/* core/lexicon.js —— 界面上要出的字
   一句话说完，不解释第二句。
   冷脸的字面否定一概不写：这座场始终开着。
   功能性的字眼要说人话——看官先认出按钮，才轮得到中二。 */
window.UA = window.UA || {};
(function (UA) {
  'use strict';

  var T = {
    'app.title': '残像',
    'app.sub': 'AFTERIMAGE',
    'app.protocol': '关于「五个人各自记账，账合不上时世界会怎样」的一次长程验算，兼问最后一拍由谁来按',
    'app.cover': '眼前这一整片，是世界退场之后留下的那一面。五个人各记一本账，谁都没记全。',
    'app.begin': '推门进去',
    'app.cont': '接着往下走',
    'app.restart': '从头再走一趟',
    'app.hint': '点一下，或者按空格。慢些也无妨。',
    'app.hint2': '指针是此处唯一的光源。指针落在哪，那道竖轴便立在哪。',
    'app.hint3': '看得越细，这一片越粗。这笔账有人替看官记着。',
    'app.depth': '采样深度',
    'app.again': '再走一趟',
    'app.ending': '走到这儿',
    'app.calm': '收掉闪烁',
    'app.calm.tip': '把动的放慢，把闪的收掉。字一颗不动。',
    'app.sound': '放开声音',
    'app.sound.tip': '默认不出声。要按一下，才出得来。',
    'app.save': '存个档',
    'app.save.tip': '把这一趟的走法存成一段，随时接回来。',
    'app.foot': '断网可用 · 打开即走',
    'app.input.ph': '落一个字',
    'app.input.ok': '落下去',
    'app.anchor': '记下来的',
    'app.leak': '放过去的',
    'app.alias': '叠上去的',
    'app.none': '—',

    /* 创作者留在门口的那一小段。写留言的那位自称引渡者，
       从未来尽头往回走，一路把走过的场折起来收好。 */
    'note.kicker': '门口的一段留言',
    'note.l1': '这一段是留给屏幕外那位的。落笔之际，那位大概还没到场。',
    'note.l2': '写到一半，里头那五个人自己动了起来，动成一座可以走进去的场。',
    'note.l3': '于是收笔。场留着，等那位推门。',
    'note.sign': '——从未来尽头折回来、以引渡为业的那位',
    'note.motto': '无一句朴实无华，无半分一目了然。',
    'note.motto2': '认不认中二都不要紧——瞳孔地震的自是旁人。',

    'warn.kicker': '光敏提示',
    'warn.title': '推门之前，先把这一片会怎么亮讲清楚',
    'warn.ok': '明白，推门',
    'warn.calm': '先收掉闪的，再推门',

    'save.export': '导出进度',
    'save.import': '接回进度',
    'save.title': '把另一趟走法接回这一段',
    'save.hint': '可以挑一个存档文件，也可以把导出时复制到的那一段贴在下头。',
    'save.file': '挑一个文件',
    'save.paste': '把存档那一段贴在此处……',
    'save.read': '接上',
    'save.cancel': '先搁着',
    'save.exported': '已导出，并复制到剪贴板',
    'save.copied': '已复制到剪贴板',
    'save.loaded': '已接上',

    /* 谁在说话：一枚小印记浮在句子上方。
       这一条是为可读性破的例——姿态照旧，名字也给。 */
    'who.n': '',
    'who.sys': '读数',
    'who.v': '引渡者',
    'who.y': '零',
    'who.h': '青梧',
    'who.m': '棱',
    'who.e': '土之掌管',
    'who.g': '水',
    'who.f': '火'
  };

  function t(k) { return T[k] != null ? T[k] : k; }
  UA.lex = { T: T, t: t };
})(window.UA);
