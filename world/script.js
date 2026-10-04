/* world/script.js —— 汇流
   剧本由 world/acts/*.js 分批交上来，每一批自己 push 进 UA.acts。
   这里不自造内容，只做三件事：数一数、查一遍、给外面一个只读的口子。
   加一卷 = 在 world/acts/ 里加一个文件，并在 index.html 里加一行 script。 */
window.UA = window.UA || {};
(function (UA) {
  'use strict';

  function acts() { return UA.acts || []; }
  function endings() { return UA.endings || []; }

  function flow() {
    var out = [], a = acts();
    for (var i = 0; i < a.length; i++) for (var j = 0; j < a[i].length; j++) out.push(a[i][j]);
    return out;
  }

  /* 字数：只数会落到屏幕上的字，不数标点与空白。
     这个数是给人看的——它决定了这一趟要走多久。 */
  function count() {
    var n = 0, f = flow();
    function add(t) { n += String(t).replace(/[\s，。、；：？！「」『』（）—…·,.;:?!()"']/g, '').length; }
    for (var i = 0; i < f.length; i++) {
      var b = f[i];
      if (b.s && b.t) add(b.t);
      if (b.choice) for (var j = 0; j < b.choice.length; j++) {
        add(b.choice[j].t);
        var r = b.choice[j].reply || [];
        for (var k = 0; k < r.length; k++) if (r[k].t) add(r[k].t);
      }
      if (b.part) { add(b.part.n || ''); add(b.part.t || ''); add(b.part.sub || ''); add(b.part.mood || ''); }
      if (b.chapter) {
        add(b.chapter.n || ''); add(b.chapter.t || ''); add(b.chapter.sub || '');
        add(b.chapter.mood || ''); add(b.chapter.tail || '');
      }
      if (b.title) { add(b.title.n || ''); add(b.title.t || ''); add(b.title.sub || ''); add(b.title.mood || ''); }
    }
    var e = endings();
    for (var x = 0; x < e.length; x++) for (var y = 0; y < e[x].lines.length; y++) if (e[x].lines[y].t) add(e[x].lines[y].t);
    return n;
  }

  /* 查一遍：剧本引用的量程与母题必须真实存在。
     漏一条，人就会在半路撞上一块黑掉的幕。 */
  function validate() {
    var bad = [], f = flow(), i;
    var WORLD = {}, MOTIF = {};
    for (i = 0; i < UA.palette.WORLDS.length; i++) WORLD[UA.palette.WORLDS[i].id] = 1;
    for (i in UA.field.MOTIFS) MOTIF[i] = 1;
    for (i = 0; i < f.length; i++) {
      var b = f[i];
      if (b.world && !WORLD[b.world]) bad.push('拍 ' + i + ' 引用了量程 ' + b.world);
      if (b.shot && !MOTIF[b.shot[0]]) bad.push('拍 ' + i + ' 引用了母题 ' + b.shot[0]);
      if (b.part) {
        if (!WORLD[b.part.world]) bad.push('拍 ' + i + ' 的篇过场引用了量程 ' + b.part.world);
        if (!MOTIF[b.part.shot]) bad.push('拍 ' + i + ' 的篇过场引用了母题 ' + b.part.shot);
      }
      if (b.chapter) {
        if (!WORLD[b.chapter.world]) bad.push('拍 ' + i + ' 的章过场引用了量程 ' + b.chapter.world);
        if (!MOTIF[b.chapter.shot]) bad.push('拍 ' + i + ' 的章过场引用了母题 ' + b.chapter.shot);
      }
      if (b.choice) for (var j = 0; j < b.choice.length; j++) {
        var o = b.choice[j];
        if (o.world && !WORLD[o.world]) bad.push('拍 ' + i + ' 的选项引用了量程 ' + o.world);
        if (o.shot && !MOTIF[o.shot[0]]) bad.push('拍 ' + i + ' 的选项引用了母题 ' + o.shot[0]);
        if (!o.reply) bad.push('拍 ' + i + ' 的选项没有后续');
      }
      if (b.s && !b.t) bad.push('拍 ' + i + ' 是一句话，但它是空的');
    }
    if (!f.length) bad.push('剧本是空的');
    if (!endings().length) bad.push('结局是空的');
    var hasFallback = false;
    for (i = 0; i < endings().length; i++) {
      var e = endings()[i];
      if (typeof e.when !== 'function') bad.push('结局 ' + e.id + ' 缺判据');
      if (!e.lines || e.lines.length < 4) bad.push('结局 ' + e.id + ' 的收束太短');
      if (!WORLD[e.world]) bad.push('结局 ' + e.id + ' 引用了量程 ' + e.world);
      if (!MOTIF[e.shot]) bad.push('结局 ' + e.id + ' 引用了母题 ' + e.shot);
      if (e.when({ cai: 99, lou: 99, die: 99 }) && e.when({ cai: -9, lou: -9, die: -9 })) hasFallback = true;
    }
    if (!hasFallback) bad.push('兜底的结局缺一个（判据要能接住所有走法，并且排在最后）');
    return bad;
  }

  UA.script = { flow: flow, count: count, validate: validate, acts: acts, endings: endings };
})(window.UA);
