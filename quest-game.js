/* Local, decorative game feedback for the five non-dialogue training modes. */
(() => {
  'use strict';
  const modes = {
    listening: { title: '听力寻宝岛', hint: '听清口令，找到藏在岛上的宝石', reward: '宝石', yes: '叮！找到一颗宝石！', no: '这次走岔啦，记住正确口令再出发。' },
    follow: { title: '声音精灵', hint: '听示范，录下你的声音，唤醒声音精灵', reward: '录音任务', yes: '精灵收到你的声音啦，回听或再录一次吧。', no: '可以再听示范，再试着录一次。' },
    reaction: { title: '雷电跑道', hint: '在时间到之前，点中正确的能量词', reward: '闪电', yes: '闪电加速！向终点冲刺！', no: '先停一下，记住答案，下一步再加速。' },
    meaning: { title: '花牌魔法', hint: '找出词义，让花朵打开它的魔法花瓣', reward: '花朵', yes: '配对成功，一朵花开啦！', no: '这片花瓣不合适，看看正确的词义吧。' },
    translate: { title: '翻译修桥', hint: '翻译一句，就为小兔搭好一块桥板', reward: '桥板', yes: '桥板搭好啦，小兔又近了一步！', no: '这块桥板还没搭好，记住正确的翻译吧。' }
  };
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n) || 0));
  const shell = (body) => `<svg viewBox="0 0 560 74" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="quest-gold" x2="0" y2="1"><stop stop-color="#ffedaa"/><stop offset="1" stop-color="#efad43"/></linearGradient><linearGradient id="quest-aqua" x2="0" y2="1"><stop stop-color="#92e4e6"/><stop offset="1" stop-color="#28a6be"/></linearGradient><linearGradient id="quest-pink" x2="0" y2="1"><stop stop-color="#ffb9dc"/><stop offset="1" stop-color="#dc7fab"/></linearGradient></defs>${body}</svg>`;
  const star = (x, y, scale = 1) => `<path transform="translate(${x} ${y}) scale(${scale})" d="M0-8 2-2 8 0 2 2 0 8-2 2-8 0-2-2Z" fill="#ffe5a1" class="quest-twinkle"/>`;
  const flower = (x, y, count) => `<g transform="translate(${x} ${y})" data-quest-gate="${count}"><path d="M0 0V24M0 17Q-16 4-15 17Q-7 23 0 20M0 12Q14 0 14 12Q8 19 0 17" fill="#67a772" stroke="#467d54" stroke-width="1.6"/><g class="quest-bloom"><circle cy="-9" r="8" fill="#e8a0bd"/><circle cx="9" cy="-3" r="8" fill="#f0b5ca"/><circle cx="6" cy="8" r="8" fill="#e8a0bd"/><circle cx="-6" cy="8" r="8" fill="#f0b5ca"/><circle cx="-9" cy="-3" r="8" fill="#e8a0bd"/><circle r="5.5" fill="#ffe5a1"/></g></g>`;
  const rabbit = (x, y, klass = '') => `<g transform="translate(${x} ${y})"><g class="${klass}"><ellipse cx="-7" cy="-22" rx="5" ry="14" transform="rotate(-13 -7 -22)" fill="#fffdf2"/><ellipse cx="5" cy="-23" rx="5" ry="15" transform="rotate(12 5 -23)" fill="#fffdf2"/><path d="M-7-32V-14M5-34V-15" stroke="#edb1bd" stroke-width="3.2" stroke-linecap="round"/><ellipse cy="-3" rx="16" ry="14" fill="#fffdf2"/><ellipse cy="15" rx="13" ry="13" fill="#f6ece5"/><ellipse cx="-9" cy="27" rx="8" ry="4" fill="#fffdf2"/><ellipse cx="9" cy="27" rx="8" ry="4" fill="#fffdf2"/><circle cx="-5" cy="-5" r="1.8" fill="#274d54"/><circle cx="5" cy="-5" r="1.8" fill="#274d54"/><path d="m-2 0 2 2 2-2M0 2v3" fill="none" stroke="#af737b" stroke-width="1.4"/><circle cx="-10" cy="0" r="3" fill="#f3bac6"/><circle cx="10" cy="0" r="3" fill="#f3bac6"/></g></g>`;
  const scenes = {
    listening: () => shell(`<path d="M0 58Q40 52 80 59T160 59T240 59T320 59T400 59T480 59T560 59V74H0Z" fill="#97d9e0"/><path d="M6 68Q37 62 68 68M106 68Q137 62 168 68M380 68Q411 62 442 68M492 66Q514 62 546 67" fill="none" stroke="#d9f6f1" stroke-width="3"/><ellipse cx="281" cy="55" rx="139" ry="14" fill="#e5b977"/><ellipse cx="276" cy="51" rx="128" ry="11" fill="#f5d9a3"/><path d="M161 50 214 15 248 50M214 15 237 36 216 31 201 36" fill="#8bc5a3"/><path d="M161 50 214 15 221 50" fill="#addac0"/><path d="M272 52Q274 28 278 15" fill="none" stroke="#a97a48" stroke-width="5"/><path d="M278 15Q254-5 248 15Q261 9 278 15Q287-2 307 7Q296 5 278 15Q302 7 314 24Q300 19 278 15Q263 17 261 36Q263 23 278 15" fill="#69ac7b"/><g class="quest-chest" transform="translate(344 39)"><path d="M-22 4Q-24-20 0-20Q24-20 22 4" fill="#cc915a" stroke="#76563c" stroke-width="2.5"/><path d="M-21 3H21V23H-21Z" fill="#b87542" stroke="#76563c" stroke-width="2.5"/><path d="M-12-15V21M12-15V21M-21 6H21" stroke="#f8d989" stroke-width="4"/><rect x="-4" y="4" width="8" height="10" rx="2" fill="#ffe8aa"/><g class="quest-prize"><path d="m0-17 8 8-8 11-8-11Z" fill="#71d7d5" stroke="#fff7d7" stroke-width="1.5"/>${star(0, -18, .45)}</g></g><g class="quest-token" transform="translate(430 24)"><path d="m0-15 12 11-12 17-12-17Z" fill="url(#quest-aqua)" stroke="#fff4cd" stroke-width="2"/><path d="m0-15-4 11 4 17M-12-4H12" fill="none" stroke="#d4faf8" stroke-width="1.4"/></g>${star(99, 23, .65)}${star(462, 42, .5)}`),
    follow: () => shell(`<path d="M55 56Q153 39 272 58T503 54" fill="none" stroke="#d2dde6" stroke-width="2" stroke-dasharray="4 7"/><g class="quest-wave" transform="translate(130 34)"><path d="M0-8V8M10-14V14M20-20V20M30-10V10M40-18V18M50-6V6" stroke="#77bbc4" stroke-width="5" stroke-linecap="round"/></g><ellipse cx="281" cy="61" rx="44" ry="7" fill="#b2cddd" opacity=".45"/><g class="quest-sprite" transform="translate(281 34)"><ellipse class="quest-orbit" rx="45" ry="28" fill="none" stroke="#d3b7eb" stroke-width="2" stroke-dasharray="3 7"/><path d="M-23 2Q-56-30-46 5Q-43 23-23 9M23 2Q56-30 46 5Q43 23 23 9" fill="#d9cdf1" stroke="#b6a3dd" stroke-width="1.5"/><path d="M-22 8Q-26-20-4-25Q1-38 9-32Q19-26 22-10Q30 23 6 28Q-18 29-22 8Z" fill="url(#quest-aqua)" stroke="#49899a" stroke-width="1.5"/><ellipse cx="-7" cy="-4" rx="3" ry="4" fill="#315d6c"/><ellipse cx="8" cy="-4" rx="3" ry="4" fill="#315d6c"/><circle cx="-13" cy="5" r="4" fill="#b7e7ee"/><circle cx="13" cy="5" r="4" fill="#b7e7ee"/><path d="M-5 6Q1 13 7 6" fill="none" stroke="#315d6c" stroke-width="2" stroke-linecap="round"/><path d="m0 14 6 5-6 7-6-7Z" fill="#ffe5a1"/></g><g class="quest-wave quest-wave-right" transform="translate(380 34)"><path d="M0-6V6M10-18V18M20-10V10M30-20V20M40-14V14M50-8V8" stroke="#b9a4d6" stroke-width="5" stroke-linecap="round"/></g>${star(224, 17, .5)}${star(337, 48, .7)}${star(452, 20, .4)}`),
    reaction: () => shell(`<path d="M12 56H548V71H12Z" fill="#cfb49a"/><path d="M12 57H548M12 70H548" stroke="#a68368" stroke-width="2"/><path d="M25 64H82M122 64H179M219 64H276M316 64H373M413 64H470" stroke="#fff5d8" stroke-width="2" stroke-dasharray="12 8"/><g transform="translate(64 32)" class="quest-runner">${rabbit(0, 0)}<path d="M-17 5H-38M-20 14H-47M-16 22H-34" stroke="#9fc7d2" stroke-width="3" stroke-linecap="round"/></g><g class="quest-lightning" transform="translate(280 31)"><path d="m5-25-18 29H-1L-6 27 18-5H4Z" fill="url(#quest-gold)" stroke="#c8933d" stroke-width="1.5"/></g><path d="M493 59V7" stroke="#83674d" stroke-width="3"/><path d="M495 7H529V31H495Z" fill="#fff8e7"/><path d="M495 7H504V15H495M512 7H521V15H512M504 15H512V23H504M521 15H529V23H521M495 23H504V31H495M512 23H521V31H512" fill="#365d61"/>${star(332, 22, .5)}${star(224, 45, .5)}`),
    meaning: () => shell(`<path d="M37 66Q117 40 198 63Q306 41 395 61Q455 46 522 65V74H37Z" fill="#cce4b9"/><g transform="translate(57 22)"><rect width="33" height="39" rx="7" transform="rotate(-9 16 19)" fill="#f4e6b8" stroke="#d8b377" stroke-width="1.5"/><path d="M12 13h12M12 20h8M12 27h12" stroke="#a98658" stroke-width="3" stroke-linecap="round"/></g><g transform="translate(468 20)"><rect width="33" height="39" rx="7" transform="rotate(9 16 19)" fill="#e5d7f2" stroke="#b09ac8" stroke-width="1.5"/><path d="m17 10 2 6 6 1-5 4 1 6-5-3-6 3 1-6-4-4 6-1Z" fill="#ba8bad"/></g>${flower(151, 41, 1)}${flower(213, 37, 3)}${flower(277, 39, 5)}${flower(341, 37, 7)}${flower(404, 42, 9)}${star(242, 14, .45)}${star(371, 16, .45)}`),
    translate: () => shell(`<path d="M0 59Q59 45 109 58L159 57V74H0ZM431 57Q489 45 560 57V74H431Z" fill="#bed8a3"/><path d="M146 54Q276 60 443 54V74H146Z" fill="#9bd8e4"/><path d="M176 66Q198 60 220 66M280 69Q302 63 324 69M367 64Q389 58 411 64" fill="none" stroke="#d8f5ee" stroke-width="3"/><path d="M144 44H441M144 48H441" stroke="#a68559" stroke-width="2"/><path d="M147 38V63M439 38V63" stroke="#9a7950" stroke-width="4"/>${Array.from({length: 10}, (_, i) => `<rect x="${152 + i * 28.4}" y="43" width="25.4" height="13" rx="2" fill="#d5aa6e" stroke="#947145" stroke-width="1.2" data-quest-gate="${i + 1}"/>`).join('')}${rabbit(117, 29, 'quest-rabbit')}<g transform="translate(469 22)"><path d="M-7 18V-10Q-7-16 0-16Q7-16 7-10V18" fill="#cb92ac"/><path d="M-13 18H13" stroke="#9d7191" stroke-width="3"/><path d="m0-18 8 8-8 8-8-8Z" fill="#ffe5a1"/></g>${star(494, 24, .6)}`)
  };
  let eventTimer = 0;
  let state = { mode: 'listening', index: 0, correct: 0, recorded: false };
  function root() { return document.querySelector('.training-quest'); }
  function markup() {
    return '<section class="training-quest" aria-label="训练游戏场景"><div class="quest-heading"><strong class="quest-title"></strong><span class="quest-count"></span></div><div class="quest-scene"></div><div class="quest-bottom"><span class="quest-message" role="status" aria-live="polite"></span><span class="quest-nodes" aria-hidden="true">' + Array.from({length: 10}, (_, i) => `<i data-node="${i}"></i>`).join('') + '</span></div><span class="quest-sparkles" aria-hidden="true">✦ ✧ ✦ ✧ ✦</span></section>';
  }
  function render({ mode = 'listening', index = 0, correct = 0, answered = false, ok = false, skipped = false, recorded = false } = {}) {
    const el = root();
    if (!el) return;
    mode = modes[mode] ? mode : 'listening';
    const info = modes[mode];
    state = { mode, index: clamp(index, 0, 9), correct: clamp(correct, 0, 10), recorded: !!recorded };
    if (el.dataset.mode !== mode || !el.querySelector('.quest-scene svg')) {
      stop();
      el.dataset.mode = mode;
      el.querySelector('.quest-scene').innerHTML = scenes[mode]();
    }
    el.querySelector('.quest-title').textContent = info.title;
    el.querySelector('.quest-count').textContent = mode === 'follow' ? `${info.reward} ${state.index + 1}/10` : `${info.reward} ${state.correct}/10`;
    el.querySelector('.quest-message').textContent = skipped ? '换一个任务，再来试试吧。' : mode === 'follow' && recorded ? '声音已收集，可回听或重录。' : answered ? (ok ? info.yes : info.no) : info.hint;
    const progress = mode === 'follow' ? state.index : state.correct;
    el.querySelectorAll('.quest-nodes i').forEach((node, i) => {
      node.classList.toggle('lit', i < progress || (mode === 'follow' && i === state.index && recorded));
      node.classList.toggle('current', i === progress && progress < 10);
    });
    el.querySelectorAll('[data-quest-gate]').forEach((node) => node.classList.toggle('quest-unlocked', progress >= Number(node.dataset.questGate)));
    const runner = el.querySelector('.quest-runner');
    if (runner) runner.style.transform = `translate(${64 + Math.min(420, state.correct * 39)}px, 32px)`;
    const bunny = el.querySelector('.quest-rabbit');
    if (bunny) bunny.style.transform = `translate(${Math.min(328, state.correct * 32.8)}px, 0)`;
    el.classList.toggle('quest-recorded', mode === 'follow' && recorded);
  }
  function hit(ok, stats = {}) {
    const el = root();
    if (!el) return;
    if (stats && typeof stats.correct === 'number') render({ ...state, ...stats, answered: state.mode !== 'follow', ok, recorded: state.mode === 'follow' ? !!ok : false });
    clearTimeout(eventTimer);
    el.classList.remove('quest-success', 'quest-retry');
    void el.offsetWidth;
    el.classList.add(ok ? 'quest-success' : 'quest-retry');
    el.querySelector('.quest-message').textContent = ok ? modes[state.mode].yes : modes[state.mode].no;
    eventTimer = window.setTimeout(() => { el.classList.remove('quest-success', 'quest-retry'); eventTimer = 0; }, 1250);
  }
  function stop() {
    clearTimeout(eventTimer);
    eventTimer = 0;
    const el = root();
    if (el) el.classList.remove('quest-success', 'quest-retry');
  }
  window.TrainingQuest = { markup, render, hit, stop };
})();
