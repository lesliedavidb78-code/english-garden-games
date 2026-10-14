import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
function javascript(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => {
    if (entry.name.startsWith('.') || entry.name === '地球守护战素材包') return [];
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    return entry.isDirectory() ? javascript(path) : /\.(js|mjs)$/.test(entry.name) ? [fileURLToPath(path)] : [];
  });
}
function run(args) {
  const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status || 1);
}
const files=javascript(new URL('../',import.meta.url));
for(const file of files)run(['--check',file]);
console.log(`PASS ${files.length} 个 JavaScript 语法检查`);
for(const name of ['vocabulary-controls','navy-controls','offline-controls','path-regression'])run([fileURLToPath(new URL(name+'.mjs',import.meta.url))]);
console.log('PASS 全部回归套件（不代替真机或浏览器互动验收）');
