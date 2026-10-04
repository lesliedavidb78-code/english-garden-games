/* Bundled single-word audio; no microphone, API or child recordings. */
(() => {
 'use strict';
 const root=new URL('./',document.currentScript.src),clips=window.SHOOTER_WORD_CLIPS||{};
 let media=null,epoch=0,current=null,lastText='',lastError='',source=null;
 const normalize=text=>String(text).trim().toLowerCase().replace(/\s+/g,' ');
 function stop(){epoch++;if(current)clearTimeout(current.timer);current=null;if(media){media.onended=null;media.onerror=null;media.pause()}try{source?.stop()}catch{}source=null;window.WordAudio?.stop()}
 function has(text){return !!clips[normalize(text)]||!!window.WordAudio?.has(text)}
 function play(text,done){
  stop();GameCommon.stopSpeech();lastText=String(text);lastError='';const token=epoch;
  if(window.WordAudio?.has(text)){WordAudio.unlock();WordAudio.play(text,done);return}
  const file=clips[normalize(text)];if(!file){lastError='missing';done?.(false);return}
  const item={timer:0,finished:false};current=item;
  const finish=ok=>{if(token!==epoch||item.finished)return;item.finished=true;clearTimeout(item.timer);if(!ok)lastError='playback-unavailable';if(current===item)current=null;done?.(ok)};
  const fallback=async()=>{if(token!==epoch||item.finished)return;media?.pause();try{const context=GameCommon.sound.ctx||(GameCommon.sound.ctx=new(window.AudioContext||window.webkitAudioContext)());const response=await fetch(new URL(file,root));if(!response.ok)throw Error('audio-fetch');const [buffer]=await Promise.all([context.decodeAudioData(await response.arrayBuffer()),context.resume()]);if(token!==epoch||item.finished)return;if(context.state!=='running')throw Error('tap-to-unlock');source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.onended=()=>finish(true);source.start()}catch{finish(false)}};
  item.timer=setTimeout(()=>finish(false),10000);
  try{media??=new Audio();media.preload='auto';media.volume=.95;media.muted=false;media.setAttribute('playsinline','');media.onended=()=>finish(true);media.onerror=fallback;media.src=new URL(file,root).href;media.play()?.catch(fallback)}catch{fallback()}
 }
 window.ShooterAudio={has,play,stop,get status(){return{lastText,lastError,playing:!!current&&(!media?.paused||!!source)||!!window.WordAudio?.status.playing,position:media?.currentTime||0,entries:Object.keys(clips).length}}};
})();
