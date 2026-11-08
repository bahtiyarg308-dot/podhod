const SERVER = require('../lib/server');
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const dir = __dirname + '/shots';
const SEED = require('path').join(__dirname, '..', 'fixtures', 'seed.json');
const W = +(process.env.W || 375), SCHEME = process.env.SCHEME || 'dark';
(async () => {
  const srv = SERVER.start('8786', process.env.SITE);
  await new Promise(r => setTimeout(r, 1000));
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8')); seed.workouts.forEach(w => { delete w.demo; });
  const newest = Math.max(...seed.workouts.map(w => w.start)), d0 = new Date(); d0.setHours(9, 0, 0, 0); const sh = d0.getTime() - 1 * 864e5 - newest; seed.workouts.forEach(w => { w.start += sh; w.end += sh; });
  const errs = [], b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: 812 }, colorScheme: SCHEME, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load/.test(m.text())) errs.push(m.text()); });
  const tap = async sel => { const el = await p.$(sel); if (!el) { errs.push('NO ' + sel); return; } await el.click(); await p.waitForTimeout(350); };
  const esc = async () => { for (let i = 0; i < 5; i++) if (await p.$('#sheet-root .sheet')) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
  const shot = async (n, o = {}) => { await p.waitForTimeout(o.wait ?? 400); await p.screenshot({ path: `${dir}/27-${SCHEME}-${W}-${n}.png`, fullPage: !!o.full }); };
  try {
    await p.goto('http://127.0.0.1:8786/');
    await p.evaluate(async seed => {
      const db = await new Promise(res => { const r = indexedDB.open('podhod', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); });
      const put = (k, v) => new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; });
      await put('meta', { profiles: [{ id: 'main', name: 'Дима', color: 'lime', char: 'cat' }], cur: 'main', theme: 'auto', mode: 'solo', v2seen: true, v22seen: true, v23seen: true, v24seen: true, v25seen: true, v26seen: true, v27seen: true, v271seen: true, v28seen: true, chatSeen: Date.now() });
      await put('p:main', { profile: seed.profile, workouts: seed.workouts, active: null });
    }, seed);
    await p.reload(); await p.waitForTimeout(1500);
    console.log('news:', await p.evaluate(() => document.querySelector('#sheet-title') && document.querySelector('#sheet-title').textContent), '| anat uses:', await p.$$eval('#sheet-root .anat use', e => e.length));
    await shot('01-news'); await esc();
    console.log('today mini map:', await p.$$eval('.rec-mini .anat use.am', e => e.length));
    await shot('02-today');
    await tap('.rec-mini'); await p.waitForTimeout(500);
    await p.evaluate(() => { const r = document.querySelector('.rec'); r && r.scrollIntoView(); }); await shot('03-recovery');
    const mus = await p.$('.rec .anat use.am'); if (mus) { await mus.click({ force: true }); await p.waitForTimeout(300); }
    console.log('tap muscle toast:', await p.evaluate(() => document.querySelector('.toast') && document.querySelector('.toast').innerText));
    console.log('balance:', await p.evaluate(() => { const r = document.querySelector('.bal-lag'); return r && r.innerText; }));
    // picker
    await tap('.tab[data-v="today"]'); await tap('[data-act="startEmpty"]'); await tap('[data-act="addEx"]');
    const count = async () => p.$$eval('#pick-list .pick-w', e => e.length);
    console.log('all exercises in picker:', await count(), '| headers:', await p.$$eval('#pick-list .pick-h', e => e.map(x => x.textContent).join(',')));
    for (const q of ['бицуха', 'присед', 'ягодицы', 'жим лежа', 'плечи гантели', 'растяж', 'трицепс блок']) { await p.fill('#pick-q', q); await p.waitForTimeout(250); console.log(`  «${q}» →`, await count(), await p.$$eval('#pick-list .pick-name', e => e.slice(0, 3).map(x => x.textContent).join(' | '))); }
    await p.fill('#pick-q', ''); await tap('[data-act="pickE"][data-e="kettlebell"]'); console.log('kettlebell filter:', await count());
    await shot('04-picker');
    await tap('[data-act="pickE"][data-e="all"]'); await tap('#pick-list .pick-info'); await shot('05-tech');
    await esc(); await tap('[data-act="discardOpen"]'); await tap('[data-act="discardConfirm"]');
    // workout detail map
    await tap('.tab[data-v="log"]'); await tap('[data-act="openWorkout"]'); await p.evaluate(() => { const m = document.querySelector('.wmap'); m && m.scrollIntoView(); }); await shot('06-workout-map'); await esc();
    // female body
    await tap('.ph-act [data-act="settings"]'); await esc(); await tap('.ava-btn'); await tap('[data-act="setBody"][data-v="f"]'); await esc();
    await tap('.tab[data-v="progress"]'); await p.evaluate(() => { const r = document.querySelector('.rec'); r && r.scrollIntoView(); }); await shot('07-female');
  } catch (e) { errs.push('TEST ' + e.message); }
  console.log('ERRORS', JSON.stringify(errs, null, 1));
  await b.close(); srv.kill();
})();
