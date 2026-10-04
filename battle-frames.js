/* Xiaomi browser compatibility: authentic MP4 frames exported as animated WebP.
   This renderer creates no video element. Other browsers keep BattleFilm. */
(() => {
 'use strict';
 const terminalKinds=new Set(['victory_shield','defeat_retry']);
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 let host=null,layer=null,windowBox=null,slots=[],shown=-1,epoch=0,operation=null;
 let phase='uninitialized',lastKind='',lastOrientation='',lastError='',held=false,originalBackdrop='';
 let painted=null,watching=false,resizeObserver=null,resizeFrame=0;
 const orientation=()=>{const r=host?.getBoundingClientRect();return r&&r.width>r.height?'landscape':'portrait'};
 const entryFor=(kind,side)=>window.BattleMediaData?.frames?.[side]?.[kind];
 const safeCallback=(fn,value)=>{try{fn?.(value)}catch{}};
 function backdrop(side){const image=host?.querySelector('.battle-backdrop img');if(image)image.src=side?'assets/battle-media/poster-'+side+'.jpg':originalBackdrop}
 function revoke(slot){if(slot?.url){URL.revokeObjectURL(slot.url);slot.url=''}}
 function resetSlot(slot){if(!slot)return;slot.image.onload=null;slot.image.onerror=null;revoke(slot);slot.image.removeAttribute('src');slot.image.classList.remove('film-visible');slot.entry=null}
 function resetImages(){for(const slot of slots)resetSlot(slot);shown=-1;painted=null}
 function result(op,reason,extra={}){return {kind:op.kind,orientation:op.orientation,src:op.entry?.src||'',originalSource:op.entry?.originalSource||'',played:op.started,reason,cancelled:reason==='cancelled',durationMs:op.durationMs,cueSeconds:op.cueSeconds,renderer:'frames',...extra}}
 function clearOpResources(op){for(const id of op.timers)clearTimeout(id);op.timers.clear();for(const id of op.frames)cancelAnimationFrame(id);op.frames.clear();op.controller.abort();const image=slots[op.index]?.image;if(image){image.onload=null;image.onerror=null}}
 function settle(op,reason,extra={}){if(!op||op.settled)return;op.settled=true;clearOpResources(op);if(operation===op)operation=null;const value=result(op,reason,extra);op.resolve(value);if(reason!=='cancelled')safeCallback(op.onEnd,value)}
 function cancelOperation({keepShown=true}={}){epoch++;const old=operation;if(old)settle(old,'cancelled');for(let i=0;i<slots.length;i++){if(keepShown&&i===shown)revoke(slots[i]);else resetSlot(slots[i])}}
 function later(op,fn,ms){const id=setTimeout(()=>{op.timers.delete(id);fn()},ms);op.timers.add(id)}
 function nextFrame(op,fn){const id=requestAnimationFrame(()=>{op.frames.delete(id);fn()});op.frames.add(id)}
 function finalTextHeight(caption){
  if(!caption)return 0;const text=caption.getAttribute('aria-label')||caption.textContent||'',style=getComputedStyle(caption),ctx=document.createElement('canvas').getContext('2d');if(!ctx)return caption.getBoundingClientRect().height;
  ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;const width=Math.max(40,caption.closest('.battle-dialogue')?.clientWidth-28||caption.clientWidth),lineHeight=parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.35;let lines=1,line='';
  for(const token of text.split(/\s+/)){const joined=line?line+' '+token:token;if(ctx.measureText(joined).width>width&&line){lines++;line=token}else line=joined}return text?lines*lineHeight:0
 }
 function frame(slot,entry,side){
  if(!host||!windowBox||!slot?.image)return;const r=host.getBoundingClientRect();if(!r.width||!r.height)return;
  const hud=host.querySelector('.battle-hud')?.getBoundingClientRect(),box=host.querySelector('.battle-dialogue')?.getBoundingClientRect(),caption=host.querySelector('[data-battle="caption"]');
  const top=Math.max(0,hud?hud.bottom-r.top+7:r.height*.14);let right=0,bottom=r.height;
  if(side==='portrait'){const extra=Math.max(0,finalTextHeight(caption)-(caption?.getBoundingClientRect().height||0));bottom=Math.min(r.height*.77,box?box.top-r.top-extra-10:r.height*.63)}else right=r.width*.54;
  const width=Math.max(80,r.width-right),height=Math.max(1,bottom-top);windowBox.style.left='0px';windowBox.style.right=right+'px';windowBox.style.top=top+'px';windowBox.style.height=height+'px';
  // The exported WebP already contains the portrait safe crop. Fit the entire
  // asset; applying the MP4's safeArea crop again would remove the fighters.
  const image=slot.image,sourceWidth=image.naturalWidth||entry?.width||480,sourceHeight=image.naturalHeight||entry?.height||400,scale=Math.min(width/sourceWidth,height/sourceHeight),vw=sourceWidth*scale,vh=sourceHeight*scale;
  image.style.width=vw+'px';image.style.height=vh+'px';image.style.left=(width-vw)/2+'px';image.style.top=(height-vh)/2+'px';
  layer.dataset.orientation=side;host.style.setProperty('--battle-film-window-top',top+'px');host.style.setProperty('--battle-film-window-height',height+'px')
 }
 function queueLayout(){if(!watching||resizeFrame)return;resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;layout()})}
 function layout(){
  if(!watching||!host?.isConnected||document.hidden||['stopped','uninitialized','fallback','static'].includes(phase))return;
  const r=host.getBoundingClientRect();if(!r.width||!r.height)return;const side=orientation();
  if(lastOrientation&&side!==lastOrientation){play(held&&terminalKinds.has(lastKind)?lastKind:'idle_loop');return}
  const slot=operation?slots[operation.index]:slots[shown],entry=operation?.entry||entryFor(lastKind,side);if(slot&&entry)frame(slot,entry,side)
 }
 function watch(){
  if(watching||!host)return;watching=true;
  if(window.ResizeObserver){resizeObserver=new ResizeObserver(queueLayout);resizeObserver.observe(host);const box=host.querySelector('.battle-dialogue');if(box)resizeObserver.observe(box)}
  window.addEventListener('resize',queueLayout);window.addEventListener('orientationchange',queueLayout);window.visualViewport?.addEventListener('resize',queueLayout);queueLayout()
 }
 function unwatch(){watching=false;resizeObserver?.disconnect();resizeObserver=null;cancelAnimationFrame(resizeFrame);resizeFrame=0;window.removeEventListener('resize',queueLayout);window.removeEventListener('orientationchange',queueLayout);window.visualViewport?.removeEventListener('resize',queueLayout)}
 function init(stage){
  if(!stage?.querySelector)return null;if(stage===host&&layer?.isConnected){watch();return layer}
  unwatch();cancelOperation({keepShown:false});layer?.remove();host=stage;originalBackdrop=host.querySelector('.battle-backdrop img')?.src||'';shown=-1;painted=null;held=false;lastKind='';lastOrientation='';lastError='';phase='ready';host.classList.remove('film-active','film-terminal');
  layer=document.createElement('div');layer.className='battle-film-layer battle-frames-layer';layer.setAttribute('aria-hidden','true');windowBox=document.createElement('div');windowBox.className='battle-film-window';layer.append(windowBox);slots=[];
  for(let i=0;i<2;i++){const image=document.createElement('img');image.className='battle-frame-slot';image.alt='';image.draggable=false;image.setAttribute('aria-hidden','true');windowBox.append(image);slots.push({image,url:'',entry:null})}
  const bg=host.querySelector('.battle-backdrop');if(bg)bg.after(layer);else host.prepend(layer);watch();return layer
 }
 function unavailable(kind,options,reason){
  lastKind=kind;lastOrientation=orientation();phase=reason==='reduced-motion'?'static':'fallback';lastError=reason==='reduced-motion'?'':reason;held=false;host?.classList.remove('film-active','film-terminal');resetImages();backdrop(null);
  const value={kind,orientation:orientation(),played:false,reason,cancelled:false,durationMs:0,cueSeconds:{},renderer:'frames'};const promise=Promise.resolve(value);promise.then(v=>safeCallback(options?.onEnd,v));return {durationMs:0,cueSeconds:{},promise}
 }
 function fallback(op,reason,error=''){
  if(!op||op.settled)return;lastError=error||reason;phase='fallback';held=false;resetImages();host?.classList.remove('film-active','film-terminal');backdrop(null);settle(op,reason,{error:lastError})
 }
 function play(kind,{onEnd,onStart}={}){
  if(!host||!layer?.isConnected)return unavailable(kind,{onEnd},'not-initialized');
  if(document.hidden){cancelOperation({keepShown:false});return unavailable(kind,{onEnd},'document-hidden')}
  watch();const side=orientation(),entry=entryFor(kind,side);
  if(reduced()){cancelOperation({keepShown:false});return unavailable(kind,{onEnd},'reduced-motion')}
  if(!entry?.src){cancelOperation({keepShown:false});return unavailable(kind,{onEnd},'asset-unavailable')}
  if(kind==='idle_loop'&&lastKind===kind&&lastOrientation===side&&shown>=0&&phase==='looping'&&painted?.playing){return {durationMs:0,cueSeconds:entry.cueSeconds||{},promise:Promise.resolve({kind,orientation:side,played:true,reason:'already-looping',durationMs:0,cueSeconds:entry.cueSeconds||{},renderer:'frames'})}}
  cancelOperation();const token=epoch,index=shown===0?1:0,slot=slots[index],durationMs=Math.round(Math.max(.1,Math.min(60,Number(entry.durationSeconds)||5))*1000),cueSeconds=Object.fromEntries(Object.entries(entry.cueSeconds||{}).filter(([,n])=>Number.isFinite(n)&&n>=0));
  let resolve;const promise=new Promise(r=>{resolve=r});const op={kind,orientation:side,entry,index,token,durationMs,cueSeconds,onEnd,onStart,resolve,started:false,settled:false,controller:new AbortController(),timers:new Set(),frames:new Set()};
  operation=op;lastKind=kind;lastOrientation=side;lastError='';phase='loading';held=false;host.classList.remove('film-terminal');resetSlot(slot);slot.entry=entry;
  const valid=()=>operation===op&&!op.settled&&epoch===token&&host?.isConnected&&!document.hidden;
  const activate=()=>{
   if(!valid()||op.started)return;if(slot.image.currentSrc!==slot.url||!slot.image.complete||!slot.image.naturalWidth){fallback(op,'image-without-frame');return}
   op.started=true;phase=kind==='idle_loop'?'looping':'playing';frame(slot,entry,side);backdrop(side);const previous=shown;shown=index;slot.image.classList.add('film-visible');host.classList.add('film-active');painted={kind,orientation:side,startedAt:performance.now(),durationMs,playing:true};
   if(previous>=0&&previous!==index)resetSlot(slots[previous]);
   safeCallback(onStart,{kind,orientation:side,durationMs,cueSeconds,mediaTime:0,src:entry.src,renderer:'frames'});
   if(kind==='idle_loop'){settle(op,'loop-started');return}
   // Non-idle exports MUST have WebP loop=1. The browser naturally keeps their
   // last decoded frame; this timer only reports the original action boundary.
   later(op,()=>{if(!valid())return;phase='held';held=terminalKinds.has(kind);painted.playing=false;host.classList.toggle('film-terminal',held);revoke(slot);settle(op,'ended',{held})},durationMs+50)
  };
  slot.image.onload=()=>{if(!valid()||slot.image.currentSrc!==slot.url||!slot.image.complete)return;frame(slot,entry,side);nextFrame(op,()=>{if(valid())nextFrame(op,activate)})};
  slot.image.onerror=()=>{if(valid())fallback(op,'media-error','animated-webp-decode-error')};
  later(op,()=>{if(valid()&&!op.started)fallback(op,'playback-start-timeout')},7000);
  fetch(new URL(entry.src,document.baseURI).href,{signal:op.controller.signal,cache:'force-cache'}).then(response=>{if(!response.ok)throw new Error('HTTP '+response.status);return response.blob()}).then(blob=>{
   if(!valid())return;slot.url=URL.createObjectURL(blob);slot.image.src=slot.url
  }).catch(error=>{if(valid())fallback(op,'media-error',error?.message||'animated-webp-load-error')});
  return {durationMs,cueSeconds,promise}
 }
 function idle(){return play('idle_loop')}
 function stop(){
  const terminal=phase==='held'&&held&&shown>=0&&terminalKinds.has(lastKind)&&slots[shown].image.complete;
  unwatch();cancelOperation({keepShown:terminal});held=terminal;phase=terminal?'held':'stopped';if(painted)painted.playing=false;
  host?.classList.toggle('film-terminal',terminal);if(!terminal){resetImages();host?.classList.remove('film-active');backdrop(null)}
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});window.addEventListener('pagehide',stop);
 window.BattleFramePlayer={init,idle,play,stop,get status(){const elapsed=painted?Math.max(0,performance.now()-painted.startedAt):0,currentTime=painted?(painted.kind==='idle_loop'&&painted.playing?elapsed%painted.durationMs:Math.min(elapsed,painted.durationMs))/1000:0;return {renderer:'frames',phase,initialized:!!host&&!!layer?.isConnected,active:!!host?.classList.contains('film-active'),kind:lastKind,orientation:lastOrientation||orientation(),playing:!!painted?.playing&&['looping','playing'].includes(phase),held,loading:phase==='loading',currentTime,error:lastError,objectURLs:slots.filter(slot=>slot.url).length}}};
})();
