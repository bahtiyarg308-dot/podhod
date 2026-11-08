// builds index.html from src/ in the order of src/order.json:  node tools/build.js   (add --check to only compare)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..'), src = path.join(root, 'src');
const out = JSON.parse(fs.readFileSync(path.join(src, 'order.json'), 'utf8')).map(f => fs.readFileSync(path.join(src, f), 'utf8')).join('');
const target = path.join(root, 'index.html'), cur = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
const h = t => crypto.createHash('sha256').update(t).digest('hex').slice(0, 12);
if (process.argv.includes('--check')) { if (out !== cur) { console.error(`index.html is out of date with src/ (built ${h(out)}, file ${h(cur)}). Run: node tools/build.js`); process.exit(1); } console.log('index.html matches src/', h(out)); }
else { fs.writeFileSync(target, out); console.log('built index.html', out.length, 'bytes', h(out)); }
