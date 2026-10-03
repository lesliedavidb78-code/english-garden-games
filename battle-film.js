(() => {
 'use strict';
 const terminalKinds=new Set(['victory_shield','defeat_retry']);
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 let host=null,layer=null,windowBox=null,slots=[],shown=-1,epoch=0,operation=null,lastKind='',lastOrientation='',lastError='',phase='uninitialized',held=false,originalBackdrop='';
 const portraitSafe={idle_loop:{top:.29,bottom:.72},hero_attack:{top:.26,bottom:.73},monster_attack:{top:.26,bottom:.73},special_light:{top:.23,bottom:.71},intro_city:{top:.24,bottom:.74},victory_shield:{top:.24,bottom:.75},defeat_retry:{top:.24,bottom:.75}};
 const pendingTimers=new Set(),videoFrames=new Map();
 let resizeObserver=null,resizeFrame=0,watching=false;
 const orientation=()=>{const r=host?.getBoundingClientRect();return r&&r.width>r.height?'landscape':'portrait'};
 const entryFor=(kind,side)=>window.BattleMediaData?.video?.[side]?.[kind];
 function later(fn,ms){const id=setTimeout(()=>{pendingTimers.delete(id);fn()},ms);pendingTimers.add(id);return id}
 function clearWaiting(){for(const id of pendingTimers)clearTimeout(id);pendingTimers.clear();for(const[video,id]of videoFrames){video.cancelVideoFrameCallback?.(id)}videoFrames.clear()}
 function callback(fn,value){try{fn?.(value)}catch{}}
 function backdrop(side){const image=host?.querySelector('.battle-backdrop img');if(image)image.src=side?'assets/battle-media/poster-'+side+'.jpg':originalBackdrop}
 function result(op,reason,extra={}){return {kind:op.kind,orientation:op.orientation,src:op.entry?.src||'',played:op.started,reason,cancelled:reason==='cancelled',durationMs:op.durationMs,cueSeconds:op.cueSeconds,...extra}}
 function settle(op,reason,extra={}){if(!op||op.settled)return;op.settled=true;for(const[name,fn]of op.listeners)op.video?.removeEventListener(name,fn);op.listeners=[];clearWaiting();if(operation===op)operation=null;const value=result(op,reason,extra);op.resolve(value);if(reason!=='cancelled')callback(op.onEnd,value)}
 function clearOperation(){epoch++;const old=operation;if(old)settle(old,'cancelled');clearWaiting();for(const video of slots)video.pause()}
 function fallback(op,reason,error=''){if(!op||op.settled)return;lastError=error||reason;phase='fallback';held=false;for(const video of slots){video.pause();video.classList.remove('film-visible')}shown=-1;host?.classList.remove('film-active','film-terminal');backdrop(null);settle(op,reason,{error:lastError})}
 function finalTextHeight(caption){if(!caption)return 0;const text=caption.getAttribute('aria-label')||caption.textContent||'',style=getComputedStyle(caption),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)return caption.getBoundingClientRect().height;ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;const width=Math.max(40,caption.closest('.battle-dialogue')?.clientWidth-28||caption.clientWidth),tokens=text.split(/\s+/),lineHeight=parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.35;let lines=1,line='';for(const token of tokens){const joined=line?line+' '+token:token;if(ctx.measureText(joined).width>width&&line){lines++;line=token}else line=joined}return text?lines*lineHeight:0}
 function frame(video,entry,side){
  if(!host||!windowBox)return;const r=host.getBoundingClientRect();if(!r.width||!r.height)return;
  const hud=host.querySelector('.battle-hud')?.getBoundingClientRect(),box=host.querySelector('.battle-dialogue')?.getBoundingClientRect(),caption=host.querySelector('[data-battle="caption"]');
  const top=Math.max(0,hud?hud.bottom-r.top+7:r.height*.14);let right=0,bottom=r.height;
  if(side==='portrait'){const extra=Math.max(0,finalTextHeight(caption)-(caption?.getBoundingClientRect().height||0));bottom=Math.min(r.height*.77,box?box.top-r.top-extra-10:r.height*.63)}else right=r.width*.54;
  // The visible dialogue always has priority, including unusually short screens.
  const width=Math.max(80,r.width-right),height=Math.max(1,bottom-top);windowBox.style.left='0px';windowBox.style.right=right+'px';windowBox.style.top=top+'px';windowBox.style.height=height+'px';
  const sourceWidth=video.videoWidth||entry?.width||(side==='portrait'?720:1280),sourceHeight=video.videoHeight||entry?.height||(side==='portrait'?1280:720);
  if(side==='landscape'){const scale=Math.min(width/sourceWidth,height/sourceHeight),vw=sourceWidth*scale,vh=sourceHeight*scale;video.style.width=vw+'px';video.style.height=vh+'px';video.style.left=(width-vw)/2+'px';video.style.top=(height-vh)/2+'px'}
  else{const safe=entry?.safeArea||portraitSafe[entry?.key]||{top:.26,bottom:.73},safeTop=Math.max(0,Math.min(.5,Number(safe.top))),safeBottom=Math.max(safeTop+.2,Math.min(1,Number(safe.bottom))),safeHeight=sourceHeight*(safeBottom-safeTop),scale=Math.min(width/sourceWidth,height/safeHeight),vw=sourceWidth*scale,vh=sourceHeight*scale;video.style.width=vw+'px';video.style.height=vh+'px';video.style.left=(width-vw)/2+'px';video.style.top=(height-safeHeight*scale)/2-vh*safeTop+'px'}
  layer.dataset.orientation=side;host.style.setProperty('--battle-film-window-top',top+'px');host.style.setProperty('--battle-film-window-height',height+'px');
 }
 function queueLayout(){if(!watching||resizeFrame)return;resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;layout()})}
 function layout(){
  if(!watching||!host?.isConnected||document.hidden||['stopped','uninitialized','fallback','static'].includes(phase))return;
  const bounds=host.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
  const side=orientation();
  if(lastOrientation&&side!==lastOrientation){
   // An orientation change can arrive after play read the previous layout. Cancel
   // that action, retain the answer, and resume with the correct movie variant.
   const kind=held&&terminalKinds.has(lastKind)?lastKind:'idle_loop';play(kind);return
  }
  const video=operation?.video||slots[shown],entry=operation?.entry||entryFor(lastKind,side);
  if(video&&entry)frame(video,entry,side)
 }
 function watch(){
  if(watching||!host)return;watching=true;
  if(window.ResizeObserver){resizeObserver=new ResizeObserver(queueLayout);resizeObserver.observe(host);const box=host.querySelector('.battle-dialogue');if(box)resizeObserver.observe(box)}
  window.addEventListener('resize',queueLayout);window.addEventListener('orientationchange',queueLayout);window.visualViewport?.addEventListener('resize',queueLayout);queueLayout()
 }
 function unwatch(){watching=false;resizeObserver?.disconnect();resizeObserver=null;cancelAnimationFrame(resizeFrame);resizeFrame=0;window.removeEventListener('resize',queueLayout);window.removeEventListener('orientationchange',queueLayout);window.visualViewport?.removeEventListener('resize',queueLayout)}
 function init(stage){
  if(!stage?.querySelector)return null;if(stage===host&&layer?.isConnected){watch();return layer}
  unwatch();
  clearOperation();layer?.remove();host=stage;originalBackdrop=host.querySelector('.battle-backdrop img')?.src||'';shown=-1;held=false;lastKind='';lastError='';phase='ready';host.classList.remove('film-active','film-terminal');
  layer=document.createElement('div');layer.className='battle-film-layer';layer.setAttribute('aria-hidden','true');windowBox=document.createElement('div');windowBox.className='battle-film-window';layer.append(windowBox);slots=[];
  for(let i=0;i<2;i++){const video=document.createElement('video');video.className='battle-film-slot';video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='auto';video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');video.disablePictureInPicture=true;video.setAttribute('aria-hidden','true');video.tabIndex=-1;windowBox.append(video);slots.push(video)}
  const backdrop=host.querySelector('.battle-backdrop');if(backdrop)backdrop.after(layer);else host.prepend(layer);watch();return layer;
 }
 function unavailable(kind,options,reason){lastKind=kind;phase=reason==='reduced-motion'?'static':'fallback';lastError=reason==='reduced-motion'?'':reason;host?.classList.remove('film-active','film-terminal');slots.forEach(v=>v.pause());backdrop(null);const value={kind,orientation:orientation(),played:false,reason,cancelled:false,durationMs:0,cueSeconds:{}};const promise=Promise.resolve(value);promise.then(v=>callback(options?.onEnd,v));return {durationMs:0,cueSeconds:{},promise}}
 function play(kind,{onEnd,onStart}={}){
  if(!host||!layer?.isConnected)return unavailable(kind,{onEnd},'not-initialized');
  watch();
  const side=orientation(),entry=entryFor(kind,side);if(reduced()){clearOperation();held=false;return unavailable(kind,{onEnd},'reduced-motion')}
  if(!entry?.src){clearOperation();held=false;return unavailable(kind,{onEnd},'asset-unavailable')}
  if(kind==='idle_loop'&&lastKind===kind&&lastOrientation===side&&shown>=0&&!slots[shown].paused){return {durationMs:0,cueSeconds:entry.cueSeconds||{},promise:Promise.resolve({kind,orientation:side,played:true,reason:'already-looping',durationMs:0,cueSeconds:entry.cueSeconds||{}})}}
  clearOperation();const token=epoch,index=shown===0?1:0,video=slots[index],durationMs=Math.round(Math.max(.1,Math.min(60,Number(entry.durationSeconds)||5))*1000),cueSeconds=Object.fromEntries(Object.entries(entry.cueSeconds||{}).filter(([,value])=>Number.isFinite(value)&&value>=0));
  let resolve;const promise=new Promise(r=>{resolve=r});const op={kind,orientation:side,entry,durationMs,cueSeconds,video,index,token,started:false,settled:false,onEnd,onStart,resolve,listeners:[]};operation=op;lastKind=kind;lastOrientation=side;lastError='';phase='loading';held=false;host.classList.remove('film-terminal');video.classList.remove('film-visible');video.loop=kind==='idle_loop';video.playbackRate=1;video.muted=true;video.defaultMuted=true;
  const valid=()=>operation===op&&!op.settled&&epoch===token&&host?.isConnected;
  const activate=()=>{if(!valid()||op.started)return;op.started=true;phase=kind==='idle_loop'?'looping':'playing';frame(video,entry,side);backdrop(side);video.classList.add('film-visible');const previous=shown;shown=index;host.classList.add('film-active');if(previous>=0&&previous!==index){slots[previous].classList.remove('film-visible');slots[previous].pause()}callback(onStart,{kind,orientation:side,durationMs,cueSeconds,mediaTime:video.currentTime,src:entry.src});if(kind==='idle_loop')settle(op,'loop-started')};
  const firstFrame=()=>{if(!valid()||op.started)return;if(video.requestVideoFrameCallback){const frameId=video.requestVideoFrameCallback(()=>{videoFrames.delete(video);if(valid())activate()});videoFrames.set(video,frameId)}else if(video.currentTime>.01&&video.readyState>=2)activate()};
  const ended=()=>{if(!valid())return;if(!op.started){fallback(op,'ended-without-frame');return}video.pause();phase='held';held=terminalKinds.has(kind);host.classList.toggle('film-terminal',held);settle(op,'ended',{held})};
  const error=()=>fallback(op,'media-error',video.error?'media-error-'+video.error.code:'media-error');
  // A deliberate src/load switch emits abort for the preceding clip. Treat the
  // new clip's error/play rejection or bounded start timeout as its failure.
  for(const[name,fn]of[['playing',firstFrame],['timeupdate',()=>{if(!op.started&&video.currentTime>.015&&video.readyState>=2)activate()}],['loadedmetadata',()=>frame(video,entry,side)],['ended',ended],['error',error]] ){video.addEventListener(name,fn);op.listeners.push([name,fn])}
  frame(video,entry,side);video.poster=entry.poster||'';const src=new URL(entry.src,document.baseURI).href;if(video.src!==src){video.src=entry.src;video.load()}else try{video.currentTime=0}catch{}
  later(()=>{if(valid()&&!op.started)fallback(op,'playback-start-timeout')},7000);later(()=>{if(!valid())return;if(!op.started)fallback(op,'playback-timeout');else{video.pause();phase='held';held=terminalKinds.has(kind);host.classList.toggle('film-terminal',held);settle(op,'duration-timeout',{held})}},Math.min(67000,durationMs+8500));
  try{const request=video.play();request?.catch(error=>{if(valid())fallback(op,error?.name==='NotAllowedError'?'autoplay-denied':'play-rejected',error?.name||'play-rejected')})}catch(error){fallback(op,'play-rejected',error?.name||'play-rejected')}
  return {durationMs,cueSeconds,promise};
 }
 function idle(){return play('idle_loop')}
 function stop(){unwatch();clearOperation();const terminal=shown>=0&&terminalKinds.has(lastKind)&&slots[shown].readyState>=2&&slots[shown].currentTime>0;held=terminal;phase=terminal?'held':'stopped';host?.classList.toggle('film-terminal',terminal);if(!terminal){host?.classList.remove('film-active');for(const video of slots)video.classList.remove('film-visible');shown=-1;backdrop(null)}}
 window.BattleFilm={init,idle,play,stop,get status(){const video=slots[shown]||operation?.video;return {phase,initialized:!!host&&!!layer?.isConnected,active:!!host?.classList.contains('film-active'),kind:lastKind,orientation:lastOrientation||orientation(),playing:!!video&&!video.paused,held,loading:phase==='loading',currentTime:video?.currentTime||0,error:lastError}}};
})();
