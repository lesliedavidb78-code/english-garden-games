/* Keep local progress untouched; refresh code online and use the current app cache offline. */
const CACHE='english-games-offline-v13';
const FILES=['./assets/straw-soldier-boat-clean.png','./assets/kongming-poses.png','./voyage-audio.js','./assets/audio/ambience/amb_river_mist_loop.mp3','./assets/audio/dialogue/vo_five_leaks_01.mp3','./assets/audio/dialogue/vo_sink_01.mp3','./assets/audio/music/bgm_river_adventure_loop_adventurous.mp3','./assets/audio/music/bgm_river_adventure_loop_quiet.mp3','./assets/audio/sfx/sfx_arrow_straw_hit.mp3','./assets/audio/sfx/sfx_arrow_whoosh.mp3','./assets/audio/sfx/sfx_boat_sink.mp3','./assets/audio/sfx/sfx_hull_crack.mp3','./assets/audio/sfx/sfx_victory_sting.mp3','./assets/audio/sfx/sfx_water_leak_loop.mp3','./','./index.html','./adventure.js','./victory-voice.js','./assets/victory-thanks-kongming.wav','./adventure.css','./manifest.webmanifest','./assets/mist-river.png','./assets/straw-boat.png','./assets/straw-soldier-boat.png','./assets/zhuge-liang-victory.png','./base.css','./common.js','./pep-vocabulary.js','./THIRD_PARTY_NOTICES.md','./garden/','./garden/index.html','./garden/garden.css','./garden/garden.js','./garden/manifest.webmanifest','./garden/icon.svg','./garden/icon-192.png','./garden/icon-512.png','./navy/','./navy/index.html','./navy/navy.css','./navy/navy.js','./navy/manifest.webmanifest','./navy/icon.svg','./navy/icon-192.png','./navy/icon-512.png'];

self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(new URL(f,self.location.href),{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  const keys=await caches.keys(),older=keys.filter(k=>k.startsWith('english-games-offline-')&&k!==CACHE);
  await Promise.all(older.map(k=>caches.delete(k)));await self.clients.claim();
  if(older.length){const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const scope=new URL('./',self.location.href).href;windows.filter(c=>c.frameType==='top-level'&&c.url.startsWith(scope)).forEach(c=>{c.navigate(c.url).catch(()=>{})})}
})())});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url),scope=new URL('./',self.location.href).pathname;
  if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(scope))return;
  const fresh=e.request.mode==='navigate'||/\.(?:js|css)$/.test(u.pathname);
  e.respondWith((async()=>{const cache=await caches.open(CACHE),hit=await cache.match(e.request,{ignoreSearch:true});
    if(!fresh&&hit)return hit;
    try{const response=await fetch(new Request(e.request,{cache:fresh?'no-cache':'default'}));if(response.ok){await cache.put(e.request,response.clone());return response}return hit||response}catch{return hit||Response.error()}
  })());
});
