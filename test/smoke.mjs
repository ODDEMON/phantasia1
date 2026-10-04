/* ==========================================================================
   test/smoke.mjs —— jsdom 无头冒烟
   --------------------------------------------------------------------------
   守住几条一动就崩的不变式：
     · 十八个量程的 ramp 都是 256×3，且两两底色分得开
     · 工具：确定式散列、极坐标、弧线；提示表读得出句子在讲什么
     · 分级：位深越低，色带切得越粗（这是这个引擎里唯一一处量化）
     · 剧本的每一次引用都真实存在，每条选择都有后续
     · 六个收束的判据合起来兜住所有走法，兜底的只有一个，且排在最后
     · 整趟能从封面走到终幕；六个结局每一个都到得了
     · 场是一叠矢量图层，页面上没有一块 canvas；换一处景就真换一张画
     · 句子说什么，场就往哪儿偏（提示）；光标、排印、逐字落地都还在
     · 语气守卫：拒绝感的词为零；界面与选项里的字面否定为零
   用法：node test/smoke.mjs [core|script|flow|tone|read|all]
   ========================================================================== */
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

function loadJsdom() {
  const tries = ['jsdom', path.resolve(ROOT, 'node_modules', 'jsdom'),
    'E:/__SOMETHING_REAL__/AI_Work/personal1/node_modules/jsdom',
    'D:/__SOMETHING_REAL__/AI_Work/personal/node_modules/jsdom'];
  for (const p of tries) { try { return require(p); } catch (e) { /* 换下一处 */ } }
  throw new Error('找不到 jsdom：先 npm i -D jsdom，或把 NODE_PATH 指到已装的那一份');
}
const { JSDOM, VirtualConsole } = loadJsdom();

let pass = 0, fail = 0;
const fails = [], runtimeErrors = [];
function ok(c, l) { if (c) { pass++; return; } fail++; fails.push(l == null ? '<无标签>' : l); }
function eq(a, b, l) { ok(a === b, l + '（实际 ' + JSON.stringify(a) + '）'); }
function section(n) { process.stdout.write('\n  ' + n + '\n'); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeConsole() {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => {
    const m = String((e && e.message) || e);
    if (/Not implemented/.test(m)) return;
    if (m.indexOf('SecurityError') >= 0) return;
    fail++; runtimeErrors.push('运行时错误：' + m.slice(0, 180));
  });
  vc.on('error', () => { });
  return vc;
}

/* jsdom 给不出 2D 上下文。给一块真的能记事的玻璃：
   场往里写的每一个像素都会被留下来，测试直接读它。
   这不是像素级回归——它只回答一个问题：这一帧到底画出了东西没有。 */
function fakeCtx(window) {
  const g = {
    canvas: { width: 1280, height: 720 },
    imageSmoothingEnabled: true,
    createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
    putImageData(img) { window.__lastImage = img; window.__frames = (window.__frames || 0) + 1; },
    clearRect() { }, drawImage() { }, setTransform() { }, save() { }, restore() { },
    fillRect() { }, beginPath() { }, arc() { }, fill() { }, stroke() { },
    moveTo() { }, lineTo() { }, closePath() { }, fillText() { },
    createRadialGradient() { return { addColorStop() { } }; },
    createLinearGradient() { return { addColorStop() { } }; },
    measureText() { return { width: 10 }; }
  };
  return g;
}

async function open(wantCanvas) {
  const dom = await JSDOM.fromFile(path.join(ROOT, 'index.html'), {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    virtualConsole: makeConsole(),
    beforeParse(window) {
      window.UA_FAST = true;
      window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
      window.AudioContext = undefined;
      window.devicePixelRatio = 1;
      if (wantCanvas) {
        const g = fakeCtx(window);
        window.HTMLCanvasElement.prototype.getContext = () => g;
      }
    }
  });
  await sleep(340);
  return dom;
}

/* ============ 1. 结构与查表 ============ */
async function testCore() {
  section('结构与工具');
  const dom = await open();
  const w = dom.window, UA = w.UA;

  ok(!!UA, 'UA 命名空间存在');
  ok(!!(UA.util && UA.palette && UA.cue && UA.field && UA.lex && UA.bus && UA.audio && UA.script && UA.app), 'core 九件套已挂载');
  ok(!UA.lut, '旧的查表件已经撤了（那是逐像素那一版的干粮）');

  eq(UA.palette.WORLDS.length, 18, '十八个量程');
  ['imaging', 'convolve'].forEach((k) => ok(UA.palette.has(k), '第二大章的量程 ' + k + ' 在册'));
  UA.palette.WORLDS.forEach((p) => {
    ok(p.ramp && p.ramp.length === 768, '量程 ' + p.id + ' 的 ramp 是 256×3');
    ok(p.stops.length >= 4, '量程 ' + p.id + ' 至少四段');
    ok(!!p.mood, '量程 ' + p.id + ' 有一句心情');
  });
  /* 单调不是问题，两个量程长得一样才是 */
  const sig = new Set();
  UA.palette.WORLDS.forEach((p) => sig.add(p.ramp[400] + ',' + p.ramp[401] + ',' + p.ramp[402]));
  eq(sig.size, 18, '十八个量程的中段颜色两两不同');

  /* 工具：确定式散列 / 极坐标 / 弧线。构图全靠它们，所以先钉住 */
  eq(UA.util.hash(7), UA.util.hash(7), '散列同入同出');
  ok(UA.util.hash(1) !== UA.util.hash(2), '不同的序号给不同的数');
  let inRange = true;
  for (let i = 0; i < 300; i++) { const v = UA.util.hash(i * 31 + 3); if (!(v >= 0 && v < 1)) inRange = false; }
  ok(inRange, '散列落在 0..1 里');
  const pg = UA.util.polar(100, 100, 50, 0);
  ok(Math.abs(pg[0] - 150) < 1e-6 && Math.abs(pg[1] - 100) < 1e-6, '极坐标从角度给回坐标');
  ok(UA.util.arcPath(0, 0, 10, 0, Math.PI).indexOf('A10 10') >= 0, '弧线路径写得出来');
  eq(UA.util.clamp(9, 0, 1), 1, '夹得住');

  /* 提示：一句一个。这一条是「背景与文字对上」的全部依据 */
  ok(UA.cue.ids().length >= 14, '提示至少十四条（实际 ' + UA.cue.ids().length + '）');
  eq(UA.cue.read('一圈一圈地绕').id, 'ring', '讲环的句子读到环');
  eq(UA.cue.read('那道缝裂开了').id, 'crack', '讲缝的句子读到缝');
  eq(UA.cue.read('雨一直落').id, 'fall', '讲雨的句子读到雨');
  eq(UA.cue.read('那座塔立着').id, 'tower', '讲塔的句子读到塔');
  eq(UA.cue.read('', 'm').id, 'ring', '什么都没读出来时，摩尔纹默认环');
  eq(UA.cue.read('', 'sys').id, 'grid', '场说话时默认格');
  eq(UA.cue.read('问一句寻常话').id, '', '一句寻常话不硬套提示');

  /* 分级：位深越低，色带切得越粗。这是新引擎里唯一一处量化 */
  eq(UA.palette.levels(8), 0, '八位不切色带（交给渐变自己插）');
  eq(UA.palette.levels(1), 2, '一位只剩两条色带');
  ok(UA.palette.bands('interval', 3).length > UA.palette.bands('interval', 1).length,
    '三位比一位分得多');
  ok(UA.palette.bands('interval', 4, 0, 120).length === 8, '四位的色带是八条 stop（四级各一对）');
  ok(/^#[0-9a-f]{6}$/.test(UA.palette.rgbAt(UA.palette.get().ramp, 128)), '取色给回一个色值');

  /* 母题 */
  const ms = Object.keys(UA.field.MOTIFS);
  ['well', 'sash', 'gantry', 'arcs', 'chapel', 'bone'].forEach((k) => ok(!!UA.field.MOTIFS[k], '母题 ' + k + ' 在册'));
  /* 六种自成一族的画法：它们不走点阵那一支 */
  const FAM = ['rain', 'city', 'sunset', 'noise', 'watch', 'chute'];
  const FAMILY = { rain: 'rain', city: 'poles', sunset: 'orb', noise: 'grain', watch: 'rings', chute: 'chute' };
  FAM.forEach((k) => {
    ok(!!UA.field.MOTIFS[k], '自成族群 ' + k + ' 在册');
    eq(UA.field.MOTIFS[k].fam, FAMILY[k], k + ' 走的是自己那一支画法');
  });
  ok(ms.length >= 27, '母题至少二十七个（实际 ' + ms.length + '）');
  const fams = new Set();
  ms.forEach((k) => {
    const m = UA.field.MOTIFS[k];
    ok(typeof m.fam === 'string' && m.fam.length > 0, '母题 ' + k + ' 有画法');
    ok(typeof m.hz === 'number' && m.hz > 0 && m.hz <= 1.2, '母题 ' + k + ' 的地平线在范围里');
    fams.add(m.fam);
  });
  ok(fams.size >= 8, '画法至少八种（实际 ' + fams.size + '：' + Array.from(fams).join('/') + '）');

  /* 换量程会把颜色铺到 CSS 上 */
  UA.palette.set('clip');
  const acc = w.document.documentElement.style.getPropertyValue('--acc');
  ok(/^#[0-9a-f]{6}$/.test(acc), '换量程之后 CSS 拿到一个色值（' + acc + '）');
  ok(w.document.body.getAttribute('data-world') === 'clip', '身体上挂着当前量程');
  UA.palette.set('interval');

  dom.window.close();
}

/* ============ 2. 剧本 ============ */
async function testScript() {
  section('剧本');
  const dom = await open();
  const UA = dom.window.UA;

  const bad = UA.script.validate();
  ok(bad.length === 0, '剧本自检通过' + (bad.length ? '：' + bad.join(' / ') : ''));

  const f = UA.script.flow();
  ok(f.length >= 200, '拍数够走一段（' + f.length + ' 拍）');
  const n = UA.script.count();
  process.stdout.write('    当前正文 ' + n + ' 字 · ' + f.length + ' 拍 · 十五卷 · 三大章\n');
  ok(n >= 6000, '这一批的正文够长（' + n + ' 字）');

  let choices = 0, inputs = 0, titles = 0;
  f.forEach((b) => {
    if (b.choice) { choices++; ok(b.choice.length >= 2, '选择至少两条'); }
    if (b.input) inputs++;
    if (b.title) titles++;
    if (b.s) ok(['n', 'y', 'm', 'sys', 'h', 'g', 'e', 'f', 'v'].indexOf(b.s) >= 0, '声音 ' + b.s + ' 在册');
  });
  ok(choices >= 8, '至少八次选择（' + choices + '）');
  ok(titles >= 2, '至少两张卷首卡（' + titles + '）');
  ok(inputs + choices > 0, '剧本里有可以动手的地方');

  /* 篇：上篇 / 中篇 / 下篇。三个，顺序固定，都落在第一大章里面。 */
  const parts = f.filter((b) => b.part);
  eq(parts.length, 3, '三个篇（上篇 / 中篇 / 下篇）');
  eq(parts.map((b) => b.part.id).join('>'), 'upper>middle>lower', '三个篇的顺序是对的');
  parts.forEach((b) => {
    ok(!!b.part.t && !!b.part.sub && !!b.part.mood, '篇 ' + b.part.id + ' 有名有副题有心情');
    ok(!!UA.palette.byId(b.part.world), '篇 ' + b.part.id + ' 引用的量程存在');
    ok(!!UA.field.MOTIFS[b.part.shot], '篇 ' + b.part.id + ' 引用的母题存在');
  });

  /* 章：三大章对应原案的三个结局。这一档换的是记账方式，不是布景，所以更要守。 */
  const chaps = f.filter((b) => b.chapter);
  eq(chaps.length, 3, '三个大章');
  eq(chaps.map((b) => b.chapter.id).join('>'), 'fivehold>branch>crystal', '三个大章的顺序是对的');
  chaps.forEach((b) => {
    const c = b.chapter;
    ok(!!c.n && !!c.t && !!c.sub && !!c.mood && !!c.tail, '大章 ' + c.id + ' 编号 / 名 / 副题 / 心情 / 落款都在');
    ok(!!UA.palette.byId(c.world), '大章 ' + c.id + ' 引用的量程存在');
    ok(!!UA.field.MOTIFS[c.shot], '大章 ' + c.id + ' 引用的母题存在');
  });
  /* 章要把篇整个包住：第一大章必须排在第一个篇之前 */
  const ci = f.indexOf(chaps[0]), ui = f.indexOf(parts[0]);
  ok(ci >= 0 && ci < ui, '第一大章排在第一个篇之前');
  /* 第二大章必须落在第一卷之后——它不是开场白 */
  const ti = f.findIndex((b) => b.title && b.title.n === '卷十三');
  ok(ti > 0 && f.indexOf(chaps[1]) < ti, '第二大章落在卷十三之前');
  ok(ti > 0 && f.indexOf(chaps[2]) < ti, '第三大章就压在卷十三头上');

  /* 演出：种类得够多。整趟就那几下，看着就贫。 */
  const fxKinds = {};
  f.forEach((b) => { if (b.fx) b.fx.forEach((x) => { fxKinds[x[0]] = 1; }); });
  const fxN = Object.keys(fxKinds).length;
  ok(fxN >= 12, '演出种类够多（' + fxN + ' 种：' + Object.keys(fxKinds).join('/') + '）');
  /* 演出频率：光有种类不够，中间那一大段不能是静止的底。
     环境演出每 3 句一次，这里按句数估一个下限。 */
  const spoken = f.filter((b) => b.s && b.t).length;
  ok(spoken >= 200, '正文句数够多（' + spoken + ' 句）');

  /* 表里躺着不用的东西就是死重。每一个母题都得至少被引用过一次。 */
  const used = {};
  f.forEach((b) => {
    if (b.shot) used[b.shot[0]] = 1;
    if (b.choice) b.choice.forEach((o) => { if (o.shot) used[o.shot[0]] = 1; });
  });
  UA.script.endings().forEach((x) => { used[x.shot] = 1; });
  const dead = Object.keys(UA.field.MOTIFS).filter((k) => !used[k]);
  eq(dead.length, 0, '每一个母题都被用过（没被用的：' + dead.join('/') + '）');

  const e = UA.script.endings();
  eq(e.length, 6, '六个结局');
  let fallback = 0;
  e.forEach((x) => {
    if (x.when({ cai: 99, lou: 99, die: 99 }) && x.when({ cai: -9, lou: -9, die: -9 })) fallback++;
  });
  eq(fallback, 1, '兜底的结局只有一个');
  ok(e[e.length - 1].when({ cai: -9, lou: -9, die: -9 }), '兜底的那个排在最后');

  dom.window.close();
}

/* ============ 3. 整趟 ============ */
async function walk(dom) {
  const w = dom.window, doc = w.document, app = w.UA.app;
  app.start(true);
  let g = 0, picks = 0;
  while (g++ < 60000) {
    if (doc.querySelector('.cover.end')) return { ok: true, g, picks };
    if (app.busy) { await sleep(5); continue; }
    const inp = doc.getElementById('w');
    if (inp) { inp.value = '残留'; const b = doc.getElementById('wok'); if (b) { b.click(); await sleep(5); continue; } }
    const cb = doc.querySelector('#slot .cbtn');
    if (cb) { picks++; cb.click(); await sleep(5); continue; }
    if (doc.getElementById('scene')) { app.advance(); await sleep(1); continue; }
    return { ok: false, why: '停在第 ' + g + ' 步' };
  }
  return { ok: false, why: '走不完' };
}

async function testFlow() {
  section('整趟');
  const dom = await open();
  const w = dom.window, doc = w.document;

  ok(!!doc.querySelector('.warn'), '一进来先停在光敏提示上');
  doc.getElementById('wOk').click();
  ok(!!doc.querySelector('.cover'), '点过之后停在封面');
  ok(doc.querySelector('.cover-title').textContent.indexOf('残像') >= 0, '封面写着名');
  ok(!!doc.getElementById('bDump') && !!doc.getElementById('bLoad'), '封面上有导出与导入');

  const r = await walk(dom);
  ok(r.ok, '整趟走到了终幕' + (r.ok ? '' : '：' + r.why));
  ok(r.picks >= 8, '路上真的做过选择（' + r.picks + '）');
  ok(w.UA.bus.state.word === '残留', '写下的那个词被记住了');

  /* 六个结局每一个都到得了 */
  const cases = [
    { id: 'wood',  f: { cai: 5, lou: 1, die: 2 } },
    { id: 'metal', f: { cai: 2, lou: 1, die: 5 } },
    { id: 'earth', f: { cai: 1, lou: 5, die: 2 } },
    { id: 'water', f: { cai: 3, lou: 1, die: 3 } },
    { id: 'fire',  f: { cai: 2, lou: 2, die: 2 } },
    { id: 'light', f: { cai: 0, lou: 0, die: 0 } }
  ];
  for (const c of cases) {
    const s = w.UA.bus.state;
    s.cai = c.f.cai; s.lou = c.f.lou; s.die = c.f.die;
    s.i = w.UA.script.flow().length - 1;
    const prev = doc.querySelector('.cover.end');
    if (prev) prev.remove();
    w.UA.app.ending();
    await sleep(70);
    let g = 0;
    while (g++ < 3000 && !doc.querySelector('.cover.end')) {
      if (w.UA.app.busy) { await sleep(4); continue; }
      const cb = doc.querySelector('#slot .cbtn');
      if (cb) { cb.click(); await sleep(3); continue; }
      w.UA.app.advance(); await sleep(1);
    }
    ok(doc.querySelector('.cover.end'), '结局「' + c.id + '」到了');
    ok(!!s.seen[c.id], '结局「' + c.id + '」记进了卷');
  }

  /* 静一点：字一个不改 */
  doc.getElementById('btnCalm').click();
  ok(doc.body.classList.contains('calm'), '静一点开着');
  w.UA.bus.setPref('calm', false);
  doc.body.classList.remove('calm');

  dom.window.close();
}

/* ============ 4. 语气 ============ */
async function testTone() {
  section('语气');
  const dom = await open();
  const UA = dom.window.UA;
  const HARD = ['不公开', '不告诉你', '不关你事', '与你无关', '漠不关心', '你自己试', '不解释', '别问'];
  const LIT = ['没有', '无法', '不能', '不可能', '不必', '不许', '不得', '不准', '未曾', '无须', '无所谓', '并不'];
  function hard(t, where) {
    const h = HARD.filter((x) => String(t).indexOf(x) >= 0);
    ok(h.length === 0, where + ' 出现拒绝感的词：' + h.join('/'));
  }
  function lit(t, where) {
    hard(t, where);
    const h = LIT.filter((x) => String(t).indexOf(x) >= 0);
    ok(h.length === 0, where + ' 出现字面否定：' + h.join('/'));
  }

  for (const k in UA.lex.T) lit(UA.lex.T[k], '文案 ' + k);

  let prose = 0;
  const per = {}; let ci = 0;
  UA.script.flow().forEach((b, i) => {
    if (b.title) { ci++; per[ci] = 0; lit(b.title.t, '卷名' + i); lit(b.title.sub, '卷副题' + i); }
    if (b.choice) b.choice.forEach((o, j) => {
      lit(o.t, '拍 ' + i + ' 选项' + j);
      (o.reply || []).forEach((r, k) => { if (r.t) hard(r.t, '拍 ' + i + ' 后续' + j + '.' + k); });
    });
    if (b.s && b.t) {
      hard(b.t, '拍 ' + i);
      const m = String(b.t).match(/(?<!还)没有/g);
      if (m) { prose += m.length; per[ci] = (per[ci] || 0) + m.length; }
    }
  });
  UA.script.endings().forEach((e) => e.lines.forEach((l, i) => {
    if (l.t) { hard(l.t, '结局 ' + e.id + '[' + i + ']'); const m = String(l.t).match(/(?<!还)没有/g); if (m) prose += m.length; }
  }));
  /* 上限跟着卷数走：密度才是要守的东西，总量不是 */
  const cap = 6 * Object.keys(per).length;
  ok(prose <= cap, '叙述里的「没有」压在缺席这一层（' + prose + ' 处，上限 ' + cap + '）');
  Object.keys(per).forEach((k) => ok(per[k] <= 5, '第 ' + k + ' 卷的「没有」至多五处（实际 ' + per[k] + '）'));
  process.stdout.write('    各卷「没有」计数：' + Object.keys(per).map((k) => per[k]).join(' / ') + '\n');

  /* 不要露出原材料本身的信息 */
  const LEAK = ['里视界', '里世界', '麦克', '你的手凉了', '不会再被按', '操控者', 'glowith', 'glowithered', 'singular ghost', '元回响', '意识共同体', '刺球', '终极主义', '四值', '警戒性文字术', 'ODDEMON', 'oddemon'];
  const all = JSON.stringify(UA.script.flow()) + JSON.stringify(UA.script.endings());
  LEAK.forEach((x) => ok(all.indexOf(x) < 0, '剧本里没有露出「' + x + '」'));

  dom.window.close();
}

/* ============ 5. 可读与离线 ============ */
async function testRead() {
  section('可读与离线');
  const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(css.indexOf('@import') < 0, '样式里没有外链字体');
  ok(!/src\s*=\s*["']https?:/.test(html), '页面不引远程脚本');
  ok(/var\(--serif\)/.test(css), '正文字体走变量');
  ok(/Noto Serif SC|Songti SC|SimSun/.test(css), '正文有衬线字体栈');
  ok(/clamp\(/.test(css), '字号跟着窗口走');
  ok(/body\.calm/.test(css), '静一点在样式里有落点');
  ok(css.indexOf('#scene') >= 0, '矢量场的样式在');
  ok(css.indexOf('.ly-fine') >= 0, '细节层（只在指针那圈显形）在');
  ok(/#cv\s*\{/.test(css) === false, 'canvas 那一套样式已经撤掉');
  ok(/vector-effect/.test(css), '矢量线按不缩放的笔宽画');

  const dom = await open();
  const doc = dom.window.document;
  const st = dom.window.getComputedStyle(doc.body);
  ok(parseFloat(st.fontSize || '16') >= 14, '基础字号不低于 14px');
  dom.window.close();
}

/* ============ 6. 存档与光敏 ============ */
async function testSave() {
  section('存档与光敏');
  const dom = await open();
  const w = dom.window, doc = w.document, UA = w.UA;

  /* 光敏门：第一次进来先看见它 */
  ok(!!doc.querySelector('.warn'), '第一次进来先停在光敏提示上');
  ok(!!doc.getElementById('wCalm') && !!doc.getElementById('wOk'), '两个出口都在');
  const wtxt = doc.querySelector('.warn').textContent;
  ['过冲', '色散', '翻转', '光晕', '收掉闪烁'].forEach((k) => ok(wtxt.indexOf(k) >= 0, '提示里讲了「' + k + '」'));
  ok(!doc.querySelector('.cover'), '提示还在的时候，封面压在后面');

  doc.getElementById('wCalm').click();
  ok(UA.bus.state.prefs.calm === true, '走「先开静」会真的把静打开');
  ok(UA.bus.state.prefs.warned === true, '看过就被记住了');
  ok(!!doc.querySelector('.cover'), '点完之后到了封面');
  /* 封面得贴着创作者那段留言 */
  ok(!!doc.querySelector('.cover .note'), '封面贴着引渡者的留言');
  ok((doc.querySelector('.cover .note') || {}).textContent.indexOf('引渡') >= 0, '留言里自称引渡者');
  ok((doc.querySelector('.cover .note') || {}).textContent.indexOf('朴实无华') >= 0, '留言里带着创作口号');

  /* 静一点：演出白名单 */
  UA.bus.setPref('calm', true);
  const before = UA.field.bits;
  UA.app.start(true);
  await sleep(60);
  ok(!!doc.querySelector('.cover') || !!doc.getElementById('scene'), '静模式下照样进得去');
  UA.bus.setPref('calm', false);
  doc.body.classList.remove('calm');

  /* 存档：出去一趟，再回来 */
  const s = UA.bus.state;
  s.i = 733; s.cai = 5; s.lou = 2; s.die = 4;
  s.bits = 3; s.word = '残留'; s.world = 'moire'; s.motif = 'ring';
  const raw = UA.bus.dump();
  ok(raw.indexOf('AFTERIMAGE') >= 0, '导出的一段里带着记号');
  const b64 = UA.bus.encode();
  ok(b64.length > 40 && b64.charAt(0) !== '{', '导出的另一份是 base64');

  /* 先把状态搅乱，再读回来 */
  UA.bus.wipe();
  eq(UA.bus.state.i, 0, '先把进度清掉');
  const r1 = UA.bus.restore(b64);
  ok(r1.ok, 'base64 那一段能读回来');
  eq(UA.bus.state.i, 733, '进度读回来了');
  eq(UA.bus.state.cai, 5, '采读回来了');
  eq(UA.bus.state.die, 4, '叠读回来了');
  eq(UA.bus.state.word, '残留', '写下的那个词也回来了');
  eq(UA.bus.state.bits, 3, '采样深度也回来了');

  UA.bus.wipe();
  ok(UA.bus.restore(raw).ok, '原样的 JSON 也认');
  eq(UA.bus.state.lou, 2, '两次读入结果一致');

  /* 认得出来但不是存档的，要退回去 */
  ok(!UA.bus.restore('这不是一段存档').ok, '乱写的一段会被退回去');
  ok(!UA.bus.restore('{"hello":1}').ok, '结构不对的一段会被退回去');
  ok(!UA.bus.restore('').ok, '空的一段会被退回去');

  /* 手改过的数会被钳回来 */
  const bad = JSON.stringify({ sig: 'ALIASING', v: 1, s: { i: -5, bits: 99, cai: 9999, world: '不存在', motif: '也不存在' } });
  ok(UA.bus.restore(bad).ok, '钳一下之后仍然读得进');
  eq(UA.bus.state.bits, 8, '深度被钳到八');
  eq(UA.bus.state.i, 0, '负数进度被钳到零');
  eq(UA.bus.state.world, 'interval', '认不出来的量程退回第一个');
  eq(UA.bus.state.motif, 'verge', '认不出来的母题退回第一个');

  /* 导出会真的产出一段东西 */
  const out = UA.app.exportSave();
  ok(typeof out === 'string' && out.length > 60, '导出接口给出一段可写下去的东西');

  dom.window.close();
}

/* ============ 7. 矢量场：画出来了，而且换一处就换一张 ============ */
async function testRender() {
  section('矢量场');
  const dom = await open(true);
  const w = dom.window, doc = w.document, UA = w.UA;

  ok(typeof UA.field.mount === 'function', '场可以挂上');
  UA.app.start(true);
  /* 压着走几拍，让几处景都真的长出来 */
  for (let i = 0; i < 260; i++) {
    if (UA.app.busy) { await sleep(4); continue; }
    const cb = doc.querySelector('#slot .cbtn');
    if (cb) { cb.click(); await sleep(4); continue; }
    const inp = doc.getElementById('w');
    if (inp) { inp.value = '残留'; doc.getElementById('wok').click(); await sleep(4); continue; }
    if (doc.getElementById('scene')) { UA.app.advance(); await sleep(2); continue; }
    break;
  }
  await sleep(120);

  const sc = doc.getElementById('scene');
  ok(!!sc, '场挂在页面上');
  ok(!doc.getElementById('cv') && !doc.querySelector('canvas'),
    '页面上不再有 canvas：不再逐像素算');

  /* 五层景：每一层得是一张真的矢量图 */
  ['sky', 'far', 'mid', 'near', 'fine'].forEach((k) => {
    const el = sc.querySelector('.ly-' + k);
    ok(!!el, '图层 ly-' + k + ' 在');
    if (el) ok(el.tagName.toLowerCase() === 'svg', 'ly-' + k + ' 是一张矢量图');
  });
  /* 五层特效 */
  ['haze', 'grain', 'scan', 'vig', 'fx'].forEach((k) =>
    ok(!!sc.querySelector('.ly-' + k), '特效层 ly-' + k + ' 在'));
  ok(sc.querySelectorAll('.ly-fx i').length === 14, '演出层十四件都在（' + sc.querySelectorAll('.ly-fx i').length + '）');

  /* 画出来的东西得有内容 */
  ['sky', 'mid'].forEach((k) => {
    const el = sc.querySelector('.ly-' + k);
    const n = el ? el.innerHTML.length : 0;
    ok(n > 400, 'ly-' + k + ' 里有东西（' + n + ' 字节）');
  });
  ok(!!sc.querySelector('.ly-near .axisWrap'), '光轴压在近景上（它跟着指针走，不被任何东西盖住）');
  ok(!!sc.querySelector('.ly-sky linearGradient'), '天幕是一条渐变，不是一片死色');

  /* 换一处景：整幅画的指纹真的变了。
     这是这一版最要紧的一条——先前十几处景画的其实是同一张。 */
  const fp = () => {
    const q = (k) => { const e = sc.querySelector('.ly-' + k); return e ? (e.innerHTML || '') : ''; };
    const t = q('sky') + q('far') + q('mid') + q('near');
    let g = 2166136261;
    for (let i = 0; i < t.length; i += 3) { g ^= t.charCodeAt(i); g = (g * 16777619) >>> 0; }
    return g;
  };
  const ids = Object.keys(UA.field.MOTIFS);
  const prints = new Set();
  ids.forEach((id) => { UA.field.setMotif(id, 0); prints.add(fp()); });
  ok(prints.size >= 18, ids.length + ' 处景画出 ' + prints.size + ' 张不同的画');

  /* 换了抖开序号也要变：同一处景走两趟不该一模一样 */
  UA.field.setMotif('verge', 0);
  const j0 = fp();
  UA.field.setMotif('verge', 7);
  ok(fp() !== j0, '同一处景换个抖开序号，画也跟着变');

  /* ---- 看一次掉一级。掉的是色带与细节条数，不是抖出来的噪 ---- */
  UA.field.setMotif('verge', 3);
  UA.field.setBits(8);
  eq(doc.documentElement.style.getPropertyValue('--lvl'), '0', '八位不切色带');
  const grid8 = (() => { const g = sc.querySelector('.ly-mid .grid'); return g ? (g.getAttribute('d') || '').length : 0; })();
  ok(grid8 > 100, '地面的线真的画了出来（' + grid8 + ' 字节）');

  UA.field.setBits(3);
  eq(doc.documentElement.style.getPropertyValue('--lvl'), '3', '三位把色带切成三块');
  eq(sc.getAttribute('data-bits'), '3', '身上挂着当前位深');
  const grid3 = (() => { const g = sc.querySelector('.ly-mid .grid'); return g ? (g.getAttribute('d') || '').length : 0; })();
  ok(grid3 < grid8, '掉位之后地面的线也少了几条（' + grid8 + ' → ' + grid3 + '）');

  UA.field.setBits(1);
  eq(doc.documentElement.style.getPropertyValue('--lvl'), '2', '一位只剩两条色带');
  ok(parseFloat(doc.documentElement.style.getPropertyValue('--q')) > .8, '粗到什么地步也挂上了（--q）');

  /* 点一下掉一位，掉到底就停住 */
  UA.field.setBits(8);
  const b0 = UA.field.bits;
  UA.field.click(.5, .6);
  ok(UA.field.bits === b0 - 1, '点一下掉一位（' + b0 + ' → ' + UA.field.bits + '）');
  UA.field.setBits(8);
  UA.field.click(.2, .2);
  UA.field.click(.8, .8);
  ok(UA.field.bits === 6, '连点两次掉两位');
  UA.field.setBits(1);
  UA.field.click(.5, .5);
  ok(UA.field.bits === 1, '一位是底，掉到底就停住');

  /* 不看它的时候，位深自己长回来一点 */
  UA.field.setBits(2);
  await sleep(700);
  ok(UA.field.bits > 2, '不看它的时候，位深自己长回来（2 → ' + UA.field.bits + '）');

  /* ---- 提示：句子说什么，景就往哪儿偏 ---- */
  UA.field.setCue ? null : null;
  UA.field.setBits(8);
  UA.field.setMotif('verge', 0);
  const before = fp();
  UA.app.setCue('一圈一圈地绕', 'n');
  eq(sc.getAttribute('data-cue'), 'ring', '讲环的那句让场切到环');
  ok(fp() !== before, '提示一换，画也跟着换');
  const afterRing = fp();
  UA.app.setCue('那道缝裂开了', 'n');
  eq(sc.getAttribute('data-cue'), 'crack', '讲缝的那句让场切到缝');
  ok(fp() !== afterRing, '换个提示，画又换了一版');
  UA.app.setCue('', 'n');
  eq(sc.getAttribute('data-cue'), '', '寻常一句不硬套提示');

  /* 中央悬浮：文字不落框，只以姿态浮在正中 */
  ok(!!doc.getElementById('now'), '中央悬浮的容器在（#now）');
  ok(doc.querySelectorAll('#now .ln').length >= 1, '正文浮在正中');
  const anyLn = doc.querySelector('#now .ln');
  ok(!!anyLn && anyLn.style.getPropertyValue('--tl').length > 0, '每一行有自己的倾角');
  ok(!!anyLn && anyLn.style.getPropertyValue('--ink').length > 0, '每一行有自己的墨色');
  ok(doc.querySelectorAll('#now .ln.box').length === 0, '对话框已经撤掉（不落框）');
  ok(!!doc.querySelector('#now .ln .lb'), '浮出的那一行裹着一层壳');
  const narr = doc.querySelectorAll('#now .ln.n, #now .ln.y, #now .ln.v, #now .ln.h, #now .ln.m, #now .ln.e, #now .ln.g, #now .ln.f');
  ok(narr.length >= 1, '叙述那句也以同等姿态浮出');

  /* 光标：它得是一盏灯，不是一条线 */
  const ring = doc.getElementById('ring');
  ok(!!ring, '光标在');
  ok(!!ring.querySelector('.core'), '光标有内核');
  ok(!!ring.querySelector('.halo'), '光标有光晕');
  ok(!!ring.querySelector('.r1') && !!ring.querySelector('.r2'), '光标有两圈');
  ok(ring.querySelectorAll('.k').length === 4, '光标挂着四芒刻');
  ok(ring.querySelectorAll('i').length === 8, '光标的部件一件不少');

  /* 指针：它在哪，光轴就在哪。场只往外写两个数 */
  UA.field.moveTo(1200, 300);
  await sleep(90);
  const px = parseFloat(doc.documentElement.style.getPropertyValue('--px'));
  ok(px > .5, '指针挪到右边，--px 跟着过中线（' + px + '）');
  ok(doc.documentElement.style.getPropertyValue('--win').length > 0, '采样窗的半径也写了出去');
  ok(doc.documentElement.style.getPropertyValue('--idle').length > 0, '闲置的读数也写了出去');

  /* 排印档：换量程时，字距 · 字重 · 行高一起换 */
  const root = doc.documentElement;
  ok(root.style.getPropertyValue('--ls').length > 0, '字距挂上根元素（' + root.style.getPropertyValue('--ls') + '）');
  ok(root.style.getPropertyValue('--wt').length > 0, '字重挂上根元素');
  ok(root.style.getPropertyValue('--lh').length > 0, '行高挂上根元素');
  const ls0 = root.style.getPropertyValue('--ls');
  const wt0 = root.style.getPropertyValue('--wt');
  UA.app.setWorld('silence');
  ok(root.style.getPropertyValue('--ls') !== ls0 || root.style.getPropertyValue('--wt') !== wt0,
    '换一档，排印真的跟着换（' + ls0 + ' → ' + root.style.getPropertyValue('--ls') + '）');
  /* 换量程时，场的色也得跟着换——色是从当前量程的 ramp 上现采的 */
  const skyBefore = sc.querySelector('.ly-sky').innerHTML;
  UA.app.setWorld('clip');
  ok(sc.querySelector('.ly-sky').innerHTML !== skyBefore, '换量程，天幕的色真的重采过一遍');
  UA.app.setWorld('interval');

  /* 逐行微差：每一行有自己的倾角 */
  const l1 = doc.querySelector('#now .ln');
  ok(!!l1 && !!l1.style.getPropertyValue('--tl'), '每一行有自己的倾角');

  /* 逐字切分：短句切，长句不切 */
  const probe = doc.createElement('span');
  probe.className = 'txt';
  probe.textContent = '此段已获名';
  UA.app.glyphize(probe, '此段已获名');
  ok(probe.querySelectorAll('.ch').length === 5, '短句按字数摊成单字');
  ok(!!probe.querySelector('.ch').style.getPropertyValue('--dy'), '单字有自己的高低');
  ok(!!probe.querySelector('.lb'), '摊出来的字装在一个壳里');
  ok(!!probe.querySelector('.caret'), '末尾挂着一枚记号');
  const longOne = doc.createElement('span');
  longOne.className = 'txt';
  const longText = '这一段故意写得很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长';
  ok(longText.length > 60, '这一句确实超了六十字');
  UA.app.glyphize(longOne, longText);
  ok(longOne.querySelector('.ch') === null, '超长句不摊（逐字元素一多，滚字会拖）');
  ok(!!longOne.querySelector('.caret'), '不摊的那一句也挂着记号');
  const doneLn = doc.querySelector('#now .ln.done');
  ok(!!doneLn, '落完的句子挂上了 done');

  /* 静一点：形留着，动的那部分熄掉 */
  UA.field.setStill(1);
  eq(sc.getAttribute('data-still'), '1', '静一点给场挂了记号');
  UA.field.setStill(0);
  eq(sc.getAttribute('data-still'), '0', '关掉之后记号也撤了');

  dom.window.close();
}


/* ============ 9. 老实话 ============ */
async function testPlain() {
  section('老实话');
  const dom = await open();
  const UA = dom.window.UA;

  /* 这一版不立禁用词表。
     上一版的「死敌词 / 白话残渣」清单是机械替换的产物，它只会把语言勒死——
     写出来的句子看着干净，读起来没有人味。这里改守一件真正要紧的事：
     正文得说人话——每一卷都得有具体的、能看见的东西落地，不许通篇抽象。 */
  const text = JSON.stringify(UA.script.flow()) + JSON.stringify(UA.script.endings());
  const CONCRETE = ['年轮', '棱柱', '台阶', '井', '海', '火', '骨架', '结晶', '牌子', '精灵'];
  const seen = CONCRETE.filter((w) => text.split(w).length > 1);
  ok(seen.length >= 6, '正文里落着具体的东西（' + seen.length + ' 种：' + seen.join('/') + '）');

  /* 功能性的字眼得说人话：不许再是单字 */
  ['app.calm', 'app.sound', 'app.save', 'app.begin', 'app.cont', 'app.again'].forEach((k) => {
    const v = UA.lex.T[k];
    ok(typeof v === 'string' && v.replace(/[·\s]/g, '').length >= 2, '功能键「' + k + '」不是单字（' + v + '）');
  });

  /* 创作者那一段留言得在，而且得自称引渡者 */
  ok(UA.lex.T['note.sign'].indexOf('引渡') >= 0, '门口的留言署着引渡者');
  ok(UA.lex.T['note.motto'].indexOf('朴实无华') >= 0, '创作口号留在门口');

  dom.window.close();
}

/* ============ 8. 多语本地化 ============ */
async function testI18n() {
  section('多语本地化');
  const dom = await open();
  const UA = dom.window.UA;
  const doc = dom.window.document;

  ok(!!UA.i18n, 'i18n 层已挂载');
  ok(UA.i18n.LANGS.indexOf('zh') >= 0 && UA.i18n.LANGS.indexOf('en') >= 0 &&
    UA.i18n.LANGS.indexOf('ja') >= 0 && UA.i18n.LANGS.indexOf('ru') >= 0, '四种语言在册（中/英/日/俄）');

  const flow = UA.script.flow();
  const endings = UA.script.endings();
  const allZh = [];
  flow.forEach((b) => {
    if (b.s && b.t) allZh.push(b.t);
    if (b.title) { allZh.push(b.title.t); allZh.push(b.title.sub); }
    if (b.part) { allZh.push(b.part.t); allZh.push(b.part.sub); allZh.push(b.part.mood); }
    if (b.chapter) { allZh.push(b.chapter.t); allZh.push(b.chapter.sub); allZh.push(b.chapter.mood); allZh.push(b.chapter.tail); }
    if (b.choice) b.choice.forEach((o) => { allZh.push(o.t); (o.reply || []).forEach((r) => { if (r.t) allZh.push(r.t); }); });
  });
  endings.forEach((e) => { allZh.push(e.name); allZh.push(e.sub); e.lines.forEach((l) => { if (l.t) allZh.push(l.t); }); });
  process.stdout.write('    故事文案唯一键 ' + allZh.length + ' 条\n');

  for (const lang of ['en', 'ja', 'ru']) {
    const m = UA.i18n.maps[lang];
    ok(m && typeof m === 'object', lang + ' 译文表已注册');
    const miss = allZh.filter((z) => m[z] == null || String(m[z]).trim() === '');
    ok(miss.length === 0, lang + ' 覆盖全部故事文案（缺 ' + miss.length + '）' + (miss.length ? '：' + miss.slice(0, 5).join(' / ') : ''));
  }

  /* 旧设定泄漏词绝不能进译文 */
  const LEAK2 = ['里视界', '里世界', '麦克', '操控者', 'glowith', 'glowithered',
    'singular ghost', 'ODDEMON', 'oddemon', '元回响', '意识共同体', '刺球', '终极主义', '四值', '警戒性文字术'];
  let leakHit = 0;
  for (const lang of ['en', 'ja', 'ru']) {
    const m = UA.i18n.maps[lang];
    for (const k in m) { const v = String(m[k]); for (const w of LEAK2) if (v.indexOf(w) >= 0) leakHit++; }
  }
  ok(leakHit === 0, '译文里不出现旧设定泄漏词');

  /* 界面译文表与中文键一致（who.n 故意为空，仅校验键存在） */
  const tk = Object.keys(UA.lex.T);
  for (const lang of ['en', 'ja', 'ru']) {
    const M = UA.lex.M[lang];
    const miss = tk.filter((k) => M[k] == null);
    ok(miss.length === 0, '界面 ' + lang + ' 覆盖全部键（缺 ' + miss.length + '）' + (miss.length ? '：' + miss.join('/') : ''));
  }

  /* 切语言要真生效：渲染一句英文，文本应等于译文且不等于中文 */
  UA.i18n.setLang('en');
  ok(doc.documentElement.lang === 'en', 'html lang 切到 en');
  UA.app.start(true);
  let g = 0, shown = '', zh = '';
  while (g++ < 3000) {
    if (UA.app.busy) { await sleep(4); continue; }
    const inp = doc.getElementById('w');
    if (inp) { inp.value = '残留'; doc.getElementById('wok').click(); await sleep(4); continue; }
    const cb = doc.querySelector('#slot .cbtn');
    if (cb) { cb.click(); await sleep(4); continue; }
    const ln = doc.querySelector('#now .ln.done');
    if (ln && ln.textContent && ln.textContent.trim()) {
      shown = ln.textContent.trim();
      const b = flow[UA.bus.state.i];
      zh = b && b.t;
      if (zh) break;
    }
    await sleep(4);
  }
  ok(!!zh, '走到了一句正文');
  ok(shown && shown !== zh, '英文渲染文本不等于中文原文');
  ok(shown === UA.i18n.get(zh), '渲染文本等于 en 译文（' + JSON.stringify(shown) + '）');

  /* 切回中文，文本应回到中文 */
  UA.i18n.setLang('zh');
  await sleep(30);
  const zhShown = ((doc.querySelector('#now .ln.done') || {}).textContent || '').trim();
  ok(zhShown === zh, '切回中文后文本回到中文');

  dom.window.close();
}

/* ============ 跑 ============ */
const only = process.argv[2] || 'all';
const run = { core: testCore, script: testScript, save: testSave, flow: testFlow, render: testRender, tone: testTone, plain: testPlain, read: testRead, i18n: testI18n };
const jobs = only === 'all' ? Object.keys(run) : [only];

process.stdout.write('\n残像 · 无头冒烟\n');
for (const j of jobs) {
  if (!run[j]) { process.stdout.write('  跳过未知分组 ' + j + '\n'); continue; }
  await run[j]();
}
if (runtimeErrors.length) {
  process.stdout.write('\n  运行时错误：\n');
  runtimeErrors.slice(0, 10).forEach((e) => process.stdout.write('    · ' + e + '\n'));
}
process.stdout.write('\n  通过 ' + pass + ' · 失败 ' + fail + '\n');
if (fails.length) {
  process.stdout.write('\n  失败清单：\n');
  fails.slice(0, 40).forEach((f) => process.stdout.write('    · ' + f + '\n'));
}
process.exit(fail ? 1 : 0);
