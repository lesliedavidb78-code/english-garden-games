(() => {
  'use strict';
  const C=GameCommon,$=C.$,KEY='english-adventure-v2',RELEASE='10.4-03';
  const fingerprint=text=>{let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return `${text.length}:${h>>>0}`};
  const freshGarden=()=>({version:1,app:'garden',settings:{pack:'pep5-photo-upper-all'},custom:[],water:0,suns:0,growth:0,selectedSeed:0,seedGrowth:[0,0,0,0,0,0],flowers:[],history:[],active:null});
  const freshNavy=()=>({totalArrows:0,history:[],legacyHistory:[],active:null});
  const validGarden=s=>C.validBase(s,'garden')&&C.validPlanting(s)&&C.int(s.water)&&C.int(s.suns)&&C.int(s.growth,99)&&Array.isArray(s.flowers)&&s.flowers.length<=10000&&s.flowers.every(f=>f&&C.int(f.variety,5)&&Number.isFinite(Date.parse(f.at)))&&C.validRound(s.active)&&(s.active===null||['spell','listen'].includes(s.active.mode));
  const validActive=a=>a===null||(a&&typeof a.id==='string'&&C.validWord(a.word)&&C.int(a.index,10000)&&C.int(a.correct,a.index+1)&&C.int(a.streak,10)&&C.int(a.holes,10000)&&C.int(a.batchCorrect,10)&&['audio','sail'].includes(a.mode)&&['word','meaning'].includes(a.language)&&(a.campaign?campaignReference(a.campaign)&&a.seconds===Progression.level('navy',a.campaign.levelId).seconds:[10,15,20,105].includes(a.seconds))&&Number.isFinite(a.remaining)&&a.remaining>=0&&a.remaining<=a.seconds*1000&&['ready','correct','wrong','won','sunk'].includes(a.phase)&&typeof a.paused==='boolean'&&(a.seenWords===undefined||(Array.isArray(a.seenWords)&&a.seenWords.length<=1000&&new Set(a.seenWords).size===a.seenWords.length&&a.seenWords.every(x=>typeof x==='string'&&x.length<=40)))&&(a.lastReview===undefined||(a.lastReview&&C.validWord(a.lastReview.word)&&['correct','wrong','timeout'].includes(a.lastReview.outcome))));
  const validNavy=n=>n&&C.int(n.totalArrows)&&Array.isArray(n.history)&&n.history.length<=20000&&n.history.every(h=>h&&typeof h.id==='string'&&Number.isFinite(Date.parse(h.at))&&C.int(h.total,10000)&&h.total>0&&C.int(h.correct,h.total))&&Array.isArray(n.legacyHistory)&&n.legacyHistory.length<=20000&&n.legacyHistory.every(h=>h&&typeof h.id==='string'&&Number.isFinite(Date.parse(h.at))&&C.int(h.total,10)&&h.total===10&&C.int(h.correct,10))&&validActive(n.active);
  const validate=s=>s&&s.version===2&&s.app==='adventure'&&validGarden(s.garden)&&validNavy(s.navy)&&TrainingData.validState(s.training)&&(!window.Progression||Progression.validRoot(s))&&s.settings&&['audio','sail'].includes(s.settings.mode)&&['word','meaning'].includes(s.settings.language)&&[10,15,20,105].includes(s.settings.seconds)&&Array.isArray(s.imported)&&s.imported.every(x=>typeof x==='string');
  let state,blocked=false;
  function convertLegacy(n){if(!C.validBase(n,'navy')||!C.int(n.totalArrows))throw Error('旧借箭备份不正确');const out=freshNavy();out.totalArrows=n.totalArrows;out.legacyHistory=C.copy(n.history);if(n.active&&Array.isArray(n.active.words)&&n.active.words.every(C.validWord)&&!['done','victory'].includes(n.active.phase)) {const a=n.active;out.active={id:a.id,word:a.words[Math.min(a.index,9)],index:a.index,correct:a.correct||0,streak:0,holes:0,batchCorrect:0,mode:'audio',language:a.mode==='meaning'?'meaning':'word',seconds:20,remaining:20000,phase:a.phase==='answered'?(a.lastOK?'correct':'wrong'):'ready',paused:true,legacy:true}}return out}
  try{const raw=localStorage.getItem(KEY);if(raw){state=JSON.parse(raw);if(!validate(state))throw Error('invalid')}else{state={version:2,app:'adventure',settings:{mode:'audio',language:'word',seconds:20},garden:freshGarden(),navy:freshNavy(),imported:[]};const g=localStorage.getItem('english-garden-v1'),n=localStorage.getItem('english-navy-v1');if(g){const old=JSON.parse(g);if(!validGarden(old))throw Error('garden');state.garden=old;state.imported.push(fingerprint(g))}if(n){const old=JSON.parse(n);state.navy=convertLegacy(old);state.imported.push(fingerprint(n))}if(!validate(state))throw Error('invalid');localStorage.setItem(KEY,JSON.stringify(state))}}catch(e){blocked=true;state={version:2,app:'adventure',settings:{mode:'audio',language:'word',seconds:20},garden:freshGarden(),navy:freshNavy(),imported:[]};C.toast('旧存档无法读取，原数据已保留。请先导出原始备份，或导入有效备份。')}
  function reloadState(){if(blocked)return;try{const raw=localStorage.getItem(KEY);if(raw){const s=JSON.parse(raw);if(!validate(s))throw Error('invalid');state=s}}catch(e){blocked=true;C.toast('存档无法读取，已停止保存并保留原始数据。')}}
  function update(fn){reloadState();if(blocked){C.toast('原存档已保留，请在家长设置备份或恢复。');return false}const next=C.copy(state);if(fn(next)===false)return false;if(!validate(next)){C.toast('进度未保存，数据校验未通过。');return false}try{localStorage.setItem(KEY,JSON.stringify(next));state=next;return true}catch(e){C.toast('储存空间不足，进度未保存。');return false}}
  // Expand the old demo preset once, preserving custom vocabulary and current questions.
  if(!blocked&&!state.vocabularyRevision)update(s=>{if(['nature','life','action'].includes(s.garden.settings.pack))s.garden.settings.pack='pep5-all';s.vocabularyRevision=1});
  if(!blocked&&!state.garden.photoVocabularyRevision)update(s=>{if(C.migratePhotoPack(s.garden))C.retargetNavy(s)});
  function renderVocabulary(){const level=navyLevel(active()),words=C.words(navyGarden()),pack=C.PACKS.find(p=>p.id===state.garden.settings.pack);$('vocabulary-summary').textContent=`当前词库：${level?'闯关第'+level.id+'关 · 单元'+level.units.join('、'):pack?.name||'我的课本词汇'} · ${words.length} 个词条（单词＋短语）`;$('pack-count').textContent=`已选 ${C.words(state.garden).length} 个词条。目标词和干扰项都来自所选范围。切换范围会重新准备练习，已得奖励保留。`;}
  let running=false,lastFrame=0,spawnClock=0,targetClock=0,raf=0,drops=[],pendingEnd=false,view='voyage',selectedAnswer=null,endTimer=0;
  const active=()=>state.navy.active;
  function campaignReference(ref){return !!ref&&ref.kind==='navy'&&Number.isInteger(ref.levelId)&&!!window.Progression?.level('navy',ref.levelId)}
  const navyLevel=a=>a?.campaign?window.Progression?.level('navy',a.campaign.levelId):null;
  const arrowTarget=(a=active())=>navyLevel(a)?.targetArrows||10;
  const rewardMultiplier=(a=active())=>navyLevel(a)?.rewardMultiplier||1;
  function navyGarden(a=active()){const level=navyLevel(a);if(!level)return state.garden;const entries=level.units.flatMap(unit=>C.PACKS.find(p=>p.id==='pep5-photo-upper-u'+unit)?.words||[]);return {...state.garden,settings:{...state.garden.settings,pack:'custom'},custom:[...new Map(entries.map(w=>[w[0],w])).values()]}}
  function renderCampaignFleet(a){const level=navyLevel(a),fleet=document.querySelector('.fleet');let escorts=$('campaign-fleet');if(!escorts){escorts=document.createElement('div');escorts.id='campaign-fleet';escorts.className='campaign-fleet';fleet.prepend(escorts)}escorts.replaceChildren();$('river').classList.toggle('navy-campaign-multi',!!level&&level.boats>1);document.body.classList.toggle('navy-campaign',!!level);let info=$('navy-campaign-info');if(!info){info=document.createElement('p');info.id='navy-campaign-info';info.className='navy-campaign-info';$('vocabulary-summary').after(info)}info.hidden=!level;if(!level){$('boat-image').alt='草船与稻草士兵';return;}info.textContent=`闯关第${level.id}关 · ${level.boats}艘船 / ${level.targetArrows}支箭 · 奖励${level.rewardMultiplier}倍 · 胜利且正确率90%解锁`;const current=Math.min(level.boats,Math.floor(Math.max(0,a.correct-1)/10)+1);let escortIndex=0;for(let i=0;i<level.boats;i++){if(i===current-1)continue;const ship=document.createElement('div');ship.className='campaign-escort';ship.style.left=(escortIndex*40)+'%';ship.style.bottom=(50+escortIndex*35)+'px';escortIndex++;const image=document.createElement('img');image.src='assets/straw-soldier-boat-clean.png';image.alt=`第${i+1}艘稻草兵船`;const label=document.createElement('span');label.textContent=`${i+1}号船 ${Math.min(10,Math.max(0,a.correct-i*10))}/10`;ship.append(image,label);escorts.append(ship)}const nextBoat=Math.min(level.boats,Math.floor(a.correct/10)+1);$('boat-image').alt=`第${current}艘主草船与稻草士兵`;$('question-number').textContent=`第${a.index+1}题 · 为${nextBoat}号船收箭`}
  function startCampaign(requested){const level=window.Progression?.level('navy',requested?.id);if(!level||!Progression.canStart('navy',level.id)){C.toast('先以90%以上正确率完成前一关，再解锁这一关。');return false}pause(false);switchView('voyage');const options={mode:'audio',language:$('language').value,seconds:level.seconds};const draw=C.drawWord(navyGarden({campaign:{kind:'navy',levelId:level.id}}));if(!update(s=>{s.navy.active={id:C.uid(),word:draw.word,seenWords:draw.seenWords,index:0,correct:0,streak:0,holes:0,batchCorrect:0,...options,remaining:options.seconds*1000,phase:'ready',paused:true,campaign:{kind:'navy',levelId:level.id}}}))return false;sinkingUntil=0;waterParticles=[];stopWater();$('effects').replaceChildren();$('hero-boat').classList.remove('sinking');$('feedback').textContent='';resume();return true}
  function startFree(){pause(false);if(!update(s=>{s.navy.active=null}))return false;start();return true}

  const ended=a=>!a||['won','sunk'].includes(a.phase);
  function renderInventory(){renderVocabulary();$('inventory').textContent=`💧 ${state.garden.water}　☀ ${state.garden.suns}　🌸 ${state.garden.flowers.length}`}
  function answerTotals(){
    const a=active(),saved=state.navy.history.some(h=>h.id===a?.id);
    const wrong=[...state.navy.legacyHistory,...state.navy.history].reduce((sum,h)=>sum+h.total-h.correct,0)+(a&&!saved?a.holes:0);
    return {correct:state.navy.totalArrows,wrong,roundCorrect:a?.correct||0,roundWrong:a?.holes||0};
  }
  function renderAnswerTotals(){const totals=answerTotals();$('answer-totals').textContent=`历史累计：答对 ${totals.correct} · 答错 ${totals.wrong}`;}
  function renderCaptain(holes,phase){
    const pose=holes===0?0:holes<=2?1:holes<=4?2:holes<=7?3:4;
    const labels=['稳坐摇扇','船歪了，扶稳船边','坐不稳了，赶紧撑住','半站起来，抓紧船舷','船快沉了，抱紧船边'];
    const body=$('kongming-body'),panel=$('captain-panel'),sunk=phase==='sunk';
    for(const node of [body,panel]){node.dataset.pose=String(pose);node.dataset.phase=phase||'ready';node.style.setProperty('--pose-position',`${pose*25}%`);}
    body.style.setProperty('--body-balance',`${[0,-2,-5,-10,-14][pose]}deg`);
    body.setAttribute('aria-label',`诸葛亮：${sunk?'随草船沉入江水':labels[pose]}`);
    $('captain-state').textContent=sunk?'草船沉没，下次再来':phase==='won'?'满载归来！':labels[pose];
  }
  function renderBoat(){
    const a=active(),holes=Math.min(a?.holes||0,10),damage=Math.min(holes,9),heel=damage*8;
    renderCaptain(a?.holes||0,a?.phase);$('arrow-count').textContent=`收箭 ${a?.correct||0} / ${arrowTarget(a)}`;renderAnswerTotals();
    $('timer').textContent=`${Math.ceil((a?.remaining??state.settings.seconds*1000)/1000)} 秒`;
    $('leak-label').textContent=`本轮答错 ${a?.holes||0} · 累计漏水 ${a?.holes||0} / 10（答对不减）`;
    const spots=[28,78,40,65,52,34,72,46,60,82];
    $('holes').innerHTML=Array.from({length:holes},(_,i)=>`<span class="hull-hole" style="left:${spots[i]}%;top:${83+(i%3)*2}%"></span>`).join('');
    const caught=a?.correct||0,boatArrows=navyLevel(a)&&caught>0?((caught-1)%10)+1:caught;
    $('stuck-arrows').innerHTML=Array.from({length:Math.min(boatArrows,10)},(_,i)=>`<i class="arrow-slot" data-index="${i}" style="left:${[27,37,47,65,74,82][i%6]+(i>=6?2:0)}%;top:${i<6?71:75}%">${arrowSVG()}</i>`).join('');
    $('hero-boat').style.translate=`0 ${damage*5}px`;
    $('hero-boat').style.rotate=`${heel}deg`;
    $('hero-boat').style.setProperty('--heel',`${heel}deg`);
    $('river').style.setProperty('--flood-height',`${35+damage*6}px`);
    $('river').classList.toggle('critical',holes>=4&&!ended(a));
    $('river').classList.toggle('damaged',holes>0);
    $('water-body').setAttribute('y',String(1010-damage*27));
    const y=1010-damage*27;
    $('flood-wave').setAttribute('d',`M90 ${y} Q280 ${y-22} 440 ${y} T790 ${y} T1120 ${y} T1470 ${y}`);
    $('boat-flood').style.opacity=holes?1:0;
    $('sail-word').textContent=a?.word[a.language==='meaning'?0:1]||'';$('question-number').textContent=`第 ${(a?.index||0)+1} 题`;
    renderCampaignFleet(a);$('replay').hidden=false;
    const review=a?.lastReview;$('previous-answer').hidden=!review;if(review)$('previous-answer').textContent=`上一题 ${review.outcome==='correct'?'✓ 答对':review.outcome==='timeout'?'超时':'选错'}：${review.word[0]} = ${review.word[1]}`;
    setLeakSound(running?damage:0);renderInventory();window.Progression?.refresh();
  }
  function renderRecords(){const rows=[...state.navy.legacyHistory,...state.navy.history].slice(-20).reverse();$('records').innerHTML=rows.length?rows.map(h=>`<div class="record-row"><span>${C.escape(new Date(h.at).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}))}<small>${C.escape(h.mode||'旧版借箭')} · ${h.outcome==='sunk'?'草船沉没':h.outcome==='won'?'借箭归来':'旧版记录'}</small></span><strong>${h.correct}/${h.total} · ${Math.round(h.correct/h.total*100)}%</strong></div>`).join(''):'<p class="note">启航后，成绩会记在这里。</p>'}
  function overlay(title,copy,button,victory=false){$('overlay').classList.toggle('victory',victory);$('victory-portrait').hidden=!victory;$('victory-replay').hidden=!victory;$('overlay-title').textContent=title;$('overlay-copy').textContent=copy;$('start').textContent=button;$('overlay').hidden=false}
  function saveRemaining(paused=true){if(ended(active()))return true;const remaining=active().remaining;return update(s=>{s.navy.active.remaining=remaining;s.navy.active.paused=paused})}
  function pause(show=true){clearTimeout(endTimer);VoyageAudio.stop();VictoryVoice.stop();stopWater();$('river').classList.add('paused');running=false;cancelAnimationFrame(raf);C.stopSpeech();setLeakSound(0);if(!ended(active()))saveRemaining(true);if(show&&!ended(active()))overlay('雾江暂歇，进度已保存','剩余时间已暂停。回来后继续这一题，已经获得的奖励不会重复发放。','继续借箭 →');else if(show&&active())renderLanding()}
  function clearRain(){drops=[];$('rain').replaceChildren();spawnClock=0;targetClock=0}
  function announce(){const a=active();if(!a||ended(a))return;$('sail-word').textContent=a.word[a.language==='meaning'?0:1];$('cue').textContent=a.language==='meaning'?'听英文，看英文提示，找中文意思':'听英文，看中文提示，找英文单词';VoyageAudio.speechBegin();C.speak(a.word[0],ok=>{VoyageAudio.speechEnd();if(!ok&&running)$('cue').textContent='单词录音暂未播放，请点“再听一次”'})}
  function resume(){reloadState();if(active()?.phase==='ready'&&!active().campaign&&!C.words(state.garden).some(w=>w[0]===active().word[0]))update(s=>C.retargetNavy(s));if(!ended(active())&&active().holes>=10)return finish('sunk');if(['correct','wrong'].includes(active()?.phase))continueOldAnswer();const a=active();if(ended(a))return start();if(!update(s=>{s.navy.active.paused=false}))return;$('overlay').hidden=true;$('river').classList.remove('paused');running=true;document.body.classList.add('voyage-focus');VoyageAudio.start(a.holes);lastFrame=performance.now();clearRain();resetSelection();renderBoat();announce();spawn(true);spawn(false);startWater();raf=requestAnimationFrame(tick)}
  function chooseWord(exclude,seen=[]){return C.drawWord(navyGarden(),exclude,seen)}
  function start(){if(ended(active())&&active()?.campaign)return startCampaign(navyLevel(active()));clearTimeout(endTimer);VoyageAudio.stop();VictoryVoice.stop();if(!ended(active()))return resume();sinkingUntil=0;waterParticles=[];stopWater();$('effects').replaceChildren();const opts={mode:$('mode').value,language:$('language').value,seconds:Number($('seconds').value)};if(!update(s=>{s.settings=opts;const draw=C.drawWord(s.garden);s.navy.active={id:C.uid(),word:draw.word,seenWords:draw.seenWords,index:0,correct:0,streak:0,holes:0,batchCorrect:0,...opts,remaining:opts.seconds*1000,phase:'ready',paused:true}}))return;$('hero-boat').classList.remove('sinking');$('feedback').textContent='';resume()}
  function arrowSVG(){return '<svg viewBox="0 0 104 26" aria-hidden="true"><path d="M7 13H91" stroke="#493523" stroke-width="5"/><path d="M7 12H91" stroke="#e6c382" stroke-width="2.5"/><path d="M6 13L1 4L18 9L23 13L17 18L1 22Z" fill="#eee3ce" stroke="#695643" stroke-width="1"/><path d="M89 13L100 7L96 13L100 19Z" fill="#e2edf0" stroke="#647e88" stroke-width="1"/></svg>'}
  let waterRaf=0,lastWater=0,waterParticles=[],waterEmit=0,sinkingUntil=0;
  function stopWater(){cancelAnimationFrame(waterRaf);waterRaf=0}
  function startWater(){if(waterRaf)return;lastWater=performance.now();waterRaf=requestAnimationFrame(waterFrame)}
  function waterFrame(now){
    waterRaf=0;const sinking=now<sinkingUntil;if(!running&&!sinking)return;
    const canvas=$('water-effects'),rect=$('river').getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),dt=Math.min((now-lastWater)/1000,.05);lastWater=now;
    if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr)}
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,damage=Math.min(active()?.holes||0,9);
    const sources=[...document.querySelectorAll('.hull-hole')].map(node=>{const r=node.getBoundingClientRect();return {x:r.left+r.width/2-rect.left,y:r.top+r.height/2-rect.top}});
    waterEmit+=dt;const emit=waterEmit>.065;if(emit)waterEmit=0;
    sources.forEach((p,i)=>{
      if(p.y>rect.height+8||p.x<0||p.x>rect.width)return;
      const height=29+damage*4,pulse=reduced?0:Math.sin(now/180+i)*2,top=p.y-height+pulse,spread=13+damage;
      ctx.save();ctx.lineCap='round';
      const gradient=ctx.createLinearGradient(p.x,top,p.x,p.y);gradient.addColorStop(0,'rgba(205,248,255,.7)');gradient.addColorStop(.5,'rgba(91,205,237,.85)');gradient.addColorStop(1,'rgba(186,243,255,.92)');
      ctx.strokeStyle=gradient;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.bezierCurveTo(p.x-1,p.y-height*.35,p.x+2,top+13,p.x,top+8);ctx.stroke();
      ctx.strokeStyle='rgba(239,253,255,.9)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x-1,p.y);ctx.quadraticCurveTo(p.x+1,p.y-height*.55,p.x-1,top+8);ctx.stroke();
      // Water strikes upward and spreads into a lobed umbrella before falling.
      ctx.fillStyle='rgba(133,217,241,.68)';ctx.beginPath();ctx.moveTo(p.x-spread,top+17);ctx.bezierCurveTo(p.x-spread+2,top-7,p.x+spread-2,top-7,p.x+spread,top+17);ctx.quadraticCurveTo(p.x+spread-5,top+10,p.x+spread-8,top+17);ctx.quadraticCurveTo(p.x+3,top+10,p.x,top+17);ctx.quadraticCurveTo(p.x-7,top+10,p.x-11,top+17);ctx.quadraticCurveTo(p.x-spread+3,top+9,p.x-spread,top+17);ctx.fill();
      ctx.strokeStyle='rgba(220,251,255,.85)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(p.x-spread+3,top+10);ctx.quadraticCurveTo(p.x,top-6,p.x+spread-3,top+10);ctx.stroke();
      if(emit&&!reduced)for(let j=0;j<4;j++)waterParticles.push({x:p.x+(Math.random()-.5)*5,y:p.y-5,vx:(Math.random()-.5)*70,vy:-Math.sqrt(660*height)*( .85+Math.random()*.3),life:.8+Math.random()*.3,max:1.1,r:1+Math.random()*1.6,foam:false});
      ctx.restore();
    });
    if(sinking&&emit&&!reduced)for(let j=0;j<10;j++)waterParticles.push({x:rect.width*(.2+Math.random()*.65),y:rect.height-37,vx:(Math.random()-.5)*180,vy:-90-Math.random()*130,life:.9,max:.9,r:1.8+Math.random()*3,foam:true});
    waterParticles=waterParticles.slice(-360).filter(p=>{p.life-=dt;p.vy+=330*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.life<=0||p.y>rect.height+8)return false;ctx.globalAlpha=Math.min(1,p.life/.25);ctx.fillStyle=p.foam?'#e4f9ff':'#b4eefa';ctx.beginPath();ctx.ellipse(p.x,p.y,p.r,p.foam?p.r:p.r*1.7,Math.atan2(p.vy,p.vx)-Math.PI/2,0,Math.PI*2);ctx.fill();return true});ctx.globalAlpha=1;
    if(sinking){ctx.strokeStyle='rgba(223,247,255,.65)';ctx.lineWidth=3;for(let i=0;i<3;i++){const phase=((now/650+i*.3)%1);ctx.beginPath();ctx.ellipse(rect.width*.53,rect.height-26,40+phase*125,5+phase*12,0,0,Math.PI*2);ctx.stroke()}}
    waterRaf=requestAnimationFrame(waterFrame);
  }
  function noise(ctx,seconds){const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*seconds),ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;return buffer}
  function effectSound(kind){if(VoyageAudio.effect(kind))return;try{const ctx=C.sound.ctx||(C.sound.ctx=new(window.AudioContext||window.webkitAudioContext)());ctx.resume();const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=noise(ctx,.3);filter.type=kind==='shot'?'highpass':'lowpass';filter.frequency.value=kind==='shot'?1500:350;source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);gain.gain.setValueAtTime(kind==='shot'?.16:.3,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.24);source.start();source.stop(ctx.currentTime+.27);if(kind==='impact'){const bass=ctx.createOscillator(),g=ctx.createGain();bass.connect(g);g.connect(ctx.destination);bass.frequency.setValueAtTime(125,ctx.currentTime);bass.frequency.exponentialRampToValueAtTime(48,ctx.currentTime+.15);g.gain.setValueAtTime(.22,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.25);bass.start();bass.stop(ctx.currentTime+.27)}}catch{}}
  function setLeakSound(damage){VoyageAudio.leak(damage)}
  function shoot(sourcePoint){
    const shotWord=active().lastReview?.word[0]||active().word[0],voyage=active().id,multiplier=rewardMultiplier(),index=navyLevel(active())?(active().correct-1)%10:active().correct-1,slot=$('stuck-arrows').querySelector(`[data-index="${index}"]`);if(!slot)return;
    slot.classList.add('pending');
    const rect=$('river').getBoundingClientRect(),hit=slot.getBoundingClientRect(),target={x:hit.left-rect.left,y:hit.top-rect.top},from=sourcePoint||{x:25,y:rect.height*.25};
    const angle=Math.atan2(target.y-from.y,target.x-from.x)*180/Math.PI;
    const arrow=document.createElement('span');arrow.className='flight-arrow';arrow.innerHTML=arrowSVG();$('effects').append(arrow);effectSound('shot');
    const transform=p=>`translate(${p.x-96}px,${p.y-13}px) rotate(${angle}deg)`;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const flight=arrow.animate([{transform:transform(from)},{transform:transform({x:(from.x+target.x)/2,y:(from.y+target.y)/2-28}),offset:.55},{transform:transform(target)}],{duration:reduced?180:950,easing:'cubic-bezier(.25,.5,.7,1)',fill:'forwards'});
    flight.onfinish=()=>{
      arrow.remove();if(active()?.id!==voyage)return;
      const current=$('stuck-arrows').querySelector(`[data-index="${index}"]`);current?.classList.remove('pending');current?.classList.add('arrow-quiver');
      $('boat-image').classList.remove('impact-jolt');void $('boat-image').offsetWidth;$('boat-image').classList.add('impact-jolt');
      const ring=document.createElement('span');ring.className='impact-ring';ring.style.left=target.x+'px';ring.style.top=target.y+'px';$('effects').append(ring);
      for(let i=0;i<10;i++){const spark=document.createElement('i');spark.className='straw-spark';spark.style.left=target.x+'px';spark.style.top=target.y+'px';spark.style.setProperty('--dx',`${Math.cos(i*Math.PI/5)*(22+Math.random()*18)}px`);spark.style.setProperty('--dy',`${Math.sin(i*Math.PI/5)*25-12}px`);$('effects').append(spark);setTimeout(()=>spark.remove(),800)}
      const reward=document.createElement('span');reward.className='impact-reward';reward.textContent=`${shotWord} 中箭！+1 箭 · +${multiplier} 水滴`;$('effects').append(reward);setTimeout(()=>{ring.remove();reward.remove()},1400);
      if(view==='voyage'&&!document.hidden&&(running||active()?.phase==='won'))effectSound('impact');
    };
  }
  function questionKey(a=active()){return a?`${a.id}:${a.index}`:''}
  function resetSelection(){selectedAnswer=null;$('selected-word').textContent='点中单词即判题 · 答对自动射箭';$('fire').disabled=true;document.querySelectorAll('.rain-word.chosen').forEach(b=>b.classList.remove('chosen'))}
  function selectAnswer(value,point,button){if(!running||ended(active())||active().phase!=='ready')return;document.querySelectorAll('.rain-word.chosen').forEach(b=>b.classList.remove('chosen'));button?.classList.add('chosen');selectedAnswer={value,point,key:questionKey()};$('selected-word').textContent=`已选：${value}`;$('fire').disabled=false;fire()}
  function fire(){const choice=selectedAnswer;if(!choice||choice.key!==questionKey()||!running)return;resetSelection();answer(choice.value,choice.point,choice.key)}
  function answer(value,sourcePoint,expectedKey){
    const a=active();if(!running||!a||a.phase!=='ready'||(expectedKey&&expectedKey!==questionKey(a)))return false;
    const oldWord=C.copy(a.word),nextDraw=chooseWord(a.word[0],a.seenWords),ok=value!==null&&value===a.word[a.language==='meaning'?1:0],outcome=ok?'correct':value===null?'timeout':'wrong';
    if(!update(s=>{const r=s.navy.active;if(questionKey(r)!==questionKey(a)||r.phase!=='ready')return false;r.phase=ok?'correct':'wrong';r.lastReview={word:oldWord,outcome};if(ok){r.correct++;r.batchCorrect++;r.streak=0;s.navy.totalArrows++;s.garden.water+=rewardMultiplier(r)}else{r.streak++;r.holes++}if(r.correct<arrowTarget(r)&&r.holes<10){assessBatch(s);r.index++;r.word=nextDraw.word;r.seenWords=nextDraw.seenWords;r.phase='ready';r.remaining=r.seconds*1000}})){pause();return false}
    resetSelection();clearRain();renderBoat();
    if(ok){shoot(sourcePoint);$('feedback').textContent=`收箭 +1 · 水滴 +${rewardMultiplier()}，下一题已开始`}else{if(!VoyageAudio.effect('crack'))C.sound('miss');$('feedback').textContent=outcome==='timeout'?'超时漏水，下一题已开始':'选错漏水，下一题已开始'}
    if(active().holes>=10){finish('sunk');return false}if(active().correct>=arrowTarget()){finish('won');return true}
    lastFrame=performance.now();announce();if(!ok&&active().holes===5)VoyageAudio.queueFive();spawn(true);spawn(false);return ok;
  }
  function continueOldAnswer(){const a=active();if(!a)return;if(a.holes>=10)return finish('sunk');if(a.correct>=arrowTarget(a))return finish('won');const word=C.copy(a.word),next=chooseWord(a.word[0],a.seenWords);update(s=>{const r=s.navy.active;assessBatch(s);r.lastReview={word,outcome:r.phase==='correct'?'correct':'wrong'};r.index++;r.word=next.word;r.seenWords=next.seenWords;r.phase='ready';r.remaining=r.seconds*1000})}
  function assessBatch(s){const a=s.navy.active;if((a.index+1)%10===0){if(!a.campaign&&a.batchCorrect>=9)s.garden.suns++;a.batchCorrect=0}}
  function deadline(){if(!running||ended(active())||pendingEnd)return;pendingEnd=true;try{answer(null,undefined,questionKey())}finally{pendingEnd=false}}
  function finish(outcome){running=false;cancelAnimationFrame(raf);C.stopSpeech();setLeakSound(0);resetSelection();if(!update(s=>{const r=s.navy.active;assessBatch(s);r.phase=outcome;r.paused=true;r.remaining=0;if(!s.navy.history.some(h=>h.id===r.id)){s.navy.history.push({id:r.id,at:new Date().toISOString(),correct:r.correct,total:r.index+1,mode:r.campaign?'闯关第'+r.campaign.levelId+'关':'听音＋看帆',outcome});if(r.campaign){if(outcome==='won'&&r.correct/(r.index+1)>=.9)s.garden.suns+=rewardMultiplier(r);Progression.record(s,{kind:'navy',levelId:r.campaign.levelId,id:r.id,correct:r.correct,total:r.index+1,outcome})}}})){pause();return}renderBoat();renderRecords();VoyageAudio.terminal(outcome);const a=active();if(outcome==='sunk'){$('feedback').textContent='累计漏水十处，草船正在沉没…';sinkingUntil=performance.now()+2600;startWater();$('hero-boat').classList.add('sinking');endTimer=setTimeout(()=>{if(active()?.phase==='sunk')overlay('草船沉没，下次再出发','本轮累计答错或超时十题，草船沉没。已获得的水滴保留，下次再来。','重新启航 →')},2500)}else{$('feedback').textContent=`${arrowTarget()}支箭已收齐，满载归航！`;stopWater();endTimer=setTimeout(()=>{if(active()?.id===a.id&&active()?.phase==='won'&&view==='voyage')overlay('“哈哈，孔明，谢谢丞相赐箭！”',`已收齐${arrowTarget(a)}支箭，本次正确率 ${Math.round(a.correct/(a.index+1)*100)}%。${a.campaign?(a.correct/(a.index+1)>=.9?(navyLevel(a).id<10?'本关已完成，下一关已解锁。':'本关已完成，全部航线已通关！'):'已战胜本关，达到90%再解锁下一关。'):'每十题达到90%，额外送太阳。'}奖励已送到花园。`,'再次启航 →',true);if(active()?.id===a.id&&active()?.phase==='won'&&view==='voyage'&&!document.hidden)VictoryVoice.play()},1100)}}
  function spawn(target=false){const a=active();if(!a||ended(a)||drops.length>=35)return;const pool=C.distractors(a.word,navyGarden(a),12);const word=target?a.word:pool[Math.floor(Math.random()*pool.length)];const b=document.createElement('button');b.type='button';b.className='rain-word';b.textContent=word[a.language==='meaning'?1:0];b.setAttribute('aria-label',`选择 ${b.textContent}`);b.style.fontSize=`${15+Math.random()*3}px`;$('rain').append(b);const width=$('rain').clientWidth-b.offsetWidth-10;let x=5+Math.random()*Math.max(0,width);for(let k=0;k<8&&drops.some(d=>d.y<52&&Math.abs(d.x-x)<Math.max(d.b.offsetWidth,b.offsetWidth)+8);k++)x=5+Math.random()*Math.max(0,width);if(drops.some(d=>d.y<0&&d.x<x+b.offsetWidth+4&&d.x+d.b.offsetWidth+4>x)){b.remove();return}let speed=(30+Math.random()*24)*(navyLevel(a)?.rainSpeed||1);for(const old of drops)if(old.x<x+b.offsetWidth+4&&old.x+old.b.offsetWidth+4>x)speed=Math.min(speed,old.speed);const d={b,x,y:-46,speed,angle:Math.random()*6-3};b.style.transform=`translate(${x}px,-46px) rotate(${d.angle}deg)`;b.onclick=()=>{const r=b.getBoundingClientRect(),stage=$('river').getBoundingClientRect();selectAnswer(b.textContent,{x:r.left+r.width/2-stage.left,y:r.top+r.height/2-stage.top},b)};drops.push(d)}
  function tick(now){if(!running)return;const elapsed=Math.max(0,(now-lastFrame)/1000),dt=Math.min(elapsed,.15);lastFrame=now;active().remaining=Math.max(0,active().remaining-elapsed*1000);$('timer').textContent=`${Math.ceil(active().remaining/1000)} 秒`;spawnClock+=dt;targetClock+=dt;if(spawnClock>.42){spawnClock=0;spawn(false)}if(targetClock>1.8){targetClock=0;spawn(true)}const h=$('rain').clientHeight;drops=drops.filter(d=>{d.y+=d.speed*dt;d.b.style.transform=`translate(${d.x}px,${d.y}px) rotate(${d.angle}deg)`;if(d.y>h+45){d.b.remove();return false}return true});if(active().remaining<=0)deadline();if(running)raf=requestAnimationFrame(tick)}
  function switchView(next){window.EnglishTraining?.pause();pause(false);document.body.classList.remove('voyage-focus','garden-focus','training-focus','training-dialogue');view=next;$('map-view').hidden=next!=='map';$('nav-map').setAttribute('aria-selected',String(next==='map'));document.dispatchEvent(new CustomEvent('adventure-view',{detail:next}));$('training-view').hidden=next!=='training';$('nav-training').setAttribute('aria-selected',String(next==='training'));$('voyage-view').hidden=next!=='voyage';$('garden-view').hidden=next!=='garden';$('nav-voyage').setAttribute('aria-selected',String(next==='voyage'));$('nav-garden').setAttribute('aria-selected',String(next==='garden'));if(next==='garden')$('garden-frame').src='garden/?embed=1';else if(next==='training'){reloadState();window.EnglishTraining?.home()}else if(next==='voyage'){reloadState();renderBoat();renderRecords();renderLanding()}else{reloadState();window.AdventureMap?.refresh()}window.scrollTo(0,0)}
  function renderLanding(){if(active()?.phase==='ready'&&!active().campaign&&!C.words(state.garden).some(w=>w[0]===active().word[0]))update(s=>C.retargetNavy(s));const a=active();if(!a)return;renderBoat();if(a.phase==='won')overlay('“哈哈，孔明，谢谢丞相赐箭！”',`${arrowTarget(a)}支箭满载而归！${a.campaign?(a.correct/(a.index+1)>=.9?'本关已通过90%考核。':'这次未达到90%，再挑战可晋级。'):'奖励已送进花园，随时可以开始新的旅程。'}`,'再次启航 →',true);else if(a.phase==='sunk')overlay('草船沉没，下次再出发','已经获得的水滴都保留了。可以改用看帆模式或慢练。','重新启航 →');else overlay('继续上次的借箭之旅',`已经收集 ${a.correct} 支箭，剩余 ${Math.ceil(a.remaining/1000)} 秒。`,'继续借箭 →')}
  function fillSettings(){const g=state.garden;$('pack').replaceChildren();[...C.PACKS,{id:'custom',name:'我的课本词汇'}].forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=`${p.name} · ${p.words?.length??g.custom.length}词条`;o.disabled=p.id==='custom'&&g.custom.length<4;$('pack').append(o)});$('pack').value=g.settings.pack;$('custom').value=g.custom.map(w=>`${w[0]}=${w[1]}`).join('\n')}
  function setVocabulary(pack,custom){pause(false);if(!update(s=>{const changed=s.garden.settings.pack!==pack||custom!==undefined;if(custom!==undefined)s.garden.custom=custom;s.garden.settings.pack=pack;if(changed){s.garden.active=null;if(!s.navy.active?.campaign)C.retargetNavy(s)}}))return false;fillSettings();renderBoat();renderVocabulary();if(view==='garden')$('garden-frame').src='garden/?embed=1';else renderLanding();C.toast('词库已切换：题目和干扰项都按新范围准备，已得奖励保留。');return true}
  function download(data,name){const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  async function restore(file){if(!file||file.size>5000000){C.toast('请选择不超过5MB的备份。');return false}try{const text=await file.text(),s=JSON.parse(text);pause(false);if(s.app==='adventure'){if(!validate(s))throw Error('invalid');if(!confirm('恢复全部进度会替换当前存档。请先导出当前备份。是否继续？'))return false;localStorage.setItem(KEY,JSON.stringify(s));state=s;blocked=false}else{if(!['garden','navy'].includes(s.app))throw Error('invalid');if(s.app==='garden'&&!validGarden(s))throw Error('invalid');const navy=s.app==='navy'?convertLegacy(s):null;if(blocked)throw Error('blocked');if(state.imported.includes(fingerprint(text))){C.toast('这份旧版备份已导入，不会重复计算奖励。');return false}if(!confirm(`导入旧版${s.app==='garden'?'花园':'借箭'}存档？将替换对应部分的进度，另一个游戏的进度保留。建议先导出全部备份。`))return false;if(!update(n=>{if(s.app==='garden')n.garden=s;else n.navy=navy;n.imported.push(fingerprint(text))}))return false}fillSettings();renderBoat();renderRecords();renderLanding();if(view==='garden')$('garden-frame').src='garden/?embed=1';C.toast('备份已恢复。');return true}catch(e){C.toast('未导入：备份格式不正确，原进度没有改动。');return false}}
  $('nav-training').onclick=()=>switchView('training');
  $('exit-stage').onclick=()=>{pause();document.body.classList.remove('voyage-focus');window.scrollTo(0,0)};
  $('victory-replay').onclick=()=>VictoryVoice.play();$('fire').onclick=fire;$('start').onclick=()=>{WordAudio.unlock();VoyageAudio.unlock();VictoryVoice.unlock();C.sound('drop');ended(active())?start():resume()};$('pause').onclick=()=>pause();$('replay').onclick=()=>{if(running){WordAudio.unlock();announce()}};$('nav-voyage').onclick=()=>switchView('voyage');$('nav-garden').onclick=$('to-garden').onclick=()=>switchView('garden');$('settings-open').onclick=()=>{pause();reloadState();fillSettings();$('settings-dialog').showModal()};$('settings-close').onclick=()=>{$('settings-dialog').close()};$('pack').onchange=()=>setVocabulary($('pack').value);$('save-words').onclick=()=>{try{const words=C.parseWords($('custom').value);if(setVocabulary('custom',words)){fillSettings();renderVocabulary();C.toast(`已保存 ${words.length} 个课本词条，两个游戏共用。`)}}catch(e){C.toast(e.message)}};$('export').onclick=()=>{pause(false);reloadState();const raw=blocked?localStorage.getItem(KEY)||JSON.stringify({garden:localStorage.getItem('english-garden-v1'),navy:localStorage.getItem('english-navy-v1')}):JSON.stringify(state,null,2);download(raw,`英语花园-全部进度-${new Date().toISOString().slice(0,10)}.json`)};$('import').onchange=e=>restore(e.target.files[0]);
  for(const id of ['mode','language','seconds']){$(id).value=state.settings[id];$(id).onchange=()=>{if(!ended(active()))C.toast('设置会用于下次启航，当前题目保持原玩法。');else update(s=>{s.settings[id]=id==='seconds'?Number($(id).value):$(id).value});if(ended(active()))renderBoat()}}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});window.addEventListener('pagehide',()=>pause(false));window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==$('garden-frame').contentWindow)return;if(e.data?.type==='garden-focus'){document.body.classList.toggle('garden-focus',view==='garden'&&e.data.active===true);window.scrollTo(0,0)}if(e.data==='garden-updated'){reloadState();renderInventory()}});
  function fitViewport(){document.documentElement.style.setProperty('--play-height',`${window.visualViewport?.height||window.innerHeight}px`)}fitViewport();window.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('resize',fitViewport);
  fillSettings();renderBoat();renderRecords();renderLanding();if(location.hash==='#garden')switchView('garden');
  $('offline-status').textContent=`版本 ${RELEASE} · 离线资源准备中…`;
  if('serviceWorker'in navigator){
   let framesPreparation=null;
   const prepareFrames=cache=>{
    if(framesPreparation)return framesPreparation;
    framesPreparation=(async()=>{
     const files=Object.values(window.BattleMediaData?.frames||{}).flatMap(group=>Object.values(group).map(entry=>entry.src));
     if(files.length!==14)throw Error('incomplete-animation-catalog');
     let cursor=0;
     const worker=async()=>{while(cursor<files.length){const file=files[cursor++],request=new Request(new URL(file,location.href));if(await cache.match(request))continue;const response=await fetch(request);if(!response.ok)throw Error('animation-download');await cache.put(request,response)}};
     await Promise.all([worker(),worker()]);
    })().catch(error=>{framesPreparation=null;throw error});
    return framesPreparation;
   };
   const showOfflineState=async()=>{try{
    // The shell registers its worker before the later battle scripts load.
    // Wait for that renderer before deciding which offline assets are required.
    if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
    if(!window.BattleFilm)throw Error('battle-renderer-unavailable');
    const cache=await caches.open('english-games-offline-v28');
    const essential=['assets/realm-art/hero-v1.png','word-realm.js','word-realm.css','progression.js','progression-data.js','battle-campaign.js','assets/progression-art/monsters-v1.png','assets/progression-art/scenes-v1.png','assets/progression-art/river-scenes-v1.png','assets/battle-media/manifest.js','assets/battle-media/video/portrait/victory_shield.mp4','assets/battle-media/video/landscape/victory_shield.mp4','assets/battle-media/audio/voice/vo_intro_monster.mp3','assets/word-audio/words/w0381.mp3'];
    essential.push('battle-frames.js','battle-frames.css');
    if(window.BattleFilm?.usesFrames){
     $('offline-status').textContent=`版本 ${RELEASE} · 正在下载离线动画，请保持联网…`;
     await prepareFrames(cache);
     essential.push(...Object.values(window.BattleMediaData.frames).flatMap(group=>Object.values(group).map(entry=>entry.src)));
    }
    const ready=(await Promise.all(essential.map(f=>cache.match(new URL(f,location.href),{ignoreSearch:true})))).every(Boolean);
    $('offline-status').textContent=`版本 ${RELEASE} · ${ready?'离线已准备 · 动画和内置词库可离线使用':'正在下载离线动画，请保持联网…'}`
   }catch{$('offline-status').textContent=`版本 ${RELEASE} · 离线未准备，请联网重新打开`}};
   navigator.serviceWorker.addEventListener('controllerchange',showOfflineState);
   navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(()=>navigator.serviceWorker.ready).then(showOfflineState).catch(()=>{$('offline-status').textContent=`版本 ${RELEASE} · 离线未准备，请联网重新打开`})
  }
  $('check-update').onclick=async()=>{pause(false);$('check-update').disabled=true;try{const reg=await navigator.serviceWorker?.getRegistration();await reg?.update();const r=await fetch(`index.html?update=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw Error('network');location.reload()}catch{$('check-update').disabled=false;C.toast('暂时无法联网更新，存档已保留。')}};
  window.Adventure={release:RELEASE,get state(){return state},update,validate,validGarden,validNavy,start,startCampaign,startFree,resume,pause,answer,deadline,finish,switchView,restore,spawn,fire,selectAnswer,questionKey,answerTotals,get waterStats(){return {particles:waterParticles.length,active:!!waterRaf,sinking:sinkingUntil>performance.now()}},get running(){return running},get drops(){return drops}};
})();
