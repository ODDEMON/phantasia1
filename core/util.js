/* core/util.js —— 确定式散列与几条小算术
   旧版这里叫 lut（查表）：抖动矩阵、正弦表、量化表、暗角表、字形砖——
   那些都是给逐像素循环备的干粮。第二版不走像素了，干粮也就没必要留。
   留下的几样，是矢量构图要用的：
     散列（同一个序号永远给同一个数）· 取小数 · 夹 · 缓动 · 极坐标。
   没有随机数。一处「随机」如果每次重开都不一样，构图就立不住。 */
window.UA = window.UA || {};
(function (UA) {
  'use strict';

  /* ---- 稳定的整数散列：0..1。同一个入参永远同一个出参 ---- */
  function hash(i) {
    var x = (i | 0) * 2654435761;
    x = ((x >>> 16) ^ x) * 0x45d9f3b;
    x = ((x >>> 16) ^ x) >>> 0;
    return x / 4294967296;
  }

  /* 由「母题序号 + 抖开序号 + 第几个」造一个稳定的小数 */
  function at(seed, i) { return hash((seed | 0) * 7919 + (i | 0) * 104729); }

  function frac(x) { return x - Math.floor(x); }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  /* 从一个区间里取一个偏中间的确定值 */
  function span(seed, i, a, b) { return lerp(a, b, at(seed, i)); }

  /* ---- 极坐标：环、弧、辐条都从这儿出 ---- */
  function polar(cx, cy, r, a) {
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  }
  function deg(d) { return d * Math.PI / 180; }

  /* ---- 数字收敛：SVG 里的坐标少几位就少几份字节 ---- */
  function n(v, k) { return Number(v).toFixed(k == null ? 1 : k).replace(/\.0+$/, ''); }

  /* ---- 弧线路径：一段从 a0 到 a1 的圆环 ---- */
  function arcPath(cx, cy, r, a0, a1) {
    var p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
    var big = (a1 - a0) > Math.PI ? 1 : 0;
    return 'M' + n(p0[0]) + ' ' + n(p0[1]) +
      'A' + n(r) + ' ' + n(r) + ' 0 ' + big + ' 1 ' + n(p1[0]) + ' ' + n(p1[1]);
  }

  UA.util = {
    hash: hash, at: at, frac: frac, clamp: clamp, lerp: lerp, smooth: smooth,
    span: span, polar: polar, deg: deg, n: n, arcPath: arcPath
  };
})(window.UA);
