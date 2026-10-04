/* core/bus.js —— 记进度
   记四样东西：走到第几拍、当前量程与母题、采样深度、三个隐性轴向。
   三个轴向摆不到明面上。它们只在最后决定，哪一次重建接住你。 */
window.UA = window.UA || {};
(function (UA) {
  'use strict';
  var KEY = 'afterimage_v1';

  function blank() {
    return {
      i: 0,
      world: 'interval',
      motif: 'verge',
      jit: 0,
      bits: 8,
      word: '',
      /* 三个隐性轴向 */
      cai: 0,   /* 采：你把它记下来了 */
      lou: 0,   /* 漏：你让它过去了 */
      die: 0,   /* 叠：你接受了更连贯的那一个 */
      seen: {},
      prefs: { calm: false, sound: false }
    };
  }

  var state = blank();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return false;
      var o = JSON.parse(raw);
      if (!o || typeof o !== 'object') return false;
      var b = blank();
      for (var k in b) if (o[k] != null) b[k] = o[k];
      if (!b.prefs || typeof b.prefs !== 'object') b.prefs = blank().prefs;
      for (var j in b) state[j] = b[j];
      return true;
    } catch (e) { return false; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 记不下就记不下 */ }
  }
  function wipe() {
    var p = state.prefs;
    var s = blank();
    for (var k in s) state[k] = s[k];
    state.prefs = p;
    save();
  }
  function fx(d) {
    for (var k in d) if (typeof state[k] === 'number') state[k] += d[k];
    save();
  }
  function setPref(k, v) { state.prefs[k] = v; save(); }

  /* ---- 存档：出去一趟，再回来 ----
     导出的是「进度 + 三个轴向 + 偏好」的全部，格式就是这张 state。
     编码成 base64 只是为了粘起来方便；读入时两种都认。 */
  function dump() {
    var pack = { sig: 'AFTERIMAGE', v: 1, at: new Date().toISOString(), s: state };
    return JSON.stringify(pack);
  }
  function encode() {
    var t = dump();
    try { return btoa(unescape(encodeURIComponent(t))); } catch (e) { return t; }
  }
  function decode(txt) {
    var t = String(txt || '').trim();
    if (!t) return '';
    if (t.charAt(0) === '{') return t;
    try { return decodeURIComponent(escape(atob(t.replace(/\s+/g, '')))); } catch (e) { return ''; }
  }
  /* 读入：认得出来的字段写进去；认不出来的原样退回。
     几个数会被重新钳到范围内——存档是可以被人手改的，钳一下是礼貌。 */
  function restore(txt) {
    var raw = decode(txt);
    if (!raw) return { ok: false, why: '这一段读不出东西来' };
    var pack;
    try { pack = JSON.parse(raw); } catch (e) { return { ok: false, why: '这一段并非一张存档' }; }
    var o = pack && pack.s ? pack.s : (pack && pack.i != null ? pack : null);
    if (!o || typeof o !== 'object') return { ok: false, why: '这一段里寻不出进度' };
    var b = blank();
    for (var k in b) if (o[k] != null) state[k] = o[k];
    if (!state.prefs || typeof state.prefs !== 'object') state.prefs = blank().prefs;
    if (!state.seen || typeof state.seen !== 'object') state.seen = {};
    state.bits = Math.max(1, Math.min(8, state.bits | 0 || 8));
    state.i = Math.max(0, state.i | 0);
    ['cai', 'lou', 'die'].forEach(function (a) { state[a] = Math.max(-99, Math.min(99, state[a] | 0)); });
    if (UA.palette && UA.palette.has && !UA.palette.has(state.world)) state.world = 'interval';
    if (UA.field && !UA.field.MOTIFS[state.motif]) state.motif = 'verge';
    save();
    return { ok: true, at: pack.at || '', i: state.i };
  }

  UA.bus = {
    KEY: KEY, state: state, load: load, save: save, wipe: wipe, fx: fx, setPref: setPref,
    dump: dump, encode: encode, decode: decode, restore: restore
  };
})(window.UA);
