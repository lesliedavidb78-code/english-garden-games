(() => {
  'use strict';
  const intro = [
    {speaker:'怪兽',text:'地球的城市，从今天起归我统治！我已经切断通讯，你们休想呼叫救援！'},
    {speaker:'奥特曼',text:'这里的人们应该自由生活。我会守护地球！小小通讯员，你愿意和我并肩作战吗？'},
    {speaker:'守护队',text:'你负责接通英文频道，听懂问句、选择合适的回应。每接通一道信号，就能为奥特曼补充反击能量！'}
  ];
  const missions = ['第一幕 · 接通城市通讯','第二幕 · 护送居民避难','第三幕 · 重启地球护盾'];
  const contexts = {
    1:'学校救援频道：孩子们正在介绍伙伴和自己的本领。帮他们接上对话。',
    2:'通讯修复频道：同学们正在讨论学校项目。听懂他们的烦恼，接上回应。',
    3:'安全生活频道：学校正在恢复课程和日常生活。选择与问句相配的回答。',
    4:'健康救援频道：避难所正在讨论健康习惯。帮大家接上对话。',
    5:'避难所补给频道：大家正在谈论食物。选择适合这段对话的回应。',
    6:'自然公园频道：救援队正在交流公园情况。选择适合问句的回应。'
  };
  function scene(stats={},item={}) {
    const correct=stats.correct||0,wrong=stats.wrong||0,act=correct<3?0:correct<6?1:2;
    if(stats.terminal==='won')return {mission:'地球守护成功',context:'城市通讯恢复，居民安全，地球护盾重新点亮。',question:item.q||'',heroLine:'小小通讯员，我们做到了！是你的每一次努力，守住了大家的家园。',monsterLine:'可恶……你们的团结，竟然比我的力量还强！'};
    if(stats.terminal==='lost')return {mission:'暂时撤退 · 守护不会结束',context:'居民已经进入避难所。记住正确回应，整装后再出发！',question:item.q||'',heroLine:'先保护大家撤离。我陪你复习，再一起夺回城市！',monsterLine:'哈哈，这次我占了上风！你们还会回来吗？'};
    const heroLine=wrong>=7?'护盾快撑不住了！别慌，看清问句，我和你一起守住这里。':wrong>=5?'防线受损了，居民还需要我们。把正确回应记住，继续接通信号！':act===0?'通讯还有杂音，先让大家听见彼此。':act===1?'信号接通了！现在护送居民到安全的地方。':'居民安全了！再接通信号，就能启动地球护盾！';
    const monsterLine=wrong>=5?'通讯员，你们的护盾可撑不了多久！':act===0?'没有通讯，这座城市就得听我的！':act===1?'不许撤离！地球应该由我统治！':'谁准你们重启护盾？我不会轻易退走！';
    return {mission:missions[act],context:contexts[item.unit]||'守护队英文频道：听懂问句，选择合适的回应。',question:item.q||'',heroLine,monsterLine};
  }
  window.BattleStory={intro,scene};
})();
