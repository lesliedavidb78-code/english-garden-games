(() => {
 'use strict';
 let animationTimer = null;
 const stage = () => document.getElementById('dialogue-battle');
 const integer = n => Math.min(10, Math.max(0, Math.floor(Number(n) || 0)));
 function markup() {
  return `<section id="dialogue-battle" class="dialogue-battle" aria-label="奥特曼对话大战">
   <div class="battle-health"><div class="battle-health-side"><div class="battle-health-label"><strong>奥特曼</strong><span data-battle="hero-count">10 / 10</span></div><div class="battle-health-track" role="progressbar" aria-label="奥特曼血量" aria-valuemin="0" aria-valuemax="10" aria-valuenow="10" data-battle="hero-bar"><span></span></div></div><span class="battle-versus" aria-hidden="true">VS</span><div class="battle-health-side"><div class="battle-health-label"><strong>怪兽</strong><span data-battle="monster-count">10 / 10</span></div><div class="battle-health-track monster-health" role="progressbar" aria-label="怪兽血量" aria-valuemin="0" aria-valuemax="10" aria-valuenow="10" data-battle="monster-bar"><span></span></div></div></div>
   <div class="battle-arena"><svg class="battle-scene" viewBox="0 0 600 220" role="img" aria-label="奥特曼与怪兽站在星空城市中对战">
    <defs><linearGradient id="battle-sky" x2="0" y2="1"><stop stop-color="#233a61"/><stop offset="1" stop-color="#697cb2"/></linearGradient><linearGradient id="battle-silver" x2="1" y2="1"><stop stop-color="#fff8ec"/><stop offset=".55" stop-color="#d9e7f1"/><stop offset="1" stop-color="#8fa4bf"/></linearGradient><linearGradient id="battle-red" x2=".6" y2="1"><stop stop-color="#fb6573"/><stop offset="1" stop-color="#bc274a"/></linearGradient><linearGradient id="battle-monster" x2="1" y2="1"><stop stop-color="#b293eb"/><stop offset="1" stop-color="#61529b"/></linearGradient><linearGradient id="battle-light"><stop stop-color="#eaffff"/><stop offset=".45" stop-color="#70e6ff"/><stop offset="1" stop-color="#c3ffff" stop-opacity=".1"/></linearGradient></defs>
    <rect width="600" height="220" rx="18" fill="url(#battle-sky)"/>
    <g fill="#ffeabe" opacity=".75"><circle cx="42" cy="22" r="2"/><circle cx="242" cy="27" r="2"/><circle cx="334" cy="12" r="2"/><circle cx="530" cy="28" r="2"/><path d="M312 45l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M53 90l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/></g>
    <circle cx="465" cy="39" r="19" fill="#c6e7ee" opacity=".55"/><circle cx="474" cy="33" r="19" fill="#314766"/>
    <g fill="#17354b" opacity=".4"><path d="M0 202V120h38v82h14v-51h43v51h28v-88h45v88h22v-58h30v58h29v-67h49v67h20v-49h38v49h16v-80h43v80h33v-46h27v46h16v-72h42v72h39v-87h40v87z"/><path d="M150 114V94h8v20h19v88h-42v-88zM407 122v-28h8v28z"/></g>
    <g fill="#f5d688" opacity=".35"><path d="M10 135h6v8h-6zm15 0h6v8h-6zm36 31h6v8h-6zm15 0h6v8h-6zm63-38h6v8h-6zm16 0h6v8h-6zm119 21h6v8h-6zm16 0h6v8h-6zm111-13h6v8h-6zm16 0h6v8h-6zm82 6h6v8h-6zm16 0h6v8h-6z"/></g>
    <ellipse cx="300" cy="202" rx="290" ry="17" fill="#b9bff0" opacity=".24"/>
    <ellipse cx="134" cy="201" rx="52" ry="8" fill="#132947" opacity=".45"/><ellipse cx="466" cy="201" rx="64" ry="9" fill="#132947" opacity=".45"/>
    <g transform="translate(70, 5)"><g class="battle-hero">
     <g class="battle-hero-body" stroke="#3e4561" stroke-width="3" stroke-linejoin="round">
      <path d="M53 139L44 184 36 192q-2 7 7 7h23l5-55M79 140l9 44-3 12h25q8-4 2-10l-9-45" fill="url(#battle-silver)"/>
      <path d="M46 170l22 3-2 19H43zM90 173l17-3 4 22H88z" fill="url(#battle-red)"/>
      <path d="M40 78q-12-2-18 13l-8 37q-1 11 8 14 10 1 12-10l8-27M99 78q13 2 17 15l13 31q5 10-4 14-10 5-15-6l-15-27" fill="url(#battle-silver)"/>
      <path d="M17 121l19 5-4 14-13 2-5-11zM108 126l18-7 6 14-7 8-12-1z" fill="url(#battle-red)"/>
      <path d="M43 77q24-11 53 0l10 29-7 38q-26 12-53-1l-8-37z" fill="url(#battle-silver)"/>
      <path d="M43 81l28 21 25-21 6 15-31 27-30-23zM46 126l24 13 30-15-1 20q-26 12-53-1z" fill="url(#battle-red)"/>
      <path d="M54 70h32v17q-14 7-29 0z" fill="#cad9e5"/>
      <path d="M43 56C35 22 52 8 73 10c22 1 36 19 28 48-5 16-18 23-30 23-13 0-24-9-28-25z" fill="url(#battle-silver)"/>
      <path d="M69 11l5-11 7 13-4 46-8 5z" fill="#dae9ed"/>
      <path d="M43 38q8-7 22-3l-2 19q-14 3-19-8zM83 35q14-3 19 4l-1 9q-8 10-20 6z" fill="#ffeeb5" stroke="#bc9964" stroke-width="2"/>
      <path d="M61 66q12 6 23-1" fill="none" stroke="#8399ab" stroke-width="2"/>
      <circle class="battle-hero-core" cx="71" cy="107" r="10" fill="#67e5ff" stroke="#f8ffff"/><circle cx="68" cy="104" r="3" fill="#fff" stroke="none"/>
     </g>
     <g class="battle-hero-sweat" fill="#a6edff" stroke="#59a5d2" stroke-width="2"><path d="M17 44q-9 13-4 18t10-1q2-6-6-17z"/><path d="M118 28q-7 10-3 15t8-1q1-4-5-14z"/></g>
     <g class="battle-hero-celebration" fill="#fff0a6"><path d="M0 62l5 11 11 3-11 4-5 11-4-11-11-4 11-3zM119 5l4 9 9 3-9 3-4 9-3-9-9-3 9-3z"/></g>
    </g></g>
    <g transform="translate(404, 13)"><g class="battle-monster">
     <g class="battle-monster-body" stroke="#343e68" stroke-width="3" stroke-linejoin="round">
      <path d="M97 146q55-27 59 11-18-15-41 12" fill="url(#battle-monster)"/>
      <path d="M26 130L9 148q-16 13-8 18 10 7 20-1l13-15M111 127l23 18q17 11 12 19-5 11-20 0l-16-10" fill="url(#battle-monster)"/>
      <path d="M32 166L25 179l-14 8q-7 8 6 9h31l9-24M85 168l10 15-1 13h37q11-5 0-11l-19-9-7-14" fill="url(#battle-monster)"/>
      <path d="M22 82q-8 57 9 86 37 15 78-2 21-34 6-83" fill="url(#battle-monster)"/>
      <ellipse cx="71" cy="130" rx="29" ry="35" fill="#d9bef3" stroke="#8165ae" stroke-width="2"/>
      <path d="M44 111h54M43 124h57M45 138h53M52 151h37" fill="none" stroke="#b699d3" stroke-width="2"/>
      <path d="M32 33L20 4q20 5 27 28M88 28L106 2q6 22-4 37" fill="#f3d992"/>
      <path d="M25 34q29-17 63-10l26 17 5 37q-11 30-51 29-32-1-46-23L16 61z" fill="url(#battle-monster)"/>
      <path d="M29 39q13-3 22 4M80 38q12-5 24 0" fill="none" stroke-width="4"/>
      <ellipse cx="41" cy="55" rx="12" ry="15" fill="#fff4db"/><ellipse cx="93" cy="51" rx="12" ry="15" fill="#fff4db"/>
      <ellipse cx="44" cy="57" rx="5" ry="7" fill="#344469" stroke="none"/><ellipse cx="89" cy="53" rx="5" ry="7" fill="#344469" stroke="none"/>
      <path d="M46 81q21 14 45-3" fill="none" stroke-width="4" stroke-linecap="round"/>
      <path d="M47 80l6 12 6-7M82 84l5 8 6-15" fill="#fff4d9" stroke-width="2"/>
      <ellipse cx="26" cy="75" rx="9" ry="5" fill="#e99cc8" stroke="none"/><ellipse cx="107" cy="73" rx="8" ry="5" fill="#e99cc8" stroke="none"/>
     </g>
     <g class="battle-monster-stars" fill="#ffe795" stroke="#efb856" stroke-width="1"><path d="M19 20l4 7 8 1-6 6 1 9-7-4-7 4 1-9-6-6 8-1zM109 15l4 7 8 1-6 6 1 9-7-4-7 4 1-9-6-6 8-1z"/></g>
    </g></g>
    <g class="battle-light-beam"><path d="M183 111L472 44v148z" fill="url(#battle-light)"/><path d="M183 111h297" stroke="#fff" stroke-width="12" stroke-linecap="round"/><path d="M183 111h297" stroke="#99eeff" stroke-width="5" stroke-linecap="round"/><circle cx="183" cy="111" r="24" fill="#e7ffff" opacity=".8"/></g>
    <g class="battle-hero-impact" transform="translate(141, 93)"><path class="battle-impact-burst" d="M0-33L8-14 30-20 19-2 36 11 15 14 12 35-3 20-21 32-17 12-36 6-18-7-22-27-7-18z" fill="#ffcc70" stroke="#fff6d9" stroke-width="3"/><text y="8" text-anchor="middle" fill="#9e3850" font-size="22" font-weight="900">咚!</text></g>
    <g class="battle-monster-impact" transform="translate(469, 88)"><path class="battle-impact-burst" d="M0-33L8-14 30-20 19-2 36 11 15 14 12 35-3 20-21 32-17 12-36 6-18-7-22-27-7-18z" fill="#9df0ff" stroke="#edffff" stroke-width="3"/><text y="8" text-anchor="middle" fill="#225873" font-size="22" font-weight="900">啪!</text></g>
    <g class="battle-combo-badge"><rect x="205" y="18" width="190" height="32" rx="16" fill="#fff1a9"/><text x="300" y="40" text-anchor="middle" fill="#6d4b16" font-size="19" font-weight="800">★ 光之力量 ★</text></g>
   </svg></div>
   <p class="battle-caption" data-battle="caption" role="status">选对回答，帮奥特曼打怪兽！</p>
  </section>`;
 }
 function clean(s) {
  return { correct: integer(s?.correct), wrong: integer(s?.wrong), streak: Math.max(0, Math.floor(Number(s?.streak) || 0)) };
 }
 function render(stats) {
  const el = stage(); if (!el) return;
  const s = clean(stats), won = s.correct >= 10, lost = s.wrong >= 10;
  for (const [name, left] of [['hero', 10-s.wrong], ['monster', 10-s.correct]]) {
   const bar = el.querySelector(`[data-battle="${name}-bar"]`);
   bar.setAttribute('aria-valuenow', String(left));
   bar.classList.toggle('low-health', left <= 3);
   bar.querySelector('span').style.width = `${left*10}%`;
   el.querySelector(`[data-battle="${name}-count"]`).textContent = `${left} / 10`;
  }
  el.classList.toggle('hero-danger', s.wrong >= 7 && !lost);
  el.classList.toggle('is-won', won);
  el.classList.toggle('is-lost', lost && !won);
  el.querySelector('[data-battle="caption"]').textContent = won ? '胜利！小朋友，你相信光吗？' : lost ? '怪兽获胜！记住正确答案，再挑战一次。' : s.streak ? `连对 ${s.streak} 题 · 答对 ${s.correct}，答错 ${s.wrong}` : `答对 ${s.correct}，答错 ${s.wrong} · 两边各有 10 格血量`;
 }
 function stop() {
  clearTimeout(animationTimer); animationTimer = null;
  const el = stage(); if (el) el.classList.remove('hero-attacks', 'monster-attacks', 'special-attack');
 }
 function hit(ok, stats) {
  stop(); render(stats);
  const el = stage(); if (!el) return;
  const s = clean(stats), special = ok && s.streak > 0 && s.streak % 5 === 0;
  // Restart the visual effect even if two answers arrive within one animation.
  void el.offsetWidth;
  el.classList.add(ok ? 'hero-attacks' : 'monster-attacks');
  if (special) el.classList.add('special-attack');
  el.querySelector('[data-battle="caption"]').textContent = s.correct >= 10 ? '胜利！小朋友，你相信光吗？' : s.wrong >= 10 ? '怪兽获胜！记住正确答案，再挑战一次。' : special ? `连对 ${s.streak} 题！光之大招发动！` : ok ? '答对了！奥特曼出击，怪兽掉 1 格血。' : '答错了！怪兽反击，奥特曼掉 1 格血。';
  animationTimer = setTimeout(() => { stop(); render(stats); }, special ? 1700 : 900);
 }
 window.DialogueBattle = { markup, render, hit, stop };
})();
