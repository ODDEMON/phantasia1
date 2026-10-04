/* 合并 + 校验 + 产出 world/i18n/{en,ja,ru}.js
   1) 读 _corpus.json（权威键集）
   2) 读各语言的 _a/_b.json，合并成 map
   3) 校验：缺键 / 空值 / 孤儿键（不在 corpus 里）/ 禁词
   4) 写出 world/i18n/<lang>.js */
import fs from 'fs';
import path from 'path';

const D = path.join(process.cwd(), 'world', 'i18n');
const corpus = JSON.parse(fs.readFileSync(path.join(D, '_corpus.json'), 'utf8'));
const corpusKeys = new Set(corpus.map((c) => c.zh));

const LEAK = ['里视界', '里世界', '麦克', '操控者', 'glowith', 'glowithered',
  'singular ghost', 'ODDEMON', 'oddemon', '元回响', '意识共同体', '刺球', '终极主义', '四值', '警戒性文字术'];

const langs = ['en', 'ja', 'ru'];
const report = {};

for (const lang of langs) {
  const a = JSON.parse(fs.readFileSync(path.join(D, lang + '_a.json'), 'utf8'));
  const b = JSON.parse(fs.readFileSync(path.join(D, lang + '_b.json'), 'utf8'));
  const arr = a.concat(b);
  const map = {};
  const orphans = [], empties = [], leak = [];
  for (const e of arr) {
    const zh = e.zh, t = e.t;
    if (!(zh in corpusKeys)) orphans.push(zh);
    if (t == null || String(t).trim() === '') empties.push(zh);
    map[zh] = t;
    const low = String(t);
    for (const w of LEAK) if (low.indexOf(w) >= 0) leak.push(zh + '  ←含「' + w + '」');
  }
  const missing = corpus.filter((c) => !(c.zh in map)).map((c) => c.zh);
  report[lang] = { total: arr.length, missing, empties, orphans: orphans.slice(0, 20), leak };

  // 写出
  const head =
    '/* world/i18n/' + lang + '.js —— 故事正文译文（键=原中文，值=' + lang + '）\n' +
    '   由 _corpus.json 经翻译产出；切换语言时 core/i18n.js 按当前语言取用。\n' +
    '   中文永远是源，本文件是叠加层；缺译的条目回退中文。 */\n' +
    'window.UA = window.UA || {};\n' +
    'window.UA.i18n = window.UA.i18n || {};\n' +
    'window.UA.i18n.maps = window.UA.i18n.maps || {};\n' +
    'window.UA.i18n.maps.' + lang + ' = {\n';
  const body = corpus.map((c) => {
    const v = map[c.zh];
    const key = JSON.stringify(c.zh);
    const val = JSON.stringify(v != null ? v : c.zh);
    return '  ' + key + ': ' + val;
  }).join(',\n');
  const out = head + body + '\n};\n';
  fs.writeFileSync(path.join(D, lang + '.js'), out, 'utf8');
}

console.log('corpus 唯一键数：', corpusKeys.size);
for (const lang of langs) {
  const r = report[lang];
  console.log('\n=== ' + lang + ' ===');
  console.log('  产出条目：', r.total, ' 缺键：', r.missing.length, ' 空值：', r.empties.length, ' 孤儿键(前20)：', r.orphans.length);
  if (r.missing.length) console.log('  缺键示例：', r.missing.slice(0, 10));
  if (r.empties.length) console.log('  空值示例：', r.empties.slice(0, 10));
  if (r.orphans.length) console.log('  孤儿键：', r.orphans);
  if (r.leak.length) console.log('  禁词！', r.leak);
}
console.log('\n已写出 world/i18n/{en,ja,ru}.js');
