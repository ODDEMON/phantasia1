/* 一次性工具：从 world/acts/*.js 与 endings.js 抽取全部待译字符串。
   用法：node extract_strings.mjs
   输出 world/i18n/_corpus.json —— [{ zh, kind, n }]，kind 标出上下文。 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const ROOT = process.cwd();
const actsDir = path.join(ROOT, 'world', 'acts');

const files = [];
for (let i = 0; i <= 14; i++) files.push(path.join(actsDir, 'act' + String(i).padStart(2, '0') + '.js'));
files.push(path.join(actsDir, 'endings.js'));

// 桩：最小 window
const sandbox = { window: {}, console };
sandbox.window = sandbox; // window.UA = window.UA || {} 需要 window 自指
vm.createContext(sandbox);
sandbox.UA = {};
sandbox.window.UA = sandbox.UA;

for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
}

const UA = sandbox.UA;
const flow = [];
(UA.acts || []).forEach((a) => { for (const b of a) flow.push(b); });
const endings = UA.endings || [];

const map = new Map(); // zh -> { kind:Set, n }
function add(zh, kind) {
  if (zh == null) return;
  const s = String(zh);
  if (!s.trim()) return;
  if (!map.has(s)) map.set(s, { kind: new Set(), n: 0 });
  map.get(s).kind.add(kind);
  map.get(s).n += 1;
}

for (const b of flow) {
  if (b.s && b.t) add(b.t, 'line');
  if (b.title) { add(b.title.n, 'title.n'); add(b.title.t, 'title.t'); add(b.title.sub, 'title.sub'); add(b.title.mood, 'title.mood'); }
  if (b.part) { add(b.part.n, 'part.n'); add(b.part.t, 'part.t'); add(b.part.sub, 'part.sub'); add(b.part.mood, 'part.mood'); }
  if (b.chapter) { add(b.chapter.n, 'chapter.n'); add(b.chapter.t, 'chapter.t'); add(b.chapter.sub, 'chapter.sub'); add(b.chapter.mood, 'chapter.mood'); add(b.chapter.tail, 'chapter.tail'); }
  if (b.choice) for (const o of b.choice) {
    add(o.t, 'choice');
    (o.reply || []).forEach((r) => { if (r.t) add(r.t, 'choice.reply'); });
  }
}
for (const e of endings) {
  add(e.name, 'ending.name');
  add(e.sub, 'ending.sub');
  for (const l of e.lines) if (l.t) add(l.t, 'ending.line');
}

const corpus = [];
for (const [zh, v] of map) corpus.push({ zh, kind: Array.from(v.kind).join(','), n: v.n });
corpus.sort((a, b) => b.n - a.n);

const out = path.join(ROOT, 'world', 'i18n', '_corpus.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(corpus, null, 2), 'utf8');

const charCount = corpus.reduce((s, c) => s + c.zh.length, 0);
console.log('唯一字符串数：', corpus.length);
console.log('中文总字数：', charCount);
console.log('已写出：', out);
console.log('---- 按出现频次排序的前 60 条 ----');
corpus.slice(0, 60).forEach((c, i) => console.log((i + 1) + '. [' + c.n + '][' + c.kind + '] ' + c.zh));
