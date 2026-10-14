import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
fs.mkdirSync(new URL('./.results/',import.meta.url),{recursive:true});
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const base=fileURLToPath(new URL('../',import.meta.url));
const checks=[];
const clone=v=>JSON.parse(JSON.stringify(v));
const norm=v=>String(v).trim().toLowerCase().replace(/\s+/g,' ');
const deepFreeze=v=>{if(v&&typeof v==='object'){Object.freeze(v);Object.values(v).forEach(deepFreeze)}return v};
const check=(name,run)=>{try{const detail=run();checks.push({name,result:'PASS',...(detail===undefined?{}:{detail})});console.log('PASS',name)}catch(error){checks.push({name,result:'FAIL',error:error.message});console.log('FAIL',name,error.message)}};
let seed=0x20261004;
const seededMath=Object.create(Math);
seededMath.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const writes=[];
const parentState={garden:{settings:{pack:'pep5-photo-upper-u1'},custom:[]}};
const sandbox={window:{},document:{getElementById:()=>null},Math:seededMath,crypto:{randomUUID:()=>crypto.randomUUID()},localStorage:{getItem:()=>null,setItem:(...v)=>writes.push(v)},console,Date,Number,Set,Map};
const sources={};
function load(name){const code=fs.readFileSync(base+name,'utf8');sources[name]=crypto.createHash('sha256').update(code).digest('hex');vm.runInNewContext(code,sandbox,{filename:name})}
load('pep-vocabulary.js');load('common.js');
const C=sandbox.window.GameCommon;
const packsBefore=clone(C.PACKS);
const sharedNamesBefore=C.PACKS.map(p=>p.id);
const parentWordsBefore=clone(C.words(parentState.garden));
deepFreeze(C.PACKS);
deepFreeze(parentState);
sandbox.window.Adventure={state:parentState,update:()=>{throw Error('数据模块不应写入共享游戏存档')}};
load('shooter-vocabulary.js');load('shooter-data.js');
const D=sandbox.window.ShooterData;
const json=JSON.parse(fs.readFileSync(base+'assets/shooter-vocabulary.json','utf8'));
const photo=JSON.parse(fs.readFileSync(base+'assets/textbook-pep5-upper-2024.json','utf8'));
const report={at:new Date().toISOString(),method:'Node VM 加载正式词库及 GameCommon；固定随机种子；只调用数据生成函数；未修改产品代码、用户存档或浏览器数据。',scope:'数据结构、题目生成、难度范围、去重和共享设置隔离；没有宣称三四年级参考库已与孩子纸质教材照片逐词校准。',seed:'0x20261004',sources,books:[],scopeRuns:[],checks};
const books=D.books();
report.books=clone(books.map(({words,...book})=>({...book,count:words.length})));
const expectedCounts={'pep-ref-3-upper':106,'pep-ref-3-lower':114,'pep-ref-4-upper':83,'pep-ref-4-lower':106,'photo-5-upper':120,'pep-ref-5-lower':155};
check('六册均存在且年级、学期、数量明确',()=>{
 assert.equal(books.length,6);assert.equal(new Set(books.map(b=>b.id)).size,6);
 for(const b of books){assert.equal(b.words.length,expectedCounts[b.id],b.id);assert.ok([3,4,5].includes(b.grade));assert.ok(['upper','lower'].includes(b.semester));assert.ok(b.edition&&b.source&&b.name)}
 for(const grade of [3,4,5])assert.equal(JSON.stringify(books.filter(b=>b.grade===grade).map(b=>b.semester).sort()),JSON.stringify(['lower','upper']));
 return expectedCounts;
});
check('三四年级 JS 与 JSON 参考数据一致，参考边界显式标注',()=>{
 assert.equal(json.version,1);assert.equal(JSON.stringify(json.books),JSON.stringify(sandbox.window.SHOOTER_REFERENCE_BOOKS));
 assert.equal(json.books.length,4);assert.ok(json.status.includes('not-verified'));assert.ok(json.sourceBoundary.includes('五年级上册'));
 for(const b of json.books){assert.ok(b.name.includes('参考'));assert.ok(b.edition.includes('参考'));assert.ok(!b.edition.includes('照片'));assert.ok(!b.name.includes('核对'))}
});
check('五年级上册120词来自照片词表，下册155词明确旧版参考',()=>{
 const actual=books.find(b=>b.id==='photo-5-upper');
 const expected=photo.units.flatMap(u=>u.entries.map(w=>[norm(w.english),w.meaning]));
 assert.equal(expected.length,120);
 assert.equal(JSON.stringify(actual.words.map(w=>[norm(w.en),w.zh]).sort()),JSON.stringify(expected.sort()));
 assert.ok(actual.name.includes('2024'));assert.ok(actual.edition.includes('照片'));
 assert.ok(books.find(b=>b.id==='pep-ref-5-lower').edition.includes('旧版参考'));
});
check('跨六册按归一化英文去重后626条，保留来源与最低出现年级',()=>{
 const independent=new Map();
 for(const b of books)for(const w of b.words){const key=norm(w.en);const entry=independent.get(key)||{grade:b.grade,books:new Set()};entry.grade=Math.min(entry.grade,b.grade);entry.books.add(b.id);independent.set(key,entry)}
 const pool=D.pool('all');assert.equal(independent.size,626);assert.equal(pool.length,626);assert.equal(new Set(pool.map(w=>w.key)).size,626);
 for(const w of pool){assert.equal(w.key,norm(w.en));assert.equal(w.grade,independent.get(w.key).grade);assert.deepEqual([...w.sources].sort(),[...independent.get(w.key).books].sort())}
 return {rawEntries:books.reduce((n,b)=>n+b.words.length,0),unique:pool.length};
});
check('跨册相同英文优先采用五上照片释义',()=>{
 const pool=D.pool('all');const byKey=new Map(pool.map(w=>[w.key,w]));
 for(const w of books.find(b=>b.id==='photo-5-upper').words)assert.equal(byKey.get(norm(w.en)).zh,w.zh,w.en);
});
check('全词库所有词均可形成有效题目，合法撇号/省略表达不阻塞存档',()=>{
 const pool=D.pool('all');const invalid=[];
 for(const w of pool){const other=pool.filter(x=>x.key!==w.key&&x.zh!==w.zh).slice(0,3);const item={...w,expected:w.zh,options:[w.zh,...other.map(x=>x.zh)],targets:[w.en,...other.slice(0,2).map(x=>x.en)],english:false};if(!D.validItem(item))invalid.push({en:w.en,bookId:w.bookId})}
 assert.equal(invalid.length,0,JSON.stringify(invalid));
});
check('全部渐进模式1至4房仅三年级、5至8允许四年级、9房起允许五年级',()=>{
 const pool=D.pool('all');
 for(let level=1;level<=100;level++){
  const ceiling=level<=4?3:level<=8?4:5;
  const expectedKeys=pool.filter(w=>w.grade<=ceiling).map(w=>w.key).sort();
  assert.equal(JSON.stringify([...D.eligible(pool,'all',level)].map(w=>w.key).sort()),JSON.stringify(expectedKeys),`第${level}房`);
 }
});
check('选择池提供全部、三个年级、六册且未引入大学词库',()=>{
 const choices=D.choices();assert.deepEqual([...choices].map(x=>x.id),['all','3','4','5',...books.map(b=>b.id)]);
 assert.equal(choices.length,10);assert.ok(choices.every(x=>typeof x.name==='string'&&x.name.length>0));
 assert.ok(!choices.some(x=>/雅思|托福|CET|IELTS|TOEFL/i.test(x.name)));
});

for(const {id:scope}of D.choices()){
 const selectedBooks=books.filter(b=>scope==='all'||String(b.grade)===scope||b.id===scope);
 const sourceKeys=new Set(selectedBooks.flatMap(b=>b.words.map(w=>norm(w.en))));
 const pool=D.pool(scope);const knownKeys=new Set(pool.map(w=>w.key));
 check(`${scope}：选择池恰好由所选册/年级组成`,()=>{assert.deepEqual([...knownKeys].sort(),[...sourceKeys].sort());assert.ok(pool.length>=10)});
 let seen=[],last='',cycle=1,streamSeen=new Set(),prev='',wrongCount=0;
 const fail={bounds:[],valid:[],roomUnique:[],adjacent:[],cycle:[],inputMutated:[]};
 const trace={scope,rooms:100,questions:0,cycleCount:0,pool:pool.length,gradesSeen:[],representative:[]};
 const sampledGrades=new Set();
 for(let level=1;level<=100;level++){
  const before=JSON.stringify(seen);
  const room=D.drawRoom(scope,level,seen,last,cycle);
  if(JSON.stringify(seen)!==before)fail.inputMutated.push(level);
  if(!room||room.items.length!==10){fail.valid.push({level,reason:'不是10题'});break}
  const ceiling=scope==='all'?(level<=4?3:level<=8?4:5):5;
  const allowed=pool.filter(w=>scope!=='all'||w.grade<=ceiling);
  const allowedKeys=new Set(allowed.map(w=>w.key));
  const allowedMeanings=new Set(allowed.map(w=>w.zh));
  const roomKeys=room.items.map(w=>norm(w.en));
  if(new Set(roomKeys).size!==10)fail.roomUnique.push({level,words:roomKeys});
  for(const item of room.items){
   trace.questions++;sampledGrades.add(item.grade);
   if(!D.validItem(item))fail.valid.push({level,en:item.en});
   if(!allowedKeys.has(item.key)||!allowedMeanings.has(item.zh)||!item.options.every(x=>allowedMeanings.has(x))||!item.targets.every(x=>allowedKeys.has(norm(x))))fail.bounds.push({level,en:item.en,grade:item.grade,unexpectedTargets:item.targets.filter(x=>!allowedKeys.has(norm(x))),unexpectedOptions:item.options.filter(x=>!allowedMeanings.has(x))});
   if(item.key===prev)fail.adjacent.push({level,en:item.en});prev=item.key;
   if(streamSeen.has(item.key)){
    if(allowed.some(w=>!streamSeen.has(w.key)))fail.cycle.push({level,en:item.en,remaining:allowed.filter(w=>!streamSeen.has(w.key)).length});
    streamSeen.clear();trace.cycleCount++;
   }
   streamSeen.add(item.key);
  }
  seen=[...room.seen];last=room.lastWord;cycle=room.cycle;
  assert.ok(Number.isInteger(cycle)&&cycle>=1);
  if(!seen.every(k=>knownKeys.has(k)))fail.bounds.push({level,reason:'seen越界'});
  if(level<=2)trace.representative.push({level,questions:roomKeys,cycle});
 }
 trace.gradesSeen=[...sampledGrades].sort();report.scopeRuns.push(trace);
 for(const [key,title]of Object.entries({bounds:'100房题目/选项/怪物目标均不越所选渐进范围',valid:'100房共1000题均能通过正式存档题目校验',roomUnique:'每房10题去重',adjacent:'相邻题目及跨房首尾不连续重复',cycle:'先耗尽当时可用词池再复习',inputMutated:'生成新房不修改调用方旧seen数组'})){
  check(`${scope}：${title}`,()=>{assert.equal(fail[key].length,0,JSON.stringify({count:fail[key].length,examples:fail[key].slice(0,3)}));assert.equal(trace.questions,1000)});
 }
}
check('无效scope返回空池/空房而不会fallback到其他年级',()=>{assert.equal(D.pool('invalid-book').length,0);assert.equal(D.drawRoom('invalid-book',1),null)});
check('低年级与单册模式房间10000仍在该范围',()=>{
 for(const scope of ['3','pep-ref-3-upper','4','photo-5-upper']){
  const keys=new Set(D.pool(scope).map(w=>w.key));const room=D.drawRoom(scope,10000);
  assert.equal(room.items.length,10);assert.ok(room.items.every(w=>keys.has(w.key)&&w.targets.every(t=>keys.has(norm(t)))));
 }
});
check('射击数据加载与一万题生成均未改变共享PACKS、设置、家长第一单元词池',()=>{
 assert.equal(JSON.stringify(C.PACKS),JSON.stringify(packsBefore));
 assert.deepEqual(C.PACKS.map(p=>p.id),sharedNamesBefore);
 assert.equal(JSON.stringify(parentState),JSON.stringify({garden:{settings:{pack:'pep5-photo-upper-u1'},custom:[]}}));
 assert.equal(JSON.stringify(C.words(parentState.garden)),JSON.stringify(parentWordsBefore));
 assert.ok(!C.PACKS.some(p=>p.id.startsWith('pep-ref-3')||p.id.startsWith('pep-ref-4')));
 assert.equal(writes.length,0);
 return {sharedPacks:C.PACKS.length,parentPack:parentState.garden.settings.pack,parentWords:parentWordsBefore.length,localStorageWrites:writes.length};
});
report.passed=checks.filter(c=>c.result==='PASS').length;
report.failed=checks.filter(c=>c.result==='FAIL').length;
report.questionsGenerated=report.scopeRuns.reduce((n,r)=>n+r.questions,0);
fs.writeFileSync(new URL('./.results/vocabulary-controls.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed,questions:report.questionsGenerated,report:new URL('./.results/vocabulary-controls.json',import.meta.url)}));
process.exitCode=report.failed?1:0;
