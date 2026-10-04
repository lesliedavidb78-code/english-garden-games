/* Shooter-only reference pools. Existing games keep their own textbook ranges. */
(() => {
 'use strict';
 const normalize=text=>String(text).trim().toLowerCase().replace(/\s+/g,' ');
 const refs=window.SHOOTER_REFERENCE_BOOKS||[];
 function books(){
  const packs=window.GameCommon?.PACKS||[];
  const upper=packs.find(p=>p.id==='pep5-photo-upper-all'),lower=packs.find(p=>p.id==='pep5-lower');
  return [...refs,...[upper&&{id:'photo-5-upper',grade:5,semester:'upper',name:'我的课本 · 五年级上册（2024审定照片核对）',edition:'家长照片词表',source:'assets/textbook-pep5-upper-2024.json',words:upper.words.map(w=>({en:w[0],zh:w[1],unit:0}))},lower&&{id:'pep-ref-5-lower',grade:5,semester:'lower',name:'PEP旧版参考 · 五年级下册',edition:'PEP旧版参考',source:'PEP五年级词库说明.md',words:lower.words.map(w=>({en:w[0],zh:w[1],unit:0}))}].filter(Boolean)];
 }
 function choices(){return [{id:'all',name:'三至五年级 · 全部（渐进）'},{id:'3',name:'三年级 · 上下册参考'},{id:'4',name:'四年级 · 上下册旧版参考'},{id:'5',name:'五年级 · 照片上册＋旧版下册'},...books().map(b=>({id:b.id,name:b.name}))]}
 function pool(scope='all'){
  const selected=books().filter(b=>scope==='all'||String(b.grade)===scope||b.id===scope),unique=new Map();
  // Prefer the photographed fifth-grade meaning when an English word occurs in multiple books.
  selected.sort((a,b)=>Number(a.id==='photo-5-upper')-Number(b.id==='photo-5-upper'));
  for(const book of selected)for(const word of book.words){const key=normalize(word.en),old=unique.get(key);unique.set(key,{key,en:word.en,zh:word.zh,grade:old?Math.min(old.grade,book.grade):book.grade,bookId:book.id,bookName:book.name,unit:word.unit,sources:[...(old?.sources||[]),book.id]})}
  return [...unique.values()];
 }
 function eligible(words,scope,level){if(scope!=='all')return words;const ceiling=Math.min(5,3+Math.floor((level-1)/4));return words.filter(w=>w.grade<=ceiling)}
 function drawRoom(scope,level,oldSeen=[],lastWord='',cycle=1){
  const C=window.GameCommon,words=pool(scope),seen=new Set(oldSeen),items=[];if(words.length<4)return null;
  const selected=eligible(words,scope,level);let last=normalize(lastWord),round=cycle;
  for(let index=0;index<10;index++){
   let available=selected.filter(w=>!seen.has(w.key));
   // Finish the current eligible batch before repeating; later grades join as rooms advance.
   if(!available.length){for(const word of selected)seen.delete(word.key);round++;available=[...selected]}
   const inRoom=new Set(items.map(w=>w.key));available=available.filter(w=>!inRoom.has(w.key));
   const different=available.filter(w=>w.key!==last);if(different.length)available=different;
   const w=C.shuffle(available)[0];seen.add(w.key);last=w.key;
   const others=C.shuffle(selected.filter(x=>x.key!==w.key&&x.zh!==w.zh));
   const meanings=[w.zh,...[...new Set(others.map(x=>x.zh))].slice(0,3)];
   const targets=C.shuffle([w.en,...others.slice(0,2).map(x=>x.en)]);
   items.push({...w,expected:w.zh,options:C.shuffle(meanings),targets,english:false});
  }
  return {items,seen:[...seen],cycle:round,lastWord:last};
 }
 function validItem(w){return !!w&&typeof w.key==='string'&&w.key===normalize(w.en)&&typeof w.en==='string'&&w.en.length<=40&&/^[a-z][a-z '.-]*[a-z.]?$/i.test(w.en)&&typeof w.zh==='string'&&w.zh.length>0&&w.zh.length<=80&&w.expected===w.zh&&Array.isArray(w.options)&&w.options.length>=3&&w.options.length<=4&&new Set(w.options).size===w.options.length&&w.options.includes(w.expected)&&w.options.every(x=>typeof x==='string'&&x.length>0&&x.length<=80)&&Array.isArray(w.targets)&&w.targets.length===3&&new Set(w.targets.map(normalize)).size===3&&w.targets.includes(w.en)&&w.targets.every(x=>typeof x==='string'&&x.length>0&&x.length<=40)}
 window.ShooterData={normalize,books,choices,pool,eligible,drawRoom,validItem};
})();
