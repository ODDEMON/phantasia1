/* core/palette.js —— 十六个量程
   每一个「量程」是一条多段渐变，不是一组固定的色位。
   场里算出来的是一个标量 v（深度/亮度/距离的混合），
   颜色由 ramp[v] 一处给出——单点收敛，配色只改这张表。
   十六个量程彼此色相拉开，任何一个都不会被认成另一个。 */
window.UA = window.UA || {};
(function (UA) {
  'use strict';

  var WORLDS = [
    {
      id: 'interval', name: '间隙', sub: 'THE INTERVAL',
      mood: '两次采样之间。所有没被记下的长度，都堆在这儿。',
      stops: [[0, '#04081c'], [0.34, '#0d2a6b'], [0.68, '#22ccff'], [0.88, '#b9f2ff'], [1, '#ffffff']]
    },
    {
      id: 'dither', name: '抖动', sub: 'DITHER',
      mood: '为着让粗的物事看似细，有人故意往里加一点噪声。',
      stops: [[0, '#180630'], [0.32, '#5d189e'], [0.62, '#e04fc8'], [0.85, '#ffd6f5'], [1, '#fffbdc']]
    },
    {
      id: 'moire', name: '摩尔', sub: 'MOIRE',
      mood: '两种规律穿过去之际，会长出第三种。它不在原本的两样里。',
      stops: [[0, '#03130e'], [0.3, '#0a5a48'], [0.6, '#57ffa8'], [0.84, '#d8ffe9'], [1, '#f7fff2']]
    },
    {
      id: 'ringing', name: '振铃', sub: 'RINGING',
      mood: '每一个陡边的旁边，都会多出一点原本不存在的量。',
      stops: [[0, '#220e00'], [0.3, '#8a3a00'], [0.6, '#ffab3d'], [0.85, '#ffe9b8'], [1, '#fffdf5']]
    },
    {
      id: 'quantize', name: '量化', sub: 'QUANTIZED',
      mood: '把连续的物事凑到最近的允许值上。这一步做完便回不去。',
      stops: [[0, '#060a1a'], [0.33, '#20368c'], [0.66, '#7fa8ff'], [0.88, '#dce8ff'], [1, '#ffffff']]
    },
    {
      id: 'clip', name: '削波', sub: 'CLIPPED',
      mood: '超出它能待的范围。超出去的那部分不会被保留，只会被切齐。',
      stops: [[0, '#1a0000'], [0.28, '#8c1105'], [0.56, '#ff6a2b'], [0.82, '#ffd9b0'], [1, '#ffffff']]
    },
    {
      id: 'guard', name: '保护带', sub: 'GUARD BAND',
      mood: '两路之间留出来的一条空地。它一概不施，它无非空着。',
      stops: [[0, '#01030a'], [0.34, '#16212e'], [0.66, '#4d6f8c'], [0.9, '#bcd8ea'], [1, '#eef7ff']]
    },
    {
      id: 'rebuild', name: '重建', sub: 'RECONSTRUCTED',
      mood: '从留下的那些点上，重新长出。它比记得的那个更整齐。',
      stops: [[0, '#24060f'], [0.3, '#8c1b3a'], [0.6, '#ff7a86'], [0.85, '#ffd9d0'], [1, '#fff8f2']]
    },
    {
      id: 'invert', name: '反转', sub: 'INVERTED',
      mood: '把亮的所在当作暗的所在记。这是记账方式的改变，不是一次修理。',
      stops: [[0, '#000000'], [0.34, '#3a3a3a'], [0.68, '#9a9a9a'], [0.9, '#e2e2e2'], [1, '#ffffff']]
    },
    {
      id: 'alias', name: '混叠', sub: 'ALIASED',
      mood: '它比原本的信号更连贯。连贯到会以为，它才是原本那个。',
      stops: [[0, '#03060f'], [0.26, '#b01bd6'], [0.55, '#22ddff'], [0.82, '#cdf6ff'], [1, '#ffffff']]
    },
    {
      id: 'silence', name: '静默', sub: 'SILENCE',
      mood: '一条一片都不放的带子。走进去以后，会听见自身的采样率。',
      stops: [[0, '#04060a'], [0.36, '#1d2733'], [0.68, '#55657a'], [0.9, '#a8b6c4'], [1, '#c9b98a']]
    },
    {
      id: 'fullscale', name: '满量程', sub: 'FULL SCALE',
      mood: '一格都不剩。所有所在都被写满，包括不该写的所在。',
      stops: [[0, '#0e0e0e'], [0.28, '#6b5a1e'], [0.58, '#ffd75e'], [0.84, '#fff2b8'], [1, '#ffffff']]
    },
    {
      id: 'prism', name: '棱', sub: 'PRISM',
      mood: '一样进去，五份散开。它们都不是原本那个，但都从它那儿来。',
      stops: [[0, '#05050f'], [0.22, '#00b3ff'], [0.46, '#ff00a8'], [0.70, '#ffe600'], [0.88, '#ffffff'], [1, '#ffffff']]
    },
    {
      id: 'hush', name: '伏', sub: 'HUSHED',
      mood: '这里的物事都趴着。走过去之际，它们跟着看官的脚步换气。',
      stops: [[0, '#02100c'], [0.32, '#0a4a34'], [0.64, '#4ce0a0'], [0.88, '#c8ffe8'], [1, '#f2fffa']]
    },
    {
      id: 'eclipse', name: '蚀', sub: 'ECLIPSED',
      mood: '有一个物事挡在前面。它没有形状，它无非把光让开。',
      stops: [[0, '#020202'], [0.3, '#2a0508'], [0.6, '#7a1a12'], [0.84, '#c9a37a'], [1, '#e8dcc8']]
    },
    {
      id: 'residue', name: '余', sub: 'RESIDUE',
      mood: '算完之后剩下的那一点。它不参与结果，但它一径在。',
      stops: [[0, '#100a05'], [0.32, '#4a2f14'], [0.64, '#b98a4a'], [0.88, '#eddcbb'], [1, '#fdf8ee']]
    },
    {
      id: 'imaging', name: '镜像', sub: 'IMAGING',
      mood: '采完之后，另一侧会多出一个跟它对称的。它跟原本那个同等真。',
      stops: [[0, '#0a0410'], [0.30, '#4a0f7a'], [0.60, '#ff3fb0'], [0.86, '#ffd9ef'], [1, '#ffffff']]
    },
    {
      id: 'convolve', name: '卷积', sub: 'CONVOLUTION',
      mood: '两件物事互相抹过一遍，出的第三样，既不是这个也不是那个。',
      stops: [[0, '#0b0a06'], [0.28, '#5a4a12'], [0.56, '#b8d63a'], [0.80, '#3ad6c0'], [1, '#f6fffb']]
    }
  ];

  function hex2rgb(h) {
    return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
  }
  function hex(v) { return '#' + ('0' + v.toString(16)).slice(-2); }

  /* 由 stops 展平成 256×3 的 ramp。场里每像素只做一次查表。 */
  function build(stops) {
    var r = new Uint8Array(256 * 3);
    var pts = stops.map(function (s) { return [s[0], hex2rgb(s[1])]; });
    for (var i = 0; i < 256; i++) {
      var t = i / 255, k = 0;
      while (k < pts.length - 2 && t > pts[k + 1][0]) k++;
      var a = pts[k], b = pts[k + 1];
      var u = (t - a[0]) / ((b[0] - a[0]) || 1e-6);
      u = u < 0 ? 0 : (u > 1 ? 1 : u);
      u = u * u * (3 - 2 * u);          /* 感知上加一次缓动，中间段不会脏 */
      r[i * 3] = Math.round(a[1][0] + (b[1][0] - a[1][0]) * u);
      r[i * 3 + 1] = Math.round(a[1][1] + (b[1][1] - a[1][1]) * u);
      r[i * 3 + 2] = Math.round(a[1][2] + (b[1][2] - a[1][2]) * u);
    }
    return r;
  }

  WORLDS.forEach(function (w) { w.ramp = build(w.stops); });

  var cur = WORLDS[0];

  function byId(id) {
    for (var i = 0; i < WORLDS.length; i++) if (WORLDS[i].id === id) return WORLDS[i];
    return WORLDS[0];
  }

  /* 从 ramp 的某一档取一个色 */
  function rgbAt(ramp, i) {
    var k = (i | 0) * 3;
    if (k < 0) k = 0; else if (k > 762) k = 762;
    return '#' + hex(ramp[k]).slice(1) + hex(ramp[k + 1]).slice(1) + hex(ramp[k + 2]).slice(1);
  }

  /* ---- 位深 → 色带级数 ----
     八位不切：交给渐变自己去插，看着是连续的。
     掉一级：色被切成几块平的。这就是「看粗了」在矢量世界里该有的样子。 */
  var LV = [0, 2, 2, 3, 4, 6, 8, 12, 0];
  function levels(bits) { return LV[Math.max(1, Math.min(8, bits | 0))]; }

  /* ---- 分级色带：从 ramp 的 from..to 之间取级 ----
     每一级写一对 stop（起点与终点同一个色），于是渐变成了阶梯。
     这是整幅画上唯一一处「量化」，场里所有渐变都走它。 */
  function bands(id, bits, from, to) {
    var w = byId(id), lv = levels(bits);
    if (from == null) from = 0;
    if (to == null) to = 255;
    var out = [], i, t, c;
    if (!lv) {
      return [
        { t: 0, c: rgbAt(w.ramp, from) },
        { t: .5, c: rgbAt(w.ramp, Math.round((from + to) / 2)) },
        { t: 1, c: rgbAt(w.ramp, to) }
      ];
    }
    for (i = 0; i < lv; i++) {
      t = (i + .5) / lv;
      c = rgbAt(w.ramp, Math.round(from + (to - from) * t));
      out.push({ t: i / lv, c: c });
      out.push({ t: (i + 1) / lv, c: c });
    }
    return out;
  }

  /* 把当前量程的几处取样交给 CSS，页面上的字与矢量场跟着一起换色。
     一九处取样，各管一摊：底 · 底上的第二层 · 暗 · 亮 · 强调 · 高光 · 光晕。 */
  function set(id, bits) {
    cur = byId(id);
    var r = cur.ramp;
    if (document.documentElement && document.documentElement.style) {
      var s = document.documentElement.style;
      function put(k, v) { s.setProperty(k, v); }
      put('--bg', rgbAt(r, 0));
      put('--bg2', rgbAt(r, 26));
      put('--dim', rgbAt(r, 128));
      put('--acc', rgbAt(r, 204));
      put('--acc2', rgbAt(r, 232));
      put('--fg', rgbAt(r, 250));
      put('--glow', rgbAt(r, 186));
      /* 天幕两端的色：上端更沉，下端更亮一点，方向感从这里出 */
      put('--skyA', rgbAt(r, 10));
      put('--skyB', rgbAt(r, 96));
      /* 地面的两块 */
      put('--floorA', rgbAt(r, 34));
      put('--floorB', rgbAt(r, 150));
    }
    if (document.body) document.body.setAttribute('data-world', cur.id);
    return cur;
  }

  function has(id) {
    for (var i = 0; i < WORLDS.length; i++) if (WORLDS[i].id === id) return true;
    return false;
  }
  function get() { return cur; }

  UA.palette = {
    WORLDS: WORLDS, byId: byId, has: has, set: set, get: get, build: build,
    rgbAt: rgbAt, bands: bands, levels: levels
  };
})(window.UA);
