/* Original primary-school word shooter. No third-party game code or sprites.
 * The host owns questions, persistence, rewards and the adventure lifecycle.
 * Runtime movement and particles are deliberately not permanent progress. */
(() => {
 'use strict';
 const W=1000,H=700,TAU=Math.PI*2,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const upgradeInfo={
  heal:{name:'补给药箱',icon:'✚',copy:'恢复 2 格生命，最多 10 格。'},
  boots:{name:'疾风靴',icon:'➤',copy:'走得更快，寻找舒服的射击位置。'},
  prism:{name:'棱镜弹',icon:'✧',copy:'词义弹变成双束光，命中更闪亮。'},
  shield:{name:'守护盾',icon:'⬡',copy:'每个新房间抵挡一次反击；错题照常记录。'}
 };
 const roomNames=['晨光研究所','森林观测站','海岛能源舱','月光图书馆','极光修复站'];
 const roomStories=['词语被淘气的小怪藏起来了。选中文弹药，瞄准英文小怪，找回知识晶石。','穿过房门，新的词语正在等你。移动避开工作台，听清英语，再找对应的意思。','这些小怪只是在闹着玩。用正确的词义为它们充能，继续探索新的房间。'];
 let host=null,root=null,hooks={},a=null,q=null,pool=[],canvas=null,ctx=null,observer=null,raf=0,lastFrame=0,paused=false,disposed=true,epoch=0;
 let width=1,height=1,scale=1,offsetX=0,offsetY=0,hero={x:250,y:520},enemies=[],obstacles=[],particles=[],bolts=[],targetPath=[],keys=new Set(),aim=-1,choice='',pendingShot=null,shot=null,shownKey='',questionKey='',busy=false,joy={x:0,y:0,id:null},walk=0,shake=0,hitGlow=0;
 let images={},imageEpoch=0,aborts=null;
 const el=name=>root?.querySelector(`[data-ws="${name}"]`);
 const room=()=>Number(a?.level||a?.shooter?.level||1);
 const runKey=value=>value?`${value.id}:${value.level||value.shooter?.level||1}:${value.index}`:'';
 const asset=path=>`${hooks.assetBase||''}${path}`;
 const expected=()=>q?.expected??q?.zh;
 const isReady=()=>a?.phase==='ready'&&!paused&&!busy&&health(a?.shooter)>0;
 const live=()=>hooks.getActive?.()||a;
 const reduce=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const finite=(value,fallback)=>Number.isFinite(value)?value:fallback;

 function fresh(){return {version:1,level:1,health:10,streak:0,loadout:{boots:0,prism:0,shield:0},shieldCharge:0,lastHitIndex:-1,lastChestLevel:0,pendingChest:0,ended:false,lastAnswerShielded:false}}
 function health(state){return clamp(finite(state?.health,10),0,10)}
 function recordAnswer(state,index,ok){
  if(!state||!Number.isSafeInteger(index)||index<0||index<=state.lastHitIndex||state.ended)return {applied:false,health:health(state),shielded:false,damage:0};
  const shielded=!ok&&state.shieldCharge>0;
  if(shielded)state.shieldCharge--;
  const damage=ok||shielded?0:1;
  state.health=clamp(health(state)-damage,0,10);state.streak=ok?(state.streak||0)+1:0;
  state.lastHitIndex=index;state.lastAnswerShielded=shielded;state.ended=state.health===0;
  return {applied:true,health:state.health,shielded,damage};
 }
 function enterRoom(state,level){if(!state||!Number.isSafeInteger(level)||level<1)return false;state.level=level;state.pendingChest=0;state.shieldCharge=state.loadout?.shield>0?1:0;return true}
 function grantUpgrade(state,level,key){
  if(!state||!upgradeInfo[key]||!Number.isSafeInteger(level)||level<1||state.ended||state.lastChestLevel>=level||state.pendingChest!==level)return false;
  state.loadout??={boots:0,prism:0,shield:0};
  if(key==='heal')state.health=Math.min(10,health(state)+2);else state.loadout[key]=Math.min(3,(state.loadout[key]||0)+1);
  state.lastChestLevel=level;state.pendingChest=0;return true;
 }

 function markup(){return `<section class="word-shooter" aria-label="单词守卫：移动、装填词义、瞄准射击">
  <header class="ws-hud"><div class="ws-brand"><small>WORD GUARDIANS</small><strong data-ws="title">单词守卫</strong></div><div class="ws-health"><span>生命 <b data-ws="health-number">10 / 10</b></span><div data-ws="health" role="progressbar" aria-label="本次探索生命" aria-valuemin="0" aria-valuemax="10"><i></i></div></div><button type="button" class="ws-quiet" data-ws="pause">暂停</button><button type="button" class="ws-quiet" data-ws="leave">返回</button></header>
  <section class="ws-arena" data-ws="arena" aria-label="房间战场。点空地移动；点击英文小怪瞄准。键盘 W A S D 或方向键移动。" tabindex="0">
   <canvas data-ws="canvas" aria-hidden="true"></canvas><div class="ws-room-tag"><span data-ws="room-name"></span><small data-ws="count"></small></div><div class="ws-mission"><span>本次目标</span><strong data-ws="target-word"></strong></div><div class="ws-enemies" data-ws="enemies"></div><div class="ws-impact-title" data-ws="impact" aria-hidden="true"></div><div class="ws-joystick" data-ws="joystick" role="application" aria-label="按住这里拖动，移动守卫"><span></span><i data-ws="stick">✧</i></div><div class="ws-move-help">点地面移动 · 点小怪瞄准</div><div class="ws-pause-overlay" data-ws="paused" hidden><strong>探索已暂停</strong><p>题目、生命和奖励都保留。</p><button type="button" class="ws-primary" data-ws="resume">继续探索 →</button></div>
  </section>
  <section class="ws-deck" aria-label="词义弹药和答案反馈"><div class="ws-deck-top"><div><strong>装填词义弹</strong><small data-ws="tip">选中文意思，再射击英文目标</small></div><button type="button" class="ws-hear" data-ws="hear">♫ 听单词</button></div><div class="ws-ammo" data-ws="ammo" role="group" aria-label="中文弹药"></div><div class="ws-feedback" data-ws="feedback" role="status" aria-live="polite"></div><div class="ws-actions"><button type="button" class="ws-primary ws-fire" data-ws="fire" disabled><span>✧</span> 装填后发射</button><button type="button" class="ws-primary" data-ws="next" hidden>下一题 →</button><button type="button" class="ws-finish" data-ws="finish">结束并结算</button></div><div class="ws-loadout" data-ws="loadout"></div></section>
  <section class="ws-chest-overlay" data-ws="chest" hidden aria-label="房间补给宝箱"><div class="ws-chest-panel"><div class="ws-chest-illustration" aria-hidden="true"><span>✦</span></div><small>房间已探索完成</small><h2 data-ws="chest-title">补给宝箱</h2><p data-ws="chest-copy">选择一件装备，带去下一间房。</p><div class="ws-upgrades" data-ws="upgrade-list"></div><button type="button" class="ws-primary" data-ws="chest-next" disabled>选好装备再出发 →</button><button type="button" class="ws-finish" data-ws="chest-finish">结束探索并结算</button></div></section>
 </section>`}

 function on(node,type,handler){node?.addEventListener(type,handler,{signal:aborts.signal})}
 function mount(options={}){
  if(!options.host)return false;
  if(host===options.host&&!disposed){hooks={...hooks,...options};sync(options.active,options.wordPool);return true}
  unmount();hooks=options;host=options.host;host.innerHTML=markup();root=host.querySelector('.word-shooter');canvas=el('canvas');ctx=canvas.getContext('2d');aborts=new AbortController();disposed=false;epoch++;images={};
  on(el('fire'),'click',fire);on(el('next'),'click',next);on(el('leave'),'click',()=>{pause();hooks.onLeave?.()});on(el('finish'),'click',finish);on(el('chest-finish'),'click',finish);on(el('chest-next'),'click',next);on(el('hear'),'click',()=>{hooks.onHear?.(q?.en,q)});on(el('pause'),'click',()=>setPaused(!paused));on(el('resume'),'click',()=>setPaused(false));
  on(canvas,'pointerdown',event=>{if(event.button!==undefined&&event.button!==0||!isReady())return;event.preventDefault();const point=worldPoint(event);moveTo(point.x,point.y)});
  on(el('joystick'),'pointerdown',event=>{if(!isReady())return;event.preventDefault();joy.id=event.pointerId;try{event.currentTarget.setPointerCapture(event.pointerId)}catch{}stick(event)});
  on(el('joystick'),'pointermove',event=>{if(joy.id===event.pointerId){event.preventDefault();stick(event)}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])on(el('joystick'),type,event=>{if(joy.id===event.pointerId)clearStick()});
  on(window,'keydown',event=>{if(!root||disposed||!root.getClientRects().length||event.target.closest?.('input,textarea,select,[contenteditable]'))return;const key=event.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)&&isReady()){event.preventDefault();keys.add(key);targetPath=[]}if(key===' '&&event.target===canvas){event.preventDefault();fire()}});
  on(window,'keyup',event=>keys.delete(event.key.toLowerCase()));on(window,'blur',()=>{keys.clear();clearStick();if(!disposed)setPaused(true)});on(document,'visibilitychange',()=>{if(document.hidden)setPaused(true)});on(window,'pagehide',pause);
  observer=window.ResizeObserver?new ResizeObserver(fit):null;observer?.observe(el('arena'));on(window,'resize',fit);
  loadImage('room','assets/shooter-art/room-v1.png');loadImage('sprites','assets/shooter-art/sprites-v1.png');
  fit();sync(options.active,options.wordPool);return true;
 }
 function loadImage(key,path){const token=imageEpoch;const picture=new Image();picture.onload=()=>{if(!disposed&&token===imageEpoch){images[key]=picture;draw(performance.now())}};picture.onerror=()=>{};picture.src=asset(path)}
 function unmount(){disposed=true;epoch++;imageEpoch++;cancelAnimationFrame(raf);raf=0;aborts?.abort();aborts=null;observer?.disconnect();observer=null;clearStick();keys.clear();particles=[];bolts=[];shot=null;pendingShot=null;enemies=[];targetPath=[];if(host)host.replaceChildren();host=root=canvas=ctx=a=q=null;questionKey=shownKey='';busy=false;paused=false;images={}}
 function pause(){if(disposed)return;paused=true;cancelAnimationFrame(raf);raf=0;keys.clear();clearStick();if(el('paused'))el('paused').hidden=false;updateControls()}
 function setPaused(value){if(disposed)return;paused=!!value;if(el('paused'))el('paused').hidden=!paused;el('pause').textContent=paused?'继续':'暂停';keys.clear();clearStick();updateControls();if(paused){cancelAnimationFrame(raf);raf=0}else startLoop()}

 function normalizePool(list){return (list||[]).map(item=>Array.isArray(item)?{en:String(item[0]),zh:String(item[1])}:{en:String(item.en||''),zh:String(item.zh||'')}).filter(item=>item.en&&item.zh)}
 function sync(active,wordPool){
  if(disposed||!root||!active)return false;
  const previousKey=questionKey,previousPhase=a?.phase; a=active;q=(a.queue||a.items||[])[a.index];if(!q&&a.phase!=='done')return false;if(wordPool)pool=normalizePool(wordPool);
  questionKey=runKey(a);const changed=previousKey!==questionKey;
  if(changed){epoch++;particles=[];bolts=[];shot=null;busy=false;targetPath=[];choice='';aim=-1;questionLayout();shownKey='';el('impact').textContent='';root.classList.remove('ws-firing');}
  if(a.phase==='ready'){busy=false;if(!changed&&previousPhase==='ready')choice=q?.options?.includes(choice)?choice:'';else if(!changed)choice='';}
  paused=document.hidden;el('paused').hidden=!paused;el('pause').textContent=paused?'继续':'暂停';root.classList.toggle('ws-reviewed',a.phase!=='ready');root.classList.toggle('ws-ended',a.phase==='done');root.style.setProperty('--ws-accent',['#95ecb5','#89deff','#ffd985','#b9acff','#82f1db'][(room()-1)%5]);
  el('title').textContent=`单词守卫 · 第 ${room()} 关`;el('room-name').textContent=roomNames[(room()-1)%roomNames.length];el('count').textContent=a.phase==='done'?'本次探索结束':`第 ${a.index+1} / 10 题`;const listening=a.mode==='listening'&&a.phase==='ready';root.classList.toggle('ws-listening',listening);el('target-word').textContent=listening?'听单词，找英文小怪':q?.en||'探索结束';el('target-word').setAttribute('aria-label',listening?'听英语，再寻找对应英文小怪':`需要配对的英文：${q?.en||''}`);
  const hp=health(a.shooter);el('health-number').textContent=`${hp} / 10`;el('health').setAttribute('aria-valuenow',String(hp));el('health').querySelector('i').style.width=`${hp*10}%`;root.classList.toggle('ws-low-health',hp<=3);
  renderAmmo();renderFeedback();renderLoadout();updateControls();
  if(a.phase==='between'&&a.shooter?.pendingChest&&health(a.shooter)>0&&!pendingShot&&!shot&&!busy)showChest();else el('chest').hidden=true;
  if(a.phase!=='ready'&&a.phase!=='done'&&pendingShot?.key===questionKey&&shownKey!==questionKey){const planned=pendingShot;pendingShot=null;shownKey=questionKey;beginAttack(planned)}else if(a.phase==='done'&&pendingShot?.key===questionKey&&shownKey!==questionKey){const planned=pendingShot;pendingShot=null;shownKey=questionKey;beginAttack(planned)}
  fit();startLoop();return true;
 }
 function renderAmmo(){
  const box=el('ammo');box.replaceChildren();if(!q)return;
  (q.options||q.choices||[]).forEach((value,index)=>{const text=typeof value==='string'?value:String(value.label||value.zh||value.text||'');const button=document.createElement('button');button.type='button';button.className='ws-ammo-chip';button.dataset.index=String(index);button.innerHTML='<i aria-hidden="true">✧</i><span></span>';button.querySelector('span').textContent=text;button.disabled=a.phase!=='ready';button.setAttribute('aria-pressed',String(choice===text));button.classList.toggle('selected',choice===text);if(a.phase!=='ready'){button.classList.toggle('correct',text===expected());button.classList.toggle('incorrect',text===a.submitted&&!a.ok)}button.onclick=()=>pick(text);box.append(button)});
 }
 function renderFeedback(){
  const feedback=el('feedback');feedback.replaceChildren();const small=document.createElement('small'),strong=document.createElement('strong');
  if(a.phase==='done'){strong.textContent=health(a.shooter)===0?'能量用完了，整装再出发！':'探索收获已保存';small.textContent=`累计答对 ${a.correctTotal??a.correct??0} · 答错 ${a.wrongTotal??0} · 水滴 ${a.water??a.correctTotal??0} · 太阳 ${a.suns??0}`;feedback.append(strong,small);return}
  if(a.phase!=='ready'){const submittedTarget=a.shooter?.targetSubmitted||a.targetSubmitted||q?.en;small.textContent=`${a.ok?'✓ 配对成功':'✗ 这题已锁定'} · 你的弹药：${a.submitted||'未选择'}${submittedTarget&&submittedTarget!==q?.en?`；目标：${submittedTarget}`:''}`;strong.textContent=`正确配对：${q?.en} = ${q?.zh}`;feedback.append(small,strong);if(a.shooter?.lastAnswerShielded){const shield=document.createElement('small');shield.textContent='护盾挡住了反击；错题仍保留，记住正确词义。';feedback.append(shield)}return}
  small.textContent=choice?`已装填「${choice}」${aim>=0?` · 瞄准 ${enemies[aim]?.en}`:' · 点击英文小怪瞄准'}`:roomStories[(room()-1)%roomStories.length];feedback.append(small);
 }
 function renderLoadout(){const out=el('loadout');out.replaceChildren();for(const [key,value]of Object.entries(a?.shooter?.loadout||{})){if(!value||!upgradeInfo[key])continue;const badge=document.createElement('span');badge.textContent=`${upgradeInfo[key].icon} ${upgradeInfo[key].name}${value>1?' ×'+value:''}`;out.append(badge)}out.hidden=!out.childElementCount}
 function updateControls(){if(!a||!root)return;const answered=a.phase!=='ready',ready=isReady();el('fire').hidden=answered;el('next').hidden=!answered;el('next').disabled=busy;el('fire').disabled=!ready||!choice;el('fire').innerHTML=`<span>✧</span> ${choice?'发射词义弹':'装填后发射'}`;el('next').textContent=a.phase==='done'?'查看收获，返回地图 →':a.phase==='between'||a.index===9?'开启宝箱，进入下一关 →':'下一题 →';el('tip').textContent=answered?'首答已锁定，先记住正确答案':aim<0?'选中文弹药，再瞄准英文小怪':`已瞄准 ${enemies[aim]?.en||''}`;for(const button of el('ammo').querySelectorAll('button'))button.disabled=!ready;for(const button of el('enemies').querySelectorAll('button'))button.disabled=!ready;el('joystick').classList.toggle('ws-disabled',!ready);el('pause').disabled=a.phase==='done';el('hear').disabled=busy||a.phase==='done';el('finish').disabled=busy;}
 function pick(value){if(!isReady()||!(q.options||q.choices||[]).includes(value))return false;choice=value;for(const button of el('ammo').children){const selected=button.querySelector('span').textContent===choice;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected))}renderFeedback();updateControls();return true}
 function selectEnemy(index,shootIfReady=true){if(!isReady()||!enemies[index])return false;aim=index;renderFeedback();updateControls();if(choice&&shootIfReady)fire();return true}
 function fire(){
  if(!isReady()||!q)return false;if(!choice){el('feedback').textContent='先选择下面的中文弹药，再瞄准英文小怪。';return false}
  if(aim<0)aim=enemies.findIndex(enemy=>enemy.en===q.en);const enemy=enemies[aim];if(!enemy)return false;
  if(!lineClear(hero,enemy)){const point=firingPosition(enemy);if(point){moveTo(point.x,point.y);el('feedback').textContent='工作台挡住了弹道，守卫正在绕过去。到位后再次发射。'}else el('feedback').textContent='弹道被工作台挡住了，请点空地移动，再试着发射。';return false}
  const planned={key:questionKey,target:aim,targetWord:enemy.en,from:{x:hero.x,y:hero.y-25},to:{x:enemy.x,y:enemy.y-25},choice};pendingShot=planned;busy=true;updateControls();
  let result;try{result=hooks.onAnswer?.(choice,{targetWord:enemy.en,targetCorrect:enemy.en===q.en,choiceIndex:(q.options||[]).indexOf(choice)})}catch{result=false}
  const latest=live();if(latest?.phase==='ready'||!latest||runKey(latest)!==planned.key){pendingShot=null;busy=false;el('feedback').textContent='这次答案未能保存，请再试一次。';updateControls();return false}
  if(pendingShot)sync(latest);return result;
 }
 function next(){if(!a||busy||a.phase==='ready')return false;if(a.phase==='done'){hooks.onNext?.();return true}if(!beforeNext(a))return false;hideChest();hooks.onNext?.();return true}
 function beforeNext(active=a){if(!active)return false;const state=active.shooter,level=active.level||state?.level||1;if(active.phase!=='done'&&(active.phase==='between'||active.index===9)&&health(state)>0&&state?.lastChestLevel<level){showChest();return false}return true}
 function finish(){if(busy)return;pause();hooks.onFinish?.()}
 function hideChest(){if(el('chest'))el('chest').hidden=true}
 function showChest(){if(!a||!root||health(a.shooter)===0)return;el('chest').hidden=false;const level=room(),chosen=a.shooter?.lastChestLevel>=level;el('chest-title').textContent=`第 ${level} 关 · 补给宝箱`;const correct=a.roomCorrect??Math.max(0,(a.index+1)-(a.roomWrong||0));el('chest-copy').textContent=chosen?'装备已经保存，出发探索下一间房！':`本关答对 ${correct}/10。选择一件补给，生命将延续到下一关。`;const list=el('upgrade-list');list.replaceChildren();for(const [key,info]of Object.entries(upgradeInfo)){const button=document.createElement('button');button.type='button';button.className='ws-upgrade';button.disabled=chosen||busy;const icon=document.createElement('i'),title=document.createElement('strong'),copy=document.createElement('small');icon.textContent=info.icon;title.textContent=info.name;copy.textContent=info.copy;button.append(icon,title,copy);button.onclick=()=>{if(busy||a.shooter?.lastChestLevel>=level)return;let result=false;try{result=hooks.onUpgrade?.(key,level)!==false}catch{}const latest=live();if(result&&latest?.shooter?.lastChestLevel>=level){sync(latest);showChest();const selected=[...el('upgrade-list').children].find(node=>node.querySelector('strong').textContent===info.name);selected?.classList.add('chosen')}else el('chest-copy').textContent='装备未能保存，请再选择一次。'};list.append(button)}el('chest-next').disabled=!chosen;}

 function questionLayout(){
  const variant=(room()-1)%3;obstacles=variant===0?[{x:230,y:280,w:140,h:94},{x:720,y:250,w:150,h:90},{x:500,y:430,w:125,h:72}]:variant===1?[{x:260,y:330,w:120,h:90},{x:720,y:390,w:120,h:90},{x:500,y:215,w:150,h:78}]:[{x:230,y:250,w:130,h:86},{x:730,y:265,w:130,h:86},{x:490,y:460,w:155,h:70}];
  if(!fits(hero.x,hero.y,20))hero={x:240,y:530};
  const available=pool.filter(word=>word.en.toLowerCase()!==q?.en?.toLowerCase()),others=[];const used=new Set();for(let n=0;n<available.length&&others.length<2;n++){const word=available[(n+(a.index*7+room()*3))%available.length];if(!used.has(word.en.toLowerCase())){used.add(word.en.toLowerCase());others.push(word)}}
  if(others.length<2)for(const item of (a.queue||a.items||[])){if(item.en!==q.en&&!used.has(item.en)){used.add(item.en);others.push(item);if(others.length===2)break}}
  const targets=Array.isArray(q?.targets)?q.targets.map(value=>typeof value==='string'?value:String(value.en||'')).filter(Boolean):null;
  const words=targets?.length?targets.map(en=>({en,zh:pool.find(word=>word.en===en)?.zh||(en===q.en?q.zh:'')})):[{en:q?.en||'word',zh:q?.zh||''},...others.slice(0,2)],positions=[{x:510,y:305},{x:370,y:545},{x:790,y:510}];enemies=words.slice(0,3).map((word,index)=>({...word,...positions[index],seed:index*2.1+a.index*.7,heading:index*1.8+1,speed:12+Math.min(18,(room()-1)*2),hit:0,dead:false}));
  // Rotate positions so the English target does not always occupy the same spot.
  const rotation=(a.index+room()-1)%3;for(let i=0;i<enemies.length;i++)Object.assign(enemies[i],positions[(i+rotation)%3]);
  const nodes=el('enemies');nodes.replaceChildren();enemies.forEach((enemy,index)=>{const button=document.createElement('button');button.type='button';button.className='ws-enemy';button.dataset.enemy=String(index);button.setAttribute('aria-label',`瞄准英文小怪 ${enemy.en}`);const word=document.createElement('span');word.textContent=enemy.en;button.append(word);const aimMark=document.createElement('i');aimMark.textContent='⌖';aimMark.setAttribute('aria-hidden','true');button.append(aimMark);button.onclick=()=>selectEnemy(index);nodes.append(button)});
 }
 function fit(){if(!canvas||!root)return;const box=el('arena').getBoundingClientRect();if(!box.width||!box.height)return;width=box.width;height=box.height;const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;ctx.setTransform(dpr,0,0,dpr,0,0);scale=Math.min(width/W,height/H);offsetX=(width-W*scale)/2;offsetY=(height-H*scale)/2;draw(performance.now());positionEnemyButtons()}
 function worldPoint(event){const box=canvas.getBoundingClientRect();return {x:clamp((event.clientX-box.left-offsetX)/scale,100,900),y:clamp((event.clientY-box.top-offsetY)/scale,160,605)}}
 function fits(x,y,radius=22){return x>=105+radius&&x<=895-radius&&y>=160+radius&&y<=610-radius&&!obstacles.some(o=>x+radius>o.x-o.w/2&&x-radius<o.x+o.w/2&&y+radius>o.y-o.h/2&&y-radius<o.y+o.h/2)}
 function lineClear(from,to){const length=Math.hypot(to.x-from.x,to.y-from.y),steps=Math.ceil(length/12);for(let i=1;i<steps;i++){const p=i/steps,x=from.x+(to.x-from.x)*p,y=from.y+(to.y-from.y)*p;if(obstacles.some(o=>x>o.x-o.w/2-6&&x<o.x+o.w/2+6&&y>o.y-o.h/2-6&&y<o.y+o.h/2+6))return false}return true}
 function firingPosition(enemy){let best=null,distance=Infinity;for(let degrees=0;degrees<360;degrees+=30){const angle=degrees/180*Math.PI;for(const reach of [160,240]){const point={x:enemy.x+Math.cos(angle)*reach,y:enemy.y+Math.sin(angle)*reach};const dist=Math.hypot(point.x-hero.x,point.y-hero.y);if(dist<distance&&fits(point.x,point.y,22)&&lineClear(point,enemy)){distance=dist;best=point}}}return best}
 function moveTo(x,y){if(!isReady())return false;targetPath=findPath(hero,{x,y});keys.clear();return !!targetPath.length}
 function findPath(from,to){
  const step=35,cols=24,rows=13,toCell=p=>({x:clamp(Math.round((p.x-110)/step),0,cols-1),y:clamp(Math.round((p.y-170)/step),0,rows-1)}),point=c=>({x:110+c.x*step,y:170+c.y*step}),start=toCell(from),target=toCell(to),key=c=>c.x+','+c.y;
  if(fits(to.x,to.y,22)&&lineClear(from,to))return [to];
  const open=[start],visited=new Set([key(start)]),previous=new Map();let nearest=start,nearestDistance=Infinity,found=null;
  while(open.length){const c=open.shift(),p=point(c),dist=Math.hypot(p.x-to.x,p.y-to.y);if(dist<nearestDistance&&fits(p.x,p.y,22)){nearest=c;nearestDistance=dist}if(c.x===target.x&&c.y===target.y&&fits(p.x,p.y,22)){found=c;break}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const n={x:c.x+dx,y:c.y+dy},np=point(n);if(n.x<0||n.y<0||n.x>=cols||n.y>=rows||visited.has(key(n))||!fits(np.x,np.y,22))continue;visited.add(key(n));previous.set(key(n),c);open.push(n)}}
  found??=nearest;const path=[];let cursor=found;while(key(cursor)!==key(start)&&path.length<400){path.unshift(point(cursor));cursor=previous.get(key(cursor));if(!cursor)break}if(path.length&&fits(to.x,to.y,22)&&lineClear(path.at(-1),to))path.push(to);return path;
 }
 function stick(event){const box=el('joystick').getBoundingClientRect(),dx=event.clientX-box.left-box.width/2,dy=event.clientY-box.top-box.height/2,length=Math.hypot(dx,dy),max=box.width*.31;joy.x=length?dx/Math.max(length,max):0;joy.y=length?dy/Math.max(length,max):0;targetPath=[];el('stick').style.transform=`translate(${clamp(dx,-max,max)}px,${clamp(dy,-max,max)}px)`}
 function clearStick(){joy={x:0,y:0,id:null};if(el('stick'))el('stick').style.transform='';}
 function startLoop(){if(disposed||paused||raf)return;lastFrame=performance.now();raf=requestAnimationFrame(tick)}
 function tick(now){raf=0;if(disposed||paused)return;const dt=Math.min(.035,(now-lastFrame)/1000);lastFrame=now;update(dt,now);draw(now);positionEnemyButtons();raf=requestAnimationFrame(tick)}
 function update(dt,now){
  if(isReady()){
   let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy.x,dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+joy.y;
   const next=targetPath[0];if(!dx&&!dy&&next){const distance=Math.hypot(next.x-hero.x,next.y-hero.y);if(distance<9)targetPath.shift();else{dx=(next.x-hero.x)/distance;dy=(next.y-hero.y)/distance}}
   const length=Math.hypot(dx,dy);if(length){const speed=150+Math.min(3,a.shooter?.loadout?.boots||0)*38,x=hero.x+dx/Math.max(1,length)*speed*dt,y=hero.y+dy/Math.max(1,length)*speed*dt;let moved=false;if(fits(x,hero.y,20)){hero.x=x;moved=true}if(fits(hero.x,y,20)){hero.y=y;moved=true}if(moved)walk+=dt*12;else targetPath=[];if(moved&&a.shooter?.loadout?.boots&&Math.random()<dt*15)particles.push({x:hero.x,y:hero.y-4,vx:-dx*15,vy:-dy*15,life:.35,max:.35,color:'#ffd981',r:4})}
   for(const enemy of enemies){if(enemy.dead)continue;enemy.heading+=Math.sin(now/2200+enemy.seed)*dt*.7;const x=enemy.x+Math.cos(enemy.heading)*enemy.speed*dt,y=enemy.y+Math.sin(enemy.heading)*enemy.speed*.72*dt;if(fits(x,y,28)&&!enemies.some(other=>other!==enemy&&!other.dead&&Math.hypot(other.x-x,other.y-y)<225)){enemy.x=x;enemy.y=y}else enemy.heading+=Math.PI*.65;enemy.hit=Math.max(0,enemy.hit-dt)}
  }
  for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.gravity||0;if(p.collect){const d=Math.hypot(p.x-hero.x,p.y-hero.y);if(d>15){p.vx+=(hero.x-p.x)*dt*6;p.vy+=(hero.y-30-p.y)*dt*6}}}particles=particles.filter(p=>p.life>0);
  shake=Math.max(0,shake-dt*20);hitGlow=Math.max(0,hitGlow-dt*2);
  if(shot){const elapsed=(now-shot.started)/1000;if(shot.phase==='out'&&elapsed>=shot.duration){impactShot();if(!shot)return}else if(shot.phase==='back'&&elapsed>=shot.duration){impactHero();finishAttack()}else if(shot.phase==='end'&&elapsed>.65)finishAttack()}
 }
 function beginAttack(planned){busy=true;keys.clear();clearStick();targetPath=[];const enemy=enemies[planned.target];const to=enemy?{x:enemy.x,y:enemy.y-25}:planned.to;shot={...planned,from:{x:hero.x,y:hero.y-25},to,ok:!!a.ok,shielded:!!a.shooter?.lastAnswerShielded,started:performance.now(),duration:reduce()?.13:.43,phase:'out',token:epoch};el('impact').textContent='';root.classList.add('ws-firing');updateControls();}
 function impactShot(){if(!shot||shot.token!==epoch)return finishAttack();const enemy=enemies[shot.target];burst(shot.to.x,shot.to.y,shot.ok?'#fff1a3':'#ffb8a6',shot.ok?25:12);shake=reduce()?0:shot.ok?3:2;if(shot.ok){if(enemy){enemy.dead=true;enemy.hit=1}hitGlow=.45;el('impact').textContent=(a.shooter?.streak||0)>=5?'连击！知识之光 ✦':'词义命中 +1 水滴';for(let n=0;n<4;n++)particles.push({x:shot.to.x,y:shot.to.y,vx:(Math.random()-.5)*70,vy:(Math.random()-.5)*70,life:1.6,max:1.6,color:'#a8f9ed',r:5,collect:true});shot.phase='end';shot.started=performance.now();shot.duration=.6}else{if(enemy)enemy.hit=.8;el('impact').textContent=shot.shielded?'护盾准备！再记一次词义':'词义没配对，小怪反击！';shot.phase='back';shot.from=shot.to;shot.to={x:hero.x,y:hero.y-25};shot.started=performance.now();shot.duration=reduce()?.12:.42}}
 function impactHero(){if(!shot)return;burst(hero.x,hero.y-25,shot.shielded?'#a3faff':'#ffaea8',shot.shielded?20:18);shake=reduce()?0:shot.shielded?2:5;hitGlow=shot.shielded?.45:-.5;el('impact').textContent=shot.shielded?'护盾挡住了反击':'能量 -1 · 记住正确答案';}
 function finishAttack(){shot=null;busy=false;root?.classList.remove('ws-firing');updateControls();if(a?.phase==='between'&&a.shooter?.pendingChest)showChest();}
 function burst(x,y,color,count){for(let n=0;n<count;n++){const angle=TAU*n/count,speed=65+Math.random()*120;particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.45+Math.random()*.4,max:.85,color,r:2+Math.random()*5})}}
 function positionEnemyButtons(){if(!root)return;const fontSize=width>height?14:clamp(width*.036,14,19);ctx.save();ctx.font=`750 ${fontSize}px Georgia`;for(const [index,enemy]of enemies.entries()){const button=el('enemies').children[index];if(!button)continue;const spriteHeight=[101,80,91][index%3],bx=offsetX+enemy.x*scale,by=offsetY+(enemy.y-spriteHeight)*scale-27,labelWidth=ctx.measureText(enemy.en).width+23,maxWidth=Math.min(220,width*.46),wordSize=Math.max(14,fontSize*Math.min(1,(maxWidth-23)/Math.max(1,labelWidth-23)));button.style.left=`${bx}px`;button.style.top=`${by}px`;button.style.setProperty('--ws-word-size',`${wordSize}px`);button.style.setProperty('--ws-enemy-width',`${clamp(Math.max(170*scale,labelWidth),66,maxWidth)}px`);button.style.setProperty('--ws-enemy-height',`${clamp(spriteHeight*scale+32,58,135)}px`);button.classList.toggle('targeted',aim===index);button.classList.toggle('defeated',enemy.dead);button.style.opacity=enemy.dead?'.52':'1'}ctx.restore()}

 function rounded(x,y,w,h,r=12){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):ctx.rect(x,y,w,h)}
 function draw(now){if(!ctx||!canvas||!root)return;ctx.clearRect(0,0,width,height);const backdrop=ctx.createLinearGradient(0,0,0,height);backdrop.addColorStop(0,'#182c38');backdrop.addColorStop(1,'#0b1723');ctx.fillStyle=backdrop;ctx.fillRect(0,0,width,height);ctx.save();ctx.translate(offsetX+(shake?(Math.random()-.5)*shake:0),offsetY+(shake?(Math.random()-.5)*shake:0));ctx.scale(scale,scale);drawRoom(now);const actors=[...obstacles.map(obstacle=>({type:'obstacle',y:obstacle.y+obstacle.h/2,item:obstacle})),...enemies.map(enemy=>({type:'enemy',y:enemy.y,item:enemy,index:enemies.indexOf(enemy)})),{type:'hero',y:hero.y,item:hero}].sort((left,right)=>left.y-right.y);for(const actor of actors){if(actor.type==='obstacle')drawObstacle(actor.item);else if(actor.type==='enemy')drawEnemy(actor.item,actor.index,now);else drawHero(now)}drawPath(now);drawShot(now);for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=p.collect?12:0;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fill()}ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.restore()}
 function drawRoom(now){
  if(images.room){ctx.drawImage(images.room,0,0,W,H);ctx.fillStyle='#08192632';ctx.fillRect(0,0,W,H)}else{
   const background=ctx.createLinearGradient(0,0,0,H);background.addColorStop(0,'#273e48');background.addColorStop(.7,'#536664');background.addColorStop(1,'#263b40');ctx.fillStyle=background;ctx.fillRect(0,0,W,H);
   ctx.fillStyle='#21343d';ctx.fillRect(67,65,866,561);ctx.fillStyle='#435451';ctx.fillRect(96,127,808,493);
   for(let row=0;row<9;row++)for(let col=0;col<13;col++){const x=100+col*63,y=130+row*55;ctx.fillStyle=(row+col)%2?'#6d8073':'#63796e';ctx.fillRect(x,y,61,53);ctx.strokeStyle='#d2e8b018';ctx.strokeRect(x+2,y+2,57,49)}
   ctx.fillStyle='#2d424b';ctx.fillRect(70,70,860,82);ctx.fillStyle='#6e8a85';ctx.fillRect(70,148,860,7);ctx.fillStyle='#a5c8b6';ctx.fillRect(85,78,16,74);ctx.fillRect(897,78,16,74);
   for(let n=0;n<5;n++){ctx.fillStyle='#5e787d';rounded(170+n*145,83,90,55,6);ctx.fill();ctx.fillStyle='#1c3d4b';rounded(176+n*145,89,78,42,4);ctx.fill();ctx.fillStyle='#9debe34a';ctx.fillRect(184+n*145,94,62,6)}
   ctx.fillStyle='#213740';rounded(451,72,98,81,8);ctx.fill();ctx.fillStyle='#9ee9c3';ctx.shadowColor='#a1ffe9';ctx.shadowBlur=15;ctx.fillRect(470,77,59,4);ctx.shadowBlur=0;
   ctx.fillStyle='#617575';ctx.fillRect(68,619,864,25);ctx.fillStyle='#1b2d36';ctx.fillRect(67,644,866,19);ctx.fillStyle='#adc0a826';ctx.fillRect(68,618,864,4);
   drawPlant(132,170);drawPlant(868,185);drawPlant(880,580);
  }
  // Soft energy marks distinguish every room without obscuring the vocabulary.
  const hues=['#a6dfb2','#82dcfa','#ead091','#b6b2e6','#8cdfd7'],color=hues[(room()-1)%hues.length];ctx.strokeStyle=color+'36';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(500,390,278,133,0,0,TAU);ctx.stroke();ctx.strokeStyle=color+'14';ctx.beginPath();ctx.ellipse(500,390,310,150,0,0,TAU);ctx.stroke();
  for(let n=0;n<9;n++){ctx.fillStyle=color;ctx.globalAlpha=.16+.16*Math.sin(now/1300+n);ctx.beginPath();ctx.arc(140+n*90,190+((n*71)%300),2.2,0,TAU);ctx.fill()}ctx.globalAlpha=1;
 }
 function drawPlant(x,y){ctx.fillStyle='#1d303355';ctx.beginPath();ctx.ellipse(x,y+18,29,8,0,0,TAU);ctx.fill();ctx.fillStyle='#976740';rounded(x-19,y-15,38,34,7);ctx.fill();for(let n=0;n<6;n++){const angle=n*TAU/6;ctx.fillStyle=n%2?'#81ae73':'#447d66';ctx.beginPath();ctx.ellipse(x+Math.cos(angle)*14,y-22+Math.sin(angle)*10,13,24,angle,0,TAU);ctx.fill()}}
 function drawObstacle(o){const x=o.x-o.w/2,y=o.y-o.h/2;ctx.fillStyle='#091b2b42';rounded(x+8,y+6,o.w,o.h+15,15);ctx.fill();ctx.fillStyle='#293f42';rounded(x,y-28,o.w,o.h+28,11);ctx.fill();ctx.fillStyle='#a67f50';rounded(x-3,y-32,o.w+6,o.h,9);ctx.fill();ctx.fillStyle='#d9bc87';rounded(x+2,y-34,o.w-4,o.h-7,8);ctx.fill();ctx.fillStyle='#c9a572';rounded(x+8,y-27,o.w-16,o.h-20,6);ctx.fill();ctx.fillStyle='#344751';rounded(o.x-29,o.y-64,56,40,7);ctx.fill();ctx.fillStyle='#1c343c';rounded(o.x-24,o.y-59,46,29,4);ctx.fill();ctx.fillStyle='#8bedca';ctx.fillRect(o.x-18,o.y-53,24,3);ctx.fillRect(o.x-18,o.y-46,33,3);ctx.fillStyle='#536d6b';rounded(o.x-22,o.y-16,43,14,4);ctx.fill();ctx.strokeStyle='#becbbe';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(o.x-15,o.y-11);ctx.lineTo(o.x+13,o.y-11);ctx.stroke();ctx.fillStyle='#69563c';ctx.beginPath();ctx.ellipse(x+o.w-18,y-15,10,7,0,0,TAU);ctx.fill();ctx.fillStyle='#9ebd72';ctx.beginPath();ctx.ellipse(x+o.w-21,y-25,7,13,-.45,0,TAU);ctx.fill();ctx.fillStyle='#79965d';ctx.beginPath();ctx.ellipse(x+o.w-14,y-27,6,14,.5,0,TAU);ctx.fill()}
 function drawEnemy(enemy,index,now){if(enemy.dead)return;const bounce=reduce()?0:Math.sin(now/240+enemy.seed)*3;ctx.save();ctx.translate(enemy.x,enemy.y+bounce);ctx.fillStyle='#08151c50';ctx.beginPath();ctx.ellipse(0,4,43,12,0,0,TAU);ctx.fill();if(aim===index){ctx.strokeStyle='#ffe5a5';ctx.lineWidth=3;ctx.setLineDash([7,6]);ctx.beginPath();ctx.ellipse(0,0,51,18,0,0,TAU);ctx.stroke();ctx.setLineDash([])}
  if(images.sprites){const crop=[[750,145,395,470],[125,770,410,390],[680,735,535,420]][index%3],spriteHeight=index===0?101:index===1?80:91,spriteWidth=index===2?116:96;ctx.drawImage(images.sprites,...crop,-spriteWidth/2,-spriteHeight,spriteWidth,spriteHeight)}else{const colors=[['#76c49b','#daf09b'],['#edb367','#ffdf8e'],['#8baee4','#b4e6ed']],color=colors[index%colors.length];const fill=ctx.createLinearGradient(0,-80,0,0);fill.addColorStop(0,color[1]);fill.addColorStop(1,color[0]);ctx.fillStyle=fill;ctx.strokeStyle='#243b4150';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-37,-7);ctx.bezierCurveTo(-50,-38,-37,-70,-9,-68);ctx.bezierCurveTo(4,-85,34,-66,37,-42);ctx.bezierCurveTo(55,-12,26,4,8,-5);ctx.quadraticCurveTo(-10,6,-37,-7);ctx.fill();ctx.stroke();ctx.fillStyle=color[1];for(const sign of [-1,1]){ctx.beginPath();ctx.ellipse(sign*19,-71,6,15,sign*.45,0,TAU);ctx.fill()}ctx.fillStyle='#fffcdb';ctx.beginPath();ctx.ellipse(-15,-41,10,13,0,0,TAU);ctx.ellipse(13,-42,10,13,0,0,TAU);ctx.fill();ctx.fillStyle='#253f44';ctx.beginPath();ctx.ellipse(-12,-40,4,7,0,0,TAU);ctx.ellipse(16,-41,4,7,0,0,TAU);ctx.fill();ctx.strokeStyle='#3d6655';ctx.lineWidth=3;ctx.beginPath();ctx.arc(3,-22,7,0,Math.PI);ctx.stroke();ctx.fillStyle='#ffffff42';ctx.beginPath();ctx.ellipse(-22,-59,12,5,-.35,0,TAU);ctx.fill()}
  if(enemy.hit>0){ctx.globalAlpha=enemy.hit*.5;ctx.fillStyle='#fff4c7';ctx.beginPath();ctx.arc(0,-40,45,0,TAU);ctx.fill()}ctx.restore()}
 function drawHero(now){const moving=isReady()&&(keys.size||targetPath.length||joy.id!==null),bounce=moving&&!reduce()?Math.sin(walk)*2:0;ctx.save();ctx.translate(hero.x,hero.y+bounce);ctx.fillStyle='#041c2755';ctx.beginPath();ctx.ellipse(0,5,28,9,0,0,TAU);ctx.fill();if(a?.shooter?.shieldCharge>0){ctx.strokeStyle='#8ffff77a';ctx.fillStyle='#9ae9e518';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-36,38,50,0,0,TAU);ctx.fill();ctx.stroke()}
  if(images.sprites)ctx.drawImage(images.sprites,130,80,400,530,-43,-117,88,117);else{ctx.fillStyle='#273e4b';rounded(-16,-28,13,28,5);ctx.fill();rounded(4,-28,13,28,5);ctx.fill();ctx.fillStyle='#315d6c';rounded(-23,-57,44,42,11);ctx.fill();ctx.fillStyle='#9febd9';rounded(-13,-48,26,21,6);ctx.fill();ctx.fillStyle='#efd9bb';ctx.beginPath();ctx.arc(0,-70,23,0,TAU);ctx.fill();ctx.fillStyle='#364e61';ctx.beginPath();ctx.arc(0,-74,26,Math.PI,TAU);ctx.lineTo(28,-62);ctx.lineTo(-26,-62);ctx.closePath();ctx.fill();ctx.fillStyle='#8cdce5';rounded(-19,-75,37,11,5);ctx.fill();ctx.fillStyle='#2c455a';rounded(-22,-66,43,9,3);ctx.fill();ctx.fillStyle='#6da9b1';rounded(11,-52,29,12,4);ctx.fill();ctx.fillStyle='#d6efdd';rounded(35,-55,13,18,4);ctx.fill();ctx.fillStyle='#73e9e5';ctx.fillRect(47,-51,4,10)}
  const target=enemies[aim];if(target&&!images.sprites){const angle=Math.atan2(target.y-hero.y,target.x-hero.x);ctx.rotate(angle);ctx.fillStyle='#314956';rounded(15,-30,29,14,5);ctx.fill();ctx.fillStyle='#bbe9dd';rounded(34,-29,22,10,3);ctx.fill();ctx.fillStyle='#81ffe5';ctx.fillRect(53,-27,5,6)}ctx.restore();}
 function drawPath(now){if(!targetPath.length||!isReady())return;const last=targetPath.at(-1);ctx.strokeStyle='#aef1d778';ctx.lineWidth=3;ctx.setLineDash([5,8]);ctx.lineDashOffset=-now/130;ctx.beginPath();ctx.moveTo(hero.x,hero.y);for(const point of targetPath)ctx.lineTo(point.x,point.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#aef1d72c';ctx.beginPath();ctx.ellipse(last.x,last.y,18,7,0,0,TAU);ctx.fill();ctx.strokeStyle='#bdfff3';ctx.beginPath();ctx.ellipse(last.x,last.y,18,7,0,0,TAU);ctx.stroke()}
 function drawShot(now){if(!shot||shot.phase==='end')return;const t=clamp((now-shot.started)/1000/shot.duration,0,1),p={x:shot.from.x+(shot.to.x-shot.from.x)*t,y:shot.from.y+(shot.to.y-shot.from.y)*t},color=shot.phase==='back'?'#ffab9c':'#9cffe8',rays=shot.phase==='out'&&a?.shooter?.loadout?.prism?2:1;for(let n=0;n<rays;n++){const offset=(n-(rays-1)/2)*11;ctx.strokeStyle=color;ctx.lineWidth=5;ctx.shadowColor=color;ctx.shadowBlur=17;ctx.beginPath();ctx.moveTo(p.x-(shot.to.x-shot.from.x)*.16,p.y+offset-(shot.to.y-shot.from.y)*.16);ctx.lineTo(p.x,p.y+offset);ctx.stroke();ctx.fillStyle='#fff9d5';ctx.beginPath();ctx.arc(p.x,p.y+offset,7,0,TAU);ctx.fill();ctx.shadowBlur=0}}

 window.WordShooter={mount,unmount,sync,pause,resume:()=>setPaused(false),beforeNext,fresh,createState:fresh,recordAnswer,grantUpgrade,enterRoom,health,markup,upgrades:upgradeInfo,get debug(){return {mounted:!disposed,paused,busy,key:questionKey,choice,aim,hero:{...hero},enemies:enemies.map(({en,x,y,dead})=>({en,x,y,dead})),obstacles:obstacles.map(o=>({...o})),raf:!!raf,room:room()}}};
})();
