/* 生成 core/lexicon.js —— 在原有中文 T 之外，补齐 en/ja/ru 三套界面译文。
   运行：node gen_lexicon.mjs  （覆盖 core/lexicon.js） */
import fs from 'fs';
import path from 'path';

const ZH = {
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
  'app.idle': '不看它之际，它自行长回一点。',

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

const EN = {
  'app.title': '残像',
  'app.sub': 'AFTERIMAGE',
  'app.protocol': "A long reckoning of what becomes of the world when five keepers each tally their own ledger and the books refuse to add up — and of who it is that presses the final beat.",
  'app.cover': "All of this before you is the side the world leaves behind once it withdraws. Five keepers, five ledgers; none of them whole.",
  'app.begin': 'Push the door open',
  'app.cont': 'Go on',
  'app.restart': 'Walk it again from the start',
  'app.hint': 'Tap, or press space. There is no need to hurry.',
  'app.hint2': 'The pointer is the only light here. Where it falls, there the vertical axis stands.',
  'app.hint3': "The closer you look, the coarser this place grows. Someone keeps that tally for you.",
  'app.depth': 'Sampling depth',
  'app.again': 'Walk it once more',
  'app.ending': 'You have come this far',
  'app.calm': 'Still the flicker',
  'app.calm.tip': 'Slow what moves, take back what flickers. Not a single word shifts.',
  'app.sound': 'Let the sound out',
  'app.sound.tip': 'Silent by default. It only sounds once you press.',
  'app.save': 'Save your passage',
  'app.save.tip': 'Keep this walk as a strand; take it up again whenever you like.',
  'app.foot': 'Works offline · begins the moment you open it',
  'app.input.ph': 'Set down a word',
  'app.input.ok': 'Let it fall',
  'app.anchor': 'what you kept',
  'app.leak': 'what you let pass',
  'app.alias': 'what you stacked',
  'app.none': '—',
  'app.idle': 'When you look away, it grows back a little on its own.',

  'note.kicker': 'A note left at the threshold',
  'note.l1': 'This part is for the one beyond the screen. When it was written, that one had likely not yet arrived.',
  'note.l2': 'Halfway through, the five inside stirred on their own, and moved into a place you could walk into.',
  'note.l3': 'So the pen was set down. The place remains, waiting for that one to push the door.',
  'note.sign': "— the one who folds back from the world's end, and makes a trade of ferrying",
  'note.motto': 'Not a line plainspoken, not a fraction plainly seen.',
  'note.motto2': "Whether you own the chuunibyou or not matters little — it is the others whose pupils quake.",

  'warn.kicker': 'Light-sensitivity note',
  'warn.title': 'Before you push the door, let me say plainly how this place will light up',
  'warn.ok': "I understand — push the door",
  'warn.calm': 'Still the flicker first, then push',

  'save.export': 'Export passage',
  'save.import': 'Resume passage',
  'save.title': 'Take up another walk in this place',
  'save.hint': 'Pick a saved file, or paste the strand copied when you exported.',
  'save.file': 'Choose a file',
  'save.paste': 'Paste the saved strand here…',
  'save.read': 'Take it up',
  'save.cancel': 'Leave it for now',
  'save.exported': 'Exported, and copied to clipboard',
  'save.copied': 'Copied to clipboard',
  'save.loaded': 'Taken up',

  'who.n': '',
  'who.sys': 'Readout',
  'who.v': 'the Ferryman',
  'who.y': 'Zero',
  'who.h': 'Qingwu',
  'who.m': 'Prism',
  'who.e': 'the Earthkeeper',
  'who.g': 'the Water',
  'who.f': 'the Fire'
};

const JA = {
  'app.title': '残像',
  'app.sub': 'AFTERIMAGE',
  'app.protocol': '五人がそれぞれ帳簿をつけ、帳尻が合わなくなったとき世界がどうなるかについての、長い検算。そして最後の一拍を押すのは誰か、という問いをも兼ねる。',
  'app.cover': '目の前のこの一面は、世界が立ち去ったあとに残された、その一面だ。五人がそれぞれ帳簿をつけ、誰のも完ぺきではない。',
  'app.begin': '扉を押し開く',
  'app.cont': '続けて歩む',
  'app.restart': '最初からもう一度歩む',
  'app.hint': 'タップするか、スペースを押せ。ゆっくりでも構わない。',
  'app.hint2': '針はここでの唯一の光源だ。針が落ちた場所に、その縦軸が立つ。',
  'app.hint3': '見れば見るほど、この一面は粗くなる。その勘定は、誰かが観客の代わりに記している。',
  'app.depth': 'サンプリング深度',
  'app.again': 'もう一度歩む',
  'app.ending': 'ここまで来た',
  'app.calm': 'ちらつきを鎮める',
  'app.calm.tip': '動くものを緩め、ちらつくものを鎮める。文字は一つとして動かない。',
  'app.sound': '音を放つ',
  'app.sound.tip': '標準では無音。押して初めて鳴る。',
  'app.save': '保存する',
  'app.save.tip': 'この歩みを一節として保存し、いつでも再開できる。',
  'app.foot': 'オフラインで動く・開けば即座に歩み出す',
  'app.input.ph': '一字を落とす',
  'app.input.ok': '落とす',
  'app.anchor': '記したもの',
  'app.leak': '見過ごしたもの',
  'app.alias': '重ねたもの',
  'app.none': '—',
  'app.idle': '見ていない間に、それはひとりでに少し育ち戻る。',

  'note.kicker': '扉の際に残された留言',
  'note.l1': 'この一节は、画面の外のあの人へのものだ。書き始めた頃、あの人はまだ着いていなかったろう。',
  'note.l2': '半ばまで書いたとき、中の五人が自ら動き出し、歩き入れる場へと動いた。',
  'note.l3': 'こうして筆を置いた。場は残り、あの人が扉を押すのを待っている。',
  'note.sign': '——未来の果てから折り返し、引渡を業とするあの人',
  'note.motto': '一語も飾らずとも質朴ではなく、一片もひと目では見えぬ。',
  'note.motto2': '中二を認めようと認めまいと構わない——瞳孔を揺らすのは傍の者だ。',

  'warn.kicker': '光感受性の注意',
  'warn.title': '扉を押す前に、この一面がどう光るかをはっきり述べておく',
  'warn.ok': 'わかった、扉を押す',
  'warn.calm': 'まずちらつきを鎮めてから扉を押す',

  'save.export': '進捗を書き出す',
  'save.import': '進捗を繋ぐ',
  'save.title': '別の歩みをこの場に繋ぐ',
  'save.hint': '保存したファイルを選ぶか、書き出し時にコピーした一節を下に貼り付けよ。',
  'save.file': 'ファイルを選ぶ',
  'save.paste': '保存した一節をここに貼り付けて……',
  'save.read': '繋ぐ',
  'save.cancel': 'ひとまず置いておく',
  'save.exported': '書き出し、クリップボードにコピー済み',
  'save.copied': 'クリップボードにコピー済み',
  'save.loaded': '繋がった',

  'who.n': '',
  'who.sys': '読数',
  'who.v': '渡し手',
  'who.y': '零',
  'who.h': '青梧',
  'who.m': '棱',
  'who.e': '土の守り手',
  'who.g': '水',
  'who.f': '火'
};

const RU = {
  'app.title': '残像',
  'app.sub': 'AFTERIMAGE',
  'app.protocol': 'Долгий пересчёт того, как мир ведёт себя, когда пятеро ведут каждый свою книгу и счета не сходятся, — и кто нажмёт последний такт.',
  'app.cover': 'Всё, что перед тобой, — это сторона, что остаётся после того, как мир уходит. Пятеро, пять книг, и ни одна не полна.',
  'app.begin': 'Отвори дверь',
  'app.cont': 'Идти дальше',
  'app.restart': 'Пройти сначала',
  'app.hint': 'Нажми или пробел. Торопиться некуда.',
  'app.hint2': 'Указатель — здесь единственный свет. Где он опустится, там встанет вертикальная ось.',
  'app.hint3': 'Чем пристальнее смотришь, тем грубее становится эта грань. Этот счёт кто-то ведёт за тебя.',
  'app.depth': 'Глубина выборки',
  'app.again': 'Пройти ещё раз',
  'app.ending': 'Ты зашёл так далеко',
  'app.calm': 'Усмирить мерцание',
  'app.calm.tip': 'Замедли движущееся, уйми мерцающее. Ни один знак не сдвинется.',
  'app.sound': 'Впустить звук',
  'app.sound.tip': 'По умолчанию тишина. Звук — лишь когда нажмёшь.',
  'app.save': 'Сохранить путь',
  'app.save.tip': 'Сохрани этот путь как нить; подхватишь когда угодно.',
  'app.foot': 'Работает офлайн · начинается с открытия',
  'app.input.ph': 'Опусти иероглиф',
  'app.input.ok': 'Опустить',
  'app.anchor': 'записанное',
  'app.leak': 'пропущенное',
  'app.alias': 'наложенное',
  'app.none': '—',
  'app.idle': 'Когда не смотришь, оно само чуть отрастает.',

  'note.kicker': 'Записка у порога',
  'note.l1': 'Эта часть — для того, кто по ту сторону экрана. Когда писалось, тот, верно, ещё не пришёл.',
  'note.l2': 'На полпути пятеро внутри сами ожили и обратились в место, куда можно войти.',
  'note.l3': 'Так и положили перо. Место осталось, ждёт, когда тот откроет дверь.',
  'note.sign': '— тот, кто возвращается из конца грядущего и взял переправу за ремесло',
  'note.motto': 'Ни строки простоватой, ни доли очевидной.',
  'note.motto2': 'Признаёшь ты этот пафос или нет — неважно; зрачки сводит у других.',

  'warn.kicker': 'Замечание о светочувствительности',
  'warn.title': 'Прежде чем отворить дверь, скажу внятно, как эта грань засветится',
  'warn.ok': 'Понятно, отворяй',
  'warn.calm': 'Сначала усмири мерцание, потом отворяй',

  'save.export': 'Вывести путь',
  'save.import': 'Подхватить путь',
  'save.title': 'Подхвати другой путь в этом месте',
  'save.hint': 'Выбери файл сохранения или вставь нить, скопированную при выгрузке.',
  'save.file': 'Выбери файл',
  'save.paste': 'Вставь сохранённую нить сюда…',
  'save.read': 'Подхватить',
  'save.cancel': 'Пока отложим',
  'save.exported': 'Выгружено и скопировано в буфер',
  'save.copied': 'Скопировано в буфер',
  'save.loaded': 'Подхвачено',

  'who.n': '',
  'who.sys': 'Показания',
  'who.v': 'Перевозчик',
  'who.y': 'Ноль',
  'who.h': 'Цинъу',
  'who.m': 'Грань',
  'who.e': 'Хранитель Земли',
  'who.g': 'Вода',
  'who.f': 'Огонь'
};

const head = `/* core/lexicon.js —— 界面上要出的字
   中文 T 是源（语气守卫仍逐字校验它）；en/ja/ru 是叠加层，由 L(k) 按当前语言取用。
   一句话说完，不解释第二句。冷脸的字面否定一概不写：这座场始终开着。 */
window.UA = window.UA || {};
(function (UA) {
  'use strict';

  var T = ${JSON.stringify(ZH, null, 2)};
  var E = ${JSON.stringify(EN, null, 2)};
  var J = ${JSON.stringify(JA, null, 2)};
  var R = ${JSON.stringify(RU, null, 2)};
  var M = { en: E, ja: J, ru: R };

  function t(k) {
    var l = (UA.i18n && UA.i18n.lang) || 'zh';
    if (l === 'zh') return T[k] != null ? T[k] : k;
    var m = M[l];
    if (m && m[k] != null) return m[k];
    return T[k] != null ? T[k] : k;
  }
  UA.lex = { T: T, E: E, J: J, R: R, M: M, t: t };
})(window.UA);
`;

fs.writeFileSync(path.join(process.cwd(), 'core', 'lexicon.js'), head, 'utf8');
console.log('lexicon.js 已生成：', Object.keys(ZH).length, '个键 × 4 语言');
