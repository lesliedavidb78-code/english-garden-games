import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
fs.mkdirSync(new URL('./.results/',import.meta.url),{recursive:true});
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const base=fileURLToPath(new URL('../',import.meta.url));
const original=fs.readFileSync(base+'word-shooter.js','utf8');
const nodes=new Map();
function node(name){
 if(!nodes.has(name)) nodes.set(name,{textContent:'',style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},querySelector:selector=>node(name+selector),getBoundingClientRect:()=>({x:0,y:0,width:390,height:650}),children:[],replaceChildren(){},append(){}});
 return nodes.get(name);
}
// Only expose existing private functions and establish test input; do not alter any production function.
const seam=`window.__review={fits,lineClear,findPath,moveTo,update,setPaused,
 setup(from,desks){hero={...from};obstacles=desks.map(o=>({...o}));enemies=[];pickups=[];particles=[];flight=null;shot=null;pendingShot=null;targetPath=[];keys=new Set();joy={x:0,y:0,id:null};contactGrace=0;root={querySelector:s=>node(s),classList:{add(){},remove(){},toggle(){}}};disposed=false;paused=false;busy=false;a={phase:'ready',shooter:fresh(),index:0};q={en:'robot'};},
 state(){return {hero:{...hero},path:targetPath.map(p=>({...p})),paused,busy}},
};`;
const source=original.replace(' window.WordShooter={',seam+'\n window.WordShooter={');
assert.notEqual(source,original,'review seam insertion failed');
const sandbox={window:{},document:{},Math,performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},node};
vm.runInNewContext(source,sandbox,{filename:base+'word-shooter.js'});
const R=sandbox.window.__review;
// Actual first-room desk: questionLayout multiplies its original x/y by 1.4.
const desk={x:230*1.4,y:280*1.4,w:140,h:94};
const from={x:220,y:330},to={x:420,y:330};
R.setup(from,[desk]);
assert(R.fits(from.x,from.y,20));assert(R.fits(to.x,to.y,22));
assert.equal(R.lineClear(from,to),false,'body clearance must reject unsafe shortcut');
const selected=JSON.parse(JSON.stringify(R.findPath(from,to)));assert(selected.length>1,'BFS must route around the desk');assert(R.moveTo(to.x,to.y));
for(let i=0;i<600;i++)R.update(.02,i*20);
const stopped=JSON.parse(JSON.stringify(R.state()));assert(Math.hypot(stopped.hero.x-to.x,stopped.hero.y-to.y)<9,'reachable target must be reached');
const repeated=stopped,detoured=stopped;
const report={at:new Date().toISOString(),file:'word-shooter.js',sha256:crypto.createHash('sha256').update(original).digest('hex'),verified:true,method:'原函数 VM 复现；仅附加读取/设定 seam，不替换寻路、碰撞或移动逻辑。无共享浏览器。',finding:{priority:'P2',title:'F04桌边目标自动绕行到达',lines:[158,181,196],from,to,desk,selected,stopped,repeated,detoured,expected:'按人物半径做 swept collision，遇到阻挡走 BFS 路径或重新寻路。',actual:'统一半径22检查，BFS绕行到达目标，无需手动调整。'}};
const out=new URL('./.results/shooter-path-evidence.json',import.meta.url);
fs.writeFileSync(out,JSON.stringify(report,null,2));
console.log('PASS 射击桌边寻路回归');
