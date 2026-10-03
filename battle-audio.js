/* Local procedural combat sound. No recordings, speech, uploads or background loop. */
(() => {
  'use strict';
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
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  window.BattleAudio = { unlock, question, event, stop, get status() { return status(); } };
})();
