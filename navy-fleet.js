/* 草船船队：仅负责航行、远近队列与铁索，不修改答题、奖励或存档。 */
(function () {
  'use strict';
  const ART = 'assets/straw-soldier-boat-clean.png';
  const NS = 'http://www.w3.org/2000/svg';
  let fleet = null;
  const POSES = [
    { x: .51, y: .94, scale: 1, opacity: 1 },
    { x: .23, y: .35, scale: .53, opacity: .94 },
    { x: .76, y: .275, scale: .41, opacity: .86 },
    { x: .28, y: .17, scale: .32, opacity: .79 },
    { x: .73, y: .15, scale: .26, opacity: .73 },
    { x: .31, y: .08, scale: .21, opacity: .68 },
    { x: .69, y: .07, scale: .175, opacity: .63 },
    { x: .36, y: .033, scale: .145, opacity: .59 },
    { x: .65, y: .028, scale: .12, opacity: .55 },
    { x: .43, y: .006, scale: .095, opacity: .51 },
  ];
  const bound = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0));
  const clonePose = (p) => ({ ...p });
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
    const badge = node.querySelector('.navy-fleet-badge');
    if (badge && depth >= 3) {
      badge.textContent = String(Number(node.dataset.boatIndex) + 1);
      badge.style.fontSize = `${10 / p.scale}px`;
      badge.style.padding = `${2 / p.scale}px ${4 / p.scale}px`;
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
    f.layer.style.setProperty('--fleet-ship-width', `${Math.min(570, f.width * .88)}px`);
  }
  function createEscort(i) {
    const ship = document.createElement('div');
    ship.className = 'navy-fleet-ship';
    ship.dataset.boatIndex = String(i);
    const motion = document.createElement('div');
    motion.className = 'navy-fleet-motion';
    const img = document.createElement('img');
    img.src = ART; img.alt = ''; img.draggable = false;
    const spray = document.createElement('div');
    spray.className = 'navy-fleet-spray';
    spray.innerHTML = '<i></i><i></i><i></i>';
    motion.append(img, spray);
    const badge = document.createElement('span');
    badge.className = 'navy-fleet-badge';
    ship.append(motion, badge);
    return { ship, motion, badge, index: i };
  }
  function updateLabels(f) {
    f.frontBadge.textContent = `${f.viewIndex + 1}号船 · ${count(f.data, f.viewIndex)} / ${f.data.capacities[f.viewIndex]} 箭`;
    f.frontBadge.setAttribute('aria-label', `当前第${f.viewIndex + 1}艘船，已收集${count(f.data, f.viewIndex)}支箭`);
    f.layer.dataset.boats = String(f.data.boats);
    f.layer.dataset.currentBoat = String(f.viewIndex + 1);
    f.layer.dataset.holes = String(f.data.holes);
    const damage = Math.min(f.data.holes, 9);
    for (const item of f.escorts.values()) {
      item.badge.textContent = Number(item.ship.dataset.fleetDepth) >= 3 ? String(item.index + 1) : `${item.index + 1}号 · ${count(f.data, item.index)}/${f.data.capacities[item.index]}`;
      item.ship.setAttribute('aria-label', `第${item.index + 1}艘稻草兵船，${count(f.data, item.index)}支箭；累计漏水${f.data.holes}处`);
      item.motion.style.setProperty('--escort-heel', `${damage * 6}deg`);
      item.motion.style.setProperty('--escort-flood', `${damage * 3}px`);
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
    let path = '';
    for (let i = 0; i < ships.length - 1; i++) {
      const near = ships[i].ship.getBoundingClientRect(), far = ships[i + 1].ship.getBoundingClientRect();
      const toRight = far.left + far.width / 2 > near.left + near.width / 2;
      const x1 = near.left - layerRect.left + near.width * (toRight ? .81 : .19);
      const y1 = near.top - layerRect.top + near.height * .78;
      const x2 = far.left - layerRect.left + far.width * (toRight ? .19 : .81);
      const y2 = far.top - layerRect.top + far.height * .78;
      const sag = Math.min(24, Math.hypot(x2 - x1, y2 - y1) * .11);
      path += `M${x1.toFixed(1)},${y1.toFixed(1)}Q${((x1 + x2) / 2).toFixed(1)},${((y1 + y2) / 2 + sag).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} `;
    }
    f.chainShadow.setAttribute('d', path); f.chainMetal.setAttribute('d', path); f.chainLinks.setAttribute('d', path);
    f.chainSvg.setAttribute('viewBox', `0 0 ${f.width} ${f.height}`);
  }
  function drawWhileMoving(f) {
    if (f !== fleet || !f.transitioning) return;
    drawChains(f); f.chainFrame = requestAnimationFrame(() => drawWhileMoving(f));
  }
  function layout(f) {
    measure(f); setPose(f, f.dock, POSES[0]);
    let depth = 1;
    for (const e of [...f.escorts.values()].sort((a, b) => a.index - b.index)) {
      setPose(f, e.ship, POSES[depth], depth); depth++;
    }
    drawChains(f);
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
    layer.insertBefore(dock, hero); dock.append(hero);
    const frontBadge = document.createElement('span'); frontBadge.className = 'navy-fleet-front-badge'; frontBadge.setAttribute('role', 'status'); dock.append(frontBadge);
    const chainSvg = document.createElementNS(NS, 'svg'); chainSvg.classList.add('navy-fleet-chains'); chainSvg.setAttribute('aria-hidden', 'true'); chainSvg.setAttribute('preserveAspectRatio', 'none');
    const paths = ['navy-chain-shadow', 'navy-chain-metal', 'navy-chain-links'].map(cls => { const p = document.createElementNS(NS, 'path'); p.setAttribute('class', cls); chainSvg.append(p); return p; });
    layer.prepend(chainSvg); layer.classList.add('navy-fleet-enabled'); stage.classList.add('navy-fleet-stage');
    fleet = { stage, hero, layer, dock, frontBadge, chainSvg, chainShadow: paths[0], chainMetal: paths[1], chainLinks: paths[2], escorts: new Map(), animations: new Set(), viewIndex: 0, data: snapshot(null, null), transitioning: false, chainFrame: 0, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, onHandoff: options.onHandoff, run: 0 };
    const f = fleet;
    f.observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (!f.transitioning) layout(f); }) : null;
    f.observer?.observe(layer); f.resize = () => { if (f === fleet && !f.transitioning) layout(f); }; window.addEventListener('resize', f.resize);
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
    f.transitioning = true; f.stage.classList.add('navy-fleet-sailing');
    const run = ++f.run, oldIndex = f.viewIndex;
    drawWhileMoving(f);
    const exited = await animate(f, f.dock, [clonePose(POSES[0]), { x: .12, y: .74, scale: .88, opacity: .96 }, { x: -.68, y: .41, scale: .57, opacity: 0 }], 1250);
    if (!exited || f !== fleet || run !== f.run) return false;
    const next = oldIndex + 1;
    if (next < data.boats) {
      const escortStarts = new Map();
      for (const [i] of f.escorts) if (i > next) escortStarts.set(i, clonePose(POSES[i - oldIndex]));
      f.viewIndex = next; rebuild(f); setPose(f, f.dock, POSES[1]);
      try { (options.onHandoff || f.onHandoff)?.(next, data); } catch (error) { console.error('NavyFleet handoff failed', error); }
      const arriving = animate(f, f.dock, [clonePose(POSES[1]), { x: .72, y: .56, scale: .77, opacity: 1 }, clonePose(POSES[0])], 1250);
      const movements = [...f.escorts.values()].map(e => {
        const depth = e.index - next;
        const start = escortStarts.get(e.index) || clonePose(POSES[depth + 1]);
        const end = clonePose(POSES[depth]);
        return animate(f, e.ship, [start, { x: (start.x + end.x) / 2 + (depth % 2 ? -.10 : .10), y: (start.y + end.y) / 2, scale: (start.scale + end.scale) / 2, opacity: (start.opacity + end.opacity) / 2 }, end], 1250, depth);
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
    f.run++; f.transitioning = false;
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
    for (const e of f.escorts.values()) e.ship.remove();
    f.layer.insertBefore(f.hero, f.dock); f.dock.remove(); f.chainSvg.remove();
    f.layer.classList.remove('navy-fleet-enabled', 'navy-fleet-all-full'); f.layer.style.removeProperty('--fleet-ship-width');
    f.stage.classList.remove('navy-fleet-stage', 'navy-fleet-sailing'); fleet = null;
  }
  window.NavyFleet = Object.freeze({ init, sync, depart, stop, reset, capacities, currentBoat: () => fleet?.viewIndex ?? 0, currentRange: () => fleet ? range(fleet.data, fleet.viewIndex) : { index: 0, start: 0, end: 10, capacity: 10 }, isSailing: () => !!fleet?.transitioning, inspect: () => fleet ? { boats: fleet.data.boats, capacities: fleet.data.capacities.slice(), total: fleet.data.total, currentBoat: fleet.viewIndex + 1, correct: fleet.data.correct, holes: fleet.data.holes, escorts: fleet.escorts.size, sailing: fleet.transitioning } : null });
}());
