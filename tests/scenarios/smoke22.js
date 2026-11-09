// smoke test for 2.2: an existing 2.1 user opens the new version
const SERVER = require('../lib/server');
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const dir = __dirname + '/shots';
fs.mkdirSync(dir, { recursive: true });
const SEED = require('path').join(__dirname, '..', 'fixtures', 'seed.json');
const W = +(process.env.W || 375), SCHEME = process.env.SCHEME || 'dark', LAG = +(process.env.LAG || 4);
(async () => {
  const srv = SERVER.start('8791', process.env.SITE);
  await new Promise(r => setTimeout(r, 1000));
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  seed.workouts.forEach(w => { delete w.demo; }); (seed.profile.body || []).forEach(b => { delete b.demo; }); delete seed.profile.demo;
  const newest = Math.max(...seed.workouts.map(w => w.start));
  const d = new Date(); d.setHours(18, 0, 0, 0); const target = d.getTime() - LAG * 864e5;
  const shift = target - newest; seed.workouts.forEach(w => { w.start += shift; w.end += shift; });
  const errs = [];
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: 812 }, deviceScaleFactor: 1, colorScheme: SCHEME, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const shot = async (n, full) => { await p.waitForTimeout(450); await p.screenshot({ path: `${dir}/${SCHEME}-${W}-${n}.png`, fullPage: !!full }); };
  const tap = async sel => { const el = await p.$(sel); if (!el) { errs.push('NO ELEMENT ' + sel); return false; } await el.click(); await p.waitForTimeout(350); return true; };
  try {
    await p.goto('http://127.0.0.1:8791/?debug=' + (process.env.DBG || '0'));
    await p.evaluate(async seed => {
      const db = await new Promise(res => { const r = indexedDB.open('podhod', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); });
      const put = (k, v) => new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; });
      await put('meta', { profiles: [{ id: 'main', name: 'Дима', color: 'lime', char: 'cat' }], cur: 'main', theme: 'auto', v2seen: true, chatSeen: Date.now() });
      await put('p:main', { profile: seed.profile, workouts: seed.workouts, active: null });
    }, seed);
    await p.reload(); await p.waitForTimeout(1500);
    await shot('01-news');
    const info = await p.evaluate(() => ({ title: document.querySelector('#sheet-title') && document.querySelector('#sheet-title').textContent }));
    console.log('sheet:', info.title);
    await tap('.sheet-foot .btn-primary'); // open chests
    await shot('02-chest-closed');
    await tap('.sheet-foot .btn-primary'); await p.waitForTimeout(1700);
    await shot('03-chest-open');
    // open the remaining starters
    for (let i = 0; i < 4; i++) { const nx = await p.$('.sheet-foot [data-act="chestOpenNext"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(400); await tap('.sheet-foot .btn-primary'); await p.waitForTimeout(1700); }
    await shot('04-chest-last');
    await tap('.sheet-foot [data-act="chestWear"]');
    for (let i = 0; i < 3; i++) if (await p.$('.sheet')) { await p.keyboard.press('Escape'); await p.waitForTimeout(350); }
    await shot('05-today', true);
    await tap('.tab[data-v="hero"]'); await tap('.ch-btn.mate'); await p.waitForTimeout(700);
    await shot('06-wardrobe');
    const own = await p.$$('.tiles .tile:not(.lock)');
    if (own[1]) { await own[1].click(); await p.waitForTimeout(400); }
    await shot('07-wardrobe-wear');
    await tap('[data-act="shop"]'); await shot('08-shop');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    // supplements tab
    await tap('.tab[data-v="more"]'); await tap('.more-row[data-v="supp"]'); await shot('09-supp-empty', true);
    await tap('[data-act="supQuick"][data-i="0"]'); await shot('10-supp-edit');
    await p.fill('#sup-stock', '300'); await tap('[data-act="supSave"]');
    await tap('[data-act="supNew"]'); await p.fill('#sup-name', 'Витамин D'); await p.fill('#sup-dose', '2000'); await tap('[data-act="supSet"][data-f="unit"][data-v="МЕ"]'); await tap('[data-act="supDayT"][data-v="1"]'); await tap('[data-act="supDayT"][data-v="3"]'); await tap('[data-act="supDayT"][data-v="5"]'); await tap('[data-act="supSave"]');
    await tap('[data-act="supNew"]'); await p.fill('#sup-name', 'Омега-3'); await p.fill('#sup-dose', '2'); await tap('[data-act="supSet"][data-f="unit"][data-v="капс."]'); await tap('[data-act="supSet"][data-f="when"][data-v="day"]'); await tap('[data-act="supCourseT"]'); await shot('11-supp-course'); await tap('[data-act="supSave"]');
    await shot('12-supp-list', true);
    const checks = await p.$$('.sup-check[data-act="supTake"]'); for (const c of checks) { await c.click(); await p.waitForTimeout(250); }
    await shot('13-supp-done', true);
    await tap('[data-act="supOrder"]'); await shot('14-supp-order', true); await tap('[data-act="supOrder"]');
    await tap('.tab[data-v="today"]'); await shot('15-today-supp', true);
    // settings: freeze
    await tap('[data-act="settings"]'); const fz = await p.$('[data-act="freezeOn"]'); if (fz) { await fz.scrollIntoViewIfNeeded(); } await shot('16-settings');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await tap('.tab[data-v="hero"]'); await tap('[data-act="awards"]'); await shot('17-awards'); await p.keyboard.press('Escape');
    const st = await p.evaluate(() => { const r = {}; return r; });
  } catch (e) { errs.push('TEST ERROR ' + e.message); }
  console.log('ERRORS', JSON.stringify(errs, null, 1));
  await b.close(); srv.kill();
})();
