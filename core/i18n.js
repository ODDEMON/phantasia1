/* core/i18n.js —— 语言层
   中文永远是源；译文是叠加层（world/i18n/{en,ja,ru}.js 把自己的 map 注册进 UA.i18n.maps）。
   get(zh)：zh 语言原样返回；其余语言查表，查不到回退中文。
   语言偏好存在 bus 的 prefs.lang 里，刷新页面后仍在。 */
window.UA = window.UA || {};
(function (UA) {
  'use strict';

  var maps = { en: {}, ja: {}, ru: {} };
  var lang = 'zh';
  var LANGS = ['zh', 'en', 'ja', 'ru'];
  var NAMES = { zh: '中文', en: 'EN', ja: '日本語', ru: 'РУС' };

  function can(l) { return l === 'zh' || !!maps[l]; }

  function get(zh) {
    if (zh == null) return zh;
    if (lang === 'zh') return zh;
    var m = maps[lang];
    if (!m) return zh;
    var v = m[zh];
    if (v != null && String(v).length) return v;
    return zh;
  }

  function setLang(l) {
    if (!can(l)) return;
    lang = l;
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = (l === 'zh') ? 'zh-CN' : l;
    }
    if (UA.bus && UA.bus.setPref) UA.bus.setPref('lang', l);
    if (UA.app && UA.app.onLangChange) UA.app.onLangChange(l);
  }

  function init() {
    var p = UA.bus && UA.bus.state && UA.bus.state.prefs;
    var l = (p && p.lang) || 'zh';
    lang = can(l) ? l : 'zh';
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = (lang === 'zh') ? 'zh-CN' : lang;
    }
  }

  UA.i18n = {
    get: get, setLang: setLang, init: init, can: can, maps: maps, LANGS: LANGS, NAMES: NAMES,
    get lang() { return lang; }
  };
})(window.UA);
