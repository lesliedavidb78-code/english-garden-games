/* English clips are bundled locally and sliced from compact recording packs. */
(() => {
  'use strict';
  const assetRoot=new URL('./',document.currentScript.src);
  const entries=window.WORD_RECORDINGS||{},buffers=new Map(),loading=new Map();
  let epoch=0,current=null,lastText='',lastError='',unlocked=false;
  const normalize=text=>String(text).trim().toLowerCase().replace(/\s+/g,' ');
  function context(){const C=window.GameCommon;if(!C)throw Error('not-ready');return C.sound.ctx||(C.sound.ctx=new(window.AudioContext||window.webkitAudioContext)())}
  function unlock(){try{const ctx=context();ctx.resume().then(()=>{unlocked=ctx.state==='running'}).catch(()=>{})}catch{}}
  async function load(file){if(buffers.has(file)){const buffer=buffers.get(file);buffers.delete(file);buffers.set(file,buffer);return buffer}if(loading.has(file))return loading.get(file);const task=(async()=>{const response=await fetch(new URL(file,assetRoot));if(!response.ok)throw Error('recording-fetch');const buffer=await context().decodeAudioData(await response.arrayBuffer());buffers.set(file,buffer);while(buffers.size>3)buffers.delete(buffers.keys().next().value);return buffer})();loading.set(file,task);try{return await task}finally{loading.delete(file)}}
  function stop(){epoch++;if(current){clearTimeout(current.timer);try{current.source?.stop()}catch{}current=null}}
  function has(text){return Object.hasOwn(entries,normalize(text))}
  function play(text,done){stop();const token=epoch,entry=entries[normalize(text)];if(!entry){done?.(false);return}lastText=String(text);lastError='';const item={source:null,timer:0,ended:false};current=item;
    const finish=ok=>{if(token!==epoch||item.ended)return;item.ended=true;clearTimeout(item.timer);try{item.source?.stop()}catch{}if(current===item)current=null;done?.(ok)};
    item.timer=setTimeout(()=>{lastError='recording-timeout';finish(false)},9000);
    let resumed;try{resumed=context().resume()}catch{lastError='audio-context';finish(false);return}
    Promise.all([load(entry.file),resumed]).then(([buffer])=>{if(token!==epoch||item.ended)return;const ctx=context();if(ctx.state!=='running'){lastError='tap-to-unlock';finish(false);return}if(entry.start+entry.duration>buffer.duration+.06){lastError='recording-range';finish(false);return}const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.connect(gain);gain.connect(ctx.destination);gain.gain.value=.9;item.source=source;source.onended=()=>{source.disconnect();gain.disconnect();finish(true)};source.start(0,entry.start,entry.duration)}).catch(()=>{lastError='recording-unavailable';finish(false)});
  }
  window.WordAudio={unlock,has,play,stop,load,get status(){return {entries:Object.keys(entries).length,playing:!!current?.source,lastText,lastError,unlocked,cached:buffers.size,context:window.GameCommon?.sound.ctx?.state}}};
})();
