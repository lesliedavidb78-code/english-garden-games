/* 草船船队：同尺度首尾队列、短缆与航行，不修改答题、奖励或存档。 */
(function () {
  'use strict';
  const ART = 'assets/straw-soldier-boat-clean.png';
  const SIDE_ART = 'assets/straw-fleet-side-v2.png';
  const NS = 'http://www.w3.org/2000/svg';
  let fleet = null;
  const bound = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0));
  const clonePose = (p) => ({ ...p });
  function attachments(node) {
    for (const side of ['left', 'right']) { const ring = document.createElement('i'); ring.className = `navy-fleet-attachment ${side}`; ring.setAttribute('aria-hidden', 'true'); node.append(ring); }
  }
  // 低关是同一水线的横向船队；多船沿连续 S 航道排队，不把队尾缩成小点。
  function convoyPoses(boats, width = 390, height = 240) {
    if (boats === 1) return [{ x: .50, y: .78, scale: 1, opacity: 1, heading: 1 }];
    if (boats <= 3) return Array.from({ length: boats }, (_, depth) => ({
      x: .5 + (boats - 1) * .5 * .92 / boats - depth * .92 / boats,
      y: .74 - depth * .017, scale: 1 - depth * .025, opacity: 1 - depth * .025, heading: 1,
    }));
    const path = []; let length = 0;
    for (let sample = 0; sample <= 200; sample++) {
      const t = sample / 200, x = .5 + .30 * Math.cos(t * Math.PI * 2), y = .87 - .74 * t;
      if (sample) length += Math.hypot((x - path[sample - 1].x) * width, (y - path[sample - 1].y) * height);
      path.push({ x, y, t, distance: length });
    }
    // 用实际屏幕上的弧长均匀取点；直接均匀取角度会让转弯处/头尾几艘挤成一团。
    return Array.from({ length: boats }, (_, depth) => {
      const distance = length * depth / (boats - 1), sample = Math.max(1, path.findIndex(point => point.distance >= distance));
      const before = path[sample - 1], after = path[sample], fraction = (distance - before.distance) / (after.distance - before.distance || 1);
      const t = before.t + (after.t - before.t) * fraction;
      return { x: before.x + (after.x - before.x) * fraction, y: before.y + (after.y - before.y) * fraction, scale: 1 - .13 * t, opacity: 1 - .10 * t, heading: t > .50 ? -1 : 1 };
    });
  }
  function capacities(level) {
    const boats = Math.round(bound(level?.boats || 1, 1, 10));
    const total = Math.round(bound(level?.targetArrows || boats * 10, boats, 1000));
    const base = Math.floor(total / boats), remainder = total % boats;
    return Array.from({ length: boats }, (_, index) => base + (index < remainder ? 1 : 0));
  }
  function snapshot(active, level) {
    const caps = capacities(level), boats = caps.length, total = caps.reduce((a, b) => a + b, 0);
    const correct = Math.round(bound(active?.correct, 0, total));
    return { id: String(active?.id || 'free'), boats, capacities: caps, total, correct, holes: bound(active?.fleetDamage ?? level?.damage ?? active?.holes, 0, 10), completed: correct >= total };
  }
  function range(data, index) {
    const start = data.capacities.slice(0, index).reduce((a, b) => a + b, 0), capacity = data.capacities[index];
    return { index, start, end: start + capacity, capacity };
  }
  function logicalIndex(data) {
    let end = 0;
    for (let index = 0; index < data.boats; index++) { end += data.capacities[index]; if (data.correct < end) return index; }
    return data.boats - 1;
  }
  function count(data, i) { const r = range(data, i); return bound(data.correct - r.start, 0, r.capacity); }
  function transform(f, p) {
    return `translate3d(${(p.x * f.width).toFixed(2)}px,${(p.y * f.height).toFixed(2)}px,0) translate(-50%,-83%) scale(${p.scale})`;
  }
  function setPose(f, node, p, depth = 0) {
    node.style.transform = transform(f, p);
    node.style.opacity = String(p.opacity ?? 1);
    node.style.zIndex = String(60 - depth * 5);
    node.dataset.fleetX = String(p.x);
    node.dataset.fleetY = String(p.y);
    node.dataset.fleetScale = String(p.scale);
    node.dataset.fleetDepth = String(depth);
    node.classList.toggle('navy-fleet-reversed', p.heading === -1);
    const badge = node.querySelector('.navy-fleet-badge');
    if (badge && f.data.boats >= 4) {
      badge.textContent = String(Number(node.dataset.boatIndex) + 1);
      badge.style.fontSize = `${10 / p.scale}px`;
      badge.style.padding = `${2 / p.scale}px ${5 / p.scale}px`;
      badge.style.borderWidth = `${1 / p.scale}px`;
    } else if (badge) {
      badge.style.fontSize = ''; badge.style.padding = ''; badge.style.borderWidth = '';
      const index = Number(node.dataset.boatIndex);
      badge.textContent = `${index + 1}号 · ${count(f.data, index)}/${f.data.capacities[index]}`;
    }
  }
  function measure(f) {
    f.width = f.layer.clientWidth || f.stage.clientWidth || 320;
    f.height = f.layer.clientHeight || 240;
    const boats = f.data.boats;
    const factor = boats === 1 ? .78 : boats <= 3 ? .88 / boats : boats <= 6 ? .31 : .21;
    f.shipWidth = Math.min(520, f.width * factor);
    f.layer.style.setProperty('--fleet-ship-width', `${f.shipWidth}px`);
    f.layer.dataset.formation = boats <= 3 ? 'line' : 'serpentine';
    f.layer.dataset.boats = String(boats);
    f.poses = convoyPoses(boats, f.width, f.height);
    f.shipWidth = parseFloat(getComputedStyle(f.dock).width) || f.shipWidth;
  }
  function createEscort(i) {
    const ship = document.createElement('div');
    ship.className = 'navy-fleet-ship';
    ship.dataset.boatIndex = String(i);
    const motion = document.createElement('div');
    motion.className = 'navy-fleet-motion';
    const img = document.createElement('img');
    img.src = fleet?.sideArt ? SIDE_ART : ART; img.alt = ''; img.draggable = false;
    const spray = document.createElement('div');
    spray.className = 'navy-fleet-spray';
    spray.innerHTML = '<i></i><i></i><i></i>';
    motion.append(img, spray); attachments(motion);
    const badge = document.createElement('span');
    badge.className = 'navy-fleet-badge';
    ship.append(motion, badge);
    return { ship, motion, badge, index: i };
  }
  function updateLabels(f) {
    f.frontBadge.textContent = f.data.boats > 1 ? `${f.viewIndex + 1}号 · ${count(f.data, f.viewIndex)}/${f.data.capacities[f.viewIndex]}` : `${f.viewIndex + 1}号船 · ${count(f.data, f.viewIndex)} / ${f.data.capacities[f.viewIndex]} 箭`;
    f.frontBadge.setAttribute('aria-label', `当前第${f.viewIndex + 1}艘船，已收集${count(f.data, f.viewIndex)}支箭`);
    f.layer.dataset.boats = String(f.data.boats);
    f.layer.dataset.currentBoat = String(f.viewIndex + 1);
    f.layer.dataset.holes = String(f.data.holes);
    const damage = Math.min(f.data.holes, 9);
    f.hero.style.setProperty('--fleet-heel', `${damage * 6}deg`);
    f.hero.style.setProperty('--fleet-flood', `${damage * 2}px`);
    for (const item of f.escorts.values()) {
      item.badge.textContent = f.data.boats >= 4 ? String(item.index + 1) : `${item.index + 1}号 · ${count(f.data, item.index)}/${f.data.capacities[item.index]}`;
      item.ship.setAttribute('aria-label', `第${item.index + 1}艘稻草兵船，${count(f.data, item.index)}支箭；累计漏水${f.data.holes}处`);
      item.motion.style.setProperty('--escort-heel', `${damage * 6}deg`);
      item.motion.style.setProperty('--escort-flood', `${damage * 2}px`);
      item.ship.classList.toggle('leaking', f.data.holes > 0);
    }
  }
  function rebuild(f) {
    const wanted = new Set();
    for (let i = f.viewIndex + 1; i < f.data.boats; i++) {
      wanted.add(i);
      if (!f.escorts.has(i)) {
        const escort = createEscort(i);
        f.escorts.set(i, escort); f.layer.append(escort.ship);
      }
    }
    for (const [i, escort] of f.escorts) {
      if (!wanted.has(i)) { escort.ship.remove(); f.escorts.delete(i); }
    }
    updateLabels(f);
  }
  function docks(f) {
    return [{ index: f.viewIndex, ship: f.dock }, ...[...f.escorts.values()].map(e => ({ index: e.index, ship: e.ship }))].sort((a, b) => a.index - b.index);
  }
  function drawChains(f) {
    if (!f || f !== fleet) return;
    const ships = docks(f), layerRect = f.layer.getBoundingClientRect();
    let path = ''; const geometry = [];
    for (let i = 0; i < ships.length - 1; i++) {
      if (i === 0 && f.leadDetached) continue;
      const leader = ships[i].ship, follower = ships[i + 1].ship;
      // 缆绳的挂点跟随船体实际倾斜/颠簸；船尾连后船船头，转弯时仍挂在同一铁环。
      const near = leader.querySelector(`.navy-fleet-attachment.${leader.classList.contains('navy-fleet-reversed') ? 'right' : 'left'}`).getBoundingClientRect();
      const far = follower.querySelector(`.navy-fleet-attachment.${follower.classList.contains('navy-fleet-reversed') ? 'left' : 'right'}`).getBoundingClientRect();
      const x1 = near.left - layerRect.left, y1 = near.top - layerRect.top;
      const x2 = far.left - layerRect.left, y2 = far.top - layerRect.top;
      const distance = Math.hypot(x2 - x1, y2 - y1);
      const sag = Math.min(9, distance * .07);
      path += `M${x1.toFixed(1)},${y1.toFixed(1)}Q${((x1 + x2) / 2).toFixed(1)},${((y1 + y2) / 2 + sag).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} `;
      geometry.push({ from: ships[i].index + 1, to: ships[i + 1].index + 1, x1, y1, x2, y2, length: distance });
    }
    f.chainShadow.setAttribute('d', path); f.chainMetal.setAttribute('d', path); f.chainLinks.setAttribute('d', path);
    f.chainSvg.setAttribute('viewBox', `0 0 ${f.width} ${f.height}`);
    f.chains = geometry;
  }
  function drawWhileMoving(f) {
    if (f !== fleet || !f.transitioning) return;
    drawChains(f); f.chainFrame = requestAnimationFrame(() => drawWhileMoving(f));
  }
  function settleChains(f, until) {
    if (f !== fleet || f.transitioning) return;
    drawChains(f);
    if (performance.now() < until) f.chainFrame = requestAnimationFrame(() => settleChains(f, until));
    else f.chainFrame = 0;
  }
  function layout(f) {
    measure(f); setPose(f, f.dock, f.poses[0]);
    let depth = 1;
    for (const e of [...f.escorts.values()].sort((a, b) => a.index - b.index)) {
      setPose(f, e.ship, f.poses[depth], depth); depth++;
    }
    drawChains(f);
    // 刚受损时船体有 750ms 倾斜过渡，短缆也跟随实际挂环，不悬在旧坐标。
    cancelAnimationFrame(f.chainFrame); f.chainFrame = requestAnimationFrame(() => settleChains(f, performance.now() + 850));
  }
  function animate(f, node, route, duration, depth = 0) {
    if (!node.animate || f.reduced) {
      setPose(f, node, route.at(-1), depth); return Promise.resolve(true);
    }
    const effect = node.animate(route.map((p, i) => ({ transform: transform(f, p), opacity: p.opacity ?? 1, offset: i / (route.length - 1) })), { duration, easing: 'cubic-bezier(.38,.01,.20,1)', fill: 'forwards' });
    f.animations.add(effect);
    return effect.finished.then(() => {
      if (f !== fleet) return false;
      setPose(f, node, route.at(-1), depth); effect.cancel(); return true;
    }, () => false).finally(() => f.animations.delete(effect));
  }
  function init(options = {}) {
    reset();
    const stage = options.stage || document.getElementById('river');
    const hero = options.heroBoat || document.getElementById('hero-boat');
    const layer = hero?.parentElement;
    if (!stage || !hero || !layer) return false;
    const dock = document.createElement('div'); dock.className = 'navy-fleet-hero-dock';
    layer.insertBefore(dock, hero); dock.append(hero); attachments(hero);
    const frontBadge = document.createElement('span'); frontBadge.className = 'navy-fleet-front-badge'; frontBadge.setAttribute('role', 'status'); dock.append(frontBadge);
    const chainSvg = document.createElementNS(NS, 'svg'); chainSvg.classList.add('navy-fleet-chains'); chainSvg.setAttribute('aria-hidden', 'true'); chainSvg.setAttribute('preserveAspectRatio', 'none');
    const paths = ['navy-chain-shadow', 'navy-chain-metal', 'navy-chain-links'].map(cls => { const p = document.createElementNS(NS, 'path'); p.setAttribute('class', cls); chainSvg.append(p); return p; });
    layer.prepend(chainSvg); layer.classList.add('navy-fleet-enabled'); stage.classList.add('navy-fleet-stage');
    fleet = { stage, hero, layer, dock, frontBadge, chainSvg, chainShadow: paths[0], chainMetal: paths[1], chainLinks: paths[2], escorts: new Map(), animations: new Set(), viewIndex: 0, data: snapshot(null, null), transitioning: false, chainFrame: 0, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, onHandoff: options.onHandoff, run: 0, poses: convoyPoses(1), chains: [], sideArt: false };
    const f = fleet;
    // 统一远景中，长中文词义由同屏提示牌承接；原帆内容/匹配模式仍由判题逻辑决定。
    const cue = stage.querySelector('#cue'), sail = hero.querySelector('#sail-word');
    if (cue?.parentElement && sail) {
      f.cluePanel = document.createElement('div'); f.cluePanel.className = 'navy-fleet-clue-panel';
      f.clue = document.createElement('strong'); f.clue.id = 'navy-fleet-clue'; f.clue.setAttribute('aria-label', '船帆提示');
      cue.before(f.cluePanel); f.cluePanel.append(f.clue, cue);
      const updateClue = () => { f.clue.textContent = sail.textContent; };
      f.clueObserver = new MutationObserver(updateClue); f.clueObserver.observe(sail, { childList: true, characterData: true, subtree: true }); updateClue();
    }
    f.observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (!f.transitioning) layout(f); }) : null;
    f.observer?.observe(layer); f.resize = () => { if (f === fleet && !f.transitioning) layout(f); }; window.addEventListener('resize', f.resize);
    // 新美术失败时仍显示旧船，不让一次素材加载失败使游戏无法运行。
    const art = new Image(); art.onload = () => {
      if (f !== fleet) return;
      f.sideArt = true; f.layer.classList.add('navy-fleet-side-art');
      f.layer.style.setProperty('--fleet-ship-aspect', `${art.naturalWidth} / ${art.naturalHeight}`);
      f.originalHeroSource = f.hero.querySelector('#boat-image')?.getAttribute('src');
      const heroImage = f.hero.querySelector('#boat-image'); if (heroImage) heroImage.src = SIDE_ART;
      for (const e of f.escorts.values()) e.motion.querySelector('img').src = SIDE_ART;
      if (!f.transitioning) layout(f);
    }; art.src = SIDE_ART;
    rebuild(f); layout(f); return true;
  }
  function sync(active, level, options = {}) {
    const f = fleet; if (!f) return false;
    const data = snapshot(active, level), changed = data.id !== f.data.id || data.boats !== f.data.boats || data.total !== f.data.total;
    if (changed) stop({ snap: false });
    f.data = data;
    if (f.transitioning) { updateLabels(f); return true; }
    const desired = logicalIndex(data);
    const crossing = desired === f.viewIndex + 1 && data.correct === range(data, f.viewIndex).end;
    if (!options.holdHandoff || !crossing || changed) f.viewIndex = desired;
    rebuild(f); layout(f);
    if (options.animate && crossing && options.holdHandoff) return depart(active, level, options);
    return true;
  }
  async function depart(active, level, options = {}) {
    const f = fleet; if (!f || f.transitioning) return false;
    const data = snapshot(active, level);
    if (data.id !== f.data.id || !data.correct || data.correct !== range(data, f.viewIndex).end) return false;
    f.data = data; updateLabels(f); measure(f);
    f.transitioning = true; f.leadDetached = true; f.stage.classList.add('navy-fleet-sailing');
    const run = ++f.run, oldIndex = f.viewIndex;
    cancelAnimationFrame(f.chainFrame); drawWhileMoving(f);
    const head = clonePose(f.poses[0]);
    const exited = await animate(f, f.dock, [head, { ...head, x: head.x + .22, y: head.y - .035, opacity: .96 }, { ...head, x: 1.6, y: head.y - .13, opacity: 0 }], 1250);
    if (!exited || f !== fleet || run !== f.run) return false;
    const next = oldIndex + 1;
    if (next < data.boats) {
      const escortStarts = new Map();
      for (const [i] of f.escorts) if (i > next) escortStarts.set(i, clonePose(f.poses[i - oldIndex]));
      f.viewIndex = next; f.leadDetached = false; rebuild(f); setPose(f, f.dock, f.poses[1]);
      try { (options.onHandoff || f.onHandoff)?.(next, data); } catch (error) { console.error('NavyFleet handoff failed', error); }
      const startHead = clonePose(f.poses[1]);
      const arriving = animate(f, f.dock, [startHead, { ...head, x: (startHead.x + head.x) / 2, y: (startHead.y + head.y) / 2, scale: (startHead.scale + head.scale) / 2 }, head], 1250);
      const movements = [...f.escorts.values()].map(e => {
        const depth = e.index - next;
        const start = escortStarts.get(e.index) || clonePose(f.poses[depth + 1]);
        const end = clonePose(f.poses[depth]);
        return animate(f, e.ship, [start, { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2, scale: (start.scale + end.scale) / 2, opacity: (start.opacity + end.opacity) / 2 }, end], 1250, depth);
      });
      await Promise.all([arriving, ...movements]);
      if (f !== fleet || run !== f.run) return false;
    } else {
      f.layer.classList.add('navy-fleet-all-full');
      try { (options.onHandoff || f.onHandoff)?.(next, data); } catch (error) { console.error('NavyFleet finish handoff failed', error); }
    }
    f.transitioning = false; f.stage.classList.remove('navy-fleet-sailing'); cancelAnimationFrame(f.chainFrame); f.chainFrame = 0;
    if (next < data.boats) layout(f); else drawChains(f);
    return true;
  }
  function stop(options = {}) {
    const f = fleet; if (!f) return;
    f.run++; f.transitioning = false; f.leadDetached = false;
    cancelAnimationFrame(f.chainFrame); f.chainFrame = 0;
    for (const effect of f.animations) effect.cancel(); f.animations.clear();
    f.stage.classList.remove('navy-fleet-sailing');
    if (options.snap !== false) {
      f.viewIndex = logicalIndex(f.data); f.layer.classList.remove('navy-fleet-all-full'); rebuild(f); layout(f);
    }
  }
  function reset() {
    const f = fleet; if (!f) return;
    stop({ snap: false }); f.observer?.disconnect(); window.removeEventListener('resize', f.resize);
    f.clueObserver?.disconnect();
    if (f.cluePanel) { const cue = f.cluePanel.querySelector('#cue'); if (cue) f.cluePanel.before(cue); f.cluePanel.remove(); }
    for (const e of f.escorts.values()) e.ship.remove();
    for (const ring of f.hero.querySelectorAll('.navy-fleet-attachment')) ring.remove();
    f.layer.insertBefore(f.hero, f.dock); f.dock.remove(); f.chainSvg.remove();
    if (f.originalHeroSource) f.hero.querySelector('#boat-image').src = f.originalHeroSource;
    f.layer.classList.remove('navy-fleet-enabled', 'navy-fleet-all-full', 'navy-fleet-side-art'); f.layer.style.removeProperty('--fleet-ship-width'); f.layer.style.removeProperty('--fleet-ship-aspect');
    f.stage.classList.remove('navy-fleet-stage', 'navy-fleet-sailing'); fleet = null;
  }
  window.NavyFleet = Object.freeze({ init, sync, depart, stop, reset, capacities, currentBoat: () => fleet?.viewIndex ?? 0, currentRange: () => fleet ? range(fleet.data, fleet.viewIndex) : { index: 0, start: 0, end: 10, capacity: 10 }, isSailing: () => !!fleet?.transitioning, inspect: () => fleet ? { boats: fleet.data.boats, capacities: fleet.data.capacities.slice(), total: fleet.data.total, currentBoat: fleet.viewIndex + 1, correct: fleet.data.correct, holes: fleet.data.holes, escorts: fleet.escorts.size, sailing: fleet.transitioning, formation: fleet.layer.dataset.formation, sideArt: fleet.sideArt, shipWidth: fleet.shipWidth, chains: fleet.chains.map(p => ({ ...p })) } : null });
}());
