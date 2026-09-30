/* User supplied recordings. Local files only; no remote voices or tracking. */
(() => {
  'use strict';
  const C=GameCommon,base='assets/audio/',files={
    quiet:'music/bgm_river_adventure_loop_quiet.mp3',adventurous:'music/bgm_river_adventure_loop_adventurous.mp3',
    river:'ambience/amb_river_mist_loop.mp3',shot:'sfx/sfx_arrow_whoosh.mp3',impact:'sfx/sfx_arrow_straw_hit.mp3',
    crack:'sfx/sfx_hull_crack.mp3',leak:'sfx/sfx_water_leak_loop.mp3',sink:'sfx/sfx_boat_sink.mp3',
    win:'sfx/sfx_victory_sting.mp3',five:'dialogue/vo_five_leaks_01.mp3',sunk:'dialogue/vo_sink_01.mp3'
  };
  let options={music:'quiet',effects:true,dialogue:true};
  try{const saved=JSON.parse(localStorage.getItem('english-voyage-audio-v1'));if(saved&&['quiet','adventurous','off'].includes(saved.music)&&typeof saved.effects==='boolean'&&typeof saved.dialogue==='boolean')options=saved}catch{}
  let ctx,live=false,damage=0,speaking=false,voice=null,epoch=0,pending=null,voiceTimer=0,terminalTimer=0,lastDialogue=-Infinity;
  const buffers=new Map(),loops=new Map(),shots=new Set(),events=[],failures=[];
  function log(kind,key){events.push({kind,key,at:Date.now()});if(events.length>80)events.shift()}
  function context(){return ctx||(ctx=C.sound.ctx||(C.sound.ctx=new(window.AudioContext||window.webkitAudioContext)()))}
  const ready=(async()=>{try{context();await Promise.all(Object.entries(files).map(async([key,file])=>{try{const r=await fetch(base+file);if(!r.ok)throw Error(r.status);buffers.set(key,await ctx.decodeAudioData(await r.arrayBuffer()))}catch{failures.push(key)}}));syncLoops();renderSettings()}catch{failures.push('audio-context')}return buffers.size})()
  function gainTarget(g,value){g.gain.setTargetAtTime(value,ctx.currentTime,.08)}
  function volume(kind){const duck=(speaking||voice) ? .22 : 1;if(kind==='music')return .16*duck;if(kind==='river')return options.effects ? .07*duck : 0;return options.effects?Math.min(.15,.035+damage*.012)*duck:0}
  function mix(){for(const l of loops.values())gainTarget(l.bus,volume(l.kind));for(const s of shots)gainTarget(s.gain,s.level*((speaking||voice) ? .45 : 1))}
  function stopLoop(kind){const l=loops.get(kind);if(!l)return;clearInterval(l.timer);for(const source of l.sources){try{source.stop()}catch{}}l.bus.disconnect();loops.delete(kind)}
  function loop(kind,key){if(loops.get(kind)?.key===key)return;stopLoop(kind);const buffer=buffers.get(key);if(!buffer||!ctx)return;const bus=ctx.createGain();bus.gain.value=volume(kind);bus.connect(ctx.destination);const overlap=Math.min(.65,buffer.duration/5),l={kind,key,bus,sources:new Set(),next:ctx.currentTime+.02,timer:0};loops.set(kind,l);
    const schedule=()=>{while(l.next<ctx.currentTime+1.5){const source=ctx.createBufferSource(),fade=ctx.createGain(),when=Math.max(l.next,ctx.currentTime),end=when+buffer.duration;source.buffer=buffer;source.connect(fade);fade.connect(bus);fade.gain.setValueAtTime(0,when);fade.gain.linearRampToValueAtTime(1,when+overlap);fade.gain.setValueAtTime(1,end-overlap);fade.gain.linearRampToValueAtTime(0,end);l.sources.add(source);source.onended=()=>{l.sources.delete(source);source.disconnect();fade.disconnect()};source.start(when);l.next=when+buffer.duration-overlap;log('loop',key)}};
    schedule();l.timer=setInterval(schedule,250);
  }
  function syncLoops(){if(!live){for(const kind of [...loops.keys()])stopLoop(kind);return}if(options.music==='off')stopLoop('music');else loop('music',options.music);if(options.effects){loop('river','river');if(damage)loop('leak','leak');else stopLoop('leak')}else{stopLoop('river');stopLoop('leak')}mix()}
  function effect(key,level=.32){if(!options.effects)return true;const buffer=buffers.get(key);if(!buffer||!ctx)return false;const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.connect(gain);gain.connect(ctx.destination);const item={source,gain,level};shots.add(item);gain.gain.value=level*((speaking||voice) ? .45 : 1);source.onended=()=>{shots.delete(item);source.disconnect();gain.disconnect()};source.start();log('effect',key);return true}
  function caption(line){const node=document.getElementById('story-caption');if(node){node.textContent=line||'';node.hidden=!line}}
  function stopVoice(){if(voice){try{voice.source.stop()}catch{}voice=null}caption('');mix()}
  function dialogue(key,line){if(!options.dialogue||speaking||!buffers.has(key)||!ctx)return false;stopVoice();const source=ctx.createBufferSource(),gain=ctx.createGain(),item={source,gain};source.buffer=buffers.get(key);source.connect(gain);gain.connect(ctx.destination);gain.gain.value=.85;voice=item;caption(line);mix();source.onended=()=>{source.disconnect();gain.disconnect();if(voice===item){voice=null;caption('');mix()}};source.start();lastDialogue=performance.now();log('dialogue',key);return true}
  function drain(){clearTimeout(voiceTimer);if(!pending||speaking||!live)return;const token=epoch;voiceTimer=setTimeout(()=>{if(token!==epoch||!pending||speaking||!live)return;const item=pending;pending=null;if(performance.now()<item.expires&&performance.now()-lastDialogue>10000)dialogue('five','军师！水都到鞋面啦！')},120)}
  function speechBegin(){speaking=true;clearTimeout(voiceTimer);stopVoice();mix()}
  function speechEnd(){speaking=false;mix();drain()}
  function queueFive(){if(!live||!options.dialogue)return;pending={expires:performance.now()+8000};drain()}
  function stop(){epoch++;live=false;damage=0;speaking=false;pending=null;clearTimeout(voiceTimer);clearTimeout(terminalTimer);stopVoice();syncLoops();for(const s of shots){try{s.source.stop()}catch{}}shots.clear()}
  function start(holes){stop();live=true;damage=Math.min(holes||0,9);syncLoops();ready.then(()=>{if(live)syncLoops()})}
  function leak(holes){damage=Math.min(holes||0,9);syncLoops()}
  function terminal(outcome){stop();if(outcome==='won'){effect('win',.25);return}effect('sink',.38);const token=epoch;terminalTimer=setTimeout(()=>{if(token===epoch)dialogue('sunk','船沉啦！下回咱们再借箭！')},350)}
  function unlock(){try{context().resume().catch(()=>{})}catch{}}
  function renderSettings(){const music=document.getElementById('audio-music'),fx=document.getElementById('audio-effects'),talk=document.getElementById('audio-dialogue');if(music)music.value=options.music;if(fx)fx.checked=options.effects;if(talk)talk.checked=options.dialogue;const note=document.getElementById('audio-status');if(note)note.textContent=failures.length?'部分声音暂不可用，可继续看帆答题。':buffers.size===11?'配乐和剧情录音已准备，启航后播放。':'正在准备航行声音…'}
  function configure(change){options={...options,...change};try{localStorage.setItem('english-voyage-audio-v1',JSON.stringify(options))}catch{}if(!options.dialogue){pending=null;stopVoice()}if(!options.effects)for(const s of shots){try{s.source.stop()}catch{}}syncLoops();renderSettings()}
  document.getElementById('audio-music')?.addEventListener('change',e=>configure({music:e.target.value}));
  document.getElementById('audio-effects')?.addEventListener('change',e=>configure({effects:e.target.checked}));
  document.getElementById('audio-dialogue')?.addEventListener('change',e=>configure({dialogue:e.target.checked}));
  renderSettings();
  window.VoyageAudio={ready,unlock,start,stop,leak,effect,queueFive,speechBegin,speechEnd,terminal,configure,get status(){return {ready:buffers.size,failures:[...failures],live,speaking,dialogue:voice?true:false,pending:!!pending,loops:[...loops.values()].map(l=>({kind:l.kind,key:l.key,volume:l.bus.gain.value})),options:{...options},events:[...events],durations:Object.fromEntries([...buffers].map(([k,b])=>[k,b.duration]))}}};
})();
