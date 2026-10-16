(() => {
 'use strict';
 const art='assets/battle-art/',stage=()=>document.getElementById('dialogue-battle');
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const int=n=>Math.min(10,Math.max(0,Math.floor(Number(n)||0)));
 let combatFrame=0,typingFrame=0,introFrame=0,combatEpoch=0,typingEpoch=0,introEpoch=0,dialogueKey='',dialogueText='',boundStage=null;
 let animations=new Set(),timeouts=new Set(),lastStats={correct:0,wrong:0,streak:0},liveDialogue=null,intro=null;
 function markup(){return `<section id="dialogue-battle" class="dialogue-battle is-paused" aria-label="光之守护者与怪兽的英语对话大战">
  <div class="battle-backdrop" aria-hidden="true"><img src="${art}battlefield-v3.png" alt=""><div class="battle-atmosphere"></div><div class="battle-sky-light"></div></div>
  <div class="battle-idle-dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
  <div class="battle-hud"><div class="battle-health-side"><div class="battle-health-label"><strong>光之守护者</strong><span data-battle="hero-count">10 / 10</span></div><div class="battle-health-track" role="progressbar" aria-label="光之守护者生命值" aria-valuemin="0" aria-valuemax="10" aria-valuenow="10" data-battle="hero-bar"><span></span></div></div><span class="battle-versus" aria-hidden="true">VS</span><div class="battle-health-side"><div class="battle-health-label"><strong>怪兽</strong><span data-battle="monster-count">10 / 10</span></div><div class="battle-health-track monster-health" role="progressbar" aria-label="怪兽生命值" aria-valuemin="0" aria-valuemax="10" aria-valuenow="10" data-battle="monster-bar"><span></span></div></div></div>
  <div class="battle-mission" data-battle="mission">任务 · 守护地球</div>
  <div class="battle-characters" aria-label="对战角色"><div class="battle-ground-plane" aria-hidden="true"><i></i><i></i></div><div class="battle-fighter battle-hero"><div class="battle-mover"><div class="battle-charge-ring"></div><img class="battle-figure" src="${art}hero-v3.png" alt="银红铠甲的光之守护者，举拳守护城市"></div><span class="battle-ground-shadow" aria-hidden="true"></span></div><div class="battle-fighter battle-monster"><div class="battle-mover"><div class="battle-charge-ring"></div><img class="battle-figure" src="${art}monster-v3.png" alt="有角的怪兽，准备迎接挑战"></div><span class="battle-ground-shadow" aria-hidden="true"></span></div></div>
  <div class="battle-story-line" data-battle="story-line" aria-live="polite"></div>
  <canvas id="battle-effects" aria-hidden="true"></canvas><div class="battle-flash" aria-hidden="true"></div><div class="battle-edge-light" aria-hidden="true"></div>
  <div class="battle-combo-card" aria-hidden="true"><small>FIVE IN A ROW</small><strong>光之大招</strong><span>相信光的力量！</span></div>
  <div class="battle-impact-word" aria-hidden="true">命中！</div>
  <div class="battle-terminal-banner" aria-hidden="true"><small>英语守护者</small><strong data-battle="result-title"></strong></div>
  <section class="battle-dialogue" role="button" tabindex="0" aria-label="点击显示全部对话"><div class="battle-dialogue-heading"><span class="battle-speaker-dot"></span><strong class="battle-dialogue-name">怪兽 · 发起挑战</strong><small class="battle-read-hint">点击展开</small></div><div class="battle-dialogue-controls"></div><div class="battle-dialogue-line"><p class="battle-caption" data-battle="caption" aria-live="off">听清问题，选一句回答！</p><span class="battle-type-cursor" aria-hidden="true"></span></div><p class="battle-dialogue-translation"></p></section>
  <div class="battle-intro" hidden><div class="battle-intro-shade"></div><div class="battle-intro-content"><p class="battle-intro-kicker">地球守护任务</p><strong class="battle-intro-speaker"></strong><p class="battle-intro-text" aria-live="off"></p><p class="battle-intro-translation"></p><div class="battle-intro-progress"></div><div class="battle-intro-actions"><button type="button" class="battle-intro-next">下一段 →</button><button type="button" class="battle-intro-skip">跳过开场</button></div></div></div>
 </section>`}
 function ensure(){const el=stage();if(!el)return null;if(el!==boundStage){boundStage=el;dialogueKey='';liveDialogue=null;const box=el.querySelector('.battle-dialogue');box.addEventListener('click',e=>{if(!e.target.closest('.battle-dialogue-controls'))revealDialogue()});box.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('.battle-dialogue-controls')){e.preventDefault();revealDialogue()}});el.querySelector('.battle-intro-next').addEventListener('click',advanceIntro);el.querySelector('.battle-intro-skip').addEventListener('click',()=>finishIntro(true))}return el}
 function clean(s){return {correct:int(s?.correct),wrong:int(s?.wrong),streak:Math.max(0,Math.floor(Number(s?.streak)||0)),terminal:s?.terminal||null}}
 function render(stats){const el=ensure();if(!el)return;lastStats=clean(stats);const won=lastStats.correct>=10||lastStats.terminal==='won',lost=!won&&(lastStats.wrong>=10||lastStats.terminal==='lost');for(const[name,left]of[['hero',10-lastStats.wrong],['monster',10-lastStats.correct]]){const bar=el.querySelector(`[data-battle="${name}-bar"]`);bar.setAttribute('aria-valuenow',String(left));bar.classList.toggle('low-health',left<=3);bar.querySelector('span').style.width=`${left*10}%`;el.querySelector(`[data-battle="${name}-count"]`).textContent=`${left} / 10`}el.classList.toggle('hero-danger',lastStats.wrong>=7&&!lost);el.classList.toggle('is-won',won);el.classList.toggle('is-lost',lost);el.classList.remove('is-paused');el.querySelector('[data-battle="result-title"]').textContent=won?'城市守护成功！':lost?'挑战结束 · 再次集结！':'';if(!liveDialogue){const p=el.querySelector('[data-battle="caption"]');p.textContent=won?'小朋友，你相信光吗？':lost?'记住正确回答，我们再挑战一次！':'怪兽发来英语挑战，选一句回答！';p.setAttribute('aria-label',p.textContent)}}
 function schedule(fn,ms){const id=setTimeout(()=>{timeouts.delete(id);fn()},ms);timeouts.add(id);return id}
 function clearCombat(){combatEpoch++;cancelAnimationFrame(combatFrame);combatFrame=0;for(const a of animations)a.cancel();animations.clear();for(const id of timeouts)clearTimeout(id);timeouts.clear();const el=stage();if(!el)return;el.classList.remove('hero-attacks','monster-attacks','special-attack','impact-freeze','battle-shaking');const canvas=el.querySelector('#battle-effects'),ctx=canvas?.getContext('2d');if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height)}
 function stop(){window.BattleFilm?.stop();clearCombat();revealDialogue();finishIntro(false);stage()?.classList.add('is-paused')}
 function revealDialogue(){typingEpoch++;cancelAnimationFrame(typingFrame);typingFrame=0;const el=stage();if(!el)return;if(dialogueText)el.querySelector('[data-battle="caption"]').textContent=dialogueText;el.classList.remove('is-typing');el.querySelector('.battle-read-hint').textContent=''}
 function setDialogue(d={}){const el=ensure();if(!el)return;const key=JSON.stringify([d.key??'',d.question??'',d.answer??'',d.phase??'ready',d.ok??false,d.terminal??null]);if(key===dialogueKey)return;typingEpoch++;cancelAnimationFrame(typingFrame);typingFrame=0;dialogueKey=key;liveDialogue=d;const answered=d.phase==='answered'||d.phase==='done',terminal=d.terminal||null;let speaker='怪兽 · 发起挑战',text=String(d.question||'听清问题，选一句回答！'),translation=String(d.story?.context||d.context||'');if(answered){speaker=d.ok?'光之守护者 · 英语反击':'光之守护者 · 记住正确回答';text=String(d.answer||'');translation=(d.ok?'✓ 回答正确 · ':'正确意思 · ')+String(d.translation||'')}if(terminal){speaker=terminal==='won'?'光之守护者 · 守护成功':'怪兽 · 本次获胜';translation=(d.ok?'✓ 正确回应 · ':'正确回应 · ')+String(d.translation||'')+' '+String(d.story?.context||'记住正确回答，我们再一起出发！')}dialogueText=text;const letters=Array.from(text),p=el.querySelector('[data-battle="caption"]');p.setAttribute('aria-label',text);el.querySelector('.battle-dialogue').setAttribute('aria-label',`${speaker}。${text}。${translation}。点击显示全部`);el.querySelector('.battle-dialogue-name').textContent=speaker;el.querySelector('.battle-dialogue-translation').textContent=translation;el.querySelector('.battle-dialogue').classList.toggle('hero-speaking',answered&&terminal!=='lost');el.querySelector('.battle-dialogue').classList.toggle('dialogue-correction',answered&&!d.ok);el.classList.remove('is-paused');const story=d.story||{};el.querySelector('[data-battle="mission"]').textContent=story.mission||'任务 · 守护地球';el.querySelector('[data-battle="story-line"]').textContent=answered?(d.ok?story.heroLine:story.monsterLine)||'':story.monsterLine||story.heroLine||'';if(reduced()||!text){p.textContent=text;el.classList.remove('is-typing');el.querySelector('.battle-read-hint').textContent='';return}p.textContent='';el.classList.add('is-typing');el.querySelector('.battle-read-hint').textContent='点击展开';const epoch=typingEpoch,start=performance.now();const tick=now=>{if(epoch!==typingEpoch||el!==stage()||document.hidden)return;const count=Math.min(letters.length,1+Math.floor((now-start)/28));p.textContent=letters.slice(0,count).join('');if(count<letters.length)typingFrame=requestAnimationFrame(tick);else{typingFrame=0;el.classList.remove('is-typing');el.querySelector('.battle-read-hint').textContent=''}};typingFrame=requestAnimationFrame(tick)}
 function finishIntro(callFinish){introEpoch++;cancelAnimationFrame(introFrame);introFrame=0;const callback=intro?.onFinish;intro=null;const el=stage();if(el){el.classList.remove('intro-active');el.querySelector('.battle-intro').hidden=true}if(callFinish&&callback)callback()}
 function introStep(){const el=ensure();if(!el||!intro)return;intro.onStep?.(intro.index);introEpoch++;cancelAnimationFrame(introFrame);introFrame=0;const raw=intro.lines[intro.index],line=typeof raw==='string'?{text:raw}:raw||{},text=String(line.text||line.line||line.en||''),p=el.querySelector('.battle-intro-text');el.querySelector('.battle-intro-speaker').textContent=line.speaker||line.name||'城市通讯';p.setAttribute('aria-label',text);el.querySelector('.battle-intro-translation').textContent=line.translation||line.zh||'';el.querySelector('.battle-intro-progress').textContent=`${intro.index+1} / ${intro.lines.length}`;el.querySelector('.battle-intro-next').textContent=intro.index===intro.lines.length-1?'开始守护 →':'下一段 →';if(reduced()){p.textContent=text;return}p.textContent='';const letters=Array.from(text),epoch=introEpoch,start=performance.now();const tick=now=>{if(!intro||epoch!==introEpoch||document.hidden)return;const count=Math.min(letters.length,1+Math.floor((now-start)/28));p.textContent=letters.slice(0,count).join('');if(count<letters.length)introFrame=requestAnimationFrame(tick);else introFrame=0};introFrame=requestAnimationFrame(tick)}
 function advanceIntro(){if(!intro)return;if(introFrame){introEpoch++;cancelAnimationFrame(introFrame);introFrame=0;const raw=intro.lines[intro.index];stage().querySelector('.battle-intro-text').textContent=typeof raw==='string'?raw:raw?.text||raw?.line||raw?.en||'';return}if(intro.index<intro.lines.length-1){intro.index++;introStep()}else finishIntro(true)}
 function showIntro({lines=[],onFinish,onStep}={}){finishIntro(false);const el=ensure();if(!el)return;if(!lines.length){onFinish?.();return}intro={lines,index:0,onFinish,onStep};el.querySelector('.battle-intro').hidden=false;el.classList.add('intro-active');el.classList.remove('is-paused');introStep()}
 function animate(node,frames,options){if(!node?.animate||reduced())return null;const a=node.animate(frames,options);animations.add(a);a.finished.then(()=>animations.delete(a),()=>animations.delete(a));return a}
 // The action lives in the same bounded stage as the characters. HUD and
 // answer cards remain readable even when an effect reaches the edge of the city.
 function fighterGeometry(el,selector){
  const box=el.querySelector(selector),figure=box.querySelector('.battle-figure:not([hidden])'),r=(figure||box).getBoundingClientRect();
  // IMG object-fit leaves transparent layout space above a short figure. Atlas
  // monsters also have their own square box: strike the visible body, not its
  // much taller fighter wrapper (particularly on wide desktop stages).
  if(figure?.tagName==='IMG'&&figure.naturalWidth&&figure.naturalHeight){const scale=Math.min(r.width/figure.naturalWidth,r.height/figure.naturalHeight),width=figure.naturalWidth*scale,height=figure.naturalHeight*scale;return {left:r.left+(r.width-width)/2,top:r.bottom-height,width,height}}
  return r;
 }
 function actionGeometry(el,ok){
  const bounds=el.getBoundingClientRect(),hero=fighterGeometry(el,'.battle-hero'),monster=fighterGeometry(el,'.battle-monster'),a=ok?hero:monster,b=ok?monster:hero,chars=el.querySelector('.battle-characters').getBoundingClientRect(),hud=el.querySelector('.battle-hud').getBoundingClientRect(),dialogue=el.querySelector('.battle-dialogue').getBoundingClientRect();
  const top=Math.max(0,hud.bottom-bounds.top+4),sideBySide=dialogue.left>chars.right-12,bottom=Math.min(bounds.height,sideBySide?chars.bottom-bounds.top+12:dialogue.top-bounds.top-6);
  return {w:bounds.width,h:bounds.height,from:{x:a.left-bounds.left+a.width*(ok?.83:.36),y:a.top-bounds.top+a.height*(ok?.23:.49)},target:{x:b.left-bounds.left+b.width*.5,y:b.top-bounds.top+b.height*.49},ground:Math.min(bottom-6,chars.bottom-bounds.top-3),clip:{x:Math.max(0,chars.left-bounds.left),y:top,w:Math.min(bounds.width,chars.right-bounds.left),h:Math.max(0,bottom-top)}};
 }
 function canvasRun(el,ok,special,duration,geometry){
  if(reduced())return;
  const canvas=el.querySelector('#battle-effects'),ctx=canvas.getContext('2d');if(!ctx)return;
  const {w,h,from,target,ground,clip}=geometry,dpr=Math.min(window.devicePixelRatio||1,2);if(!w||!h||!clip.h)return;
  canvas.width=Math.ceil(w*dpr);canvas.height=Math.ceil(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  const impactAt=special?560:470,unit=Math.max(.55,Math.min(1.25,w/430)),color=ok?'119,235,255':'255,174,105',white=ok?'#efffff':'#fff5df',direction=ok?1:-1;
  const particles=Array.from({length:special?58:34},(_,i)=>({angle:i*2.399963,speed:(60+(i%9)*18)*unit,life:.23+(i%7)*.055,size:1+(i%3)*.65,delay:special?(i%3)*.028:0})),epoch=combatEpoch,start=performance.now();
  const halo=(x,y,r,alpha)=>{if(r<=0||alpha<=0)return;const gradient=ctx.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,`rgba(${color},${alpha})`);gradient.addColorStop(.28,`rgba(${color},${alpha*.38})`);gradient.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=gradient;ctx.fillRect(x-r,y-r,r*2,r*2)};
  const ring=(x,y,rx,ry,alpha,width=1.5)=>{if(alpha<=0)return;ctx.strokeStyle=`rgba(${color},${alpha})`;ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(x,y,Math.max(1,rx),Math.max(1,ry),0,0,Math.PI*2);ctx.stroke()};
  const tick=now=>{
   if(epoch!==combatEpoch||stage()!==el||document.hidden||el.classList.contains('is-paused')){combatFrame=0;return}
   const elapsed=now-start,t=elapsed/1000;ctx.clearRect(0,0,w,h);ctx.save();ctx.beginPath();ctx.rect(clip.x,clip.y,clip.w,clip.h);ctx.clip();
   // Small converging sparks, an illuminated floor and broken rotating arcs
   // establish where the power starts before the attack moves across the stage.
   const charge=Math.max(0,Math.min(1,elapsed/160))*Math.max(0,Math.min(1,(special?650:360)-elapsed)/180);
   if(charge>0){
    halo(from.x,from.y,(special?74:43)*unit,charge*.40);ring(from.x,ground,(26+charge*34)*unit,8*unit,charge*.45);
    for(let i=0;i<3;i++){const r=(17+i*9+charge*5)*unit;ctx.lineWidth=(i===0?2.5:1)*unit;ctx.strokeStyle=`rgba(${color},${charge*(.8-i*.16)})`;ctx.beginPath();ctx.ellipse(from.x,from.y,r,r*.8,i*.4,elapsed/180+i*2,elapsed/180+i*2+1.65);ctx.stroke()}
    for(let i=0;i<9;i++){const p=(elapsed/480+i/9)%1,angle=i*2.399963,r=(1-p)*64*unit;ctx.globalAlpha=Math.sin(p*Math.PI)*charge;ctx.fillStyle=white;ctx.fillRect(from.x+Math.cos(angle)*r,from.y+Math.sin(angle)*r*.7,2*unit,2*unit)}ctx.globalAlpha=1;
   }
   if(!special&&elapsed>250&&elapsed<impactAt+50){
    const progress=Math.min(1,(elapsed-250)/(impactAt-250)),x=from.x+(target.x-from.x)*progress,y=from.y+(target.y-from.y)*progress;
    const trail=ctx.createLinearGradient(from.x,from.y,x,y);trail.addColorStop(0,`rgba(${color},0)`);trail.addColorStop(.65,`rgba(${color},.25)`);trail.addColorStop(1,`rgba(${color},.9)`);ctx.strokeStyle=trail;ctx.lineWidth=9*unit;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(from.x,from.y+10*unit);ctx.quadraticCurveTo((from.x+x)/2,from.y-25*unit,x,y);ctx.stroke();ctx.strokeStyle=white;ctx.lineWidth=2.5*unit;ctx.stroke();halo(x,y,22*unit,.65);
   }
   // A broad translucent envelope, a narrow bright core and moving ellipses
   // keep the beam dimensional without replacing the whole screen with a flash.
   if(special&&elapsed>=350&&elapsed<1300){
    const strength=Math.min(1,(elapsed-350)/160)*Math.min(1,(1300-elapsed)/240),reach=Math.min(1,(elapsed-350)/210),x=from.x+(target.x-from.x)*reach,y=from.y+(target.y-from.y)*reach;
    ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=strength;
    for(const [width,alpha]of [[37,.10],[22,.22],[10,.65],[3.5,1]]){ctx.lineWidth=width*unit;ctx.strokeStyle=alpha===1?white:`rgba(${color},${alpha})`;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(x,y);ctx.stroke()}
    halo(from.x,from.y,52*unit,.55);halo(x,y,68*unit,.45);
    for(let i=0;i<5;i++){const p=(t*1.5+i*.2)%1;ring(from.x+(x-from.x)*p,from.y+(y-from.y)*p,(4+p*7)*unit,(10+p*11)*unit,(1-p)*.65,1.4)}
    ring((from.x+x)/2,ground,Math.abs(x-from.x)*.54,13*unit,.24);ctx.restore();
   }
   const age=(elapsed-impactAt)/1000;
   if(age>=0){
    const burst=Math.max(0,1-age/.22);halo(target.x,target.y,(38+age*140)*unit,burst*.72);
    for(let i=0;i<2;i++){const p=(age-i*.065)/.46;if(p>=0&&p<=1){ring(target.x,target.y,(11+p*74)*unit,(9+p*56)*unit,(1-p)*.8,2.8-p*1.8);ring(target.x,ground,(18+p*95)*unit,(4+p*19)*unit,(1-p)*.45,1.5)}}
    if(age<.23){const power=1-age/.23;ctx.save();ctx.translate(target.x,target.y);ctx.rotate(direction*.35);ctx.strokeStyle=white;ctx.lineWidth=3*unit*power;for(let i=0;i<5;i++){ctx.rotate(Math.PI*2/5);ctx.beginPath();ctx.moveTo(7*unit,0);ctx.lineTo((21+power*25)*unit,0);ctx.stroke()}ctx.restore()}
    for(const p of particles){const pt=age-p.delay;if(pt<0||pt>p.life)continue;const alpha=(1-pt/p.life)**1.4,x=target.x+Math.cos(p.angle)*p.speed*pt,y=target.y+Math.sin(p.angle)*p.speed*pt+100*unit*pt*pt;ctx.globalAlpha=alpha;ctx.strokeStyle=p.size>1.5?white:`rgb(${color})`;ctx.lineWidth=p.size*unit;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(p.angle)*6*unit,y-Math.sin(p.angle)*6*unit);ctx.stroke()}ctx.globalAlpha=1;
    // Dust skims the floor in perspective; it does not float with the defender.
    if(age<.6)for(let i=0;i<7;i++){const p=age/.6,dx=(i-3)*(10+45*p)*unit;halo(target.x+dx,ground-2-Math.sin(p*Math.PI)*(i%3+1)*4*unit,(7+p*10)*unit,(1-p)*.11)}
   }
   ctx.restore();
   if(elapsed<duration)combatFrame=requestAnimationFrame(tick);else{combatFrame=0;ctx.clearRect(0,0,w,h)}
  };combatFrame=requestAnimationFrame(tick);
 }
 function hit(ok,stats){
  clearCombat();render(stats);const el=ensure();if(!el)return;
  // Durations and impact cues match training.js / BattleAudio. This layer never
  // awards points and never invokes answer(), next() or any persistence write.
  const s=clean(stats),special=ok&&s.streak>0&&s.streak%5===0,duration=special?1750:1150,impactAt=special?560:470,epoch=combatEpoch,geometry=actionGeometry(el,ok);
  el.classList.add(ok?'hero-attacks':'monster-attacks');if(special)el.classList.add('special-attack');
  const attackerBox=el.querySelector(ok?'.battle-hero':'.battle-monster'),defenderBox=el.querySelector(ok?'.battle-monster':'.battle-hero'),attacker=attackerBox.querySelector('.battle-mover'),defender=defenderBox.querySelector('.battle-mover'),ar=attacker.getBoundingClientRect(),dr=defender.getBoundingClientRect(),direction=ok?1:-1,travel=Math.max(20,Math.min(Math.abs((dr.left+dr.width*.5)-(ar.left+ar.width*.5))*.56,geometry.w*.29))*direction,impact=impactAt/duration;
  const attackFrames=special?[
   {transform:'translate3d(0,0,0) scale(1)',offset:0},
   {transform:'translate3d(-5px,5px,0) scale(.985,.96)',offset:.13},
   {transform:'translate3d(6px,-3px,0) scale(1.02,1.035)',offset:.29},
   {transform:'translate3d(4px,-2px,0) scale(1.02,1.025)',offset:.70},
   {transform:'translate3d(0,0,0) scale(1)',offset:1}
  ]:[
   {transform:'translate3d(0,0,0) rotate(0deg) scale(1)',offset:0},
   {transform:`translate3d(${-direction*9}px,5px,0) rotate(${-direction*5}deg) scale(1.025,.96)`,offset:.19},
   {transform:`translate3d(${travel*.25}px,-3px,0) rotate(${direction*3}deg) scale(.98,1.025)`,offset:.30},
   {transform:`translate3d(${travel}px,-6px,0) rotate(${direction*8}deg) scale(1.035,.99)`,offset:impact},
   {transform:`translate3d(${travel*.97}px,-5px,0) rotate(${direction*8}deg) scale(1.035,.99)`,offset:impact+.06},
   {transform:`translate3d(${travel*.77}px,2px,0) rotate(${direction*3}deg) scale(1.02,.98)`,offset:.66},
   {transform:'translate3d(0,0,0) rotate(0deg) scale(1)',offset:1}
  ];
  animate(attacker,attackFrames,{duration,easing:'cubic-bezier(.22,.65,.28,1)'});
  animate(defender,[
   {transform:'translate3d(0,0,0) rotate(0deg) scale(1)',offset:0},
   {transform:'translate3d(0,0,0) rotate(0deg) scale(1)',offset:impact},
   {transform:`translate3d(${direction*5}px,1px,0) rotate(${direction*4}deg) scale(.96,1.015)`,offset:impact+.035},
   {transform:`translate3d(${direction*22}px,-4px,0) rotate(${direction*11}deg) scale(1.02,.985)`,offset:impact+.13},
   {transform:`translate3d(${direction*13}px,3px,0) rotate(${direction*5}deg) scale(1.03,.96)`,offset:.77},
   {transform:`translate3d(${-direction*3}px,0,0) rotate(${-direction*2}deg) scale(1)`,offset:.89},
   {transform:'translate3d(0,0,0) rotate(0deg) scale(1)',offset:1}
  ],{duration,easing:'cubic-bezier(.15,.65,.3,1)'});
  const figure=defender.querySelector('.battle-figure:not([hidden])');
  animate(figure,[{filter:'brightness(1)',offset:0},{filter:'brightness(1)',offset:impact},{filter:'brightness(1.65) drop-shadow(0 0 5px #d8ffff)',offset:impact+.035},{filter:'brightness(1.12)',offset:impact+.12},{filter:'brightness(1)',offset:1}],{duration,easing:'linear'});
  // Contact shadows remain on the floor while the character rises and recoils.
  animate(attackerBox.querySelector('.battle-ground-shadow'),[{transform:'translateX(0) scaleX(1)',opacity:.85,offset:0},{transform:`translateX(${special?0:travel}px) scaleX(.82)`,opacity:.5,offset:impact},{transform:'translateX(0) scaleX(1)',opacity:.85,offset:1}],{duration,easing:'ease-in-out'});
  animate(defenderBox.querySelector('.battle-ground-shadow'),[{transform:'translateX(0) scaleX(1)',offset:0},{transform:'translateX(0) scaleX(1)',offset:impact},{transform:`translateX(${direction*15}px) scaleX(1.18)`,offset:impact+.13},{transform:'translateX(0) scaleX(1)',offset:1}],{duration,easing:'ease-out'});
  el.style.setProperty('--battle-hit-x',`${geometry.target.x}px`);el.style.setProperty('--battle-hit-y',`${geometry.target.y}px`);
  const word=el.querySelector('.battle-impact-word');word.textContent=special?'光之力量！':ok?'命中！':'守住防线！';word.style.left=`${Math.max(55,Math.min(geometry.w-55,geometry.target.x))}px`;word.style.top=`${Math.max(geometry.clip.y+20,geometry.target.y-20)}px`;
  schedule(()=>{if(epoch!==combatEpoch)return;el.classList.add('impact-freeze','battle-shaking')},impactAt);
  schedule(()=>{if(epoch===combatEpoch)el.classList.remove('impact-freeze','battle-shaking')},impactAt+190);
  canvasRun(el,ok,special,duration,geometry);
  schedule(()=>{if(epoch!==combatEpoch)return;clearCombat();render(stats)},duration);
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});window.addEventListener('pagehide',stop);
 window.DialogueBattle={markup,render,hit,stop,setDialogue,revealDialogue,showIntro,get state(){return {typing:!!typingFrame,animating:!!combatFrame,intro:!!intro,dialogueText,stats:{...lastStats}}}};
})();
