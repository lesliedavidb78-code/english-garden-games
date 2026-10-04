/* Keep local progress untouched; refresh code online and use the current app cache offline. */
const CACHE='english-games-offline-v31';
const FILES=['./map.js','./map.css','./assets/map-art/adventure-island-v1.png','./battle-story.js','./battle-audio.js','./assets/battle-art/hero-v3.png','./assets/battle-art/monster-v3.png','./assets/battle-art/battlefield-v3.png','./battle.js','./battle.css','./quest-game.js','./quest-game.css','./assets/battle-audio/hero-hit.wav','./assets/battle-audio/monster-hit.wav','./assets/battle-audio/hero-special.wav','./assets/battle-audio/hero-win.wav','./assets/battle-audio/monster-win.wav','./training.js','./training.css','./training-data.js','./assets/training-sentences.json','./assets/sentence-audio/s00.wav','./assets/sentence-audio/s01.wav','./assets/sentence-audio/s02.wav','./assets/sentence-audio/s03.wav','./assets/sentence-audio/s04.wav','./assets/sentence-audio/s05.wav','./assets/sentence-audio/s06.wav','./assets/sentence-audio/s07.wav','./assets/sentence-audio/s08.wav','./assets/sentence-audio/s09.wav','./assets/sentence-audio/s10.wav','./assets/sentence-audio/s11.wav','./assets/sentence-audio/s12.wav','./assets/sentence-audio/s13.wav','./assets/sentence-audio/s14.wav','./assets/sentence-audio/s15.wav','./assets/sentence-audio/s16.wav','./assets/sentence-audio/s17.wav','./assets/sentence-audio/s18.wav','./assets/sentence-audio/s19.wav','./assets/sentence-audio/s20.wav','./assets/sentence-audio/s21.wav','./assets/sentence-audio/s22.wav','./assets/sentence-audio/s23.wav','./assets/sentence-audio/s24.wav','./assets/sentence-audio/s25.wav','./assets/sentence-audio/s26.wav','./assets/sentence-audio/s27.wav','./assets/sentence-audio/s28.wav','./assets/sentence-audio/s29.wav','./assets/sentence-audio/s30.wav','./assets/sentence-audio/s31.wav','./assets/sentence-audio/s32.wav','./assets/sentence-audio/s33.wav','./assets/sentence-audio/s34.wav','./assets/sentence-audio/s35.wav','./assets/sentence-audio/s36.wav','./assets/sentence-audio/s37.wav',...Array.from({length:382},(_,i)=>'./assets/word-audio/words/w'+String(i).padStart(4,'0')+'.mp3'),'./assets/textbook-pep5-upper-2024.json','./assets/word-audio/pack-12.mp3','./assets/word-audio/pack-13.mp3','./assets/word-audio/pack-14.mp3','./word-audio.js','./word-audio-manifest.js','./assets/word-audio/pack-01.mp3','./assets/word-audio/pack-02.mp3','./assets/word-audio/pack-03.mp3','./assets/word-audio/pack-04.mp3','./assets/word-audio/pack-05.mp3','./assets/word-audio/pack-06.mp3','./assets/word-audio/pack-07.mp3','./assets/word-audio/pack-08.mp3','./assets/word-audio/pack-09.mp3','./assets/word-audio/pack-10.mp3','./assets/word-audio/pack-11.mp3','./assets/straw-soldier-boat-clean.png','./assets/kongming-poses.png','./voyage-audio.js','./assets/audio/ambience/amb_river_mist_loop.mp3','./assets/audio/dialogue/vo_five_leaks_01.mp3','./assets/audio/dialogue/vo_sink_01.mp3','./assets/audio/music/bgm_river_adventure_loop_adventurous.mp3','./assets/audio/music/bgm_river_adventure_loop_quiet.mp3','./assets/audio/sfx/sfx_arrow_straw_hit.mp3','./assets/audio/sfx/sfx_arrow_whoosh.mp3','./assets/audio/sfx/sfx_boat_sink.mp3','./assets/audio/sfx/sfx_hull_crack.mp3','./assets/audio/sfx/sfx_victory_sting.mp3','./assets/audio/sfx/sfx_water_leak_loop.mp3','./','./index.html','./adventure.js','./victory-voice.js','./assets/victory-thanks-kongming.wav','./adventure.css','./manifest.webmanifest','./assets/mist-river.png','./assets/straw-boat.png','./assets/straw-soldier-boat.png','./assets/zhuge-liang-victory.png','./base.css','./common.js','./pep-vocabulary.js','./THIRD_PARTY_NOTICES.md','./garden/','./garden/index.html','./garden/garden.css','./garden/garden-map-theme.css','./garden/garden.js','./garden/manifest.webmanifest','./garden/icon.svg','./garden/icon-192.png','./garden/icon-512.png','./navy/','./navy/index.html','./navy/navy.css','./navy/navy.js','./navy/manifest.webmanifest','./navy/icon.svg','./navy/icon-192.png','./navy/icon-512.png'];

FILES.push(...["./battle-film.js", "./battle-film.css", "./assets/battle-media/manifest.js", "./assets/battle-media/manifest.json", "./assets/battle-media/video/portrait/defeat_retry.mp4", "./assets/battle-media/video/portrait/hero_attack.mp4", "./assets/battle-media/video/portrait/idle_loop.mp4", "./assets/battle-media/video/portrait/intro_city.mp4", "./assets/battle-media/video/portrait/monster_attack.mp4", "./assets/battle-media/video/portrait/victory_shield.mp4", "./assets/battle-media/video/portrait/special_light.mp4", "./assets/battle-media/video/landscape/hero_attack.mp4", "./assets/battle-media/video/landscape/defeat_retry.mp4", "./assets/battle-media/video/landscape/idle_loop.mp4", "./assets/battle-media/video/landscape/monster_attack.mp4", "./assets/battle-media/video/landscape/intro_city.mp4", "./assets/battle-media/video/landscape/special_light.mp4", "./assets/battle-media/video/landscape/victory_shield.mp4", "./assets/battle-media/audio/ambience/amb_city_wind_loop.mp3", "./assets/battle-media/audio/music/bgm_crisis_loop.mp3", "./assets/battle-media/audio/music/music_retry.mp3", "./assets/battle-media/audio/music/bgm_guardian_loop.mp3", "./assets/battle-media/audio/sfx/sfx_danger.mp3", "./assets/battle-media/audio/music/music_victory.mp3", "./assets/battle-media/audio/music/bgm_invasion_loop.mp3", "./assets/battle-media/audio/sfx/sfx_dialogue_tick.mp3", "./assets/battle-media/audio/sfx/sfx_defeat_retreat.mp3", "./assets/battle-media/audio/sfx/sfx_hero_charge.mp3", "./assets/battle-media/audio/sfx/sfx_hero_dash.mp3", "./assets/battle-media/audio/sfx/sfx_hero_impact.mp3", "./assets/battle-media/audio/sfx/sfx_monster_attack.mp3", "./assets/battle-media/audio/sfx/sfx_shield_crack.mp3", "./assets/battle-media/audio/sfx/sfx_shield_restored.mp3", "./assets/battle-media/audio/sfx/sfx_signal_connected.mp3", "./assets/battle-media/audio/sfx/sfx_special_beam.mp3", "./assets/battle-media/audio/sfx/sfx_special_charge.mp3", "./assets/battle-media/audio/sfx/sfx_special_finish.mp3", "./assets/battle-media/audio/sfx/sfx_ui_select.mp3", "./assets/battle-media/audio/voice/vo_combo_five.mp3", "./assets/battle-media/audio/voice/vo_damage_seven.mp3", "./assets/battle-media/audio/voice/vo_damage_five.mp3", "./assets/battle-media/audio/voice/vo_first_retry.mp3", "./assets/battle-media/audio/voice/vo_first_signal.mp3", "./assets/battle-media/audio/voice/vo_intro_command.mp3", "./assets/battle-media/audio/voice/vo_intro_monster.mp3", "./assets/battle-media/audio/voice/vo_intro_hero.mp3", "./assets/battle-media/audio/voice/vo_loss_monster.mp3", "./assets/battle-media/audio/voice/vo_monster_taunt.mp3", "./assets/battle-media/audio/voice/vo_retry_hero.mp3", "./assets/battle-media/audio/voice/vo_stage_evacuation.mp3", "./assets/battle-media/audio/voice/vo_stage_shield.mp3", "./assets/battle-media/audio/voice/vo_win_hero.mp3"]);

FILES.push(...["./shooter-vocabulary.js","./shooter-data.js","./shooter-audio-manifest.js","./shooter-audio.js","./word-shooter.js","./word-shooter.css","./shooter-campaign.js","./shooter-campaign.css","./assets/shooter-vocabulary.json","./assets/shooter-art/room-v1.png","./assets/shooter-art/sprites-v1.png","./assets/straw-fleet-side-v2.png","./assets/shooter-audio/s0000.wav","./assets/shooter-audio/s0001.wav","./assets/shooter-audio/s0002.wav","./assets/shooter-audio/s0003.wav","./assets/shooter-audio/s0004.wav","./assets/shooter-audio/s0005.wav","./assets/shooter-audio/s0006.wav","./assets/shooter-audio/s0007.wav","./assets/shooter-audio/s0008.wav","./assets/shooter-audio/s0009.wav","./assets/shooter-audio/s0010.wav","./assets/shooter-audio/s0011.wav","./assets/shooter-audio/s0012.wav","./assets/shooter-audio/s0013.wav","./assets/shooter-audio/s0014.wav","./assets/shooter-audio/s0015.wav","./assets/shooter-audio/s0016.wav","./assets/shooter-audio/s0017.wav","./assets/shooter-audio/s0018.wav","./assets/shooter-audio/s0019.wav","./assets/shooter-audio/s0020.wav","./assets/shooter-audio/s0021.wav","./assets/shooter-audio/s0022.wav","./assets/shooter-audio/s0023.wav","./assets/shooter-audio/s0024.wav","./assets/shooter-audio/s0025.wav","./assets/shooter-audio/s0026.wav","./assets/shooter-audio/s0027.wav","./assets/shooter-audio/s0028.wav","./assets/shooter-audio/s0029.wav","./assets/shooter-audio/s0030.wav","./assets/shooter-audio/s0031.wav","./assets/shooter-audio/s0032.wav","./assets/shooter-audio/s0033.wav","./assets/shooter-audio/s0034.wav","./assets/shooter-audio/s0035.wav","./assets/shooter-audio/s0036.wav","./assets/shooter-audio/s0037.wav","./assets/shooter-audio/s0038.wav","./assets/shooter-audio/s0039.wav","./assets/shooter-audio/s0040.wav","./assets/shooter-audio/s0041.wav","./assets/shooter-audio/s0042.wav","./assets/shooter-audio/s0043.wav","./assets/shooter-audio/s0044.wav","./assets/shooter-audio/s0045.wav","./assets/shooter-audio/s0046.wav","./assets/shooter-audio/s0047.wav","./assets/shooter-audio/s0048.wav","./assets/shooter-audio/s0049.wav","./assets/shooter-audio/s0050.wav","./assets/shooter-audio/s0051.wav","./assets/shooter-audio/s0052.wav","./assets/shooter-audio/s0053.wav","./assets/shooter-audio/s0054.wav","./assets/shooter-audio/s0055.wav","./assets/shooter-audio/s0056.wav","./assets/shooter-audio/s0057.wav","./assets/shooter-audio/s0058.wav","./assets/shooter-audio/s0059.wav","./assets/shooter-audio/s0060.wav","./assets/shooter-audio/s0061.wav","./assets/shooter-audio/s0062.wav","./assets/shooter-audio/s0063.wav","./assets/shooter-audio/s0064.wav","./assets/shooter-audio/s0065.wav","./assets/shooter-audio/s0066.wav","./assets/shooter-audio/s0067.wav","./assets/shooter-audio/s0068.wav","./assets/shooter-audio/s0069.wav","./assets/shooter-audio/s0070.wav","./assets/shooter-audio/s0071.wav","./assets/shooter-audio/s0072.wav","./assets/shooter-audio/s0073.wav","./assets/shooter-audio/s0074.wav","./assets/shooter-audio/s0075.wav","./assets/shooter-audio/s0076.wav","./assets/shooter-audio/s0077.wav","./assets/shooter-audio/s0078.wav","./assets/shooter-audio/s0079.wav","./assets/shooter-audio/s0080.wav","./assets/shooter-audio/s0081.wav","./assets/shooter-audio/s0082.wav","./assets/shooter-audio/s0083.wav","./assets/shooter-audio/s0084.wav","./assets/shooter-audio/s0085.wav","./assets/shooter-audio/s0086.wav","./assets/shooter-audio/s0087.wav","./assets/shooter-audio/s0088.wav","./assets/shooter-audio/s0089.wav","./assets/shooter-audio/s0090.wav","./assets/shooter-audio/s0091.wav","./assets/shooter-audio/s0092.wav","./assets/shooter-audio/s0093.wav","./assets/shooter-audio/s0094.wav","./assets/shooter-audio/s0095.wav","./assets/shooter-audio/s0096.wav","./assets/shooter-audio/s0097.wav","./assets/shooter-audio/s0098.wav","./assets/shooter-audio/s0099.wav","./assets/shooter-audio/s0100.wav","./assets/shooter-audio/s0101.wav","./assets/shooter-audio/s0102.wav","./assets/shooter-audio/s0103.wav","./assets/shooter-audio/s0104.wav","./assets/shooter-audio/s0105.wav","./assets/shooter-audio/s0106.wav","./assets/shooter-audio/s0107.wav","./assets/shooter-audio/s0108.wav","./assets/shooter-audio/s0109.wav","./assets/shooter-audio/s0110.wav","./assets/shooter-audio/s0111.wav","./assets/shooter-audio/s0112.wav","./assets/shooter-audio/s0113.wav","./assets/shooter-audio/s0114.wav","./assets/shooter-audio/s0115.wav","./assets/shooter-audio/s0116.wav","./assets/shooter-audio/s0117.wav","./assets/shooter-audio/s0118.wav","./assets/shooter-audio/s0119.wav","./assets/shooter-audio/s0120.wav","./assets/shooter-audio/s0121.wav","./assets/shooter-audio/s0122.wav","./assets/shooter-audio/s0123.wav","./assets/shooter-audio/s0124.wav","./assets/shooter-audio/s0125.wav","./assets/shooter-audio/s0126.wav","./assets/shooter-audio/s0127.wav","./assets/shooter-audio/s0128.wav","./assets/shooter-audio/s0129.wav","./assets/shooter-audio/s0130.wav","./assets/shooter-audio/s0131.wav","./assets/shooter-audio/s0132.wav","./assets/shooter-audio/s0133.wav","./assets/shooter-audio/s0134.wav","./assets/shooter-audio/s0135.wav","./assets/shooter-audio/s0136.wav","./assets/shooter-audio/s0137.wav","./assets/shooter-audio/s0138.wav","./assets/shooter-audio/s0139.wav","./assets/shooter-audio/s0140.wav","./assets/shooter-audio/s0141.wav","./assets/shooter-audio/s0142.wav","./assets/shooter-audio/s0143.wav","./assets/shooter-audio/s0144.wav","./assets/shooter-audio/s0145.wav","./assets/shooter-audio/s0146.wav","./assets/shooter-audio/s0147.wav","./assets/shooter-audio/s0148.wav","./assets/shooter-audio/s0149.wav","./assets/shooter-audio/s0150.wav","./assets/shooter-audio/s0151.wav","./assets/shooter-audio/s0152.wav","./assets/shooter-audio/s0153.wav","./assets/shooter-audio/s0154.wav","./assets/shooter-audio/s0155.wav","./assets/shooter-audio/s0156.wav","./assets/shooter-audio/s0157.wav","./assets/shooter-audio/s0158.wav","./assets/shooter-audio/s0159.wav","./assets/shooter-audio/s0160.wav","./assets/shooter-audio/s0161.wav","./assets/shooter-audio/s0162.wav","./assets/shooter-audio/s0163.wav","./assets/shooter-audio/s0164.wav","./assets/shooter-audio/s0165.wav","./assets/shooter-audio/s0166.wav","./assets/shooter-audio/s0167.wav","./assets/shooter-audio/s0168.wav","./assets/shooter-audio/s0169.wav","./assets/shooter-audio/s0170.wav","./assets/shooter-audio/s0171.wav","./assets/shooter-audio/s0172.wav","./assets/shooter-audio/s0173.wav","./assets/shooter-audio/s0174.wav","./assets/shooter-audio/s0175.wav","./assets/shooter-audio/s0176.wav","./assets/shooter-audio/s0177.wav","./assets/shooter-audio/s0178.wav","./assets/shooter-audio/s0179.wav","./assets/shooter-audio/s0180.wav","./assets/shooter-audio/s0181.wav","./assets/shooter-audio/s0182.wav","./assets/shooter-audio/s0183.wav","./assets/shooter-audio/s0184.wav","./assets/shooter-audio/s0185.wav","./assets/shooter-audio/s0186.wav","./assets/shooter-audio/s0187.wav","./assets/shooter-audio/s0188.wav","./assets/shooter-audio/s0189.wav","./assets/shooter-audio/s0190.wav","./assets/shooter-audio/s0191.wav","./assets/shooter-audio/s0192.wav","./assets/shooter-audio/s0193.wav","./assets/shooter-audio/s0194.wav","./assets/shooter-audio/s0195.wav","./assets/shooter-audio/s0196.wav","./assets/shooter-audio/s0197.wav","./assets/shooter-audio/s0198.wav","./assets/shooter-audio/s0199.wav","./assets/shooter-audio/s0200.wav","./assets/shooter-audio/s0201.wav","./assets/shooter-audio/s0202.wav","./assets/shooter-audio/s0203.wav","./assets/shooter-audio/s0204.wav","./assets/shooter-audio/s0205.wav","./assets/shooter-audio/s0206.wav","./assets/shooter-audio/s0207.wav","./assets/shooter-audio/s0208.wav","./assets/shooter-audio/s0209.wav","./assets/shooter-audio/s0210.wav","./assets/shooter-audio/s0211.wav","./assets/shooter-audio/s0212.wav","./assets/shooter-audio/s0213.wav","./assets/shooter-audio/s0214.wav","./assets/shooter-audio/s0215.wav","./assets/shooter-audio/s0216.wav","./assets/shooter-audio/s0217.wav","./assets/shooter-audio/s0218.wav","./assets/shooter-audio/s0219.wav","./assets/shooter-audio/s0220.wav","./assets/shooter-audio/s0221.wav","./assets/shooter-audio/s0222.wav","./assets/shooter-audio/s0223.wav","./assets/shooter-audio/s0224.wav","./assets/shooter-audio/s0225.wav","./assets/shooter-audio/s0226.wav","./assets/shooter-audio/s0227.wav","./assets/shooter-audio/s0228.wav","./assets/shooter-audio/s0229.wav","./assets/shooter-audio/s0230.wav","./assets/shooter-audio/s0231.wav","./assets/shooter-audio/s0232.wav","./assets/shooter-audio/s0233.wav","./assets/shooter-audio/s0234.wav","./assets/shooter-audio/s0235.wav","./assets/shooter-audio/s0236.wav","./assets/shooter-audio/s0237.wav","./assets/shooter-audio/s0238.wav","./assets/shooter-audio/s0239.wav","./assets/shooter-audio/s0240.wav","./assets/shooter-audio/s0241.wav","./assets/shooter-audio/s0242.wav","./assets/shooter-audio/s0243.wav","./assets/shooter-audio/s0244.wav","./assets/shooter-audio/s0245.wav","./assets/shooter-audio/s0246.wav","./assets/shooter-audio/s0247.wav","./assets/shooter-audio/s0248.wav","./assets/shooter-audio/s0249.wav","./assets/shooter-audio/s0250.wav","./assets/shooter-audio/s0251.wav","./assets/shooter-audio/s0252.wav","./assets/shooter-audio/s0253.wav","./assets/shooter-audio/s0254.wav","./assets/shooter-audio/s0255.wav","./assets/shooter-audio/s0256.wav","./assets/shooter-audio/s0257.wav","./assets/shooter-audio/s0258.wav","./assets/shooter-audio/s0259.wav","./assets/shooter-audio/s0260.wav","./assets/shooter-audio/s0261.wav","./assets/shooter-audio/s0262.wav","./assets/shooter-audio/s0263.wav","./assets/shooter-audio/s0264.wav","./assets/shooter-audio/s0265.wav","./assets/shooter-audio/s0266.wav","./assets/shooter-audio/s0267.wav","./assets/shooter-audio/s0268.wav","./assets/shooter-audio/s0269.wav","./assets/shooter-audio/s0270.wav","./assets/shooter-audio/s0271.wav","./assets/shooter-audio/s0272.wav","./assets/shooter-audio/s0273.wav","./assets/shooter-audio/s0274.wav","./assets/shooter-audio/s0275.wav","./assets/shooter-audio/s0276.wav","./assets/shooter-audio/s0277.wav","./assets/shooter-audio/s0278.wav","./assets/shooter-audio/s0279.wav","./assets/shooter-audio/s0280.wav","./assets/shooter-audio/s0281.wav","./assets/shooter-audio/s0282.wav","./assets/shooter-audio/s0283.wav","./assets/shooter-audio/s0284.wav","./assets/shooter-audio/s0285.wav","./assets/shooter-audio/s0286.wav","./assets/shooter-audio/s0287.wav","./assets/shooter-audio/s0288.wav","./assets/shooter-audio/s0289.wav","./assets/shooter-audio/s0290.wav","./assets/shooter-audio/s0291.wav","./assets/shooter-audio/s0292.wav","./assets/shooter-audio/s0293.wav","./assets/shooter-audio/s0294.wav","./assets/shooter-audio/s0295.wav","./assets/shooter-audio/s0296.wav","./assets/shooter-audio/s0297.wav","./assets/shooter-audio/s0298.wav","./assets/shooter-audio/s0299.wav","./assets/shooter-audio/s0300.wav","./assets/shooter-audio/s0301.wav","./assets/shooter-audio/s0302.wav","./assets/shooter-audio/s0303.wav","./assets/shooter-audio/s0304.wav","./assets/shooter-audio/s0305.wav","./assets/shooter-audio/s0306.wav","./assets/shooter-audio/s0307.wav","./assets/shooter-audio/s0308.wav","./assets/shooter-audio/s0309.wav","./assets/shooter-audio/s0310.wav","./assets/shooter-audio/s0311.wav","./assets/shooter-audio/s0312.wav","./assets/shooter-audio/s0313.wav","./assets/shooter-audio/s0314.wav","./assets/shooter-audio/s0315.wav","./assets/shooter-audio/s0316.wav","./assets/shooter-audio/s0317.wav","./assets/shooter-audio/s0318.wav","./assets/shooter-audio/s0319.wav","./assets/shooter-audio/s0320.wav","./assets/shooter-audio/s0321.wav","./assets/shooter-audio/s0322.wav","./assets/shooter-audio/s0323.wav","./assets/shooter-audio/s0324.wav","./assets/shooter-audio/s0325.wav","./assets/shooter-audio/s0326.wav","./assets/shooter-audio/s0327.wav","./assets/shooter-audio/s0328.wav","./assets/shooter-audio/s0329.wav","./assets/shooter-audio/s0330.wav","./assets/shooter-audio/s0331.wav"]);
FILES.push('./word-realm.js','./word-realm.css','./assets/realm-art/hero-v1.png');
FILES.push('./assets/battle-media/poster-portrait.jpg','./assets/battle-media/poster-landscape.jpg');
FILES.push(...["./battle-campaign.js", "./battle-campaign.css", "./progression.js", "./progression.css", "./progression-data.js", "./assets/progression-levels.json", "./assets/progression-art/monsters-v1.png", "./assets/progression-art/scenes-v1.png", "./assets/progression-art/river-scenes-v1.png"]);
// Animated compatibility assets cache on demand, without adding 49MB to
// the install gate for browsers that already play inline MP4 correctly.
FILES.push('./battle-frames.js','./battle-frames.css','./navy-fleet.js','./navy-fleet.css','./navy-campaign-ui.css');
const CACHE_PREFIX='english-games-offline-';
const FILE_URLS=[...new Set(FILES.map(f=>new URL(f,self.location.href).href))];
const CORE_URLS=FILE_URLS.filter(f=>! /\.(?:mp3|wav|mp4)$/i.test(new URL(f).pathname));
const READY_URL=new URL('./__offline-ready-v31',self.location.href).href;
const MAX_DOWNLOADS=4,REQUEST_TIMEOUT=30000,MAX_ATTEMPTS=3;
let coreJob=null,offlineJob=null;
let offlineProgress={type:'OFFLINE_PROGRESS',cache:CACHE,completed:0,total:FILE_URLS.length,state:'preparing'};

// Bound both downloads and cache checks. Await in-flight workers before reporting
// failure so a later retry cannot overlap a previous preparation job.
async function runPool(items,task){
  let next=0,failure=null;
  await Promise.all(Array.from({length:Math.min(MAX_DOWNLOADS,items.length)},async()=>{
    while(!failure&&next<items.length){
      const item=items[next++];
      try{await task(item)}catch(error){if(!failure)failure=error}
    }
  }));
  if(failure)throw failure;
}
async function presentFiles(cache){
  const present=new Set();
  await runPool(FILE_URLS,async url=>{if(await cache.match(url))present.add(url)});
  return present;
}
async function cacheFile(cache,url){
  if(await cache.match(url))return;
  let lastError;
  for(let attempt=1;attempt<=MAX_ATTEMPTS;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT);
    try{
      const request=new Request(url,{cache:'reload',signal:controller.signal});
      const response=await fetch(request);
      if(!response.ok||response.status===206)throw new Error(`HTTP ${response.status}`);
      // Keep the timeout active while Cache.put consumes the response body.
      await cache.put(url,response);
      return;
    }catch(error){lastError=controller.signal.aborted?'请求超过 30 秒':String(error.message||error)}
    finally{clearTimeout(timer)}
  }
  const path=new URL(url).pathname;
  throw new Error(`${path}：${lastError}（已尝试 ${MAX_ATTEMPTS} 次）`);
}
async function publishProgress(source){
  const message={...offlineProgress};
  if(source&&source.postMessage){try{source.postMessage(message)}catch{}}
  try{
    const scope=new URL('./',self.location.href),clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients){
      const url=new URL(client.url);
      if(url.origin===scope.origin&&url.pathname.startsWith(scope.pathname)&&(!source||client.id!==source.id)){
        try{client.postMessage(message)}catch{}
      }
    }
  }catch{}
}
async function prepareOffline(){
  let cache,present;
  try{
    if(coreJob)await coreJob;
    cache=await caches.open(CACHE);
    present=await presentFiles(cache);
    offlineProgress={...offlineProgress,completed:present.size,state:'preparing'};
    delete offlineProgress.error;
    if(present.size!==FILE_URLS.length)await cache.delete(READY_URL);
    await publishProgress();
    await runPool(FILE_URLS.filter(url=>!present.has(url)),async url=>{
      await cacheFile(cache,url);
      present.add(url);
      offlineProgress.completed=present.size;
      await publishProgress();
    });
    // Verify every required URL again before claiming offline readiness.
    present=await presentFiles(cache);
    offlineProgress.completed=present.size;
    if(present.size!==FILE_URLS.length)throw new Error(`离线资源不完整：${present.size}/${FILE_URLS.length}`);
    await cache.put(READY_URL,new Response(JSON.stringify({cache:CACHE,completed:present.size,total:FILE_URLS.length}),{headers:{'Content-Type':'application/json'}}));
    offlineProgress.state='ready';
    await publishProgress();
    // Preserve the previous complete version until this version is complete.
    // Cleanup failure does not invalidate an already verified ready cache.
    try{
      const keys=await caches.keys();
      await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
    }catch{}
  }catch(error){
    if(cache){
      try{offlineProgress.completed=(await presentFiles(cache)).size;await cache.delete(READY_URL)}catch{}
    }
    offlineProgress.state='failed';
    offlineProgress.error=String(error.message||error);
    await publishProgress();
  }
}
self.addEventListener('install',e=>{
  coreJob=(async()=>{
    const cache=await caches.open(CACHE);
    await runPool(CORE_URLS,url=>cacheFile(cache,url));
    offlineProgress.completed=(await presentFiles(cache)).size;
    await self.skipWaiting();
  })();
  e.waitUntil(coreJob);
});
self.addEventListener('activate',e=>{
  // Do not navigate open clients or delete their offline fallback on activation.
  e.waitUntil(self.clients.claim());
});
self.addEventListener('message',e=>{
  if(!e.data||e.data.type!=='PREPARE_OFFLINE')return;
  if(!offlineJob){
    offlineProgress.state='preparing';delete offlineProgress.error;
    offlineJob=prepareOffline().finally(()=>{offlineJob=null});
  }
  const job=offlineJob;
  // Further messages publish current progress and share the running job.
  e.waitUntil((async()=>{await publishProgress(e.source);await job})());
});
async function olderHit(request){
  const keys=(await caches.keys()).filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE);
  keys.sort((a,b)=>Number(b.match(/\d+$/)?.[0]||0)-Number(a.match(/\d+$/)?.[0]||0));
  for(const key of keys){
    const hit=await (await caches.open(key)).match(request,{ignoreSearch:true});
    if(hit)return hit;
  }
}
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url),scope=new URL('./',self.location.href).pathname;
  if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(scope))return;
  const fresh=e.request.mode==='navigate'||/\.(?:js|css)$/.test(u.pathname);
  e.respondWith((async()=>{const cache=await caches.open(CACHE),hit=await cache.match(e.request,{ignoreSearch:true});
    const range=e.request.headers.get('range');
    if(range&&hit)return mediaRange(hit,range);
    if(!fresh&&hit)return hit;
    const fallback=async()=>{
      const saved=hit||await olderHit(e.request);
      return saved?(range?mediaRange(saved,range):saved):null;
    };
    try{
      const response=await fetch(new Request(e.request,{cache:fresh?'no-cache':'default'}));
      if(response.ok){
        if(response.status!==206){try{await cache.put(e.request,response.clone())}catch{}}
        return response;
      }
      return await fallback()||response;
    }catch{return await fallback()||Response.error()}
  })());
});

// Cached full MP4s need byte-range responses for mobile video seeking/offline playback.
async function mediaRange(response,range){
 const data=await response.arrayBuffer(),size=data.byteLength,m=/^bytes=(\d*)-(\d*)$/.exec(range);
 const invalid=()=>new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
 if(!m||(!m[1]&&!m[2]))return invalid();
 let start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2])),end=m[1]?(m[2]?Math.min(Number(m[2]),size-1):size-1):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||start<0||end<start)return invalid();
 const headers=new Headers(response.headers);headers.set('Content-Range',`bytes ${start}-${end}/${size}`);headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');headers.delete('Content-Encoding');
 return new Response(data.slice(start,end+1),{status:206,headers});
}
