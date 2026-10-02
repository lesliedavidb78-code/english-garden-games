/* English clips are bundled locally and sliced from compact recording packs. */
(() => {
  'use strict';
  const assetRoot=new URL('./',document.currentScript.src);
  const entries=window.WORD_RECORDINGS||{},buffers=new Map(),loading=new Map();
  let epoch=0,current=null,lastText='',lastError='',unlocked=false,transport='none',media=null;
  const normalize=text=>String(text).trim().toLowerCase().replace(/\s+/g,' ');
  function context(){const C=window.GameCommon;if(!C)throw Error('not-ready');return C.sound.ctx||(C.sound.ctx=new(window.AudioContext||window.webkitAudioContext)())}
  function unlock(){try{const ctx=context();ctx.resume().then(()=>{unlocked=ctx.state==='running'}).catch(()=>{});const source=ctx.createBufferSource();source.buffer=ctx.createBuffer(1,1,22050);source.connect(ctx.destination);source.start(0)}catch{}}
  async function load(file){if(buffers.has(file)){const buffer=buffers.get(file);buffers.delete(file);buffers.set(file,buffer);return buffer}if(loading.has(file))return loading.get(file);const task=(async()=>{const response=await fetch(new URL(file,assetRoot));if(!response.ok)throw Error('recording-fetch');const buffer=await context().decodeAudioData(await response.arrayBuffer());buffers.set(file,buffer);while(buffers.size>3)buffers.delete(buffers.keys().next().value);return buffer})();loading.set(file,task);try{return await task}finally{loading.delete(file)}}
  function stop(){epoch++;if(current){clearTimeout(current.timer);try{current.source?.stop()}catch{}if(media){media.onended=null;media.onerror=null;media.pause()}current=null}}
  function has(text){return Object.prototype.hasOwnProperty.call(entries,normalize(text))}
  function play(text,done){
    stop();const token=epoch,entry=entries[normalize(text)];if(!entry){done?.(false);return}
    lastText=String(text);lastError='';const item={source:null,timer:0,ended:false};current=item;
    const finish=ok=>{if(token!==epoch||item.ended)return;item.ended=true;clearTimeout(item.timer);try{item.source?.stop()}catch{}if(media){media.onended=null;media.onerror=null;media.pause()}if(current===item)current=null;if(ok)lastError='';done?.(ok)};
    item.timer=setTimeout(()=>{lastError='recording-timeout';finish(false)},9000);
    const webAudio=()=>{
      if(token!==epoch||item.ended)return;transport='web-audio';let resumed;
      try{resumed=context().resume()}catch{lastError='audio-context';finish(false);return}
      Promise.all([load(entry.file),resumed]).then(([buffer])=>{if(token!==epoch||item.ended)return;const ctx=context();if(ctx.state!=='running'){lastError='tap-to-unlock';finish(false);return}if(entry.start+entry.duration>buffer.duration+.06){lastError='recording-range';finish(false);return}const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.connect(gain);gain.connect(ctx.destination);gain.gain.value=.9;item.source=source;source.onended=()=>{source.disconnect();gain.disconnect();finish(true)};source.start(0,entry.start,entry.duration)}).catch(()=>{lastError='recording-unavailable';finish(false)});
    };
    // A normal MP3 element works without speechSynthesis, decoding or AudioContext.
    // Call play immediately inside the answer/start/replay gesture; reuse the element.
    if(!entry.single){webAudio();return}
    try{
      media=media||new Audio();media.preload='auto';media.volume=.95;media.muted=false;media.setAttribute('playsinline','');
      transport='mp3';let failed=false;
      const fallback=()=>{if(failed||token!==epoch||item.ended)return;failed=true;media.onended=null;media.onerror=null;media.pause();webAudio()};
      media.onended=()=>finish(true);media.onerror=fallback;media.src=new URL(entry.single,assetRoot).href;
      const started=media.play();if(started&&typeof started.then==='function')started.then(()=>{if(token===epoch&&!item.ended)unlocked=true}).catch(fallback);
    }catch{webAudio()}
  }
  window.WordAudio={unlock,has,play,stop,load,get status(){return {entries:Object.keys(entries).length,playing:!!current&&(!!current.source||(transport==='mp3'&&!!media&&!media.paused)),transport,position:transport==='mp3'?media?.currentTime||0:0,lastText,lastError,unlocked,cached:buffers.size,context:window.GameCommon?.sound.ctx?.state}}};
})();
