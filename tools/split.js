// splits index.html into src/ parts (lossless): node tools/split.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), src = path.join(root, 'src');
const s = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const cs = s.indexOf('<style>') + 7, ce = s.indexOf('</style>'), js0 = s.indexOf('<script>') + 8, je = s.lastIndexOf('</script>');
const slug = t => { const w = t.replace(/[^\x00-\x7F]/g, ' ').toLowerCase().match(/[a-z0-9]+/g) || []; return w.slice(0, 5).join('-').slice(0, 40) || 'part'; };
function parts(text, re) { // cut before every marker line; text before the first marker is the first part
  const cuts = [0]; let m; const r = new RegExp(re, 'gm'); while ((m = r.exec(text))) if (m.index > 0) cuts.push(m.index);
  return cuts.map((c, i) => { const t = text.slice(c, cuts[i + 1] ?? text.length); const mm = t.match(/^\/\*\s*[=-]{5,}\s*([^\n]*?)\s*[=-]*\s*(\*\/)?\s*$/m); return { text: t, title: mm ? mm[1] : 'start' }; });
}
fs.rmSync(src, { recursive: true, force: true }); fs.mkdirSync(path.join(src, 'css'), { recursive: true }); fs.mkdirSync(path.join(src, 'js'), { recursive: true });
const order = [], put = (rel, text) => { fs.writeFileSync(path.join(src, rel), text); order.push(rel); };
put('head.html', s.slice(0, cs));
parts(s.slice(cs, ce), '^/\\*\\s*[=-]{5,} ').forEach((p, i) => put(`css/${String(i).padStart(2, '0')}-${slug(p.title)}.css`, p.text));
put('body.html', s.slice(ce, js0));
parts(s.slice(js0, je), '^/\\* ={5,} ').forEach((p, i) => put(`js/${String(i).padStart(2, '0')}-${slug(p.title)}.js`, p.text));
put('tail.html', s.slice(je));
fs.writeFileSync(path.join(src, 'order.json'), JSON.stringify(order, null, 1) + '\n');
console.log('parts:', order.length);
