/* Celebration sound for the Course Planner. Synthesized in the browser (no audio files, nothing downloaded or sent).
 * "musicbox"  plays when a graduation requirement is completed; "finale" when all 22 units are planned.
 * Preferences (on/off, volume) are remembered on this device. */
(function (root) {
  const WA = root.WA = root.WA || {};
  (WA.versions = WA.versions || {})['sound.js'] = '1';
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // tuned metal tines of a music box: fundamental + bright inharmonic overtones, each fading at its own rate
  const TINE = [[1, 1, 1], [2.0, 0.3, 0.45], [4.07, 0.22, 0.25], [6.2, 0.1, 0.15]];
  function voice(ctx, dest, t, midi, dur, vol) {
    const f = hz(midi), g = ctx.createGain(); g.connect(dest);
    TINE.forEach(([m, a, d]) => {
      const o = ctx.createOscillator(), pg = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * m; o.connect(pg); pg.connect(g);
      pg.gain.setValueAtTime(a, t); pg.gain.exponentialRampToValueAtTime(0.0005, t + Math.max(0.1, dur * d)); o.start(t); o.stop(t + dur + 0.05);
    });
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  const run = (ctx, dest, t, notes, gap, vol, lastDur, dur) => notes.forEach((m, i) => voice(ctx, dest, t + i * gap, m, i === notes.length - 1 ? lastDur : dur, vol * (0.85 + 0.15 * i / Math.max(1, notes.length - 1))));
  const TRIM = { musicbox: 1.06, finale: 1 };
  const BUILD = {
    musicbox: (ctx, dest, t) => { run(ctx, dest, t, [84, 88, 91, 96, 100], 0.11, 0.42, 1.5, 0.7); return 2.1; },
    finale: (ctx, dest, t) => {          // the same music box, but a full little phrase and a ringing final chord
      run(ctx, dest, t, [84, 88, 91, 96, 100], 0.11, 0.42, 0.9, 0.7);
      run(ctx, dest, t + 0.78, [96, 100, 103], 0.1, 0.4, 0.8, 0.7);
      [84, 91, 96, 100].forEach((m, i) => voice(ctx, dest, t + 1.2 + i * 0.012, m, 2.2, i === 0 ? 0.34 : 0.28));
      voice(ctx, dest, t + 1.3, 103, 1.6, 0.14); return 3.6;
    }
  };
  function softClip(ctx) {   // smooth ceiling at 0.9 so the sound can never clip
    const sh = ctx.createWaveShaper(), n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = 0.9 * Math.tanh(1.6 * x) / Math.tanh(1.6); }
    sh.curve = c; sh.oversample = '2x'; return sh;
  }
  function build(ctx, kind, vol) {
    const sh = softClip(ctx), bus = ctx.createGain(); bus.gain.value = (vol == null ? 0.7 : vol) * (TRIM[kind] || 1); bus.connect(sh); sh.connect(ctx.destination);
    return (BUILD[kind] || BUILD.musicbox)(ctx, bus, ctx.currentTime + 0.03);
  }
  let ctx = null; const KEY = 'wa_sound_v1'; let prefs = { on: true, vol: 0.7 };
  try { const raw = localStorage.getItem(KEY); if (raw) { const p = JSON.parse(raw); prefs.on = p.on !== false; if (typeof p.vol === 'number') prefs.vol = Math.max(0, Math.min(1, p.vol)); } } catch (e) { /* storage unavailable: defaults */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } };
  function play(kind, force) {
    if ((!prefs.on && !force) || prefs.vol <= 0) return 0;
    const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return 0;
    try { if (!ctx) ctx = new AC(); if (ctx.state === 'suspended') ctx.resume(); return build(ctx, kind, prefs.vol); } catch (e) { return 0; }
  }
  WA.sound = { build, play, isOn: () => prefs.on, setOn: v => { prefs.on = !!v; save(); }, volume: () => prefs.vol, setVolume: v => { prefs.vol = Math.max(0, Math.min(1, +v || 0)); save(); } };
  if (typeof module !== 'undefined') module.exports = WA.sound;
})(typeof globalThis !== 'undefined' ? globalThis : this);
