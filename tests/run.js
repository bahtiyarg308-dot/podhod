#!/usr/bin/env node
// Runs the checks:  node tests/run.js [--full] [name ...]
// Needs Playwright (npm i -D playwright). Builds a test copy of the site (sign-in gate switched off) in tests/.tmp/site.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), TMP = path.join(__dirname, '.tmp'), SITE = path.join(TMP, 'site');
const check = spawnSync('node', [path.join(ROOT, 'tools', 'build.js'), '--check'], { encoding: 'utf8' });
if (check.status) { console.error(check.stderr || check.stdout); process.exit(1); }
console.log('✓ index.html is built from src/');
fs.rmSync(SITE, { recursive: true, force: true }); fs.mkdirSync(SITE, { recursive: true });
for (const f of ['index.html', 'sw.js', 'manifest.webmanifest']) fs.copyFileSync(path.join(ROOT, f), path.join(SITE, f));
for (const d of ['icons', 'fonts']) fs.cpSync(path.join(ROOT, d), path.join(SITE, d), { recursive: true });
const gate = 'const gateOk = () => Object.values(accs()).some(verOk);';
let html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8'); if (!html.includes(gate)) { console.error('gate line not found'); process.exit(1); }
fs.writeFileSync(path.join(SITE, 'index.html'), html.replace(gate, 'const gateOk = () => true;'));
for (const d of ['shots', 'shots28', 'shots271']) fs.mkdirSync(path.join(__dirname, 'scenarios', d), { recursive: true });
const QUICK = ['smoke22', 'smoke22b', 'smoke22c', 'smoke23', 'smoke24', 'smoke25', 'smoke26', 'smoke27', 'acc29', 'lens29', 'safe30'];
const FULL = ['audit-320-dark', 'audit-375-light', 'audit-432-dark'];
const KNOWN = { smoke24: [/dbgDay/] };                              // a known quirk of that script's view, not an app error
const want = process.argv.slice(2).filter(a => !a.startsWith('--'));
const list = want.length ? want : (process.argv.includes('--full') ? QUICK.concat(FULL) : QUICK);
let bad = 0;
for (const name of list) {
  const m = name.match(/^audit-(\d+)-(dark|light)$/), file = m ? 'audit.js' : name + '.js';
  const env = Object.assign({}, process.env, { SITE, REPO: ROOT, SHOTS: '0' }, m ? { W: m[1], SCHEME: m[2] } : {});
  const t0 = Date.now(), r = spawnSync('node', [path.join(__dirname, 'scenarios', file)], { env, encoding: 'utf8', timeout: 360000 });
  const out = (r.stdout || '') + (r.stderr || ''), mm = out.match(/ERRORS (\[[\s\S]*?\])\s*$/m);
  let errs = null; try { errs = mm ? JSON.parse(mm[1]) : null; } catch (e) { errs = null; }
  const rest = errs ? errs.filter(e => !(KNOWN[name] || []).some(re => re.test(e))) : null;
  const ok = rest && rest.length === 0 && r.status === 0, sec = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`${ok ? '✓' : '✗'} ${name} (${sec}s)${m ? ' · ' + ((out.match(/ISSUES (\d+)/) || [])[0] || '') : ''}`);
  if (!ok) { bad++; console.log(rest ? '   ' + JSON.stringify(rest).slice(0, 400) : out.slice(-600)); }
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log(bad ? `\n${bad} failed` : '\nAll checks passed'); process.exit(bad ? 1 : 0);
