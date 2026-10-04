/* core/audio.js —— 声轨
   两条硬约束：默认静音 · 要人先点一下。
   只有三层：一个很低的持续音，一层随采样深度变粗的量化噪声，几个很干净的钟。
   声轨一个字都改变不了。它另行记账。 */
window.UA = window.UA || {};
(function (UA) {
  'use strict';
  var ctx = null, master = null, drone = null, hiss = null, on = false;

  var BELL = {
    soft: { f: 392.00, to: 392.00, dur: 1.8, g: 0.10 },
    step: { f: 523.25, to: 523.25, dur: 0.9, g: 0.055 },
    open: { f: 261.63, to: 392.00, dur: 2.6, g: 0.12 },
    hush: { f: 196.00, to: 174.00, dur: 3.4, g: 0.09 },
    end:  { f: 659.25, to: 659.25, dur: 4.6, g: 0.11 }
  };

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  function start() {
    if (!ctx || drone) return;
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o1.type = 'sine'; o1.frequency.value = 55;
    o2.type = 'sine'; o2.frequency.value = 55.3;
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 7);
    o1.connect(g); o2.connect(g); g.connect(master);
    o1.start(); o2.start();
    drone = { o1: o1, o2: o2, g: g };

    /* 量化噪声：一条极窄的带通噪声。采样深度越低，它越响。
       这是本作唯一一处「声音跟着画面变」的地方——它仍然不进任何判定。 */
    var len = ctx.sampleRate * 2;
    var b = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    var src = ctx.createBufferSource(); src.buffer = b; src.loop = true;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 1.4;
    var hg = ctx.createGain(); hg.gain.value = 0.0;
    src.connect(bp); bp.connect(hg); hg.connect(master);
    src.start();
    hiss = { src: src, g: hg };
  }

  function stop() {
    if (!drone || !ctx) return;
    try {
      drone.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.4);
      if (hiss) hiss.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      var d = drone, h = hiss; drone = null; hiss = null;
      setTimeout(function () {
        try { d.o1.stop(); d.o2.stop(); } catch (e) { }
        try { h.src.stop(); } catch (e) { }
      }, 1800);
    } catch (e) { drone = null; hiss = null; }
  }

  function setEnabled(b) {
    on = !!b;
    if (!on) { stop(); return on; }
    if (!ensure()) return on;
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    start();
    return on;
  }
  function isOn() { return on; }

  /* 采样深度落到声音上：位越低，那条噪声越亮。它不改任何别的东西。 */
  function setDepth(bits) {
    if (!hiss || !ctx) return;
    var k = Math.max(0, Math.min(1, (8 - bits) / 7));
    try { hiss.g.gain.linearRampToValueAtTime(0.0001 + k * 0.028, ctx.currentTime + 0.8); } catch (e) { }
  }

  function bell(kind, calm) {
    if (!on) return;
    var v = BELL[kind]; if (!v) return;
    if (!ensure()) return;
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    var t = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(v.f, t);
    if (v.to !== v.f) o.frequency.exponentialRampToValueAtTime(v.to, t + v.dur * 0.6);
    var peak = v.g * (calm ? 0.5 : 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + v.dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + v.dur + 0.06);
  }

  UA.audio = { BELL: BELL, setEnabled: setEnabled, isOn: isOn, bell: bell, setDepth: setDepth };
})(window.UA);
