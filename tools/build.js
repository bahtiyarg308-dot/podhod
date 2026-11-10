// builds the site from src/ in the order of src/order.json:  node tools/build.js   (add --check to only compare)
//   index.html — head, styles, body and a <script src="app.js?v=HASH"> (so the browser can keep the compiled code between launches)
//   app.js     — all js/*.js modules in one file
//   sw.js      — only its «APP_JS» line is rewritten to the same versioned address
//   worker/index.html — the setup page for the AI worker (instructions + the code of worker/podhod-ai.js with a copy button)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..'), src = path.join(root, 'src');
const parts = JSON.parse(fs.readFileSync(path.join(src, 'order.json'), 'utf8')).map(f => ({ f, t: fs.readFileSync(path.join(src, f), 'utf8') }));
const isJs = p => p.f.startsWith('js/'), first = parts.findIndex(isJs), last = parts.length - 1 - [...parts].reverse().findIndex(isJs);
if (parts.slice(first, last + 1).some(p => !isJs(p))) { console.error('js/ files must be one block in order.json'); process.exit(1); }
const join = a => a.map(p => p.t).join(''), before = join(parts.slice(0, first)), js = join(parts.slice(first, last + 1)), after = join(parts.slice(last + 1));
const OPEN = '<script>', CLOSE = '</script>';
if (!before.endsWith(OPEN) || !after.startsWith(CLOSE)) { console.error('body.html must end with <script> and tail.html must start with </script>'); process.exit(1); }
const h = t => crypto.createHash('sha256').update(t).digest('hex').slice(0, 12), hash = h(js).slice(0, 10), appUrl = `app.js?v=${hash}`;
// if the script file did not load at all, say so instead of showing an empty page (app.js sets window.__podhod first thing)
const guard = `<script>window.__podhod||document.body.insertAdjacentHTML('beforeend','<p style="padding:28px 20px;font:16px/1.5 system-ui,sans-serif;color:#999">Не удалось загрузить приложение. Проверьте интернет и обновите страницу.</p>')</script>\n`;
const html = before.slice(0, -OPEN.length) + `<script src="${appUrl}"></script>\n` + guard + after.slice(CLOSE.length);
const swPath = path.join(root, 'sw.js'), swOld = fs.readFileSync(swPath, 'utf8'), swLine = /const APP_JS = '[^']*';/;
if (!swLine.test(swOld)) { console.error("sw.js must contain: const APP_JS = './app.js?v=…';"); process.exit(1); }
const sw = swOld.replace(swLine, `const APP_JS = './${appUrl}';`);
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const workerPage = fs.readFileSync(path.join(__dirname, 'worker-page.html'), 'utf8').replace('{{CODE}}', () => esc(fs.readFileSync(path.join(root, 'worker', 'podhod-ai.js'), 'utf8')));
const files = [['index.html', html], ['app.js', js], ['sw.js', sw], ['worker/index.html', workerPage]];
const cur = f => { const p = path.join(root, f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; };
if (process.argv.includes('--check')) {
  const bad = files.filter(([f, t]) => t !== cur(f)).map(([f]) => f);
  if (bad.length) { console.error(`${bad.join(', ')} out of date with src/. Run: node tools/build.js`); process.exit(1); }
  console.log('index.html, app.js, sw.js and worker/index.html match src/', hash);
} else {
  files.forEach(([f, t]) => fs.writeFileSync(path.join(root, f), t));
  console.log('built index.html', html.length, '+ app.js', js.length, 'bytes', hash);
}
