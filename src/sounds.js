/* Sonidos divertidos generados con WebAudio (sin archivos externos) */
(function () {
  let ac = null;
  let enabled = true;
  let unlocked = false;
  const unlock = () => { unlocked = true; };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
  function ctx() {
    if (!unlocked) return null;
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ac = new AC(); } catch (_) { return null; }
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }
  function tone(freq, dur, type, vol, delay, slideTo) {
    const a = ctx(); if (!a || !enabled) return;
    const t0 = a.currentTime + (delay || 0);
    const o = a.createOscillator(); const g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(dur, vol, from, to) {
    const a = ctx(); if (!a || !enabled) return;
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.setValueAtTime(from || 1500, a.currentTime);
    f.frequency.exponentialRampToValueAtTime(to || 300, a.currentTime + dur);
    const g = a.createGain(); g.gain.value = vol || 0.15;
    src.connect(f); f.connect(g); g.connect(a.destination); src.start();
  }
  const S = {
    pop() { tone(520, 0.09, 'triangle', 0.14, 0, 880); },
    click() { tone(660, 0.05, 'square', 0.05); },
    color() { tone(740, 0.07, 'sine', 0.1, 0, 1100); },
    undo() { tone(500, 0.12, 'triangle', 0.12, 0, 300); },
    redo() { tone(300, 0.12, 'triangle', 0.12, 0, 500); },
    whoosh() { noise(0.5, 0.18, 2500, 200); },
    fill() { tone(300, 0.2, 'sine', 0.14, 0, 900); tone(900, 0.12, 'triangle', 0.08, 0.1); },
    stamp() { tone(180, 0.1, 'square', 0.1, 0, 90); noise(0.08, 0.1, 900, 200); },
    save() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.13, i * 0.09)); },
    tada() { [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'square', 0.07, i * 0.08)); tone(1047, 0.4, 'triangle', 0.14, 0.26); },
    oops() { tone(300, 0.18, 'sawtooth', 0.07, 0, 150); }
  };
  window.SFX = {
    play(name) { try { if (S[name]) S[name](); } catch (_) { /* sin sonido */ } },
    set(on) { enabled = !!on; },
    get() { return enabled; }
  };
})();
