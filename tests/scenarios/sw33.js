// 3.3: the real service worker with the separate app.js: first install, offline start, update to a new release, old cache removed
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const SERVER = require('../lib/server'), SITE = process.env.SITE, DIR = path.join(path.dirname(SITE), 'sw33');
(async () => {
  fs.rmSync(DIR, { recursive: true, force: true }); fs.cpSync(SITE, DIR, { recursive: true });
  const srv = SERVER.start(8834, DIR); await new Promise(r => setTimeout(r, 600));
  const errs = [], say = (...a) => console.log(...a), b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  const caches = () => p.evaluate(async () => { const ks = await caches.keys(), out = {}; for (const k of ks) out[k] = (await (await caches.open(k)).keys()).map(r => new URL(r.url).pathname + new URL(r.url).search).filter(u => /app\.js/.test(u)); return out; });
  const appUrl = () => p.evaluate(() => [...document.scripts].map(s => s.getAttribute('src')).filter(Boolean)[0]);
  await p.goto('http://127.0.0.1:8834/'); await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(1500);
  const swA = fs.readFileSync(path.join(DIR, 'sw.js'), 'utf8'), verA = (swA.match(/const VERSION = '([^']+)'/) || [])[1];
  say('1 installed. script in the page:', await appUrl(), '| caches:', JSON.stringify(await caches()), '| app started:', await p.evaluate(() => window.__podhod));
  // offline start from the cache
  await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(1500);
  say('2 offline start works:', await p.evaluate(() => window.__podhod === 1 && !!document.querySelector('#main .view, .page-head')), '| server was not needed');
  await ctx.setOffline(false);
  // a new release appears on the server
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8'), js = fs.readFileSync(path.join(DIR, 'app.js'), 'utf8'), oldUrl = (html.match(/app\.js\?v=[a-z0-9]+/) || [])[0];
  const newUrl = 'app.js?v=bbbbbbbbbb', verB = 'podhod-test-b';
  fs.writeFileSync(path.join(DIR, 'app.js'), js + "\nwindow.__B = 'release B';\n");
  fs.writeFileSync(path.join(DIR, 'index.html'), html.split(oldUrl).join(newUrl));
  fs.writeFileSync(path.join(DIR, 'sw.js'), swA.split(oldUrl).join(newUrl).replace(`'${verA}'`, `'${verB}'`));
  await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update())); await p.waitForTimeout(500);
  for (let i = 0; i < 40; i++) { if (Object.keys(await caches()).includes(verB)) break; await p.waitForTimeout(250); }
  say('3 new release downloaded in the background, the running one untouched:', JSON.stringify(Object.keys(await caches())), '| page still runs:', await p.evaluate(() => window.__B || 'release A'), '| update banner:', await p.$$eval('[data-act="applyUpdate"]', e => e.length));
  if (!(await p.evaluate(() => { const b = document.querySelector('[data-act="applyUpdate"]'); if (b) b.click(); return !!b; }))) errs.push('NO update banner'); // the first-launch welcome sheet covers the banner, so click it from the page
  for (let i = 0; i < 60 && (await p.evaluate(() => window.__B).catch(() => null)) !== 'release B'; i++) await p.waitForTimeout(250);
  await p.waitForTimeout(800);
  say('4 after «Обновить»: page runs', await p.evaluate(() => window.__B), '| script in the page:', await appUrl(), '| caches:', JSON.stringify(await caches()));
  await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(1500);
  say('5 offline again with the new release:', await p.evaluate(() => window.__B === 'release B' && window.__podhod === 1));
  console.log('ERRORS', JSON.stringify(errs)); await b.close(); srv.kill();
})();
