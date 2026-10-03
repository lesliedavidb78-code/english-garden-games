/* Bundled combat audio, cancellable narration and local preferences. No recording or uploads. */
(() => {
  'use strict';
  // Retain the original synthesized impacts if bundled MP3 playback is unavailable.
  const procedural = (() => {
  let context = null, master = null, compressor = null, unlocked = false;
  let sequence = 0, eventKey = '', finishTimer = 0, lowHealthWarned = false, lastError = '';
  const nodes = new Set();
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const status = () => ({
    unlocked: !!unlocked && context?.state === 'running',
    contextState: context?.state || 'unavailable',
    eventKey,
    activeNodes: nodes.size,
    playing: nodes.size > 0,
    error: lastError
  });
  function prepare() {
    if (context && context.state !== 'closed') return true;
    const Constructor = window.AudioContext || window.webkitAudioContext;
    if (!Constructor) { lastError = 'WebAudio unavailable'; return false; }
    try {
      context = new Constructor();
      master = context.createGain();
      // Moderate volume and soft limiting keep layered impacts comfortable.
      master.gain.value = .27;
      compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 15;
      compressor.ratio.value = 5;
      compressor.attack.value = .004;
      compressor.release.value = .11;
      master.connect(compressor);
      compressor.connect(context.destination);
      context.onstatechange = () => { if (context?.state !== 'running') unlocked = false; };
      lastError = '';
      return true;
    } catch (error) {
      lastError = error?.name || 'AudioContext unavailable';
      return false;
    }
  }
  async function unlock() {
    if (!prepare()) return false;
    try {
      // Call this directly from a genuine start/listen button gesture.
      if (context.state !== 'running') await context.resume();
      unlocked = context.state === 'running';
      return unlocked;
    } catch (error) {
      unlocked = false;
      lastError = error?.name || 'Audio unlock failed';
      return false;
    }
  }
  function track(source, chain) {
    const owned = [source, ...chain];
    owned.forEach(node => nodes.add(node));
    source.onended = () => owned.forEach(node => {
      nodes.delete(node);
      try { node.disconnect(); } catch (_) { /* already stopped */ }
    });
    return source;
  }
  function envelope(gain, at, duration, peak, attack = .007, hold = .1) {
    const end = at + duration;
    const rise = at + Math.min(attack, duration * .2);
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), rise);
    gain.gain.setValueAtTime(Math.max(.0002, peak), Math.min(end - .01, rise + duration * hold));
    gain.gain.exponentialRampToValueAtTime(.0001, end);
  }
  function tone(at, duration, from, to, peak, type = 'sine', options = {}) {
    const source = context.createOscillator(), gain = context.createGain();
    source.type = type;
    source.frequency.setValueAtTime(Math.max(15, from), at);
    source.frequency.exponentialRampToValueAtTime(Math.max(15, to), at + duration);
    if (options.detune) source.detune.value = options.detune;
    envelope(gain, at, duration, peak, options.attack || .008, options.hold ?? .06);
    source.connect(gain); gain.connect(master);
    track(source, [gain]);
    source.start(at); source.stop(at + duration + .02);
  }
  function noise(at, duration, peak, type, from, to, options = {}) {
    const count = Math.max(1, Math.ceil(context.sampleRate * duration));
    const buffer = context.createBuffer(1, count, context.sampleRate), data = buffer.getChannelData(0);
    let seed = (sequence * 69069 + count + 314159) >>> 0;
    for (let i = 0; i < count; i++) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      data[i] = ((seed >>> 0) / 2147483648) - 1;
    }
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = buffer;
    filter.type = type;
    filter.Q.value = options.q || .65;
    filter.frequency.setValueAtTime(Math.max(30, from), at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, to), at + duration);
    envelope(gain, at, duration, peak, options.attack || .008, options.hold ?? .07);
    source.connect(filter); filter.connect(gain); gain.connect(master);
    track(source, [filter, gain]);
    source.start(at); source.stop(at + duration + .02);
  }
  function charge(at, special) {
    const duration = special ? .35 : .23;
    tone(at, duration, 105, special ? 640 : 290, special ? .19 : .13, 'triangle', { attack: .065, hold: .45 });
    tone(at + .035, duration - .025, 160, special ? 940 : 440, .075, 'sine', { attack: .06, hold: .45 });
    noise(at + .06, duration - .045, .10, 'bandpass', 400, 1850, { attack: .05, q: .9, hold: .5 });
  }
  function impact(at, heavy) {
    // Low body, mid punch and short bright debris give a layered, non-vocal hit.
    tone(at, heavy ? .31 : .25, heavy ? 135 : 185, heavy ? 40 : 58, heavy ? .51 : .40, 'sine');
    tone(at + .009, .15, heavy ? 265 : 410, 100, .12, 'triangle');
    noise(at, .15, heavy ? .38 : .29, 'lowpass', heavy ? 2300 : 3300, 320);
    noise(at + .015, .20, heavy ? .14 : .18, 'highpass', 1800, 5100);
    if (!heavy) {
      tone(at + .04, .16, 1244, 1174, .035, 'sine');
      tone(at + .065, .18, 1661, 1550, .025, 'sine');
    }
  }
  function ordinary(at, ok) {
    if (ok) {
      charge(at, false);
      noise(at + .22, .25, .23, 'bandpass', 600, 3200, { attack: .04, q: .8, hold: .4 });
      tone(at + .24, .18, 270, 100, .10, 'triangle');
    } else {
      tone(at, .22, 110, 58, .17, 'triangle', { attack: .04, hold: .3 });
      noise(at + .22, .25, .24, 'lowpass', 1250, 3100, { attack: .06, hold: .3 });
    }
    // The visual particle burst and contact frame start at 470 ms.
    impact(at + .47, !ok);
    if (!ok) {
      [0, .027, .065].forEach((delay, i) => tone(at + .49 + delay, .17 - i * .02, 1750 - i * 350, 650 - i * 100, .022, 'triangle'));
    }
  }
  function special(at) {
    charge(at, true);
    // Beam starts at 350 ms. Low ring and filtered texture sustain its body.
    tone(at + .35, .91, 64, 92, .20, 'sine', { attack: .055, hold: .3 });
    tone(at + .35, .88, 196, 294, .075, 'triangle', { attack: .04, hold: .2 });
    tone(at + .38, .83, 294, 587, .045, 'sine', { attack: .07, hold: .2 });
    noise(at + .35, .94, .20, 'bandpass', 1200, 3600, { attack: .08, q: .8, hold: .3 });
    impact(at + .56, false);
    tone(at + .62, .63, 48, 36, .17, 'sine', { attack: .014, hold: .2 });
    [0, .11, .22].forEach((delay, i) => noise(at + 1.08 + delay, .13, .07 - i * .012, 'highpass', 2600, 4200));
  }
  function warning(at) {
    // Only once on entering low health, never a repeating alarm.
    tone(at, .105, 523.25, 493.88, .07, 'sine');
    tone(at + .14, .105, 493.88, 440, .06, 'sine');
  }
  function victory(at) {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) => {
      tone(at + i * .13, i === 3 ? .23 : .15, frequency, frequency, i === 3 ? .12 : .075, 'triangle', { attack: .013, hold: .14 });
      tone(at + i * .13, .17, frequency * 2, frequency * 2, .018, 'sine');
    });
  }
  function defeat(at) {
    [392, 329.63, 261.63].forEach((frequency, i) => tone(at + i * .14, .20, frequency, frequency * .96, .075, 'triangle', { attack: .012, hold: .13 }));
  }
  function stop() {
    if (finishTimer) window.clearTimeout(finishTimer);
    finishTimer = 0;
    for (const node of nodes) {
      try { if (typeof node.stop === 'function') node.stop(); } catch (_) { /* already ended */ }
      try { node.disconnect(); } catch (_) { /* already disconnected */ }
    }
    nodes.clear();
  }
  function question() {
    // Call before every English demonstration, replay and next question.
    stop();
  }
  function event(ok, stats = {}) {
    stop();
    const correct = Math.max(0, number(stats.correct)), wrong = Math.max(0, number(stats.wrong ?? stats.mistakes ?? stats.incorrect));
    const streak = Math.max(0, Math.floor(number(stats.streak))), combo = !!ok && streak > 0 && streak % 5 === 0;
    const terminal = stats.terminal === 'won' || correct >= 10 ? 'won' : stats.terminal === 'lost' || wrong >= 10 ? 'lost' : '';
    sequence++;
    eventKey = `${ok ? 'hero' : 'monster'}:${correct}:${wrong}:${streak}:${terminal || (combo ? 'beam' : 'hit')}:${sequence}`;
    if (wrong < 7) lowHealthWarned = false;
    const warn = !ok && !terminal && wrong >= 7 && !lowHealthWarned;
    if (warn) lowHealthWarned = true;
    const audioDurationMs = terminal === 'won' ? (combo ? 1630 : 1260) : terminal === 'lost' ? 1200 : combo ? 1450 : 820;
    const durationMs = Math.max(combo ? 1750 : 1150, audioDurationMs);
    const result = { key: eventKey, durationMs, audioDurationMs, special: combo, terminal: terminal || null, played: false };
    if (!unlocked || !context || context.state !== 'running' || document.hidden) return result;
    const at = context.currentTime + .008;
    if (combo) special(at); else ordinary(at, !!ok);
    if (warn) warning(at + .55);
    if (terminal === 'won') victory(at + (combo ? 1.0 : .64));
    if (terminal === 'lost') defeat(at + .68);
    // A final cleanup also covers rare interrupted/suspended browser callbacks.
    finishTimer = window.setTimeout(() => { finishTimer = 0; stop(); }, audioDurationMs + 75);
    result.played = true;
    return result;
  }
  return { unlock, question, event, stop, get status() { return status(); } };
  })();

  const PREF_KEY = 'english-battle-audio-settings';
  const defaults = { music: true, effects: true, voices: true, musicVolume: .08, ambienceVolume: .035, effectsVolume: .62, voiceVolume: .8 };
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = value => Math.min(1, Math.max(0, num(value)));
  let preferences = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(PREF_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      for (const key of ['music', 'effects', 'voices']) if (typeof saved[key] === 'boolean') preferences[key] = saved[key];
      for (const key of ['musicVolume', 'ambienceVolume', 'effectsVolume', 'voiceVolume']) if (Number.isFinite(saved[key])) preferences[key] = clamp(saved[key]);
    }
  } catch (_) { /* A private browser may disallow storage; playback still works. */ }
  let engine = null, master = null, unlocked = false, error = '';
  let generation = 0, lifecycle = 0, sequence = 0, eventKey = '', english = false, voiceEpoch = 0, effectsEpoch = 0;
  let round = { id: '', keys: new Set(), onMark: null }, stats = {}, backgroundKey = '';
  const handles = new Set(), timers = new Set(), pendingBackground = new Set();
  const decoded = new Map(), loading = new Map(), loads = new Map();
  const backgroundRoles = new Set(['music', 'ambience']);
  const enabled = role => role === 'voice' ? preferences.voices : role === 'effect' ? preferences.effects : preferences.music;
  const volume = role => role === 'voice' ? preferences.voiceVolume : role === 'effect' ? preferences.effectsVolume : role === 'ambience' ? preferences.ambienceVolume : preferences.musicVolume;
  function asset(key) {
    const value = window.BattleMediaData?.audio?.[key];
    if (!value?.src) return null;
    try {
      // Bundle assets must stay on this origin. Never send recordings to a service.
      const url = new URL(value.src, location.href);
      return url.origin === location.origin ? { ...value, src: url.href } : null;
    } catch (_) { return null; }
  }
  function prepare() {
    if (engine && engine.state !== 'closed') return true;
    const Constructor = window.AudioContext || window.webkitAudioContext;
    if (!Constructor) return false;
    try {
      engine = new Constructor();
      master = engine.createGain(); master.gain.value = .9; master.connect(engine.destination);
      return true;
    } catch (cause) { error = cause?.name || 'WebAudio unavailable'; return false; }
  }
  async function unlock() {
    // Both resumes are initiated while the real button gesture is still active.
    const fallback = procedural.unlock();
    try {
      if (prepare()) {
        if (engine.state !== 'running') await engine.resume();
        unlocked = engine.state === 'running';
      } else {
        const prime = new Audio(asset('sfx_ui_select')?.src || 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQIAAACAgA==');
        prime.volume = 0;
        try { await prime.play(); unlocked = true; } finally { prime.pause(); prime.removeAttribute('src'); prime.load(); }
      }
      if (unlocked) error = '';
    } catch (cause) { error = cause?.name || 'Audio unlock failed'; }
    await fallback;
    if (unlocked) restoreBackground();
    return unlocked;
  }
  function valid(token, role) { return token === (backgroundRoles.has(role) ? lifecycle : generation) && enabled(role) && !document.hidden; }
  function later(ms, callback, token = generation) {
    const id = window.setTimeout(() => { timers.delete(id); if (token === generation && !document.hidden) callback(); }, Math.max(0, num(ms)));
    timers.add(id); return id;
  }
  function cancelTimers() { for (const id of timers) clearTimeout(id); timers.clear(); }
  function stopLoads(roles) {
    for (const [controller, entry] of loads) if (!roles || roles.has(entry.role)) controller.abort();
  }
  function decode(meta, role) {
    if (decoded.has(meta.src)) return Promise.resolve(decoded.get(meta.src));
    if (loading.has(meta.src)) return loading.get(meta.src);
    const controller = new AbortController(); loads.set(controller, { role });
    const promise = fetch(meta.src, { signal: controller.signal, credentials: 'same-origin' })
      .then(response => { if (!response.ok) throw new Error('Audio asset ' + response.status); return response.arrayBuffer(); })
      .then(bytes => new Promise((resolve, reject) => {
        // Callback form also supports older iOS WebAudio implementations.
        const operation = engine.decodeAudioData(bytes, resolve, reject);
        if (operation?.catch) operation.catch(reject);
      }))
      .then(buffer => { decoded.set(meta.src, buffer); return buffer; })
      .finally(() => { loading.delete(meta.src); loads.delete(controller); });
    loading.set(meta.src, promise); return promise;
  }
  function hasVoice() { return [...handles].some(handle => handle.role === 'voice' && handle.started && !handle.stopped); }
  function effectiveVolume(role) {
    const base = volume(role);
    if (role === 'music') return english ? Math.min(base, .02) : hasVoice() ? Math.min(base, .025) : base;
    if (role === 'ambience') return english ? Math.min(base, .008) : hasVoice() ? Math.min(base, .012) : base;
    return base;
  }
  function updateVolumes() {
    for (const handle of handles) {
      const value = effectiveVolume(handle.role);
      if (handle.gain && engine) {
        try { handle.gain.gain.cancelScheduledValues(engine.currentTime); handle.gain.gain.setTargetAtTime(value, engine.currentTime, .045); } catch (_) { handle.gain.gain.value = value; }
      }
      if (handle.audio) handle.audio.volume = value;
    }
  }
  function finish(handle) {
    if (handle.stopped) return;
    handle.stopped = true;
    if (handle.watchdog) { clearTimeout(handle.watchdog); timers.delete(handle.watchdog); }
    if (handle.source) { try { handle.source.stop(); } catch (_) {} try { handle.source.disconnect(); } catch (_) {} }
    if (handle.gain) { try { handle.gain.disconnect(); } catch (_) {} }
    if (handle.audio) {
      handle.audio.onended = null; handle.audio.onerror = null;
      handle.audio.pause(); handle.audio.removeAttribute('src'); handle.audio.load();
    }
    handles.delete(handle); handle.resolve?.(); updateVolumes();
  }
  function stopRoles(roles) { for (const handle of [...handles]) if (roles.has(handle.role)) finish(handle); }
  function clearTransient() {
    generation++; cancelTimers(); stopLoads(new Set(['voice', 'effect']));
    stopRoles(new Set(['voice', 'effect'])); procedural.stop();
  }
  function stop() {
    generation++; lifecycle++; cancelTimers(); stopLoads();
    for (const handle of [...handles]) finish(handle);
    pendingBackground.clear(); procedural.stop(); english = false;
  }
  function mark(key) {
    if (round.keys.has(key)) return false;
    round.keys.add(key);
    try { round.onMark?.(key); } catch (_) { /* Save failure must not crash media. */ }
    return true;
  }
  async function play(key, role, options = {}) {
    const token = options.token ?? (backgroundRoles.has(role) ? lifecycle : generation), meta = asset(key);
    const roleEpoch = role === 'voice' ? voiceEpoch : role === 'effect' ? effectsEpoch : 0;
    const cancelled = () => !valid(token, role) || (role === 'voice' && roleEpoch !== voiceEpoch) || (role === 'effect' && roleEpoch !== effectsEpoch);
    if (!meta || !valid(token, role) || !unlocked || (options.once && round.keys.has(key))) return null;
    let buffer = null;
    if (engine?.state === 'running') {
      try { buffer = await decode(meta, role); }
      catch (cause) { if (cause?.name !== 'AbortError') error = cause?.name || 'Audio decode failed'; }
    }
    if (cancelled() || (options.once && round.keys.has(key))) return null;
    // An asynchronous load may arrive after the frame it belongs to. Avoid stale hits.
    if (options.deadline && performance.now() > options.deadline) return null;
    const handle = { key, role, started: false, stopped: false, source: null, gain: null, audio: null, watchdog: 0 };
    handle.finished = new Promise(resolve => { handle.resolve = resolve; }); handles.add(handle);
    const started = () => {
      if (cancelled() || handle.stopped) { finish(handle); return false; }
      handle.started = true;
      if (options.once) mark(key);
      options.onStart?.(); updateVolumes(); return true;
    };
    try {
      if (buffer && engine?.state === 'running') {
        const source = engine.createBufferSource(), gain = engine.createGain();
        source.buffer = buffer; source.loop = !!options.loop;
        if (source.loop) { source.loopStart = num(meta.loopStartSeconds); source.loopEnd = Math.min(buffer.duration, num(meta.loopEndSeconds, buffer.duration)); }
        gain.gain.value = effectiveVolume(role); source.connect(gain); gain.connect(master);
        handle.source = source; handle.gain = gain; source.onended = () => finish(handle);
        source.start(); if (!started()) return null;
      } else {
        const audio = new Audio(meta.src); audio.preload = 'auto'; audio.loop = !!options.loop; audio.volume = effectiveVolume(role);
        handle.audio = audio; audio.onended = () => finish(handle); audio.onerror = () => finish(handle);
        await audio.play(); if (!started()) return null;
      }
      // A browser losing an ended event cannot retain an unbounded transient handle.
      if (!options.loop) {
        handle.watchdog = window.setTimeout(() => { timers.delete(handle.watchdog); finish(handle); }, Math.max(1000, num(meta.durationSeconds, 10) * 1000 + 1500));
        timers.add(handle.watchdog);
      }
      return handle;
    } catch (cause) {
      error = cause?.name || 'Audio play failed'; finish(handle); return null;
    }
  }
  function prewarm(keys) {
    if (!engine || !unlocked) return;
    for (const key of keys) { const meta = asset(key); if (meta) decode(meta, key.startsWith('vo_') ? 'voice' : key.startsWith('sfx_') ? 'effect' : key.startsWith('amb_') ? 'ambience' : 'music').catch(() => {}); }
  }
  function ensureBackground(key, role, loop = true) {
    if (!enabled(role) || !unlocked || !key || [...handles].some(h => h.key === key && !h.stopped) || pendingBackground.has(key)) return;
    const token = lifecycle; pendingBackground.add(key);
    play(key, role, { token, loop }).finally(() => { if (token === lifecycle) pendingBackground.delete(key); });
  }
  function setBackground(key, loop = true) {
    if (backgroundKey !== key) {
      lifecycle++; pendingBackground.clear(); stopLoads(backgroundRoles); stopRoles(new Set(['music'])); backgroundKey = key;
    }
    ensureBackground(backgroundKey, 'music', loop);
    ensureBackground('amb_city_wind_loop', 'ambience'); updateVolumes();
  }
  function restoreBackground() {
    ensureBackground(backgroundKey, 'music', !backgroundKey.startsWith('music_'));
    ensureBackground('amb_city_wind_loop', 'ambience'); updateVolumes();
  }
  function mergeRound(roundId, playedKeys, onMark) {
    const id = String(roundId ?? round.id);
    if (id !== round.id) round = { id, keys: new Set(), onMark: null };
    if (Array.isArray(playedKeys)) for (const key of playedKeys) if (/^vo_[a-z_]+$/.test(key)) round.keys.add(key);
    if (typeof onMark === 'function') round.onMark = onMark;
  }
  function enter(nextStats = {}, roundId = '', playedKeys = [], onMark) {
    stats = { ...nextStats }; mergeRound(roundId, playedKeys, onMark);
    const wrong = num(stats.wrong ?? stats.mistakes ?? stats.incorrect);
    // Entering or restoring a saved round never emits victory/defeat narration.
    setBackground(wrong >= 5 ? 'bgm_crisis_loop' : 'bgm_guardian_loop');
    prewarm(['sfx_ui_select', 'sfx_hero_charge', 'sfx_hero_dash', 'sfx_hero_impact', 'sfx_monster_attack', 'sfx_shield_crack', 'sfx_special_charge', 'sfx_special_beam', 'sfx_special_finish']);
    return status();
  }
  function question() { clearTransient(); english = true; updateVolumes(); }
  function englishEnd() { english = false; restoreBackground(); }
  async function voiceQueue(keys, token, epoch = voiceEpoch) {
    for (const key of keys) {
      if (!valid(token, 'voice') || english || epoch !== voiceEpoch) break;
      const handle = await play(key, 'voice', { token, once: true });
      if (handle) await handle.finished;
    }
  }
  function intro(index) {
    clearTransient(); english = false; setBackground('bgm_invasion_loop');
    const key = ['vo_intro_monster', 'vo_intro_hero', 'vo_intro_command'][Math.trunc(num(index, -1))];
    if (!key) return { key: null, durationMs: 0 };
    play(key, 'voice', { token: generation });
    return { key, durationMs: num(asset(key)?.durationSeconds) * 1000 };
  }
  function event(ok, nextStats = {}, options = {}) {
    clearTransient(); english = false; stats = { ...nextStats };
    mergeRound(options.roundId, options.playedKeys, options.onMark);
    const token = generation, began = performance.now(), eventVoices = voiceEpoch, eventEffects = effectsEpoch;
    const correct = Math.max(0, num(stats.correct)), wrong = Math.max(0, num(stats.wrong ?? stats.mistakes ?? stats.incorrect));
    const streak = Math.max(0, Math.trunc(num(stats.streak))), combo = !!ok && streak > 0 && streak % 5 === 0;
    const terminal = stats.terminal === 'won' || correct >= 10 ? 'won' : stats.terminal === 'lost' || wrong >= 10 ? 'lost' : '';
    const durationMs = Math.max(0, num(options.durationMs, combo ? 1750 : 1150));
    const cues = typeof options.cueSeconds === 'number' ? { impact: options.cueSeconds } : options.cueSeconds || {};
    const cue = (keys, fallback) => { for (const key of keys) if (Number.isFinite(cues[key])) return Math.max(0, cues[key]); return fallback; };
    const impactAt = cue(['impact', 'hit', 'contact'], combo ? .56 : .47), beamAt = cue(['beam', 'beamStart'], .35);
    sequence++; eventKey = `${ok ? 'hero' : 'monster'}:${correct}:${wrong}:${streak}:${terminal || (combo ? 'beam' : 'hit')}:${sequence}`;
    const result = { key: eventKey, durationMs, audioDurationMs: durationMs, special: combo, terminal: terminal || null, played: false };
    let fallbackPlayed = false;
    const fx = (key, seconds) => later(seconds * 1000, () => {
      if (!preferences.effects || english || eventEffects !== effectsEpoch) return;
      play(key, 'effect', { token, deadline: began + seconds * 1000 + 650 }).then(handle => {
        if (handle) result.played = true;
        else if (!fallbackPlayed && token === generation && preferences.effects && !english && !document.hidden) {
          fallbackPlayed = true; const fallback = procedural.event(ok, stats); result.played ||= fallback.played;
        }
      });
    }, token);
    if (preferences.effects) {
      fx('sfx_ui_select', 0);
      if (combo) {
        fx('sfx_special_charge', cue(['charge', 'chargeStart'], 0));
        fx('sfx_special_beam', beamAt);
        fx('sfx_special_finish', cue(['finish', 'beamFinish', 'beamEnd'], Math.max(impactAt, beamAt + .65)));
      } else if (ok) {
        fx('sfx_hero_charge', cue(['charge', 'chargeStart'], 0));
        fx('sfx_hero_dash', cue(['dash', 'dashStart'], Math.max(0, impactAt - .32)));
        fx('sfx_hero_impact', impactAt);
      } else {
        fx('sfx_monster_attack', cue(['attack', 'attackStart', 'charge'], 0)); fx('sfx_shield_crack', impactAt);
        if (wrong === 7) fx('sfx_danger', impactAt + .15);
      }
      if (ok && correct === 1 && !terminal) fx('sfx_signal_connected', impactAt + .12);
    }
    let narration = [];
    if (terminal) narration = terminal === 'won' ? ['vo_win_hero'] : ['vo_loss_monster', 'vo_retry_hero'];
    else if (combo) narration = ['vo_combo_five'];
    else if (ok && correct === 1) narration = ['vo_first_signal'];
    else if (ok && correct === 3) narration = ['vo_stage_evacuation'];
    else if (ok && correct === 6) narration = ['vo_stage_shield'];
    else if (!ok && wrong === 1) narration = ['vo_first_retry'];
    else if (!ok && wrong === 3) narration = ['vo_monster_taunt'];
    else if (!ok && wrong === 5) narration = ['vo_damage_five'];
    else if (!ok && wrong === 7) narration = ['vo_damage_seven'];
    prewarm(narration);
    const narrationAt = terminal ? Math.max(0, num(options.terminalDelayMs, durationMs)) : impactAt * 1000 + 100;
    if (terminal) later(narrationAt, () => {
      setBackground(terminal === 'won' ? 'music_victory' : 'music_retry', false);
      if (preferences.effects && eventEffects === effectsEpoch) play(terminal === 'won' ? 'sfx_shield_restored' : 'sfx_defeat_retreat', 'effect', { token });
    }, token);
    if (narration.length && preferences.voices) later(narrationAt, () => { voiceQueue(narration, token, eventVoices); }, token);
    updateVolumes(); options.onStart?.(result); return result;
  }
  function setSettings(values = {}) {
    if (values.effects === false) effectsEpoch++;
    if (values.voices === false) voiceEpoch++;
    for (const key of ['music', 'effects', 'voices']) if (typeof values[key] === 'boolean') preferences[key] = values[key];
    for (const key of ['musicVolume', 'ambienceVolume', 'effectsVolume', 'voiceVolume']) if (Number.isFinite(values[key])) preferences[key] = clamp(values[key]);
    try { localStorage.setItem(PREF_KEY, JSON.stringify(preferences)); } catch (_) {}
    if (!preferences.music) { lifecycle++; pendingBackground.clear(); stopLoads(backgroundRoles); stopRoles(backgroundRoles); }
    if (!preferences.effects) { stopLoads(new Set(['effect'])); stopRoles(new Set(['effect'])); procedural.stop(); }
    if (!preferences.voices) { stopLoads(new Set(['voice'])); stopRoles(new Set(['voice'])); }
    restoreBackground(); updateVolumes(); return { ...preferences };
  }
  function status() {
    return { unlocked, contextState: engine?.state || 'html-audio', eventKey, activeNodes: handles.size + procedural.status.activeNodes,
      activeKeys: [...handles].map(handle => handle.key), playing: handles.size > 0 || procedural.status.playing,
      pendingTimers: timers.size, pendingLoads: loads.size, decodedAssets: decoded.size, english, backgroundKey,
      roundId: round.id, playedKeys: [...round.keys], settings: { ...preferences }, error };
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  window.BattleAudio = { unlock, enter, intro, question, englishEnd, event, stop, setSettings,
    get settings() { return { ...preferences }; }, get status() { return status(); } };
})();
