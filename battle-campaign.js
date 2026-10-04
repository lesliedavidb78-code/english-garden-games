/* Independent textbook campaign: mixed questions and atlas characters.
   Later monsters use browser animation, never the first monster's movie. */
(() => {
 'use strict';
 const C=window.GameCommon,D=window.TrainingData;
 const level=a=>a?.campaign?.kind==='battle'?window.Progression?.level('battle',a.campaign.levelId):null;
 const pools=l=>{
  const units=new Set(l.units),words=[];
  for(const u of units){const pack=C.PACKS.find(p=>p.id===`pep5-photo-upper-u${u}`);for(const w of pack?.words||[])words.push({en:w[0],zh:w[1],unit:u})}
  return {words:[...new Map(words.map(w=>[w.en.toLowerCase(),w])).values()],sentences:D.sentences.filter(s=>units.has(s.unit)),dialogues:D.dialogues.filter(d=>units.has(d.unit))};
 };
 function build(l){
  const p=pools(l),remaining={},previous={};let lastEnglish='';
  const materials={listening:p.words,meaning:p.words,translation:p.sentences,dialogue:p.dialogues};
  const take=kind=>{
   if(!remaining[kind]?.length)remaining[kind]=C.shuffle(materials[kind]);
   const candidates=remaining[kind],different=candidates.findIndex(w=>w.en!==lastEnglish&&w.en!==previous[kind]);
   const index=different<0?Math.max(0,candidates.findIndex(w=>w.en!==lastEnglish)):different;
   const w=candidates.splice(index,1)[0];previous[kind]=w.en;lastEnglish=w.en;return w;
  };
  const items=[];
  for(let block=0;block<2;block++){
   const kinds=C.shuffle(Object.entries(l.questionMixPerTen).flatMap(([kind,n])=>Array(n).fill(kind))),reactionSlots=C.shuffle(kinds.map((kind,i)=>kind==='listening'||kind==='meaning'?i:null).filter(i=>i!==null)).slice(0,l.reactionQuestionCountPerTen||1);
   for(let slot=0;slot<kinds.length;slot++){
    const kind=kinds[slot],w=take(kind),english=kind==='listening'||kind==='dialogue',expected=english?w.en:w.zh;
    const distractors=kind==='dialogue'?p.sentences:materials[kind];
    const others=C.shuffle([...new Set(distractors.map(v=>english?v.en:v.zh).filter(v=>v!==expected))]).slice(0,3);
    const questionId=`${kind}:${w.unit}:${kind==='translation'?w.id:(w.q||w.en).toLowerCase()}`;
    items.push({...w,kind,questionId,hearText:kind==='dialogue'?w.q:w.en,expected,options:C.shuffle([expected,...others]),english,hear:kind==='listening'?'word':'meaning',direction:'en-zh',timed:reactionSlots.includes(slot)});
   }
  }
  // A one-dialogue unit must not repeat that dialogue across a block boundary.
  for(let i=1;i<items.length;i++)if(items[i].questionId===items[i-1].questionId){const end=Math.min(items.length,(Math.floor(i/10)+1)*10),swap=items.findIndex((w,j)=>j>i&&j<end&&w.questionId!==items[i-1].questionId&&items[i].questionId!==items[j-1].questionId&&(j+1>=end||items[i].questionId!==items[j+1].questionId));if(swap>=0)[items[i],items[swap]]=[items[swap],items[i]]}
  return items;
 }
 const labels={listening:'听力信号',meaning:'词义密码',translation:'句子翻译',dialogue:'对话回应'};
 function question(w){return w.kind==='listening'?'听英文，找出对应单词。':w.kind==='meaning'?w.en:w.kind==='translation'?w.en:w.q}
 function story(a,w){
  const l=level(a),stats={correct:a.correct,wrong:a.battle?.wrong||0},act=stats.correct<3?'接通救援信号':stats.correct<6?'护送居民避难':'点亮守护护盾';
  const terminal=a.correct>=10?'won':stats.wrong>=10?'lost':null;
  const result=a.phase==='done'?`本次正确率${Math.round(a.correct/(a.index+1)*100)}%，获得${a.correct*l.rewardMultiplier}水滴${terminal==='won'&&a.correct/(a.index+1)>=.9?`、${l.rewardMultiplier}太阳。${l.id<10?'下一关已解锁！':'全部关卡完成！'}`:'。获胜且正确率达到90%可解锁下一关。'}`:null;
  return {mission:`第${l.id}关 · ${l.scene} · ${terminal==='won'?'守护成功':terminal==='lost'?'暂时撤退':act}`,
   context:result||(w.kind==='listening'?'听清英文发音，选择同一个单词。':w.kind==='meaning'?'破解词义密码，选择这个英文的中文意思。':w.kind==='translation'?'读懂英文句子，选择对应中文翻译。':w.context||'听清问句，选择合适的回应。'),
   heroLine:terminal==='won'?`${l.scene}的护盾已经点亮！感谢你的英语支援。`:stats.wrong>=5?'防线受损！别慌，记住正确答案，我们一起守住这里。':`${act}，为${l.scene}提供英语支援！`,
   monsterLine:terminal==='lost'?`${l.monster}暂时占了上风。复习后再来挑战！`:`${l.monster}发起挑战！`};
 }
 function intro(a){const l=level(a);return [
  {speaker:l.monster,text:`${l.scene}的通讯已经被我切断！我要占领这里，再逼近地球。谁敢阻挡我？`},
  {speaker:'奥特曼',text:`我们会守护大家的家园！小小通讯员，现在需要你的英语力量，帮我夺回${l.scene}。`},
  {speaker:'守护队',text:`本关学习：${l.subtitle}。听力、词义、翻译与对话都会出现；答对10题获胜，累计答错10题撤退。标有闪电的题，要在${l.seconds}秒内回应。`}
 ]}
 let bound=null,observer=null,frame=0,currentLevel=null;
 function fit(){
  const el=bound,l=currentLevel;if(!el||!l||l.videoAvailable)return;
  const b=el.getBoundingClientRect(),chars=el.querySelector('.battle-characters'),hud=el.querySelector('.battle-hud').getBoundingClientRect(),dialogue=el.querySelector('.battle-dialogue').getBoundingClientRect(),landscape=b.width>b.height;
  const top=Math.max(landscape?hud.bottom-b.top+14:hud.bottom-b.top+12,landscape?b.height*.27:b.height*.18),bottom=landscape?b.height-12:Math.min(b.height-12,dialogue.top-b.top-12);
  chars.style.top=`${top}px`;chars.style.height=`${Math.max(45,bottom-top)}px`;
  const mover=el.querySelector('.battle-monster .battle-mover'),r=mover?.getBoundingClientRect(),sprite=el.querySelector('.campaign-monster-sprite');
  if(r&&sprite){const size=Math.min(r.width,r.height);sprite.style.width=`${size}px`;sprite.style.height=`${size}px`;sprite.style.marginLeft=`${-size/2}px`}
  const scene=el.querySelector('.campaign-scene-sprite');
  if(scene&&b.width&&b.height){const cw=2115/5,ch=744/2,scale=Math.max(b.width/cw,b.height/ch),col=l.artIndex%5,row=Math.floor(l.artIndex/5);scene.style.backgroundSize=`${2115*scale}px ${744*scale}px`;scene.style.backgroundPosition=`${-col*cw*scale+(b.width-cw*scale)/2}px ${-row*ch*scale+(b.height-ch*scale)/2}px`}
 }
 function queueFit(){cancelAnimationFrame(frame);frame=requestAnimationFrame(fit)}
 function apply(a){
  const el=document.getElementById('dialogue-battle'),l=level(a);document.body.classList.toggle('training-campaign',!!l);
  if(!el)return;el.classList.toggle('campaign-atlas',!!l&&!l.videoAvailable);el.dataset.campaignLevel=l?String(l.id):'';
  if(bound!==el){observer?.disconnect();bound=el;observer=window.ResizeObserver?new ResizeObserver(queueFit):null;observer?.observe(el);observer?.observe(el.querySelector('.battle-characters'));observer?.observe(el.querySelector('.battle-dialogue'));observer?.observe(el.querySelector('.battle-hud'))}
  currentLevel=l;
  if(!l||l.videoAvailable){const chars=el.querySelector('.battle-characters');chars.style.removeProperty('top');chars.style.removeProperty('height')}
  const oldMonster=el.querySelector('.battle-monster img.battle-figure');if(oldMonster)oldMonster.hidden=!!l&&!l.videoAvailable;
  let sprite=el.querySelector('.campaign-monster-sprite');if(!sprite){sprite=document.createElement('div');sprite.className='battle-figure campaign-monster-sprite';sprite.setAttribute('role','img');oldMonster.after(sprite)}sprite.hidden=!l||l.videoAvailable;
  let scene=el.querySelector('.campaign-scene-sprite');if(!scene){scene=document.createElement('div');scene.className='campaign-scene-sprite';scene.setAttribute('aria-hidden','true');el.querySelector('.battle-backdrop').prepend(scene)}scene.hidden=!l||l.videoAvailable;
  const labels=el.querySelectorAll('.battle-health-label strong');if(labels[1])labels[1].textContent=l?.monster||'怪兽';el.setAttribute('aria-label',l?`第${l.id}关：奥特曼对战${l.monster}，守护${l.scene}`:'奥特曼与怪兽的英语对话大战');
  el.classList.toggle('campaign-timed',!!l&&!!a.items?.[a.index]?.timed&&a.phase==='ready');
  if(l){sprite.setAttribute('aria-label',l.monster);sprite.style.backgroundPosition=`${l.artIndex%5*25}% ${Math.floor(l.artIndex/5)*100}%`;if(a.correct>=10)el.querySelector('[data-battle="result-title"]').textContent=`${l.scene}守护成功！`}
  if(l&&!l.videoAvailable)oldMonster.before(sprite);else oldMonster.after(sprite);
  queueFit();
 }
 window.addEventListener('resize',queueFit);window.addEventListener('orientationchange',queueFit);
 window.BattleCampaign={level,pools,build,question,story,intro,apply,labels};
})();
