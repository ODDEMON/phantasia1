/* core/field.js —— 矢量场
   ---------------------------------------------------------------
   第一版这里是逐像素的：Bayer 抖动、半调点阵、摩尔纹、量化窗。
   它算得没错，但看久了眼睛疼——那不是「震撼」，那是噪。
   这一版整层换掉：不算像素，画矢量。

   分五层叠起来，从远到近：
     ly-sky   天幕：一条竖着的分级色带
     ly-far   远景：光体、巨字、远环
     ly-mid   中景：地平线、透视地面、柱、环、弧、裂、甬
     ly-near  近景：光轴、雨
     ly-fine  细节：细线与小刻度——只在指针那一小圈里显形
   再压上 haze（指针那团光）· grain · scan · vig · fx 五层特效。

   低频、柔和、无闪烁。所有运动都是 transform / opacity，
   交给合成器去做；脚本只写两个数：指针在哪。
   「看」仍然是账：每点一次，色带少分一级，细节少几条。
   只是这笔账不再由眼睛来付。 */
window.UA = window.UA || {};
(function (UA) {
  'use strict';

  var U = UA.util;
  var VW = 1600, VH = 900;          /* viewBox：所有的坐标都按这一套写 */

  /* ---------- 母题：二十七处景。名字沿用上一版，剧本一个字都不用改 ----------
     fam 决定由哪一个画法出手；其余的数决定这一处偏成什么样子。
     hz  地平线（0..1 屏高）· grid 透视地面 · axis 光轴 · orb 光体
     cols 柱数 · rings 环数 · nb 横带数 · rain 雨量 · crack 裂缝
     glow 光晕 · drift 漂移 · grain 颗粒 · sun 日纹 · sweep 扫描 · spokes 辐条 */
  var MOTIFS = {
    /* 空旷边界：一条绝对水平线，一道竖直的轴。最安静的那一张。 */
    verge: { fam: 'field', hz: .62, grid: .45, axis: .90, glow: .30, drift: .45 },
    /* 独石：地平线上立着一样双色的东西。它不属于这里。 */
    monolith: { fam: 'field', hz: .52, grid: .34, axis: .55, col: 1, glow: .34, drift: .35 },
    /* 纯点阵：没有天，只有一直铺到眼前的地面。 */
    lattice: { fam: 'field', hz: .24, grid: 1.00, axis: .35, glow: .22, drift: .30 },
    /* 通道：两侧各立一列，夹出一条往里收的路。 */
    corridor: { fam: 'poles', hz: .48, grid: .20, axis: .75, cols: 2, sides: 1, glow: .30, drift: .40 },
    /* 眼：一枚四芒星钉在轴上，四周是同心环。 */
    eye: { fam: 'orb', hz: .56, grid: .22, axis: .55, orb: .85, orbR: .085, orbY: .46, rings: 3, glow: .55, drift: .30 },
    /* 幕：没有地面，只有一层一层横过去的带。 */
    veil: { fam: 'bands', hz: .98, grid: .00, axis: .45, nb: 7, glow: .24, drift: .55 },
    /* 漫：地平线压到很低，地面占满整屏。 */
    flood: { fam: 'field', hz: .24, grid: 1.00, axis: .30, glow: .26, drift: .34 },
    /* 隙：一道竖着的裂缝，两侧对不齐。 */
    rift: { fam: 'crack', hz: .42, grid: .28, axis: .85, crack: .90, glow: .30, drift: .40 },
    /* 群：地面上立着很多根小柱子。它们不是敌人，它们只是立着。 */
    swarm: { fam: 'poles', hz: .50, grid: .30, axis: .50, cols: 22, glow: .26, drift: .45 },
    /* 环：两种规律穿过彼此，长出第三种。 */
    ring: { fam: 'rings', hz: .50, grid: .16, axis: .60, rings: 9, glow: .34, drift: .30 },
    /* 深：轴粗到把整屏切开，地面被推到几乎看不见。 */
    deep: { fam: 'beam', hz: .74, grid: .18, axis: 1.20, wide: 1, glow: .40, drift: .28 },
    /* 齿：地面的线在横向上做一次扫掠，像有人从中间拧了一把。 */
    comb: { fam: 'field', hz: .46, grid: .42, axis: .40, comb: 1, glow: .28, drift: .50 },
    /* 空：什么都没有，只有颜色与一点故障。 */
    void_: { fam: 'bands', hz: 1.10, grid: .00, axis: .20, nb: 3, glow: .14, drift: .70 },
    /* 息：整片与轴一起，很慢地鼓与瘪。 */
    breath: { fam: 'field', hz: .60, grid: .34, axis: .62, breath: 1, glow: .30, drift: .18 },
    /* 阶：极密的台地，一级挨着一级，一直铺到眼前。 */
    stair: { fam: 'field', hz: .38, grid: .90, axis: .24, steps: 14, glow: .26, drift: .24 },
    /* 井：向心的一圈一圈，辐条从边上收进来。 */
    well: { fam: 'rings', hz: 1.12, grid: .00, axis: .40, rings: 14, spokes: 1, glow: .34, drift: .26 },
    /* 带：一条极大的斜带压在半调面板上，带下留着一片硬边的暗。 */
    sash: { fam: 'crack', hz: .70, grid: .18, axis: .22, sash: 1, glow: .30, drift: .40 },
    /* 框：对称的一副架子，框里搁着一样很暖的东西，下面一根竖杆落地。 */
    gantry: { fam: 'poles', hz: .88, grid: .12, axis: .34, cols: 2, frame: 1, glow: .30, drift: .30 },
    /* 弧：同心的一层一层色带，从地平线上方拱过去。 */
    arcs: { fam: 'rings', hz: .92, grid: .18, axis: .28, rings: 10, base: .94, glow: .32, drift: .34 },
    /* 殿：两列对称的柱子，中间一道很粗的轴，顶上一叠横带压着。 */
    chapel: { fam: 'poles', hz: .70, grid: .18, axis: .95, cols: 6, sides: 1, glow: .34, drift: .26 },
    /* 骸：井与齿两套结构互相穿过，谁也不让谁。 */
    bone: { fam: 'rings', hz: .86, grid: .22, axis: .30, rings: 7, spokes: 1, glow: .28, drift: .22 },
    /* 雨：一列一列落下的。落的是字，不是数据。 */
    rain: { fam: 'rain', hz: 1.04, grid: .00, axis: .55, rain: 1, glow: .26, drift: .30 },
    /* 城：地平线上立着一排楼，楼里点着窗。楼顶挂霓虹。 */
    city: { fam: 'poles', hz: .74, grid: .14, axis: .45, cols: 26, sky: 1, glow: .34, drift: .38 },
    /* 落：一轮压着横带的落日，底下铺一张透视网格。 */
    sunset: { fam: 'orb', hz: .68, grid: .55, axis: .30, orb: .95, orbR: .165, orbY: .44, sun: 1, glow: .46, drift: .34 },
    /* 噪：整屏静电，横着撕开几条带。 */
    noise: { fam: 'grain', hz: .94, grid: .00, axis: .38, grain: 1, glow: .18, drift: .60 },
    /* 哨：同心一圈一圈，一道扫描线慢慢扫过。 */
    watch: { fam: 'rings', hz: 1.06, grid: .00, axis: .52, rings: 16, sweep: 1, glow: .34, drift: .20 },
    /* 甬：一圈一圈朝眼前飞来的方框。 */
    chute: { fam: 'chute', hz: 1.02, grid: .00, axis: .55, glow: .30, drift: .50 }
  };

  /* ---------- 状态 ---------- */
  var host = null, scene = null;
  var LAY = {};                       /* 五个图层 */
  var curId = 'verge', JIT = 0;
  var BITS = 8, HEAL = 0;
  var P = { x: .5, y: .5, tx: .5, ty: .5, idle: 0, wheel: 0 };
  var BREATHE = 0, GLITCH = 0, STILL = 0;
  var CUE = null, CUEK = 0;
  var fx = [], raf = 0, t = 0, t0 = 0, lastP = '';

  /* 无头测试用：把「多久之后算闲着」压到最短。内容一个字都不改。 */
  var FAST = false;
  try { FAST = !!window.UA_FAST; } catch (e) { FAST = false; }
  var HEAL_AFTER = FAST ? .10 : 2.4, HEAL_EVERY = FAST ? .05 : 1.1;

  /* ---------- 色带一律问调色板要，别在这儿再抄一份表 ---------- */
  function levels(bits) { return UA.palette.levels(bits); }

  function bandStops(from, to) {
    return UA.palette.bands(UA.palette.get().id, BITS, from, to);
  }
  function stops(from, to) { return bandStops(from, to); }

  /* ---------- 取色：一律从当前量程的 ramp 上采，绝不写死色值 ---------- */
  function ramp() { return UA.palette.get().ramp; }
  function col(i) { return UA.palette.rgbAt(ramp(), i); }

  function stopStr(list) {
    return list.map(function (s) {
      return '<stop offset="' + U.n(s.t, 4) + '" stop-color="' + s.c + '"/>';
    }).join('');
  }
  function linGrad(id, x1, y1, x2, y2, list) {
    return '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + x1 +
      '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' + stopStr(list) + '</linearGradient>';
  }
  function radGrad(id, cx, cy, r, list) {
    return '<radialGradient id="' + id + '" gradientUnits="userSpaceOnUse" cx="' + U.n(cx) +
      '" cy="' + U.n(cy) + '" r="' + U.n(r) + '">' + stopStr(list) + '</radialGradient>';
  }

  /* ---------- 平铺的模糊：光晕一律由它出 ----------
     一个模糊滤镜要占一块画布。整场只用这一枚，够用了。 */
  var DEF_BLUR =
    '<filter id="fSoft" x="-40%" y="-40%" width="180%" height="180%">' +
    '<feGaussianBlur stdDeviation="26"/></filter>' +
    '<filter id="fSoft2" x="-40%" y="-40%" width="180%" height="180%">' +
    '<feGaussianBlur stdDeviation="70"/></filter>';

  /* ================= 十一种画法 =================
     每一个都给回一段 SVG。参数一律先摊成标量，别在循环里现算。 */

  /* 一 · 分两半：地面铺在远景，线画在中景 ----
     先前这两半是合在一起的，出了一处硬伤：
     中景那张满屏的地面把远景的光体整个盖住，
     于是「落」这一处根本没有落日，「城」也没有巨字。
     分层的规矩就一条——**后画的盖先画的**，所以谁归谁要写清楚。 */

  /* 一·甲 地面：从地平线往下铺一层由近到远的渐变。远景层。 */
  function drawFloor(p) {
    var hz = p.hz * VH;
    if (hz >= VH - 4) return '';
    return '<rect class="floor" x="0" y="' + U.n(hz) + '" width="' + VW +
      '" height="' + U.n(VH - hz + 2) + '" fill="url(#gFloor)"/>';
  }

  /* 一·乙 地平线场：线 + 独石 + 齿。中景层。 */
  function drawFieldMid(p) {
    var hz = p.hz * VH;
    var out = '';
    /* 透视地面：竖线朝消失点收，横线按平方律变密 */
    if (p.grid > .02 && hz < VH - 4) {
      var vx = VW * .5, d = [], i, k, y, x;
      var n = Math.max(4, Math.round(14 * p.grid * (BITS >= 6 ? 1 : .6)));
      var reach = VW * 1.5;
      for (i = -n; i <= n; i++) {
        x = vx + (i / n) * reach;
        d.push('M' + U.n(vx, 0) + ' ' + U.n(hz, 0) + 'L' + U.n(x, 0) + ' ' + VH);
      }
      var steps = p.steps || Math.max(5, Math.round(13 * p.grid * (BITS >= 5 ? 1 : .6)));
      for (k = 1; k <= steps; k++) {
        y = hz + (VH - hz) * Math.pow(k / steps, 2.1);
        d.push('M0 ' + U.n(y, 0) + 'H' + VW);
      }
      out += '<path class="grid" d="' + d.join('') + '" mask="url(#mFade)"/>';
    }
    /* 地平线本体：一根线，加一条压扁的光 */
    out += '<g class="hz">';
    out += '<rect x="0" y="' + U.n(hz - 2) + '" width="' + VW + '" height="4" fill="var(--acc)" opacity=".9"/>';
    out += '<rect x="0" y="' + U.n(hz - 54) + '" width="' + VW + '" height="108" fill="var(--acc)" opacity=".14" filter="url(#fSoft)"/>';
    out += '</g>';
    /* 独石：一块立在线上、不属于这里的东西 */
    if (p.col) {
      var bw = VW * .13, bx = VW * .5 - bw / 2, bh = (VH - hz) * .58;
      out += '<g class="slab">';
      out += '<rect x="' + U.n(bx) + '" y="' + U.n(hz - bh) + '" width="' + U.n(bw) + '" height="' + U.n(bh) + '" fill="url(#gSlab)"/>';
      out += '<rect x="' + U.n(bx) + '" y="' + U.n(hz - bh) + '" width="' + U.n(bw) + '" height="3" fill="var(--fg)" opacity=".85"/>';
      out += '</g>';
    }
    if (p.comb) {
      /* 齿：几道从地面里长出来的竖条，粗细不一 */
      var s2 = '', i2, x2, w2;
      for (i2 = 0; i2 < 26; i2++) {
        x2 = (i2 + .5) / 26 * VW;
        w2 = 2 + U.at(JIT * 31, i2) * 16;
        s2 += 'M' + U.n(x2 - w2 / 2, 0) + ' ' + U.n(hz, 0) + 'h' + U.n(w2, 0) +
          'v' + U.n((VH - hz) * (.2 + U.at(JIT * 41, i2) * .55), 0) + 'h-' + U.n(w2, 0) + 'Z';
      }
      out += '<path class="comb" d="' + s2 + '" mask="url(#mFade)"/>';
    }
    return out;
  }

  /* 二 · 光轴：一道竖直的光柱。指针走到哪，它跟到哪 */
  function drawBeam(p) {
    var w = (p.wide ? VW * .085 : VW * .026) * (1 + GLITCH * .5);
    var out = '<g class="axisWrap">';
    out += '<rect x="' + U.n(-w) + '" y="0" width="' + U.n(w * 2) + '" height="' + VH + '" fill="url(#gBeam)" filter="url(#fSoft)"/>';
    out += '<rect x="' + U.n(-w * .30) + '" y="0" width="' + U.n(w * .60) + '" height="' + VH + '" fill="var(--fg)" opacity=".85" filter="url(#fSoft)"/>';
    out += '<rect x="-1.5" y="0" width="3" height="' + VH + '" fill="#ffffff" opacity=".92"/>';
    out += '</g>';
    return out;
  }

  /* 三 · 光体：一颗大而软的东西。它是这一处唯一不被压暗的所在 */
  function drawOrb(p) {
    var cx = VW * (p.orbX == null ? .5 : p.orbX), cy = VH * p.orbY, r = VW * p.orbR;
    var out = '<g class="orb">';
    out += '<circle cx="' + U.n(cx) + '" cy="' + U.n(cy) + '" r="' + U.n(r * 2.35) + '" fill="var(--acc)" opacity=".16" filter="url(#fSoft2)"/>';
    out += '<circle class="orbBody" cx="' + U.n(cx) + '" cy="' + U.n(cy) + '" r="' + U.n(r) + '" fill="url(#gOrb)"/>';
    if (p.sun) {
      /* 日纹：横带切过光体。越往下越密 */
      var s = '', i, y;
      for (i = 0; i < 15; i++) {
        y = cy - r + (i / 14) * r * 2;
        var hh = 1.4 + Math.pow(i / 14, 2.4) * 8;
        s += '<rect x="' + U.n(cx - r) + '" y="' + U.n(y) + '" width="' + U.n(r * 2) + '" height="' + U.n(hh) + '"/>';
      }
      out += '<clipPath id="cOrb"><circle cx="' + U.n(cx) + '" cy="' + U.n(cy) + '" r="' + U.n(r * .995) + '"/></clipPath>';
      out += '<g clip-path="url(#cOrb)" fill="var(--bg)" opacity=".92">' + s + '</g>';
    }
    out += '<circle cx="' + U.n(cx) + '" cy="' + U.n(cy) + '" r="' + U.n(r * 1.03) + '" fill="none" stroke="var(--fg)" stroke-width="1.6" opacity=".7"/>';
    out += '</g>';
    return out;
  }

  /* 四 · 同心环：从一点往外扩的一圈一圈 */
  function drawRings(p) {
    var cx = VW * (p.ringX == null ? .5 : p.ringX), cy = VH * (p.base == null ? .5 : p.base);
    var n = p.rings, out = '<g class="rings">', i;
    for (i = 0; i < n; i++) {
      var rr = (i + 1) / n;
      var r = VW * .62 * Math.pow(rr, 1.5);
      out += '<circle class="rg" cx="' + U.n(cx) + '" cy="' + U.n(cy) + '" r="' + U.n(r) +
        '" fill="none" stroke="var(--acc)" stroke-width="' + U.n(1 + (1 - rr) * 2.4, 2) +
        '" opacity="' + U.n(.10 + (1 - rr) * .55, 3) + '"/>';
    }
    if (p.spokes) {
      var d = '';
      for (i = 0; i < 48; i++) {
        var a = i / 48 * Math.PI * 2 + .31;
        var q0 = U.polar(cx, cy, VW * .06, a), q1 = U.polar(cx, cy, VW * .62, a);
        d += 'M' + U.n(q0[0]) + ' ' + U.n(q0[1]) + 'L' + U.n(q1[0]) + ' ' + U.n(q1[1]);
      }
      out += '<path class="spokes" d="' + d + '" stroke="var(--acc)" stroke-width="1" opacity=".28" fill="none"/>';
    }
    if (p.sweep) {
      /* 哨：一道慢慢转的扫描扇面 */
      var a0 = t * .62;
      var big = U.arcPath(cx, cy, VW * .62, a0, a0 + .40);
      out += '<path class="radar" d="M' + U.n(cx) + ' ' + U.n(cy) + 'L' +
        U.n(U.polar(cx, cy, VW * .62, a0)[0]) + ' ' + U.n(U.polar(cx, cy, VW * .62, a0)[1]) +
        'A' + U.n(VW * .62) + ' ' + U.n(VW * .62) + ' 0 0 1 ' +
        U.n(U.polar(cx, cy, VW * .62, a0 + .40)[0]) + ' ' + U.n(U.polar(cx, cy, VW * .62, a0 + .40)[1]) +
        'Z" fill="url(#gRadar)" opacity=".55"/>';
    }
    out += '<circle cx="' + U.n(cx) + '" cy="' + U.n(cy) + '" r="3" fill="#fff"/>';
    out += '</g>';
    return out;
  }

  /* 五 · 柱林：地平线上一排立着的东西。城、群、殿、框都走这一支 */
  function drawPoles(p) {
    var hz = p.hz * VH, out = '<g class="poles">', i;
    var sky = p.sky, n = p.cols, sides = p.sides, frame = p.frame;
    for (i = 0; i < n; i++) {
      var u = n === 1 ? .5 : i / (n - 1);
      var x, w, h;
      if (sides) {
        /* 两侧对称：只在左右各站一列，中间让出路 */
        var sgn = i % 2 ? 1 : -1;
        var k = Math.floor(i / 2);
        var off = .26 + k * .13;
        x = VW * (.5 + sgn * off);
        w = VW * (.020 + k * .012);
        h = VH * (.30 + U.at(JIT * 17, i) * .46);
      } else {
        x = u * VW;
        w = sky ? VW * (.028 + U.at(JIT * 13, i) * .030) : VW * .012;
        h = sky ? VH * (.10 + U.at(JIT * 19, i) * .40)
          : VH * (.05 + U.at(JIT * 19, i) * .26);
      }
      var top = hz - h;
      out += '<g class="po">';
      out += '<rect x="' + U.n(x - w / 2) + '" y="' + U.n(top) + '" width="' + U.n(w) + '" height="' + U.n(h) +
        '" fill="url(#gPole)" opacity="' + U.n(sky ? .78 : .66, 2) + '"/>';
      out += '<rect x="' + U.n(x - w / 2) + '" y="' + U.n(top) + '" width="' + U.n(w) + '" height="2.5" fill="var(--acc)" opacity=".95"/>';
      if (sky && BITS >= 6) {
        /* 窗：只在细节够的时候点，掉位之后楼会自己变成剪影 */
        var rows = Math.max(2, Math.round(h / 46)), cols2 = Math.max(1, Math.round(w / 26));
        var wd = '';
        for (var r2 = 0; r2 < rows; r2++) for (var c2 = 0; c2 < cols2; c2++) {
          if (U.at(JIT * 97 + i * 7, r2 * 11 + c2) > .62) {
            wd += 'M' + U.n(x - w / 2 + 8 + c2 * 26, 0) + ' ' + U.n(top + 14 + r2 * 46, 0) + 'h7v9h-7Z';
          }
        }
        if (wd) out += '<path d="' + wd + '" fill="var(--acc2)" opacity=".72"/>';
      }
      out += '</g>';
    }
    if (frame) {
      var bx = VW * .5, gy = hz;
      out += '<g class="frame" stroke="var(--acc)" fill="none" stroke-width="2" opacity=".75">';
      out += '<path d="M' + U.n(bx - VW * .22) + ' ' + U.n(VH * .22) + 'H' + U.n(bx + VW * .22) +
        'M' + U.n(bx - VW * .22) + ' ' + U.n(VH * .22) + 'V' + U.n(gy) +
        'M' + U.n(bx + VW * .22) + ' ' + U.n(VH * .22) + 'V' + U.n(gy) + '"/>';
      out += '<rect x="' + U.n(bx - VW * .07) + '" y="' + U.n(VH * .30) + '" width="' + U.n(VW * .14) +
        '" height="' + U.n(VH * .20) + '" fill="url(#gOrb)" stroke="none"/>';
      out += '</g>';
    }
    return out;
  }

  /* 六 · 横幕：一层一层横过去的带。没有地面 */
  function drawBands(p) {
    var n = p.nb, out = '<g class="bands">', i;
    for (i = 0; i < n; i++) {
      var u = i / n;
      var y = VH * (.18 + u * .78), h = VH * (.008 + U.at(JIT * 23, i) * .034);
      out += '<rect class="bd" x="-' + U.n(VW * .1) + '" y="' + U.n(y) + '" width="' + U.n(VW * 1.2) +
        '" height="' + U.n(h) + '" fill="url(#gBand)" opacity="' + U.n(.22 + (1 - u) * .55, 2) + '"/>';
    }
    out += '</g>';
    return out;
  }

  /* 七 · 雨：斜着落下的一片线。落的是字 */
  function drawRain(p) {
    var rows = 28, step = VH / rows, d = '', i, j;
    for (i = 0; i <= rows; i++) {
      var y = i * step + U.at(JIT * 53, i) * step * .8;
      var cnt = 5 + Math.round(U.at(JIT * 59, i + 99) * 7);
      for (j = 0; j < cnt; j++) {
        var x = U.at(JIT * 67 + i * 3, j) * VW;
        var len = step * (.5 + U.at(JIT * 71, j) * .5);
        d += 'M' + U.n(x, 0) + ' ' + U.n(y, 0) + 'l-16 ' + U.n(len, 0);
      }
    }
    return '<g class="rainG"><path d="' + d + '" stroke="var(--acc2)" stroke-width="1.6" ' +
      'stroke-linecap="round" opacity=".62" fill="none"/></g>' +
      '<rect x="0" y="0" width="' + VW + '" height="' + VH + '" fill="var(--bg)" opacity=".34"/>';
  }

  /* 八 · 裂缝：一道竖着的、走得很不直的缝 */
  function drawCrack(p) {
    var d = '', y = -20, x = VW * .5, i = 0;
    d += 'M' + U.n(x) + ' ' + U.n(y);
    while (y < VH + 20) {
      y += 40 + U.at(JIT * 29, i) * 46;
      x += (U.at(JIT * 37, i) - .5) * 90;
      d += 'L' + U.n(x) + ' ' + U.n(y);
      i++;
    }
    var out = '<g class="crack">';
    out += '<path d="' + d + '" stroke="var(--acc)" stroke-width="14" fill="none" opacity=".28" filter="url(#fSoft)"/>';
    out += '<path d="' + d + '" stroke="var(--fg)" stroke-width="2.4" fill="none" opacity=".95"/>';
    out += '</g>';
    if (p.sash) {
      /* 带：一条极大的斜带压下来，带下留一片硬边的暗 */
      out += '<path class="sash" d="M-100 ' + U.n(VH * .18) + 'L' + U.n(VW * .70) + ' -100L' +
        U.n(VW * .94) + ' -100L' + U.n(VW * .10) + ' ' + U.n(VH + 100) + 'L-100 ' + U.n(VH + 100) + 'Z" ' +
        'fill="url(#gSash)" opacity=".62"/>';
    }
    return out;
  }

  /* 九 · 甬：一圈一圈朝眼前飞来的方框 */
  function drawChute() {
    var out = '<g class="chute" transform-origin="' + U.n(VW / 2) + ' ' + U.n(VH / 2) + '">', i;
    for (i = 0; i < 9; i++) {
      var s = .18 + i * .1;
      out += '<rect class="ch" x="' + U.n(VW * (.5 - s / 2)) + '" y="' + U.n(VH * (.5 - s / 2)) +
        '" width="' + U.n(VW * s) + '" height="' + U.n(VH * s) + '" fill="none" stroke="var(--acc)" ' +
        'stroke-width="2" opacity=".55" style="animation-delay:' + U.n(-i * 1.4, 2) + 's"/>';
    }
    out += '</g>';
    return out;
  }

  /* 十 · 静噪：一片很粗的、慢慢滚的静 */
  function drawGrain(p) {
    return '<rect class="stat" x="0" y="0" width="' + VW + '" height="' + VH + '" fill="url(#pNoise)" opacity=".5"/>' +
      '<g class="tearBand">' + [0, 1, 2, 3].map(function (i) {
        var y = VH * (.14 + i * .24);
        return '<rect x="-' + U.n(VW * .05) + '" y="' + U.n(y) + '" width="' + U.n(VW * 1.1) +
          '" height="' + U.n(6 + U.at(JIT * 83, i) * 22) + '" fill="var(--acc2)" opacity=".3"/>';
      }).join('') + '</g>';
  }

  /* 十一 · 巨字：几笔很细的、极大的记号。它们是这一处的落款 */
  function drawGlyphs(p) {
    var g = '', i, n = 3;
    for (i = 0; i < n; i++) {
      var cx = VW * (.18 + i * .32), cy = VH * (.30 + U.at(JIT * 91, i) * .34);
      var r = VW * (.10 + U.at(JIT * 93, i) * .07);
      if (i % 3 === 0) {
        g += '<circle cx="' + U.n(cx) + '" cy="' + U.n(cy) + '" r="' + U.n(r) + '"/>';
        g += '<path d="M' + U.n(cx - r) + ' ' + U.n(cy) + 'H' + U.n(cx + r) +
          'M' + U.n(cx) + ' ' + U.n(cy - r) + 'V' + U.n(cy + r) + '"/>';
      } else if (i % 3 === 1) {
        g += '<rect x="' + U.n(cx - r * .8) + '" y="' + U.n(cy - r * .8) + '" width="' + U.n(r * 1.6) +
          '" height="' + U.n(r * 1.6) + '"/>';
      } else {
        g += '<path d="M' + U.n(cx) + ' ' + U.n(cy - r) + 'L' + U.n(cx + r) + ' ' + U.n(cy + r) +
          'L' + U.n(cx - r) + ' ' + U.n(cy + r) + 'Z"/>';
      }
    }
    return '<g class="glyphs" stroke="var(--acc)" stroke-width="1.6" fill="none" opacity=".30">' + g + '</g>';
  }

  /* 每一族给出三样：远景 / 中景 / 近景。
     后画的压先画的——光轴一律压在近景，永远在最上一层。 */
  function pack(p, far, mid, near) {
    return { far: (far || ''), mid: (mid || ''), near: (near || '') };
  }
  var DRAW = {
    field: function (p) { return pack(p, drawFloor(p) + (p.glow > .5 ? drawGlyphs(p) : ''), drawFieldMid(p)); },
    beam: function (p) { return pack(p, drawFloor(p), drawFieldMid(p)); },
    orb: function (p) { return pack(p, drawFloor(p) + drawOrb(p) + drawGlyphs(p), drawFieldMid(p)); },
    poles: function (p) { return pack(p, drawFloor(p) + drawPoles(p) + (p.glow > .45 ? drawGlyphs(p) : ''), drawFieldMid(p)); },
    bands: function (p) { return pack(p, drawGlyphs(p), drawBands(p)); },
    rings: function (p) { return pack(p, drawFloor(p), drawRings(p)); },
    crack: function (p) { return pack(p, drawFloor(p), drawCrack(p)); },
    rain: function (p) { return pack(p, drawFloor(p), '', drawRain(p)); },
    chute: function (p) { return pack(p, '', drawChute()); },
    grain: function (p) { return pack(p, '', '', drawGrain(p)); }
  };

  /* ---------- 提示：句子说什么，景就往哪儿偏 ----------
     这是这一版新加的「对上」：每句话会带一个提示过来，
     场据此把某一层推上去、把别的压下去。
     同一处景，讲「环」和讲「裂缝」时长得不一样。 */
  var CUE_ADJ = {
    ring: { rings: 1.9, grid: .4, orb: 1.3 },
    beam: { axis: 1.8, grid: .5 },
    tower: { cols: 1.8, grid: .6 },
    fall: { rain: 2.2, grid: .3 },
    crack: { crack: 1.8, axis: 1.2 },
    gaze: { orb: 1.7, glow: 1.5, rings: 1.3 },
    grid: { grid: 2.0, cols: .5 },
    void: { glow: .5, axis: .5, grid: .2, rings: .4, orb: .4, cols: .5 },
    flood: { grid: 1.7, axis: .6 },
    glyph: { glow: 1.4, rings: 1.2 },
    path: { grid: 1.4, drift: 1.5 },
    line: { grid: 1.5, axis: 1.4 },
    band: { nb: 1.8, grid: .4 },
    count: { grid: 1.6, rings: 1.4 }
  };

  /* ---------- 解一份配方：母题 + 抖开 + 提示 + 静 ---------- */
  function resolve() {
    var base = MOTIFS[curId] || MOTIFS.verge, r = {}, k;
    for (k in base) r[k] = base[k];
    var j = JIT * 97 + 1;
    /* 抖开：同一个母题每次来都长得不太一样 */
    r.hz = U.clamp(base.hz + (U.at(j, 1) - .5) * .16, .06, 1.16);
    r.grid = (base.grid || 0) * (.55 + U.at(j, 2) * .95);
    r.axis = (base.axis || 0) * (.72 + U.at(j, 3) * .60);
    r.glow = (base.glow || 0) * (.70 + U.at(j, 4) * .60);
    r.drift = (base.drift == null ? .4 : base.drift) * (.70 + U.at(j, 5) * .60);
    r.rings = base.rings ? Math.max(2, Math.round(base.rings * (.7 + U.at(j, 6) * .7))) : 0;
    r.cols = base.cols ? Math.max(1, Math.round(base.cols * (.75 + U.at(j, 7) * .6))) : 0;
    r.nb = base.nb ? Math.max(2, Math.round(base.nb * (.7 + U.at(j, 8) * .8))) : 0;
    r.rain = base.rain ? 1 : 0;
    r.crack = base.crack || 0;
    r.steps = base.steps || 0;
    r.grain = base.grain || 0;
    r.orbX = base.orbX == null ? .5 : U.clamp(base.orbX + (U.at(j, 9) - .5) * .10, .2, .8);
    r.orbY = base.orbY == null ? .46 : U.clamp(base.orbY + (U.at(j, 10) - .5) * .12, .2, .8);
    r.orbR = (base.orbR || .16) * (.85 + U.at(j, 11) * .35);
    r.ringX = base.ringX == null ? .5 : base.ringX;
    r.base = base.base == null ? .5 : base.base;
    r.sky = base.sky; r.sun = base.sun; r.sweep = base.sweep;
    r.spokes = base.spokes; r.comb = base.comb; r.sides = base.sides;
    r.frame = base.frame; r.col = base.col; r.wide = base.wide;
    r.sash = base.sash; r.breath = base.breath; r.orb = base.orb || 0;

    /* 提示：把这一句在讲的那一层推上去 */
    if (CUE && CUE_ADJ[CUE]) {
      var adj = CUE_ADJ[CUE];
      for (k in adj) {
        if (typeof r[k] === 'number') r[k] = r[k] * adj[k];
      }
      if (adj.orb && !r.orb) r.orb = .8 * adj.orb;
    }
    /* 静一点：漂移停住，颗粒收掉。形不动，只把动的那部分熄掉 */
    if (STILL) r.drift = 0;
    /* 呼吸：整片与轴一起很慢地鼓与瘪 */
    if (r.breath && BREATHE > 0) {
      var kk = 1 + BREATHE * Math.sin(t * .46) * .06;
      r.hz = U.clamp(r.hz * kk, .06, 1.16);
      r.axis = r.axis * (1 + BREATHE * Math.sin(t * .46) * .35);
    }
    /* 故障：轴跟着抖 */
    if (GLITCH > 0) r.axis = r.axis * (1 + GLITCH * .5);
    return r;
  }

  /* ---------- 造图层 ---------- */
  function layerSvg(cls) {
    return '<svg class="vly ' + cls + '" viewBox="0 0 ' + VW + ' ' + VH +
      '" preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg>';
  }

  function mount(el) {
    host = el;
    if (!host) return;
    host.classList.add('is-scene');
    host.innerHTML =
      layerSvg('ly-sky') + layerSvg('ly-far') + layerSvg('ly-mid') + layerSvg('ly-near') +
      layerSvg('ly-fine') +
      '<div class="vly ly-haze"></div><div class="vly ly-grain"></div>' +
      '<div class="vly ly-scan"></div><div class="vly ly-vig"></div>' +
      '<div class="vly ly-fx">' +
        '<i class="fxFlash"></i><i class="fxSweep"></i><i class="fxTear"></i><i class="fxRing"></i>' +
        /* 新增十块：光斑 / 涟漪 / 裂纹 / 溶解 / 数据雨 / 霓虹 / 塌洞 / 彩虹 / 吞没 / 静噪 */
        '<i class="fxBloom"></i><i class="fxRipple"></i><i class="fxBolt"></i><i class="fxDissolve"></i>' +
        '<i class="fxGlyph"></i><i class="fxNeon"></i><i class="fxHole"></i><i class="fxRainbow"></i>' +
        '<i class="fxVoid"></i><i class="fxNoise"></i>' +
      '</div>';
    scene = host;
    ['sky', 'far', 'mid', 'near', 'fine'].forEach(function (k) {
      LAY[k] = host.querySelector('.ly-' + k);
    });
    LAY.fx = host.querySelector('.ly-fx');
    build();
    apply();
    loop(0);
  }

  /* ---------- 造内容：只重写每一层里那点东西 ---------- */
  function build() {
    if (!scene) return;
    var p = resolve();
    var hy = U.n(p.hz * VH);

    /* --- 天幕层 --- */
    var sky = '<defs>' + DEF_BLUR +
      linGrad('gSky', 0, 0, 0, U.n(VH * Math.min(1, p.hz + .06)), bandStops(4, 118)) +
      linGrad('gFloor', 0, hy, 0, VH, bandStops(126, 6)) +
      linGrad('gPole', 0, 0, 0, VH, bandStops(96, 10)) +
      linGrad('gBand', 0, 0, VW, 0, [
        { t: 0, c: 'transparent' },
        { t: .5, c: col(206) }, { t: 1, c: 'transparent' }
      ]) +
      linGrad('gSlab', 0, 0, 0, VH, bandStops(230, 120)) +
      linGrad('gBeam', -VW * .1, 0, VW * .1, 0, [
        { t: 0, c: 'transparent' },
        { t: .5, c: col(224) },
        { t: 1, c: 'transparent' }
      ]) +
      linGrad('gSash', 0, 0, VW, VH, bandStops(240, 40)) +
      radGrad('gOrb', VW * (p.orbX == null ? .5 : p.orbX), VH * p.orbY, VW * p.orbR * 1.25, [
        { t: 0, c: col(252) }, { t: .55, c: col(228) },
        { t: .86, c: col(176) }, { t: 1, c: col(140) }
      ]) +
      radGrad('gRadar', VW * .5, VH * (p.base == null ? .5 : p.base), VW * .62, [
        { t: 0, c: col(230) }, { t: 1, c: 'transparent' }
      ]) +
      '<mask id="mFade"><rect x="0" y="' + hy + '" width="' + VW + '" height="' +
      U.n(Math.max(4, VH - p.hz * VH)) + '" fill="url(#gFade)"/></mask>' +
      linGrad('gFade', 0, hy, 0, U.n(hy + (VH - p.hz * VH) * .55), [
        { t: 0, c: '#000' }, { t: .30, c: '#666' }, { t: 1, c: '#fff' }
      ]) +
      '<filter id="pNoise" x="0" y="0" width="100%" height="100%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.014 0.02" numOctaves="2" seed="7"/>' +
      '<feColorMatrix type="saturate" values="0"/></filter>' +
      '</defs>';
    sky += '<rect x="0" y="0" width="' + VW + '" height="' + VH + '" fill="url(#gSky)"/>';
    LAY.sky.innerHTML = sky;

    /* --- 远 / 中 / 近：交给画法 --- */
    var fam = (MOTIFS[curId] || MOTIFS.verge).fam;
    var drawer = DRAW[fam] || DRAW.field;
    var res = drawer(p);
    var D = '<defs>' + DEF_BLUR + '</defs>';
    LAY.far.innerHTML = D + (res.far || '');
    LAY.mid.innerHTML = D + (res.mid || '');
    /* 光轴永远压在近景：它是这一处唯一的光，不该被任何东西盖住 */
    LAY.near.innerHTML = D + (res.near || '') + drawBeam(p);

    /* --- 细节层：只在指针那一圈里显形。它由 CSS 的遮罩管着 --- */
    var fd = '', i;
    for (i = 0; i <= 40; i++) fd += 'M' + U.n(i / 40 * VW, 0) + ' 0V' + VH;
    for (i = 0; i <= 26; i++) fd += 'M0 ' + U.n(i / 26 * VH, 0) + 'H' + VW;
    LAY.fine.innerHTML = '<path d="' + fd + '" stroke="var(--acc2)" stroke-width=".5" fill="none" opacity=".5"/>' +
      '<circle cx="' + U.n(P.x * VW) + '" cy="' + U.n(P.y * VH) + '" r="' + U.n(VW * .045) +
      '" fill="none" stroke="var(--fg)" stroke-width="1" opacity=".55"/>' +
      '<circle cx="' + U.n(P.x * VW) + '" cy="' + U.n(P.y * VH) + '" r="2.4" fill="#fff"/>';

    /* --- 特效层按需要开关 --- */
    scene.setAttribute('data-fam', fam);
  }

  /* ---------- 把状态挂到 CSS 上 ---------- */
  function apply() {
    if (!scene) return;
    var st = document.documentElement.style;
    var lv = levels(BITS);
    st.setProperty('--lvl', String(lv));
    st.setProperty('--q', String((8 - BITS) / 7));           /* 0..1：粗到什么地步 */
    scene.setAttribute('data-bits', String(BITS));
    scene.setAttribute('data-cue', CUE || '');
    scene.setAttribute('data-still', STILL ? '1' : '0');
    document.body.classList.toggle('glitching', GLITCH > .22 && !STILL);
    st.setProperty('--gl', String(STILL ? 0 : GLITCH));
    /* 漂移速度：静一点归零 */
    var dr = STILL || calm() ? 0 : ((MOTIFS[curId] || {}).drift || .4);
    st.setProperty('--drift', U.n(dr, 3));
  }

  function calm() { try { return !!UA.bus.state.prefs.calm; } catch (e) { return false; } }

  /* ---------- 演出：全部走 CSS 类，脚本只负责开关 ---------- */
  function fxNow(kind, opts) {
    fx.push({ k: kind, a: t, d: (opts && opts.dur) || 1.2, o: opts || {} });
    if (fx.length > 8) fx.shift();
    fire(kind, opts || {});
  }

  var CALM_OK = { ring: 1, still: 1, glow: 1 };
  function fire(kind, o) {
    if (!scene) return;
    if (calm() && !CALM_OK[kind]) return;
    var el = scene.querySelector('.ly-fx');
    function once(name, ms) {
      scene.classList.add(name);
      setTimeout(function () { scene.classList.remove(name); }, ms);
    }
    var amp = (o && o.amp != null) ? o.amp : 1;
    if (kind === 'flash') once('fx-flash', 700);
    else if (kind === 'sweep') once('fx-sweep', 2600);
    else if (kind === 'tear') once('fx-tear', 900);
    else if (kind === 'chroma') once('fx-chroma', 1800);
    else if (kind === 'mirror') once('fx-mirror', 2400);
    else if (kind === 'shake') once('fx-shake', 700);
    else if (kind === 'ring') once('fx-ring', 2400);
    /* ---- 新增：反相 / 光斑 / 万花筒 / 涟漪 / 推镜 / 裂纹 ---- */
    else if (kind === 'invert') once('fx-invert', 620);
    else if (kind === 'bloom') once('fx-bloom', 1500);
    else if (kind === 'kaleido') once('fx-kaleido', 3200);
    else if (kind === 'ripple') once('fx-ripple', 1800);
    else if (kind === 'zoom') once('fx-zoom', 900);
    else if (kind === 'bolt') once('fx-bolt', 800);
    /* ---- 新增：溶解 / 慢旋 / 心跳 / 三重重影 / 塌洞 ---- */
    else if (kind === 'dissolve') once('fx-dissolve', 1600);
    else if (kind === 'spin') once('fx-spin', 3400);
    else if (kind === 'pulse') once('fx-pulse', 1200);
    else if (kind === 'split') once('fx-split', 1400);
    else if (kind === 'hole') once('fx-hole', 1500);
    /* ---- 新增：霓虹 / 错位堆叠 / 液化 / 彩虹 / 数据雨 / 吞没 / 静噪暴走 ---- */
    else if (kind === 'neon') once('fx-neon', 2200);
    else if (kind === 'stack') once('fx-stack', 1300);
    else if (kind === 'wobble') once('fx-wobble', 1100);
    else if (kind === 'rainbow') once('fx-rainbow', 2600);
    else if (kind === 'glyph') once('fx-glyph', 1200);
    else if (kind === 'void') once('fx-void', 1800);
    else if (kind === 'noise') once('fx-noise', 900);
    else if (kind === 'glow') once('fx-glow', 1800);
    if (scene) scene.style.setProperty('--fx-amp', String(amp));
  }

  /* ---------- 指针：这一处唯一的光源 ---------- */
  var lastX = -1, lastY = -1;
  function pointer(nx, ny) {
    P.tx = U.clamp(nx, 0, 1); P.ty = U.clamp(ny, 0, 1);
    P.idle = 0;
  }
  function moveTo(cx, cy) {
    var w = window.innerWidth || 1, h = window.innerHeight || 1;
    pointer(cx / w, cy / h);
  }

  function loop(ms) {
    /* 窗口关掉之后，这一趟回调还会再响一次（无头测试里就是这样）。
       先看一眼还认不认得出这页纸，认不出就别再往下走。 */
    if (typeof document === 'undefined' || !document.documentElement) return;
    raf = window.requestAnimationFrame ? window.requestAnimationFrame(loop)
      : setTimeout(function () { loop(Date.now()); }, 16);
    var s = ms / 1000;
    var dt = Math.min(.05, s - t0); if (!(dt > 0)) dt = .016;
    t0 = s; t += dt;
    P.idle += dt;

    /* 指针的追赶：快、但不硬 */
    P.x += (P.tx - P.x) * Math.min(1, dt * 9);
    P.y += (P.ty - P.y) * Math.min(1, dt * 9);

    /* 不看它的时候，位深自己长回来一点。这是这一处唯一的善意。 */
    if (P.idle > HEAL_AFTER && BITS < 8) {
      HEAL += dt;
      if (HEAL > HEAL_EVERY) { HEAL = 0; BITS = Math.min(8, BITS + 1); apply(); build(); }
    } else HEAL = 0;

    var key = P.x.toFixed(4) + ':' + P.y.toFixed(4);
    if (key !== lastP) {
      lastP = key;
      var st = document.documentElement.style;
      st.setProperty('--px', P.x.toFixed(4));
      st.setProperty('--py', P.y.toFixed(4));
      var win = .11 + (1 - Math.min(1, P.idle / 3.2)) * .13 + HEAL * .04;
      st.setProperty('--win', U.n(win, 3));
      /* 不看它的时候，细节层自己淡下去；再看，它又浮上来 */
      st.setProperty('--idle', U.n(Math.min(1, P.idle / 4.5), 3));
    }

    /* 演出队列：到点的踢出去 */
    if (fx.length) for (var j = fx.length - 1; j >= 0; j--) if ((t - fx[j].a) / fx[j].d >= 1) fx.splice(j, 1);
  }

  /* ---------- 提示的提取：交给 core/cue.js，这里只收结果 ---------- */
  function cue(text, voice) {
    var id = '', k = 0;
    if (UA.cue && text) {
      var r = UA.cue.read(text, voice);
      id = r.id; k = r.k;
    }
    if (id === CUE && k === CUEK) return CUE;
    CUE = id; CUEK = k;
    apply();
    build();
    return CUE;
  }

  UA.field = {
    MOTIFS: MOTIFS,
    mount: mount,
    resize: function () { build(); apply(); },
    setMotif: function (id, jit) {
      if (!MOTIFS[id]) id = 'verge';
      if (id === curId && jit === JIT) return;
      curId = id; JIT = jit || 0;
      build(); apply();
    },
    get motif() { return curId; },
    /* 注意：这里不能写成 get cue()——下面还有一个同名的方法，
       字面量里后写的会把它盖掉，于是「读提示」变成「调方法」。 */
    get cueId() { return CUE; },
    cue: cue,
    fx: fxNow,
    pointer: pointer,
    moveTo: moveTo,
    click: function (nx, ny) {
      if (nx != null) pointer(nx, ny);
      /* 点一下只留一圈慢慢散开的环，不闪。
         原先这里还压了一记全屏过冲，点快了整片场跟着抖，看久了难受——去掉。 */
      fxNow('ring', { amp: .42, reach: 1.15, dur: 1.1 });
      if (BITS > 1) { BITS--; apply(); build(); }
      P.idle = 0;
    },
    wheel: function (d) {
      P.wheel = Math.min(1, Math.max(0, P.wheel + d * .0016));
      apply();
    },
    get wheel() { return P.wheel; },
    get bits() { return BITS; },
    setBits: function (b) { BITS = Math.max(1, Math.min(8, b | 0)); apply(); build(); },
    get idle() { return P.idle; },
    get size() { return { w: VW, h: VH, bits: BITS }; },
    setBreathe: function (v) { BREATHE = Math.max(0, Math.min(1.4, v || 0)); build(); },
    get breathe() { return BREATHE; },
    setGlitch: function (v) { GLITCH = Math.max(0, Math.min(1.2, v || 0)); apply(); build(); },
    get glitch() { return GLITCH; },
    /* 静一点：形留着，动的那部分熄掉 */
    setStill: function (v) { STILL = v ? 1 : 0; apply(); build(); },
    get still() { return STILL; },
    build: build, apply: apply
  };
})(window.UA);
