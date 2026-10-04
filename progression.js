(() => {
 'use strict';
 const KINDS=['battle','navy'],OUTCOMES=['won','lost','sunk'];
 const $=id=>document.getElementById(id),C=window.GameCommon;
 const integer=(n,max=100000)=>Number.isInteger(n)&&n>=0&&n<=max;
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const idOK=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(id);
 const dateOK=value=>typeof value==='string'&&value.length<=40&&Number.isFinite(Date.parse(value));
 const titleOK=value=>typeof value==='string'&&value.trim().length>0&&value.length<=80;
 const fresh=()=>({version:1,battle:{best:{},cleared:{},completed:[]},navy:{best:{},cleared:{},completed:[]},rewards:[],transactions:[]});
 const getState=()=>window.Adventure?.state;
 const data=root=>root?.progression||fresh();
 const catalog=kind=>KINDS.includes(kind)&&Array.isArray(window.ProgressionData?.[kind])?window.ProgressionData[kind]:[];
 function level(kind,id){const n=Number(id);return KINDS.includes(kind)&&integer(n,10)&&n>0?catalog(kind).find(item=>item.id===n)||null:null}
 const accuracy=r=>r.correct/r.total;
 const requiresAccuracy=kind=>kind!=='navy'||window.ProgressionData?.progression?.navyUnlockPolicy!=='victory';
 const qualifies=(r,kind)=>r.outcome==='won'&&(!requiresAccuracy(kind)||r.correct*10>=r.total*9);
 function validResult(r){return object(r)&&integer(r.correct,10000)&&integer(r.total,10000)&&r.total>0&&r.correct<=r.total&&OUTCOMES.includes(r.outcome)&&idOK(r.attemptId)&&dateOK(r.at)&&Number.isFinite(r.rate)&&Math.abs(r.rate-accuracy(r))<1e-9}
 function validCampaign(c,kind){
  if(!object(c)||!object(c.best)||!object(c.cleared)||!Array.isArray(c.completed)||c.completed.length>50000||new Set(c.completed).size!==c.completed.length||!c.completed.every(idOK))return false;
  const completed=new Set(c.completed);
  for(const key of Object.keys(c.best)){if(!/^(10|[1-9])$/.test(key)||!validResult(c.best[key])||!completed.has(c.best[key].attemptId))return false}
  for(const key of Object.keys(c.cleared)){const clear=c.cleared[key];if(!/^(10|[1-9])$/.test(key)||!validResult(clear)||!qualifies(clear,kind)||!completed.has(clear.attemptId)||!c.best[key])return false}
  // 后续关卡必须有上一关的达标记录；奖励多少不会改变解锁条件。
  for(let n=2;n<=10;n++)if((c.best[n]||c.cleared[n])&&!c.cleared[n-1])return false;
  return true;
 }
 const journeyStatuses=['active','between','sunk','complete','ended'],attemptOutcomes=[null,'won','sunk','abandoned'];
 const legacyBoatCounts=[1,2,2,2,3,3,3,3,3,3];
 const onlyKeys=(value,keys)=>Object.keys(value).every(key=>keys.includes(key));
 function validNavyJourney(j){
  if(j===undefined||j===null)return true;
  if(!object(j)||!onlyKeys(j,['version','id','damage','status','levelId','attemptId','attempts','errors','credits','rewards','settlement'])||j.version!==2||!idOK(j.id)||!integer(j.damage,10)||!journeyStatuses.includes(j.status)||!Number.isInteger(j.levelId)||!level('navy',j.levelId)||!idOK(j.attemptId)||!Array.isArray(j.attempts)||j.attempts.length<1||j.attempts.length>50000||!Array.isArray(j.errors)||j.errors.length!==j.damage||!Array.isArray(j.credits)||j.credits.length>10000||!object(j.rewards)||!onlyKeys(j.rewards,['water','suns','paidWater','paidSuns'])||!Object.values(j.rewards).every(n=>integer(n,100000))||j.rewards.paidWater>j.rewards.water||j.rewards.paidSuns>j.rewards.suns)return false;
  if(j.settlement!==null&&(!object(j.settlement)||!onlyKeys(j.settlement,['reason','at'])||!['sunk','complete','ended'].includes(j.settlement.reason)||!dateOK(j.settlement.at)||j.settlement.reason!==j.status||j.rewards.paidWater!==j.rewards.water||j.rewards.paidSuns!==j.rewards.suns))return false;
  if(j.settlement===null&&(j.rewards.paidWater!==0||j.rewards.paidSuns!==0))return false;
  const ids=new Set(),errorsPerAttempt=new Map(),creditsPerAttempt=new Map(),waterPerAttempt=new Map();let damage=0,water=0,suns=0;
  for(const a of j.attempts){
   if(!object(a)||!onlyKeys(a,['id','levelId','startDamage','damage','outcome','correct','water','suns','priorCorrect','priorWater','priorSuns','sunAwarded','result'])||!idOK(a.id)||ids.has(a.id)||!Number.isInteger(a.levelId)||!level('navy',a.levelId)||!integer(a.startDamage,10)||a.startDamage!==damage||!integer(a.damage,10)||!attemptOutcomes.includes(a.outcome)||!integer(a.correct,10000)||!integer(a.water,100000)||!integer(a.suns,10)||!integer(a.priorCorrect,a.correct)||!integer(a.priorWater,100000)||!integer(a.priorSuns,10)||typeof a.sunAwarded!=='boolean')return false;
   if(a.result!==null&&(!object(a.result)||!onlyKeys(a.result,['correct','total','outcome'])||a.result.correct!==a.correct||a.result.total!==a.correct+a.damage||a.result.total<1||a.result.outcome!==a.outcome||!['won','sunk'].includes(a.result.outcome)))return false;
   if(['won','sunk'].includes(a.outcome)!==(a.result!==null)||a.sunAwarded&&a.outcome!=='won'||a.suns>0&&(!a.sunAwarded||a.correct*10<(a.correct+a.damage)*9||a.suns!==level('navy',a.levelId).rewardMultiplier)||a.priorWater!==a.priorCorrect*level('navy',a.levelId).rewardMultiplier||a.priorSuns>0&&(!a.sunAwarded||a.suns>0||a.priorSuns!==level('navy',a.levelId).rewardMultiplier))return false;
   ids.add(a.id);errorsPerAttempt.set(a.id,0);creditsPerAttempt.set(a.id,0);waterPerAttempt.set(a.id,0);damage+=a.damage;water+=a.water;suns+=a.suns;if(damage>10)return false;
  }
  const eventIds=new Set();for(const e of j.errors){if(!object(e)||!onlyKeys(e,['id','attemptId'])||!idOK(e.id)||eventIds.has(e.id)||!idOK(e.attemptId)||!ids.has(e.attemptId))return false;eventIds.add(e.id);errorsPerAttempt.set(e.attemptId,errorsPerAttempt.get(e.attemptId)+1)}
  for(const e of j.credits){if(!object(e)||!onlyKeys(e,['id','attemptId','amount'])||!idOK(e.id)||eventIds.has(e.id)||!idOK(e.attemptId)||!ids.has(e.attemptId)||!integer(e.amount,10)||e.amount<1)return false;const a=j.attempts.find(a=>a.id===e.attemptId);if(e.amount!==level('navy',a.levelId).rewardMultiplier)return false;eventIds.add(e.id);creditsPerAttempt.set(e.attemptId,creditsPerAttempt.get(e.attemptId)+1);waterPerAttempt.set(e.attemptId,waterPerAttempt.get(e.attemptId)+e.amount)}
  if(damage!==j.damage||water!==j.rewards.water||suns!==j.rewards.suns||j.attempts.some(a=>a.damage!==errorsPerAttempt.get(a.id)||a.correct!==a.priorCorrect+creditsPerAttempt.get(a.id)||a.water!==waterPerAttempt.get(a.id)))return false;
  const last=j.attempts[j.attempts.length-1];if(last.id!==j.attemptId||last.levelId!==j.levelId||j.attempts.slice(0,-1).some(a=>a.outcome===null))return false;
  if(j.status==='ended')return !!j.settlement&&last.outcome!==null;
  if(j.status==='active')return !j.settlement&&j.damage<10&&last.outcome===null;
  if(j.status==='sunk')return j.damage===10&&(last.outcome===null||last.outcome==='sunk');
  if(j.damage>=10||last.outcome!=='won')return false;return j.status!=='complete'||j.levelId===10;
 }
 function newAttempt(id,levelId,startDamage){return {id,levelId,startDamage,damage:0,outcome:null,correct:0,water:0,suns:0,priorCorrect:0,priorWater:0,priorSuns:0,sunAwarded:false,result:null}}
 function legacyNavyJourney(root){
  const a=root?.navy?.active;if(!object(a)||!object(a.campaign)||a.campaign.kind!=='navy'||!Number.isInteger(a.campaign.levelId)||!level('navy',a.campaign.levelId)||!idOK(a.id)||!integer(a.holes,10)||!integer(a.correct,10000)||!['ready','correct','wrong','won','sunk'].includes(a.phase))return null;
  if((a.phase==='sunk'&&a.holes!==10)||(a.phase==='won'&&a.holes===10))return null;
  const id='journey_'+a.id.slice(0,80),outcome=['won','sunk'].includes(a.phase)?a.phase:null,attempt=newAttempt(a.id,a.campaign.levelId,0),multiplier=level('navy',a.campaign.levelId).rewardMultiplier;
  Object.assign(attempt,{damage:a.holes,outcome,correct:a.correct,priorCorrect:a.correct,priorWater:a.correct*multiplier,priorSuns:outcome==='won'&&root.navy.history?.some(h=>h.id===a.id)&&a.correct*10>=(a.correct+a.holes)*9?multiplier:0,sunAwarded:outcome==='won',result:outcome?{correct:a.correct,total:a.correct+a.holes,outcome}:null});
  return {version:2,id,damage:a.holes,status:a.holes===10?'sunk':outcome==='won'?(a.campaign.levelId===10?'complete':'between'):'active',levelId:a.campaign.levelId,attemptId:a.id,attempts:[attempt],errors:Array.from({length:a.holes},(_,i)=>({id:'migration_'+a.id.slice(0,70)+'_'+i,attemptId:a.id})),credits:[],rewards:{water:0,suns:0,paidWater:0,paidSuns:0},settlement:null};
 }
 // Legacy grants are already in garden. Count the current run for accuracy,
 // preserve its old target, and never place those grants in the escrow again.
 function migrateNavyJourney(root){
  if(!object(root?.navy))return false;let j=root.navy.journey;
  const legacy=j===undefined||j===null;if(!legacy){if(!validNavyJourney(j))return false}else{j=legacyNavyJourney(root);if(!j)return null}
  const a=root.navy.active;if(a?.campaign){if(a.campaign.kind!=='navy'||a.id!==j.attemptId||a.campaign.levelId!==j.levelId||(a.campaign.journeyId!==undefined&&a.campaign.journeyId!==j.id))return false;a.campaign.journeyId=j.id;if(legacy){a.campaign.legacyBoats=legacyBoatCounts[a.campaign.levelId-1];a.campaign.legacyTargetArrows=a.campaign.legacyBoats*10}}
  root.navy.journey=j;return j;
 }
 function navyJourney(root=getState()){const j=root?.navy?.journey;return j===undefined||j===null?legacyNavyJourney(root):j}
 function journeySummary(j,duplicate=false){const correct=j.attempts.reduce((sum,a)=>sum+a.correct,0);return {journeyId:j.id,status:j.status,damage:j.damage,wrong:j.damage,remaining:10-j.damage,attemptId:j.attemptId,levelId:j.levelId,correct,total:correct+j.damage,water:j.rewards.water,suns:j.rewards.suns,paidWater:j.rewards.paidWater,paidSuns:j.rewards.paidSuns,pendingWater:j.rewards.water-j.rewards.paidWater,pendingSuns:j.rewards.suns-j.rewards.paidSuns,priorWater:j.attempts.reduce((sum,a)=>sum+a.priorWater,0),priorSuns:j.attempts.reduce((sum,a)=>sum+a.priorSuns,0),duplicate}}
 function beginNavyAttempt(root,{id,levelId,journeyId,resetJourney=false}={}){
  if(!validRoot(root)||!object(root.navy)||!idOK(id)||!Number.isInteger(levelId)||!level('navy',levelId)||!canStartState(root,'navy',levelId)||typeof resetJourney!=='boolean'||(journeyId!==undefined&&!idOK(journeyId)))return false;
  const existing=navyJourney(root);if(existing&&!validNavyJourney(existing))return false;
  if(!resetJourney&&existing){if(existing.attempts.some(a=>a.id===id))return existing.attemptId===id&&existing.levelId===levelId?journeySummary(existing,true):false;if(existing.damage===10||existing.settlement||existing.attempts.length>=50000)return false}
  const freshJourney=!existing||resetJourney,newId=journeyId||'journey_'+id.slice(0,80);if(freshJourney&&existing&&newId===existing.id)return false;
  let previousSummary=null;if(resetJourney&&existing){root.navy.journey=existing;previousSummary=finishNavyJourney(root,{reason:existing.status==='sunk'?'sunk':existing.status==='complete'?'complete':'ended'});if(!previousSummary)return false}
  const j=freshJourney?{version:2,id:newId,damage:0,status:'active',levelId,attemptId:id,attempts:[],errors:[],credits:[],rewards:{water:0,suns:0,paidWater:0,paidSuns:0},settlement:null}:existing;
  if(!freshJourney){const previous=j.attempts[j.attempts.length-1];if(previous.outcome===null)previous.outcome='abandoned'}j.attempts.push(newAttempt(id,levelId,j.damage));j.levelId=levelId;j.attemptId=id;j.status='active';root.navy.journey=j;
  return {...journeySummary(j),...(previousSummary?{previousSummary}:{})};
 }
 function addNavyDamage(root,{attemptId,errorId}={}){
  const j=root?.navy?.journey;if(!j||!validNavyJourney(j)||!idOK(attemptId)||!idOK(errorId))return false;
  const prior=j.errors.find(e=>e.id===errorId);if(prior)return prior.attemptId===attemptId?journeySummary(j,true):false;
  if(j.credits.some(e=>e.id===errorId)||j.attemptId!==attemptId||j.status!=='active'||j.settlement||j.damage>=10)return false;
  j.errors.push({id:errorId,attemptId});j.damage++;j.attempts[j.attempts.length-1].damage++;if(j.damage===10)j.status='sunk';return journeySummary(j);
 }
 function creditNavyWater(root,{attemptId,answerId,amount}={}){
  const j=root?.navy?.journey;if(!j||!validNavyJourney(j)||!idOK(attemptId)||!idOK(answerId)||!integer(amount,10)||amount<1)return false;
  const prior=j.credits.find(e=>e.id===answerId);if(prior)return prior.attemptId===attemptId&&prior.amount===amount?journeySummary(j,true):false;
  if(j.errors.some(e=>e.id===answerId)||j.attemptId!==attemptId||j.status!=='active'||j.settlement||j.credits.length>=10000||amount!==level('navy',j.levelId).rewardMultiplier)return false;
  const a=j.attempts[j.attempts.length-1];if(a.correct>=10000||j.rewards.water+amount>100000)return false;j.credits.push({id:answerId,attemptId,amount});a.correct++;a.water+=amount;j.rewards.water+=amount;return journeySummary(j);
 }
 function settleNavyAttempt(root,{attemptId,outcome,correct,total}={}){
  const j=root?.navy?.journey;if(!j||!validNavyJourney(j)||!idOK(attemptId)||j.attemptId!==attemptId||!['won','sunk'].includes(outcome))return false;
  const a=j.attempts[j.attempts.length-1];if((correct!==undefined&&correct!==a.correct)||(total!==undefined&&total!==a.correct+a.damage))return false;if(a.outcome!==null)return a.outcome===outcome?journeySummary(j,true):false;
  if((outcome==='sunk'&&j.damage!==10)||(outcome==='won'&&j.damage===10)||a.correct+a.damage<1)return false;a.outcome=outcome;a.result={correct:a.correct,total:a.correct+a.damage,outcome};j.status=outcome==='sunk'?'sunk':j.levelId===10?'complete':'between';return journeySummary(j);
 }
 function awardNavySun(root,{attemptId}={}){
  const j=root?.navy?.journey;if(!j||!validNavyJourney(j)||!idOK(attemptId)||j.attemptId!==attemptId||j.settlement)return false;const a=j.attempts[j.attempts.length-1];if(a.outcome!=='won')return false;if(a.sunAwarded)return {...journeySummary(j,true),awarded:0};
  const amount=a.correct*10>=(a.correct+a.damage)*9?level('navy',a.levelId).rewardMultiplier:0;if(j.rewards.suns+amount>100000)return false;a.sunAwarded=true;a.suns=amount;j.rewards.suns+=amount;return {...journeySummary(j),awarded:amount};
 }
 function finishNavyJourney(root,{reason}={}){
  const j=root?.navy?.journey;if(!j||!validNavyJourney(j)||!['sunk','complete','ended'].includes(reason)||!object(root.garden)||!integer(root.garden.water,1000000)||!integer(root.garden.suns,1000000))return false;if(j.settlement)return journeySummary(j,true);
  const last=j.attempts[j.attempts.length-1];if(reason==='sunk'&&j.damage!==10||reason==='complete'&&(j.levelId!==10||last.outcome!=='won'))return false;
  const sunsToAward=j.attempts.reduce((sum,a)=>sum+(!a.sunAwarded&&a.outcome==='won'&&a.correct*10>=(a.correct+a.damage)*9?level('navy',a.levelId).rewardMultiplier:0),0),water=j.rewards.water-j.rewards.paidWater,suns=j.rewards.suns+sunsToAward-j.rewards.paidSuns;if(root.garden.water+water>1000000||root.garden.suns+suns>1000000)return false;
  for(const a of j.attempts)if(a.outcome==='won'&&!a.sunAwarded){a.sunAwarded=true;a.suns=a.correct*10>=(a.correct+a.damage)*9?level('navy',a.levelId).rewardMultiplier:0;j.rewards.suns+=a.suns}
  if(last.outcome===null){last.outcome=reason==='sunk'?'sunk':'abandoned';if(reason==='sunk')last.result={correct:last.correct,total:last.correct+last.damage,outcome:'sunk'}}
  root.garden.water+=water;root.garden.suns+=suns;j.rewards.paidWater=j.rewards.water;j.rewards.paidSuns=j.rewards.suns;j.status=reason;j.settlement={reason,at:new Date().toISOString()};return journeySummary(j);
 }
 function validRoot(root){
  if(!object(root))return false;
  const j=root.navy?.journey;if(!validNavyJourney(j))return false;
  const current=root.progression||fresh();
  // 导入备份也不能把锁定关卡设为进行中，避免越关获得倍率奖励。
  for(const [key,kind]of [['navy','navy'],['training','battle']]){
   const ref=root[key]?.active?.campaign;
   if(ref!==undefined&&ref!==null&&(!object(ref)||ref.kind!==kind||!level(kind,ref.levelId)||!Number.isInteger(ref.levelId)||(ref.levelId>1&&!current[kind]?.cleared?.[ref.levelId-1])))return false;
   if(key==='navy'&&ref){if(ref.journeyId!==undefined&&(!idOK(ref.journeyId)||!j||ref.journeyId!==j.id))return false;if(j&&(root.navy.active.id!==j.attemptId||ref.levelId!==j.levelId||root.navy.active.holes!==j.attempts[j.attempts.length-1].damage||root.navy.active.correct!==j.attempts[j.attempts.length-1].correct))return false;if(ref.legacyBoats!==undefined||ref.legacyTargetArrows!==undefined){if(ref.legacyBoats!==legacyBoatCounts[ref.levelId-1]||ref.legacyTargetArrows!==ref.legacyBoats*10)return false}}
  }
  if(root.progression===undefined)return true;
  const p=root.progression;
  if(!object(p)||p.version!==1||!KINDS.every(kind=>validCampaign(p[kind],kind))||!Array.isArray(p.rewards)||p.rewards.length>100||!Array.isArray(p.transactions)||p.transactions.length>20000)return false;
  const ids=new Set();
  for(const r of p.rewards){if(!object(r)||!idOK(r.id)||ids.has(r.id)||!titleOK(r.title)||!integer(r.cost,10000)||r.cost<1||typeof r.enabled!=='boolean')return false;ids.add(r.id)}
  const transactionIds=new Set();let pending=0;
  for(const t of p.transactions){
   if(!object(t)||!idOK(t.id)||transactionIds.has(t.id)||!idOK(t.rewardId)||!ids.has(t.rewardId)||!titleOK(t.title)||!integer(t.cost,10000)||t.cost<1||!['pending','done','cancelled'].includes(t.status)||!dateOK(t.at)||!dateOK(t.updatedAt))return false;
   if(t.status==='pending')pending++;transactionIds.add(t.id);
  }
  // 兑换只扣可用花朵，收藏原件不删除；无足够花朵的备份不接受。
  const flowers=root.garden?.flowers;
  return Array.isArray(flowers)&&pending<=100&&p.transactions.reduce((sum,t)=>sum+(t.status==='cancelled'?0:t.cost),0)<=flowers.length;
 }
 function ensure(root){if(!root.progression)root.progression=fresh();return root.progression}
 function canStartState(root,kind,id){const l=level(kind,id);return !!l&&(l.id===1||!!data(root)[kind].cleared[l.id-1])}
 function canStart(kind,id){return canStartState(getState(),kind,id)}
 function record(root,result){
  if(!validRoot(root)||!object(result)||!KINDS.includes(result.kind)||!level(result.kind,result.levelId)||!idOK(result.id)||!integer(result.correct,10000)||!integer(result.total,10000)||result.total<1||result.correct>result.total||!OUTCOMES.includes(result.outcome))return false;
  const number=Number(result.levelId),kind=result.kind;
  if(!canStartState(root,kind,number))return false;
  const before=data(root)[kind];
  if(before.completed.includes(result.id))return {duplicate:true,qualified:!!before.cleared[number],nextLevelId:number<10?number+1:null,newlyUnlocked:false};
  if(before.completed.length>=50000)return false;
  const p=ensure(root),campaign=p[kind],r={correct:result.correct,total:result.total,rate:result.correct/result.total,outcome:result.outcome,attemptId:result.id,at:new Date().toISOString()},passed=qualifies(r,kind),newlyUnlocked=passed&&!campaign.cleared[number]&&number<10;
  campaign.completed.push(result.id);
  if(!campaign.best[number]||r.rate>campaign.best[number].rate||(r.rate===campaign.best[number].rate&&r.outcome==='won'))campaign.best[number]=r;
  if(passed&&(!campaign.cleared[number]||r.rate>campaign.cleared[number].rate))campaign.cleared[number]={...r};
  return {duplicate:false,qualified:passed,nextLevelId:number<10?number+1:null,newlyUnlocked};
 }
 function flowerBalance(root=getState()){
  const total=root?.garden?.flowers?.length||0,spent=data(root).transactions.reduce((sum,t)=>sum+(t.status==='cancelled'?0:t.cost),0);
  return {total,spent,available:Math.max(0,total-spent)};
 }
 let initialized=false,kind='battle',editing=null,confirmation=null;
 const el=(tag,className='',text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n};
 const button=(text,fn,className='progression-button')=>{const n=el('button',className,text);n.type='button';n.onclick=fn;return n};
 const notice=message=>C?.toast?.(message);
 function save(fn){const ok=window.Adventure?.update?.(root=>{if(!validRoot(root))return false;return fn(root)});if(ok){refresh();window.AdventureMap?.refresh()}return !!ok}
 function redeem(rewardId,requestId=C?.uid?.()){
  if(!idOK(rewardId)||!idOK(requestId))return false;
  return save(root=>{
   const p=data(root),prize=p.rewards.find(r=>r.id===rewardId);
   if(!prize||!prize.enabled||p.transactions.some(t=>t.id===requestId)||p.transactions.filter(t=>t.status==='pending').length>=100||flowerBalance(root).available<prize.cost)return false;
   const at=new Date().toISOString();ensure(root).transactions.push({id:requestId,rewardId,title:prize.title,cost:prize.cost,status:'pending',at,updatedAt:at});
  });
 }
 function setTransaction(id,status){
  if(!idOK(id)||!['done','cancelled'].includes(status))return false;
  return save(root=>{const t=data(root).transactions.find(t=>t.id===id);if(!t||t.status!=='pending')return false;t.status=status;t.updatedAt=new Date().toISOString()});
 }
 function configureReward({id,title,cost,enabled=true}){
  const cleaned=typeof title==='string'?title.trim():'';
  if(!titleOK(cleaned)||!integer(cost,10000)||cost<1||typeof enabled!=='boolean'||(id!==undefined&&!idOK(id)))return false;
  return save(root=>{const p=ensure(root),existing=id&&p.rewards.find(r=>r.id===id);if(id&&!existing)return false;if(existing){Object.assign(existing,{title:cleaned,cost,enabled})}else{if(p.rewards.length>=100)return false;p.rewards.push({id:C.uid(),title:cleaned,cost,enabled})}});
 }
 function showDialog(id){const d=$(id);if(!d.open)d.showModal()}
 function closeDialog(id){$(id)?.close()}
 function dialog(id,title,subtitle){
  const d=el('dialog','progression-dialog');d.id=id;
  const h=el('header','progression-header'),texts=el('div');texts.append(el('span','progression-eyebrow','英语探险岛'),el('h2','',title),el('p','',subtitle));h.append(texts,button('关闭',()=>d.close(),'progression-close'));d.append(h);document.body.append(d);return d;
 }
 function cardArt(l){const art=el('div','progression-art progression-art-'+l.kind);art.setAttribute('aria-hidden','true');art.style.setProperty('--art-x',`${(l.artIndex%5)*25}%`);art.style.setProperty('--art-y',`${Math.floor(l.artIndex/5)*100}%`);return art}
 function renderLevels(){
  const grid=$('progression-levels');if(!grid)return;grid.replaceChildren();
  for(const tab of document.querySelectorAll('[data-progression-tab]'))tab.setAttribute('aria-selected',String(tab.dataset.progressionTab===kind));
  const campaign=data(getState())[kind];
  for(const l of catalog(kind)){
   const unlocked=canStart(kind,l.id),cleared=!!campaign.cleared[l.id],best=campaign.best[l.id];
   const card=button('',()=>startLevel(l),'progression-level');card.disabled=!unlocked;card.dataset.level=String(l.id);card.dataset.kind=kind;card.dataset.locked=String(!unlocked);card.dataset.cleared=String(cleared);card.setAttribute('aria-label',`第${l.id}关 ${l.title}，${cleared?'已达标':unlocked?'可挑战':'未解锁'}`);
   const cover=cardArt(l);cover.append(el('span','progression-level-number',`第 ${l.id} 关`));if(!unlocked)cover.append(el('span','progression-lock','未解锁'));if(cleared)cover.append(el('span','progression-cleared','达标通关'));
   const body=el('div','progression-level-body');body.append(el('h3','',l.title),el('p','progression-level-scenario',kind==='battle'?`${l.monster} · ${l.scene}`:l.scene));
   body.append(el('p','progression-level-rule',kind==='battle'?`听力·词义·翻译·对话 · 反应题 ${l.seconds} 秒`:`${l.boats} 艘草船 · 每船10箭 · 共${l.targetArrows}箭`));
   body.append(el('p','progression-level-scope',`课本 U${l.units.join(' / U')} · 奖励 ${l.rewardMultiplier} 倍`));
   if(kind==='battle'&&l.scope?.dialogueCount===1)body.append(el('p','progression-level-scope','1组课本对话，搭配听力、词义与翻译'));
   body.append(el('p','progression-level-best',best?`最佳正确率 ${Math.round(best.rate*1000)/10}%${cleared?l.id===10?' · 全路线已通关':' · 下一站已开启':best.outcome==='won'&&requiresAccuracy(kind)?' · 达到90%再解锁':''}`:unlocked?'准备好，一起出发！':requiresAccuracy(kind)?'上一关获胜且正确率达到90%后开启':'上一关每艘船收满10支箭后开启'));
   body.append(el('span','progression-level-go',cleared?'再次挑战 →':unlocked?'出发挑战 →':'等待开启'));
   card.append(cover,body);grid.append(card);
  }
  $('progression-route-copy').textContent=kind==='battle'?'孩子担任英文通讯员，听单词、解词义、读句子、接对话，帮助英雄守护城市。累计答对十题获胜，累计答错十题失败。':'听英文，找出单词雨中的答案。第几关就有几艘船，每船收齐十支箭即可晋级；整趟旅程累计十次漏水会沉船，过关和重玩不恢复。奖励在本趟旅程结束时一起送入花园。';
 }
 function startLevel(l){
  if(!canStart(l.kind,l.id)){notice(requiresAccuracy(l.kind)?'先在上一关获胜，并达到90%正确率。':'先为上一关每艘船收满10支箭。');return}
  const api=l.kind==='battle'?window.EnglishTraining?.start:window.Adventure?.startCampaign;
  if(typeof api!=='function'){notice('关卡还在准备，请稍后再试。');return}
  closeDialog('progression-campaign');
  if(l.kind==='battle'){window.Adventure.switchView('training');window.EnglishTraining.start('dialogue',{campaign:l})}
  else{window.Adventure.switchView('voyage');window.Adventure.startCampaign(l)}
  refresh();
 }
 function startFree(){
  closeDialog('progression-campaign');
  if(kind==='navy'){window.Adventure.switchView('voyage');window.Adventure.startFree()}
  else{window.Adventure.switchView('training');window.EnglishTraining.start('dialogue',{campaign:null})}
 }
 function renderCampaignArt(){
  const river=$('river'),l=level('navy',getState()?.navy?.active?.campaign?.levelId);if(!river)return;
  if(l){river.style.setProperty('--campaign-scene-x',`${(l.artIndex%5)*25}%`);river.style.setProperty('--campaign-scene-y',`${Math.floor(l.artIndex/5)*100}%`)}
 }
 function renderRewards(){
  const list=$('progression-rewards');if(!list)return;list.replaceChildren();const balance=flowerBalance(),p=data(getState());
  $('progression-flower-balance').textContent=`可用 ${balance.available} 朵 · 累计开花 ${balance.total} 朵`;
  const rewards=p.rewards.filter(r=>r.enabled);
  if(!rewards.length)list.append(el('p','progression-empty','家长还没有设置奖品。先去花园种花，约定好奖励后就能兑换。'));
  for(const r of rewards){const card=el('article','progression-reward'),texts=el('div');texts.append(el('h3','',r.title),el('p','',`${r.cost} 朵花`));const action=button(balance.available>=r.cost?'兑换奖励':'花朵还不够',()=>confirmReward(r));action.disabled=balance.available<r.cost;card.append(texts,action);list.append(card)}
  const log=$('progression-child-transactions');log.replaceChildren();
  for(const t of p.transactions.slice(-30).reverse()){const row=el('div','progression-transaction');row.append(el('strong','',t.title),el('span','',`${t.cost} 朵 · ${{pending:'等待家长兑现',done:'已兑现',cancelled:'已取消，花朵已退回'}[t.status]}`));log.append(row)}
 }
 function confirmReward(reward){
  confirmation={rewardId:reward.id,id:C.uid()};$('progression-confirm-title').textContent=`兑换“${reward.title}”`;
  $('progression-confirm-copy').textContent=`使用 ${reward.cost} 朵可用花朵。提交后等待家长兑现，花朵收藏仍保留。`;
  const submit=$('progression-confirm-submit');submit.hidden=false;submit.disabled=false;$('progression-confirm-status').textContent='';showDialog('progression-confirm');
 }
 function renderManagement(){
  const list=$('progression-managed-rewards');if(!list)return;list.replaceChildren();const p=data(getState()),b=flowerBalance();
  $('progression-management-balance').textContent=`累计开花 ${b.total} 朵 · 可用 ${b.available} 朵 · 待兑现 ${p.transactions.filter(t=>t.status==='pending').length} 项`;
  if(!p.rewards.length)list.append(el('p','progression-empty','奖品列表为空，请先写下与孩子约定的奖励。'));
  for(const r of p.rewards){
   const row=el('article','progression-managed-reward'),texts=el('div');texts.append(el('strong','',r.title),el('small','',`${r.cost} 朵花 · ${r.enabled?'可兑换':'已暂停'}`));const actions=el('div','progression-row-actions');
   actions.append(button('编辑',()=>{editing=r.id;$('progression-prize-title').value=r.title;$('progression-prize-cost').value=String(r.cost);$('progression-prize-submit').textContent='保存修改';$('progression-prize-title').focus()},'progression-secondary'),button(r.enabled?'暂停兑换':'开放兑换',()=>configureReward({...r,enabled:!r.enabled}),'progression-secondary'));
   row.append(texts,actions);list.append(row);
  }
  const pending=$('progression-parent-pending');pending.replaceChildren();
  const open=p.transactions.filter(t=>t.status==='pending');if(!open.length)pending.append(el('p','progression-empty','目前没有待兑现的奖励。'));
  for(const t of open.slice().reverse()){
   const row=el('article','progression-managed-reward'),texts=el('div');texts.append(el('strong','',t.title),el('small','',`${t.cost} 朵花 · ${new Date(t.at).toLocaleDateString('zh-CN')}`));const actions=el('div','progression-row-actions');actions.append(button('确认已兑现',()=>setTransaction(t.id,'done')),button('取消并返花',()=>setTransaction(t.id,'cancelled'),'progression-secondary'));row.append(texts,actions);pending.append(row);
  }
  const history=$('progression-parent-history');history.replaceChildren();
  for(const t of p.transactions.filter(t=>t.status!=='pending').slice(-30).reverse()){const row=el('div','progression-transaction');row.append(el('strong','',t.title),el('span','',`${t.cost} 朵 · ${t.status==='done'?'已兑现':'已取消返花'}`));history.append(row)}
 }
 function resetForm(){editing=null;$('progression-prize-form')?.reset();if($('progression-prize-submit'))$('progression-prize-submit').textContent='添加奖品'}
 function render(){renderLevels();renderRewards();renderManagement();renderCampaignArt()}
 const refresh=()=>{if(initialized)render()};
 function show(which='campaign',selectedKind){if(KINDS.includes(selectedKind))kind=selectedKind;init();render();showDialog(which==='manage'?'progression-management':which==='rewards'?'progression-exchange':'progression-campaign')}
 function init(){
  if(initialized||!window.Adventure||!document.body)return;initialized=true;
  const campaign=dialog('progression-campaign','闯关探险','两条路线，各十关。草船收满箭晋级；守护战获胜并达到90%正确率晋级。');
  const tabs=el('div','progression-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','选择冒险路线');
  for(const [value,label]of [['battle','地球守护战'],['navy','草船借箭']]){const b=button(label,()=>{kind=value;renderLevels()},'progression-tab');b.dataset.progressionTab=value;b.setAttribute('role','tab');tabs.append(b)}
  const route=el('p','progression-route-copy');route.id='progression-route-copy';const free=el('div','progression-free-route');free.append(el('span','','想按家长选择的词库练习？'),button('进入自由练习 →',startFree,'progression-secondary'));const grid=el('div','progression-levels');grid.id='progression-levels';const body=el('div','progression-body');body.append(route,free,grid);campaign.append(tabs,body);
  const exchange=dialog('progression-exchange','花朵兑换站','用开出的花兑换家长约定的奖励，收藏的花仍然保留。'),eb=el('div','progression-body');const balance=el('p','progression-balance');balance.id='progression-flower-balance';const prizes=el('div','progression-rewards');prizes.id='progression-rewards';const log=el('div','progression-transactions');log.id='progression-child-transactions';eb.append(balance,prizes,el('h3','progression-section-title','我的兑换记录'),log);exchange.append(eb);
  const management=dialog('progression-management','家长奖励管理','与孩子约定奖品、所需花朵，并记录兑现。此入口是家长管理，不设账号或密码。'),mb=el('div','progression-body');const mbalance=el('p','progression-balance');mbalance.id='progression-management-balance';
  const form=el('form','progression-prize-form');form.id='progression-prize-form';const title=el('input');title.id='progression-prize-title';title.type='text';title.maxLength=80;title.required=true;title.placeholder='如：一起去公园、选一本书';const tl=el('label','','奖品文字');tl.append(title);const cost=el('input');cost.id='progression-prize-cost';cost.type='number';cost.inputMode='numeric';cost.min='1';cost.max='10000';cost.step='1';cost.required=true;cost.value='3';const cl=el('label','','所需花朵');cl.append(cost);const submit=el('button','progression-button','添加奖品');submit.id='progression-prize-submit';submit.type='submit';form.append(tl,cl,submit,button('清空表单',resetForm,'progression-secondary'));
  form.onsubmit=event=>{event.preventDefault();const raw=cost.value.trim();if(!/^\d{1,5}$/.test(raw)||!configureReward({...(editing?{id:editing}:{}),title:title.value,cost:Number(raw),enabled:editing?data(getState()).rewards.find(r=>r.id===editing)?.enabled:true})){notice('请填写奖品文字和1至10000之间的整数花朵数量。');return}resetForm();notice('家长奖品已保存。')};
  const manageList=el('div');manageList.id='progression-managed-rewards';const pending=el('div');pending.id='progression-parent-pending';const past=el('div');past.id='progression-parent-history';mb.append(mbalance,form,manageList,el('p','progression-management-note','奖励由家长兑现。这里记录约定，不会自动控制手机使用时间。'),el('h3','progression-section-title','待兑现'),pending,el('h3','progression-section-title','最近的兑现记录'),past);management.append(mb);
  const confirm=dialog('progression-confirm','确认兑换',''),cb=el('div','progression-body');confirm.classList.add('progression-confirm');const ct=el('h3');ct.id='progression-confirm-title';const cp=el('p');cp.id='progression-confirm-copy';const status=el('p','progression-balance');status.id='progression-confirm-status';status.setAttribute('role','status');const cs=button('确认使用花朵',()=>{if(!confirmation)return;cs.disabled=true;const request=confirmation;if(redeem(request.rewardId,request.id)){confirmation=null;cs.hidden=true;status.textContent='已提交，等待家长兑现。'}else{cs.disabled=false;status.textContent='暂时无法兑换，请检查花朵余额或奖品是否开放。'}});cs.id='progression-confirm-submit';cb.append(ct,cp,status,cs);confirm.append(cb);confirm.addEventListener('close',()=>{confirmation=null});
  // 复用地图底部空白说明栏，避免新增浮动入口盖住建筑。
  const caption=document.querySelector('#map-view .map-caption');if(caption){caption.classList.add('progression-caption');const actions=el('div','progression-map-actions');actions.append(button('闯关探险',()=>show('campaign'),'progression-map-entry'),button('花朵兑换',()=>show('rewards'),'progression-map-exchange'));caption.append(actions)}
  const garden=$('garden-view');if(garden){const bar=el('div','progression-garden-bar');bar.append(button('花朵兑换站 →',()=>show('rewards'),'progression-secondary'));garden.prepend(bar)}
  const settings=$('settings-dialog');if(settings){const entry=el('section','progression-parent-entry');entry.append(el('h3','','家长奖励管理'),el('p','note','设置约定的奖品与所需花朵，确认兑现或取消返花。'),button('管理奖品与兑现',()=>show('manage'),'progression-button'));settings.append(entry)}
  const overlay=$('overlay');if(overlay){const back=button('返回选关',()=>{window.Adventure.pause(false);document.body.classList.remove('voyage-focus');show('campaign','navy')},'progression-back-levels');back.id='progression-navy-back';overlay.insertBefore(back,$('start'))}
  const river=$('river');if(river){const backdrop=el('div','progression-navy-scene');backdrop.setAttribute('aria-hidden','true');river.prepend(backdrop)}
  document.addEventListener('adventure-view',refresh);window.addEventListener('storage',event=>{if(event.key==='english-adventure-v2')refresh()});
  render();
 }
 window.Progression={level,canStart,record,validRoot,validNavyJourney,navyJourney,migrateNavyJourney,beginNavyAttempt,addNavyDamage,creditNavyWater,settleNavyAttempt,awardNavySun,finishNavyJourney,init,render,refresh,show,startFree,flowerBalance,redeem,setTransaction,configureReward};
})();
