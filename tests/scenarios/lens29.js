// glass tab bar: press, slide across tabs, screens flip live, release settles; tap still works; screenshots while held
const SERVER = require('../lib/server');
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
const ST = __dirname, NG = process.env.SITE, SEED = require('path').join(__dirname, '..', 'fixtures', 'seed.json');
(async () => {
  const srv = SERVER.start('8898', NG); await new Promise(r => setTimeout(r, 900));
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8')); seed.workouts.forEach(w => { delete w.demo; });
  const newest = Math.max(...seed.workouts.map(w => w.start)), d0 = new Date(); d0.setHours(9, 0, 0, 0); const sh = d0.getTime() - 864e5 - newest; seed.workouts.forEach(w => { w.start += sh; w.end += sh; });
  const errs = [], out = [], b = await chromium.launch();
  for (const scheme of ['dark', 'light']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, colorScheme: scheme, isMobile: true, hasTouch: true, serviceWorkers: 'block', deviceScaleFactor: 2 }), p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8898/'); await p.waitForTimeout(1500); // let the very first launch finish before seeding
    await p.evaluate(async seed => { const db = await new Promise(res => { const r = indexedDB.open('podhod', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); }); const put = (k, v) => new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; });
      await put('meta', { profiles: [{ id: 'main', name: 'Дима', color: 'lime', char: 'owl' }], cur: 'main', mode: 'pair', v2seen: true, v22seen: true, v23seen: true, v24seen: true, v25seen: true, v26seen: true, v27seen: true, v271seen: true, v28seen: true, chatSeen: Date.now() }); await put('p:main', { profile: seed.profile, workouts: seed.workouts, active: null }); }, seed);
    await p.reload(); await p.waitForTimeout(1600);
    const bar = await (await p.$('#tabbar')).boundingBox(), n = 6, tw = (bar.width - 8) / n, cx = i => bar.x + 4 + tw * (i + .5), cy = bar.y + bar.height / 2;
    const view = () => p.evaluate(() => document.querySelector('.tab[aria-current]').dataset.v), pressed = () => p.evaluate(() => document.getElementById('tabbar').classList.contains('press'));
    const T = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: cy }] });
    // tap on a tab
    await T('touchStart', cx(1)); await T('touchEnd'); await p.waitForTimeout(500); const tap = await view();
    // press on "Журнал" (now current), slide to "Добавки", hold, screenshot, slide to "Тело", release
    await T('touchStart', cx(1)); await p.waitForTimeout(120); const down = await pressed();
    const seen = [await view()];
    for (let i = 1; i <= 12; i++) { await T('touchMove', cx(1) + (cx(3) - cx(1)) * i / 12); await p.waitForTimeout(40); } await p.waitForTimeout(450); seen.push(await view());
    const f = `${ST}/shots28/lens-${scheme}-held.png`; await p.screenshot({ path: f, clip: { x: 0, y: bar.y - 70, width: 390, height: bar.height + 90 } }); out.push(f);
    for (let i = 1; i <= 10; i++) { await T('touchMove', cx(3) + (cx(5) - cx(3)) * i / 10); await p.waitForTimeout(40); } await p.waitForTimeout(350); seen.push(await view());
    await T('touchEnd', 0); await p.waitForTimeout(700);
    const after = { view: await view(), pressed: await pressed(), ti: await p.evaluate(() => getComputedStyle(document.getElementById('tabbar')).getPropertyValue('--ti').trim()) };
    // page swipe must not fire from the bar; a normal tap on today
    await T('touchStart', cx(0)); await T('touchEnd'); await p.waitForTimeout(500);
    console.log(scheme, '| tap →', tap, '| pressed on touch:', down, '| live while sliding:', seen.join(' → '), '| after release:', JSON.stringify(after), '| tap today →', await view());
    await ctx.close();
  }
  console.log('ERRORS', JSON.stringify(errs)); await b.close(); srv.kill();
})();
