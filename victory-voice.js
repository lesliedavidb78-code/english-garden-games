/* Optional family recording stays on this device, outside progress JSON. */
(() => {
  'use strict';
  const C=GameCommon,$=C.$,LINE='哈哈，孔明，谢谢丞相赐箭',DEFAULT='assets/victory-thanks-kongming.wav';
  let audio=null,url=null,record=null,epoch=0,dbPromise;
  function db(){return dbPromise ||= new Promise((resolve,reject)=>{const req=indexedDB.open('english-adventure-media',1);req.onupgradeneeded=()=>req.result.createObjectStore('audio');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  async function transaction(action){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('audio',action==='get'?'readonly':'readwrite'),store=tx.objectStore('audio');const req=action==='get'?store.get('victory'):action===null?store.delete('victory'):store.put(action,'victory');tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
  function stop(){epoch++;audio?.pause();if(audio)try{audio.currentTime=0}catch{};C.stopSpeech()}
  function attach(value,initial=false){if(!initial)stop();if(url)URL.revokeObjectURL(url);record=value||null;url=value?URL.createObjectURL(value.blob):null;audio=new Audio(url||DEFAULT);if(audio)audio.preload='auto';$('voice-status').textContent=record?`本机配音：${record.name}`:'默认配音：你提供的孔明谢箭录音';$('voice-clear').disabled=!record}
  const ready=transaction('get').then(value=>attach(value,true)).catch(()=>{attach(null,true);$('voice-status').textContent='本地导入储存不可用，仍使用默认谢箭录音'});
  async function play(){stop();const current=epoch;await ready;if(current!==epoch)return false;C.stopSpeech();try{await audio.play();return true}catch{C.toast('录音暂未能播放，请点“再听胜利台词”并检查音量。');return false}}
  async function set(file){if(!file||!file.size||file.size>10*1024*1024)throw Error('请选择不超过10MB的有效音频。');await ready;const candidate=URL.createObjectURL(file),probe=new Audio(candidate);try{await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('无法读取音频，请换用MP3或WAV。')),6000);probe.onloadedmetadata=()=>{clearTimeout(timeout);Number.isFinite(probe.duration)&&probe.duration>0?resolve():reject(Error('音频时长无效。'))};probe.onerror=()=>{clearTimeout(timeout);reject(Error('浏览器无法播放这个音频格式。'))};probe.src=candidate});const value={name:file.name,blob:file};await transaction(value);attach(value);return true}finally{probe.src='';URL.revokeObjectURL(candidate)}}
  async function clear(){await ready;await transaction(null);attach(null)}
  $('voice-import').onchange=async e=>{const input=e.target;try{await set(input.files[0]);C.toast('配音已保存到本机。通关时自动播放。')}catch(error){C.toast(error.message||'未保存音频，原配音保留。')}finally{input.value=''}};
  $('voice-preview').onclick=play;
  $('voice-clear').onclick=async()=>{try{await clear();C.toast('本机配音已移除，学习进度保留。')}catch{C.toast('未能移除，原配音保留。')}};
  function unlock(){if(!audio||!audio.paused)return;const target=audio,token=epoch;target.muted=true;target.play().then(()=>{if(epoch===token){target.pause();try{target.currentTime=0}catch{}}target.muted=false}).catch(()=>{target.muted=false})}
  window.VictoryVoice={play,stop,set,clear,ready,unlock,get source(){return audio?.src},get duration(){return audio?.duration},get hasRecording(){return !!record},get playing(){return !!audio&&!audio.paused},line:LINE};
})();
