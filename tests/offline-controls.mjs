import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
fs.mkdirSync(new URL('./.results/',import.meta.url),{recursive:true});
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const checks=[];
function check(name,fn){fn();checks.push({name,pass:true,evidence:'正式 sw.js 在内存 CacheStorage 与可控网络响应下通过断言。'})}
function harness({fastTimeout=false}={}){
  const entries=new Map(),listeners=new Map(),calls=new Map(),messages=[],deleted=[];
  const state={active:0,maxActive:0,skipWaiting:0,claimed:0,fail:new Set(),offline:new Set(),stall:new Set(),stallBody:new Set()};
  const href='https://game.test/english/sw.js';
  const toURL=r=>new URL(typeof r==='string'?r:r.url,href).href;
  class MemoryCache{
    constructor(){this.entries=new Map()}
    async match(request,options={}){
      const url=toURL(request);
      if(this.entries.has(url))return this.entries.get(url).clone();
      if(options.ignoreSearch){for(const [key,response] of this.entries){if(key.split('?')[0]===url.split('?')[0])return response.clone()}}
    }
    async put(request,response){
      assert.notEqual(response.status,206);
      const full=new Response(await response.arrayBuffer(),{status:response.status,headers:response.headers});
      this.entries.set(toURL(request),full);
    }
    async delete(request){return this.entries.delete(toURL(request))}
    async keys(){return [...this.entries.keys()].map(url=>new Request(url))}
  }
  const caches={
    async open(name){if(!entries.has(name))entries.set(name,new MemoryCache());return entries.get(name)},
    async keys(){return [...entries.keys()]},
    async delete(name){
      if(name.startsWith('english-games-offline-')&&name!=='english-games-offline-v37'){
        assert(entries.get('english-games-offline-v37')?.entries.has(new URL('./__offline-ready-v37',href).href),'旧缓存只能在完整 marker 写入后删除');
      }
      deleted.push(name);return entries.delete(name);
    }
  };
  const windowClient={id:'window-1',url:new URL('./',href).href,postMessage(data){messages.push(JSON.parse(JSON.stringify(data)))}};
  const self={location:{href,origin:new URL(href).origin},
    addEventListener(name,fn){listeners.set(name,fn)},
    async skipWaiting(){state.skipWaiting++},
    clients:{async claim(){state.claimed++},async matchAll(){return [windowClient]}}
  };
  async function fetch(request){
    const url=toURL(request);calls.set(url,(calls.get(url)||0)+1);
    state.active++;state.maxActive=Math.max(state.maxActive,state.active);
    try{
      if(state.stall.has(url)){
        await new Promise((resolve,reject)=>request.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
      }else if(!fastTimeout){await new Promise(resolve=>setTimeout(resolve,1))}
      if(state.offline.has(url))throw new TypeError('Network failure');
      if(state.stallBody.has(url))return new Response(new ReadableStream({start(controller){
        controller.enqueue(new TextEncoder().encode('partial'));
        request.signal.addEventListener('abort',()=>controller.error(new DOMException('Body aborted','AbortError')),{once:true});
      }}));
      return new Response(state.fail.has(url)?'unavailable':url,{status:state.fail.has(url)?503:200});
    }finally{state.active--}
  }
  const sandbox={self,caches,fetch,URL,Request,Response,Headers,AbortController,setTimeout:(fn,delay)=>setTimeout(fn,fastTimeout&&delay===30000?2:delay),clearTimeout};
  vm.runInNewContext(source+'\nthis.inspect={CACHE,FILE_URLS,CORE_URLS,READY_URL};',sandbox);
  function emit(type,extra={}){
    const waiting=[];
    listeners.get(type)({waitUntil(p){waiting.push(p)},source:windowClient,...extra});
    return Promise.all(waiting);
  }
  async function request(url,headers={},mode){
    let response;
    const base=new Request(new URL(url,href),{headers});
    const req=mode?new Proxy(base,{get(target,key){if(key==='mode')return mode;const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value}}):base;
    listeners.get('fetch')({request:req,respondWith(p){response=p}});
    return response;
  }
  return {entries,caches,calls,messages,state,emit,request,deleted,inspect:sandbox.inspect,href};
}

const h=harness(),{CACHE,FILE_URLS,CORE_URLS,READY_URL}=h.inspect;
check('保持 1052 个独立资源，147 个核心资源、905 个媒体资源',()=>{
  assert.equal(FILE_URLS.length,1052);assert.equal(new Set(FILE_URLS).size,1052);
  assert.equal(CORE_URLS.length,147);assert(CORE_URLS.every(url=>! /\.(mp3|wav|mp4)$/.test(url)));
});
const old=await h.caches.open('english-games-offline-v30');
const oldMedia=new URL('./assets/battle-media/video/portrait/idle_loop.mp4',h.href).href;
await old.put(oldMedia,new Response('ABCDE',{headers:{'Content-Type':'video/mp4'}}));
await h.emit('install');
const cache=await h.caches.open(CACHE);
check('安装只缓存核心资源，成功 skipWaiting，不提前删旧缓存',()=>{
  assert.equal(cache.entries.size,147);assert.equal(h.state.skipWaiting,1);assert.equal(h.deleted.length,0);
  assert.equal([...h.calls.values()].reduce((n,v)=>n+v,0),147);
});
await h.emit('activate');
check('激活只 claim，不删旧缓存',()=>{assert.equal(h.state.claimed,1);assert(h.entries.has('english-games-offline-v30'))});
h.state.offline.add(oldMedia);
const ranged=await h.request(oldMedia,{range:'bytes=1-3'});
check('当前缓存缺失、网络失败时允许旧缓存 Range 回退',()=>{
  assert.equal(ranged.status,206);assert.equal(ranged.headers.get('Content-Range'),'bytes 1-3/5');
});
check('旧缓存 Range 正文正确',()=>{assert.equal(ranged.headers.get('Content-Length'),'3')});
assert.equal(await ranged.text(),'BCD');
const invalidRange=await h.request(oldMedia,{range:'bytes=7-9'});
check('无效旧缓存 Range 返回 416',()=>{assert.equal(invalidRange.status,416)});
h.state.offline.delete(oldMedia);
const callsBeforePreparation=new Map(h.calls);

const failure=new URL('./assets/battle-audio/hero-hit.wav',h.href).href;
h.state.fail.add(failure);
await Promise.all([h.emit('message',{data:{type:'PREPARE_OFFLINE'}}),h.emit('message',{data:{type:'PREPARE_OFFLINE'}})]);
const firstCompleted=cache.entries.size;
check('503 最多尝试 3 次并报告失败，保存已经完成的资源',()=>{
  assert.equal(h.calls.get(failure),3);assert.equal(h.messages.at(-1).state,'failed');
  assert.equal(h.messages.at(-1).completed,firstCompleted);assert(firstCompleted>147&&firstCompleted<1052);
  assert.equal(cache.entries.has(READY_URL),false);assert(h.entries.has('english-games-offline-v30'));
});
const callsBeforeRetry=new Map(h.calls);
const firstPresent=new Set(cache.entries.keys());
h.state.fail.delete(failure);
await Promise.all([h.emit('message',{data:{type:'PREPARE_OFFLINE'}}),h.emit('message',{data:{type:'PREPARE_OFFLINE'}})]);
const marker=await (await cache.match(READY_URL)).json();
check('重试准确命中续传，不再次下载已完成资源',()=>{
  for(const [url,count] of callsBeforeRetry){if(firstPresent.has(url)&&url!==failure)assert.equal(h.calls.get(url),count)}
  assert.equal(h.calls.get(failure),4);assert.equal(cache.entries.size,FILE_URLS.length+1);
});
check('准确完成 1052 项后才写 marker 与删除旧缓存',()=>{
  assert.deepEqual(marker,{cache:CACHE,completed:1052,total:1052});
  assert.equal(h.messages.at(-1).state,'ready');assert.equal(h.messages.at(-1).completed,1052);
  assert.equal(h.entries.has('english-games-offline-v30'),false);
});
check('并发消息共用队列，下载并发不超过 4',()=>{
  assert(h.state.maxActive<=4);for(const url of FILE_URLS){if(url!==failure)assert.equal(h.calls.get(url),(callsBeforePreparation.get(url)||0)+(CORE_URLS.includes(url)?0:1))}
});
const callsAtReady=[...h.calls.values()].reduce((n,v)=>n+v,0);
await h.emit('message',{data:{type:'PREPARE_OFFLINE'}});
check('就绪后再次收到消息不重新下载全量资源',()=>{
  assert.equal([...h.calls.values()].reduce((n,v)=>n+v,0),callsAtReady);assert.equal(h.messages.at(-1).state,'ready');
});
check('进度字段完整、计数不超过 1052',()=>{
  assert(h.messages.every(m=>m.type==='OFFLINE_PROGRESS'&&m.cache===CACHE&&m.total===1052&&m.completed>=0&&m.completed<=1052&&['preparing','ready','failed'].includes(m.state)));
});

const offlineWav=new URL('./assets/shooter-audio/s0000.wav',h.href).href;
h.state.offline.add(offlineWav);
const cachedWav=await h.request(offlineWav);
check('完成后的媒体断网命中当前缓存',()=>{assert.equal(cachedWav.status,200)});
assert.equal(await cachedWav.text(),offlineWav);
const currentJS=new URL('./common.js',h.href).href;
const jsCalls=h.calls.get(currentJS);
await h.request(currentJS);
check('JS 保留在线优先更新',()=>{assert.equal(h.calls.get(currentJS),jsCalls+1)});
h.state.offline.add(currentJS);
const offlineJS=await h.request(currentJS);
check('JS 网络失败回退当前缓存',()=>{assert.equal(offlineJS.status,200)});

const timed=harness({fastTimeout:true}),stalled=new URL('./assets/battle-audio/hero-hit.wav',timed.href).href;
await timed.emit('install');await timed.emit('activate');timed.state.stall.add(stalled);
await timed.emit('message',{data:{type:'PREPARE_OFFLINE'}});
check('单请求超时覆盖 AbortSignal，最多 3 次后报告失败',()=>{
  assert.equal(timed.calls.get(stalled),3);assert.equal(timed.messages.at(-1).state,'failed');
  assert.match(timed.messages.at(-1).error,/超过 30 秒/);assert.equal(timed.state.active,0);
});

const bodyTimed=harness({fastTimeout:true});
await bodyTimed.emit('install');await bodyTimed.emit('activate');bodyTimed.state.stallBody.add(stalled);
await bodyTimed.emit('message',{data:{type:'PREPARE_OFFLINE'}});
check('HTTP 200 正文挂起时仍超时，未缓存半条响应',()=>{
  assert.equal(bodyTimed.calls.get(stalled),3);assert.equal(bodyTimed.messages.at(-1).state,'failed');
  assert.equal(bodyTimed.entries.get(CACHE).entries.has(stalled),false);
  assert.equal(bodyTimed.entries.get(CACHE).entries.has(READY_URL),false);
});

const coreFailed=harness({fastTimeout:true}),coreFailURL=CORE_URLS[0];
await coreFailed.caches.open('english-games-offline-v30');coreFailed.state.fail.add(coreFailURL);
await assert.rejects(coreFailed.emit('install'),/HTTP 503/);
const savedCore=new Set(coreFailed.entries.get(CACHE).entries.keys()),oldCalls=new Map(coreFailed.calls);
check('核心安装失败不激活、不删除旧缓存、保留已下载核心',()=>{
  assert.equal(coreFailed.state.skipWaiting,0);assert(coreFailed.entries.has('english-games-offline-v30'));
  assert.equal(coreFailed.calls.get(coreFailURL),3);assert(savedCore.size>0&&savedCore.size<147);
});
coreFailed.state.fail.delete(coreFailURL);await coreFailed.emit('install');
check('核心安装重试继续补缺失资源',()=>{
  assert.equal(coreFailed.state.skipWaiting,1);assert.equal(coreFailed.entries.get(CACHE).entries.size,147);
  for(const url of savedCore)assert.equal(coreFailed.calls.get(url),oldCalls.get(url));
});

const evidence=[
  'FILE_URLS 去重后 1052；CORE_URLS 147，全部非 MP3/WAV/MP4；媒体 905。',
  '安装后仅 147 个缓存项、147 次下载；skipWaiting 1 次；旧 v30 未删除。',
  'clients.claim 1 次；旧 v30 仍存在。',
  '缺失当前版本 MP4 且网络失败时返回 206；Content-Range 为 bytes 1-3/5。',
  'ABCDE 的 bytes=1-3 正文为 BCD，长度 3。',
  'bytes=7-9 超出 5 字节文件，返回 416。',
  `模拟单 URL 503 共 3 次；failed.completed=${firstCompleted}；未生成 ready marker。`,
  '先前成功缓存的每个 URL 在重试后请求次数不变；故障 URL 第 4 次成功。',
  '最终 1052 必需 URL + 1 marker；marker 的 completed/total 均为 1052；之后才允许删除旧 cache。',
  `两个同时 PREPARE 共享工作，最大实际模拟 fetch 并发 ${h.state.maxActive}；每个正常 URL 仅准备下载 1 次。`,
  'ready 后再次发送 PREPARE，累计网络请求数不变。',
  '全部进度消息 cache=v37、total=1052、completed 在 0..1052、state 值合法。',
  's0000.wav 网络失败条件下返回当前缓存 HTTP 200 和完整模拟正文。',
  'common.js 已有缓存时仍增加 1 次在线网络请求。',
  'common.js 网络失败时返回缓存 HTTP 200。',
  '将 30 s 定时器缩为 2 ms；请求监听 AbortSignal，3 次后 failed，模拟活跃请求归零。',
  'HTTP 200 的 ReadableStream 持续不结束；3 次 AbortSignal 终止读流，故障 URL 与 marker 均未缓存。',
  `核心文件 503 三次，skipWaiting=0；成功的 ${savedCore.size} 项核心继续保留，旧 v30 仍存在。`,
  '清除核心故障后第二次 install 达到 147 核心并 skipWaiting=1；先前成功 URL 没有重复下载。'
];
checks.forEach((item,index)=>{item.evidence=evidence[index]});

const report={at:new Date().toISOString(),boundary:'Node VM 中运行正式 sw.js；CacheStorage、客户端与网络为内存模拟，不替代真实浏览器安装、公网下载或手机断网验证。超时场景将计时器缩至 2 ms，仅验证 AbortSignal/重试路径。',cache:CACHE,total:1052,core:147,media:905,pass:checks.length,fail:0,maxMockDownloads:h.state.maxActive,checks};
fs.writeFileSync(new URL('./.results/offline-controls.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(`PASS ${checks.length} 项离线缓存模型检查`);
