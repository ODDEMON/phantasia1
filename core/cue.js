/* core/cue.js —— 提示：这句话在讲什么
   ---------------------------------------------------------------
   场本身有二十七处景，但景是「这一卷长什么样」，
   跟当下这一句并没有关系。所以走到哪儿都是同一幅底。

   这一件补的就是那件事：每落一句话，先从这句话里把「它在讲什么」
   读出来，交给场。场据此把对应的那一层推上去、把别的压下去。
   于是讲「环」的时候环形显出来，讲「缝」的时候那道缝自己走到近前。

   读法很土，也很牢：一张表，十四个条目，每条几个字眼，
   落在这一句里就算一票，票多的那条胜。
   没有随机数，也没有模型——同一句话永远给同一个提示。
   这就是「背景与文字对上」的全部机制，一点花巧都没有。

   字眼是跟着《残像》这一版的文本重挑的：
   木讲年轮与生长，金讲棱与形状，土讲层与规矩，
   水讲潮与全息，火讲焰与烧，终章讲几何与结晶。
   像「看」「走」「面」这种哪儿都有的，一概不收。 */
window.UA = window.UA || {};
(function (UA) {
  'use strict';

  var TABLE = [
    { id: 'ring',  words: ['环', '圈', '绕', '年轮', '圆心'] },
    { id: 'line',  words: ['线', '沿', '横', '一道', '齐'] },
    { id: 'beam',  words: ['轴', '竖', '光柱', '柱'] },
    { id: 'tower', words: ['塔', '楼', '墙', '架', '骨架'] },
    { id: 'fall',  words: ['雨', '落', '坠', '掉', '叶'] },
    { id: 'crack', words: ['缝', '裂', '岔', '断', '乱码', '碎'] },
    { id: 'gaze',  words: ['眼', '盯', '望', '目光'] },
    { id: 'grid',  words: ['格', '点', '网', '阵', '几何', '菱形'] },
    { id: 'void',  words: ['空', '散', '灭', '虚', '井'] },
    { id: 'flood', words: ['水', '潮', '漫', '淹', '海'] },
    { id: 'glyph', words: ['名', '字', '写', '刻', '账', '记'] },
    { id: 'path',  words: ['路', '步', '径'] },
    { id: 'band',  words: ['带', '幕', '一层层', '层'] },
    { id: 'count', words: ['数', '量', '算', '称', '读数'] }
  ];

  /* 九个声音各有一个默认提示：什么都没读出来的时候，按说话的人来定。
     场说话时不给默认；引渡者偏「字」（她一直在写）；
     残响（青梧）偏「梁」；计量者（水）偏「数」；土偏「带」（一层层的规矩）；
     火偏「环」（他烧起来是个环）；摹形者（棱）偏「格」。 */
  var BY_VOICE = { n: '', v: 'glyph', y: 'path', sys: 'grid', h: 'beam', g: 'count', m: 'ring', e: 'band', f: 'ring' };

  var LAST = { id: '', k: 0, at: 0 };

  function read(text, voice) {
    var s = String(text || '');
    if (!s) {
      var d = BY_VOICE[voice] || '';
      return { id: d, k: d ? .34 : 0 };
    }
    var best = '', bestN = 0, i, j, n;
    for (i = 0; i < TABLE.length; i++) {
      n = 0;
      for (j = 0; j < TABLE[i].words.length; j++) {
        if (s.indexOf(TABLE[i].words[j]) >= 0) n++;
      }
      if (n > bestN) { bestN = n; best = TABLE[i].id; }
    }
    if (!best) {
      best = BY_VOICE[voice] || '';
      bestN = best ? 1 : 0;
    }
    var k = Math.min(1, bestN / 3);
    return { id: best, k: k };
  }

  UA.cue = {
    TABLE: TABLE, BY_VOICE: BY_VOICE,
    read: read,
    ids: function () { return TABLE.map(function (t) { return t.id; }); },
    get last() { return LAST; },
    probe: function (text, voice) {
      var r = read(text, voice);
      LAST = { id: r.id, k: r.k, at: Date.now() };
      return r;
    }
  };
})(window.UA);
