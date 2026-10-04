/* Independent infinite-room campaign. All learning/reward mutations are atomic. */
(() => {
 'use strict';
 const C=GameCommon,D=ShooterData,$=id=>document.getElementById(id),phases=['ready','answered','between','done'];
 const integer=(n,max=100000000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 const scopeValid=scope=>D.choices().some(x=>x.id===scope);
 const modes=['meaning','listening'];
 const fresh=()=>({version:1,settings:{scope:'all',mode:'meaning'},active:null,history:[]});
 function validRun(a){
  if(!a||typeof a.id!=='string'||a.id.length>100||!scopeValid(a.scope)||!modes.includes(a.mode)||!integer(a.level)||a.level<1||!phases.includes(a.phase)||!integer(a.index,9)||!Array.isArray(a.items)||a.items.length!==10||!a.items.every(D.validItem))return false;
  const pool=D.pool(a.scope),byKey=new Map(pool.map(x=>[x.key,x])),eligible=D.eligible(pool,a.scope,a.level),allowed=new Set(eligible.map(x=>x.key)),meanings=new Set(eligible.map(x=>x.zh));
  if(new Set(a.items.map(w=>w.key)).size!==10||!a.items.every(w=>allowed.has(w.key)&&byKey.get(w.key).en===w.en&&byKey.get(w.key).zh===w.zh&&w.options.every(x=>meanings.has(x))&&w.targets.every(x=>allowed.has(D.normalize(x)))))return false;
  if(!['correctTotal','wrongTotal','answeredTotal','roomCorrect','roomWrong','water','suns','paidWater','paidSuns','cycle'].every(k=>integer(a[k]))||a.cycle<1||a.correctTotal+a.wrongTotal!==a.answeredTotal||a.water!==a.correctTotal||a.paidWater>a.water||a.paidSuns>a.suns||a.suns>Math.floor(a.answeredTotal/10)||a.suns*9>a.correctTotal||a.roomCorrect+a.roomWrong>10||a.correctTotal<a.roomCorrect||a.wrongTotal<a.roomWrong)return false;
  const submitted=a.phase==='ready'||a.phase==='done'&&!a.submitted?0:1;
  if(a.roomCorrect+a.roomWrong!==a.index+submitted||a.answeredTotal!==(a.level-1)*10+a.roomCorrect+a.roomWrong||a.phase==='between'&&a.index!==9||a.phase==='answered'&&a.index===9)return false;
  if(typeof a.submitted!=='string'||a.submitted.length>80||typeof a.targetSubmitted!=='string'||a.targetSubmitted.length>40||typeof a.ok!=='boolean'||typeof a.settled!=='boolean'||!['active','ended','lost'].includes(a.outcome)||typeof a.startedAt!=='string'||!Number.isFinite(Date.parse(a.startedAt)))return false;
  const w=a.items[a.index];
  if(['answered','between'].includes(a.phase)&&(!a.submitted||!a.targetSubmitted)||a.phase==='done'&&!!a.submitted!==!!a.targetSubmitted)return false;
  if(a.phase==='ready'&&(a.submitted!==''||a.targetSubmitted!==''||a.ok)||a.phase!=='ready'&&(!w.options.includes(a.submitted)&&a.submitted!==''||!w.targets.includes(a.targetSubmitted)&&a.targetSubmitted!==''))return false;
  if(a.phase!=='ready'&&a.submitted&&a.ok!==(a.submitted===w.expected&&a.targetSubmitted===w.en))return false;
  if(!Array.isArray(a.seen)||a.seen.length>pool.length||new Set(a.seen).size!==a.seen.length||!a.seen.every(k=>byKey.has(k))||!byKey.has(a.lastWord))return false;
  const s=a.shooter,l=s?.loadout;
  if(!s||s.version!==1||s.level!==a.level||!integer(s.health,10)||!integer(s.streak,a.correctTotal)||!l||!['boots','prism','shield'].every(k=>integer(l[k],3))||!integer(s.shieldCharge,1)||s.shieldCharge>0&&l.shield===0||!integer(s.lastHitIndex+1)||s.lastHitIndex!==a.answeredTotal-1||!integer(s.lastChestLevel,a.level)||!integer(s.pendingChest,a.level)||typeof s.ended!=='boolean'||s.ended!==(s.health===0)||typeof s.lastAnswerShielded!=='boolean')return false;
  if(s.health<10-a.wrongTotal||a.phase==='between'&&(s.health===0||s.pendingChest!==a.level&&s.lastChestLevel!==a.level)||a.phase!=='between'&&s.pendingChest!==0||a.phase!=='done'&&(a.settled||a.paidWater!==0||a.paidSuns!==0||a.outcome!=='active')||a.phase==='done'&&(!a.settled||a.outcome==='active'||a.paidWater!==a.water||a.paidSuns!==a.suns||(a.outcome==='lost')!==(s.health===0))||a.phase==='ready'&&s.health===0)return false;
  return true;
 }
 function validHistory(h){return !!h&&typeof h.id==='string'&&Number.isFinite(Date.parse(h.at))&&scopeValid(h.scope)&&modes.includes(h.mode)&&integer(h.level)&&h.level>=1&&integer(h.total)&&integer(h.correct,h.total)&&integer(h.wrong,h.total)&&h.correct+h.wrong===h.total&&integer(h.water)&&h.water===h.correct&&integer(h.suns,h.level)&&['ended','lost'].includes(h.outcome)}
 function validState(s){return s===undefined||!!s&&s.version===1&&s.settings&&scopeValid(s.settings.scope)&&modes.includes(s.settings.mode)&&(s.active===null||validRun(s.active))&&Array.isArray(s.history)&&s.history.length<=20000&&s.history.every(validHistory)}
 const A=()=>window.Adventure,active=()=>A()?.state.shooting?.active;
 const save=fn=>A().update(root=>{root.shooting??=fresh();return fn(root.shooting,root)});
 function settle(s,root,a,outcome){
  if(a.settled)return false;
  a.phase='done';a.outcome=outcome;a.shooter.pendingChest=0;
  root.garden.water+=a.water-a.paidWater;root.garden.suns+=a.suns-a.paidSuns;a.paidWater=a.water;a.paidSuns=a.suns;a.settled=true;
  if(!s.history.some(h=>h.id===a.id)){s.history.push({id:a.id,at:new Date().toISOString(),scope:a.scope,mode:a.mode,level:a.level,total:a.answeredTotal,correct:a.correctTotal,wrong:a.wrongTotal,water:a.water,suns:a.suns,outcome});s.history=s.history.slice(-20000)}
  return true;
 }
 function start(scope,mode){
  scope??=$('shooter-scope')?.value||A().state.shooting?.settings.scope||'all';mode??=$('shooter-mode')?.value||'meaning';
  if(!scopeValid(scope)||!modes.includes(mode))return false;
  const first=D.drawRoom(scope,1);if(!first)return false;
  if(!save((s,root)=>{if(s.active&&!s.active.settled)settle(s,root,s.active,'ended');s.settings={scope,mode};s.active={id:C.uid(),scope,mode,level:1,items:first.items,index:0,phase:'ready',correctTotal:0,wrongTotal:0,answeredTotal:0,roomCorrect:0,roomWrong:0,submitted:'',targetSubmitted:'',ok:false,water:0,suns:0,paidWater:0,paidSuns:0,settled:false,outcome:'active',startedAt:new Date().toISOString(),seen:first.seen,cycle:first.cycle,lastWord:first.lastWord,shooter:WordShooter.fresh()}}))return false;
  render();if(mode==='listening')hear();return true;
 }
 function answer(value,metadata={}){
  const current=active();if(!current||current.phase!=='ready')return false;const id=current.id,index=current.index,level=current.level,w=current.items[index];
  if(!w.options.includes(value)||typeof metadata.targetWord!=='string'||!w.targets.includes(metadata.targetWord))return false;
  const ok=value===w.expected&&metadata.targetWord===w.en;
  if(!save((s,root)=>{const a=s.active;if(!a||a.id!==id||a.index!==index||a.level!==level||a.phase!=='ready')return false;const hit=WordShooter.recordAnswer(a.shooter,a.answeredTotal,ok);if(!hit.applied)return false;a.submitted=value;a.targetSubmitted=metadata.targetWord;a.ok=ok;a.answeredTotal++;if(ok){a.correctTotal++;a.roomCorrect++;a.water++}else{a.wrongTotal++;a.roomWrong++}a.phase='answered';if(index===9){if(a.roomCorrect>=9)a.suns++;if(a.shooter.health>0){a.phase='between';a.shooter.pendingChest=a.level}}if(a.shooter.health===0)settle(s,root,a,'lost')}))return false;
  sync();return true;
 }
 function upgrade(key){const current=active();if(!current||current.phase!=='between')return false;if(!save(s=>{const a=s.active;if(a?.id!==current.id||a.phase!=='between')return false;return WordShooter.grantUpgrade(a.shooter,a.level,key)}))return false;sync();return true}
 function next(){
  const current=active();if(!current||!['answered','between'].includes(current.phase)||!WordShooter.beforeNext(current))return false;
  let room=null;if(current.phase==='between'){if(current.shooter.lastChestLevel!==current.level){C.toast('先选择一件宝箱装备。');return false}room=D.drawRoom(current.scope,current.level+1,current.seen,current.lastWord,current.cycle);if(!room)return false}
  if(!save(s=>{const a=s.active;if(a?.id!==current.id||a.level!==current.level||a.index!==current.index||a.phase!==current.phase)return false;if(room){a.level++;a.index=0;a.roomCorrect=a.roomWrong=0;a.items=room.items;a.seen=room.seen;a.cycle=room.cycle;a.lastWord=room.lastWord;WordShooter.enterRoom(a.shooter,a.level)}else a.index++;a.phase='ready';a.submitted=a.targetSubmitted='';a.ok=false}))return false;
  sync();if(active().mode==='listening')hear();return true;
 }
 function finish(){const current=active();if(!current)return false;if(!current.settled&&!save((s,root)=>{if(s.active?.id!==current.id)return false;return settle(s,root,s.active,'ended')}))return false;render();window.AdventureMap?.refresh();return true}
 function hear(){const a=active(),w=a?.items[a.index];if(!w)return;ShooterAudio.play(w.en,ok=>{if(!ok)C.toast('单词未能播放，请点“听单词”重试。')})}
 function pause(){window.ShooterAudio?.stop();window.WordShooter?.pause()}
 function leave(){pause();WordShooter.unmount();A().switchView('map')}
 function sync(){const a=active();if(a)WordShooter.sync(a,D.pool(a.scope))}
 function render(){
  const a=active();if(!a)return home();$('shooter-home').hidden=true;$('shooter-play').hidden=false;$('shooter-summary').hidden=true;document.body.classList.add('shooting-focus');
  WordShooter.mount({host:$('shooter-host'),active:a,wordPool:D.pool(a.scope),getActive:active,onAnswer:answer,onNext:()=>active()?.phase==='done'?render():next(),onLeave:leave,onUpgrade:upgrade,onHear:hear,onFinish:finish});
  if(a.phase==='done'){WordShooter.unmount();$('shooter-play').hidden=true;$('shooter-summary').hidden=false;$('shooter-summary-title').textContent=a.outcome==='lost'?'守卫需要休息，再来挑战！':'本次探索，满载而归！';$('shooter-summary-copy').textContent=`到达第 ${a.level} 关 · 答对 ${a.correctTotal} 题 · 答错 ${a.wrongTotal} 题`;$('shooter-earned-water').textContent=a.water;$('shooter-earned-suns').textContent=a.suns}
 }
 function resume(){const a=active();if(!a||a.settled)return false;render();if(a.mode==='listening')hear();return true}
 function scopeInfo(){const scope=$('shooter-scope').value,words=D.pool(scope);$('shooter-pool-count').textContent=`${words.length} 个去重词条 · 每个房间 10 题 · 房间持续开放`;$('shooter-editions').textContent=D.books().filter(b=>scope==='all'||String(b.grade)===scope||b.id===scope).map(b=>b.name).join('；')}
 function home(){pause();WordShooter.unmount();document.body.classList.remove('shooting-focus');$('shooter-home').hidden=false;$('shooter-play').hidden=true;$('shooter-summary').hidden=true;const s=A().state.shooting||fresh();$('shooter-scope').value=s.settings.scope;$('shooter-mode').value=s.settings.mode;scopeInfo();$('shooter-resume').hidden=!s.active||s.active.settled;$('shooter-resume-label').textContent=s.active?`继续第 ${s.active.level} 关 · 生命 ${s.active.shooter.health}/10 · 本次答对 ${s.active.correctTotal} 题`:''}
 function open(){A().switchView('shooter')}
 function init(){
  $('shooter-scope').replaceChildren();for(const c of D.choices()){const o=document.createElement('option');o.value=c.id;o.textContent=c.name;$('shooter-scope').append(o)}
  $('shooter-scope').onchange=scopeInfo;$('shooter-start').onclick=()=>start();$('shooter-continue').onclick=resume;$('shooter-new').onclick=()=>{if(finish())home()};$('shooter-home-map').onclick=leave;$('shooter-again').onclick=()=>start(active()?.scope,active()?.mode);$('shooter-choose').onclick=home;$('shooter-summary-map').onclick=leave;
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});window.addEventListener('pagehide',pause);
 }
 window.ShooterCampaign={fresh,validRun,validState,start,answer,upgrade,next,finish,hear,pause,leave,sync,render,resume,home,open,init,get active(){return active()}};
})();
