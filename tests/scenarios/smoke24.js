const SERVER = require('../lib/server');
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const dir = __dirname + '/shots';
const SEED = require('path').join(__dirname, '..', 'fixtures', 'seed.json');
const W = +(process.env.W || 375), SCHEME = process.env.SCHEME || 'dark';
(async () => {
  const srv = SERVER.start('8789', process.env.SITE);
  await new Promise(r => setTimeout(r, 1000));
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8')); seed.workouts.forEach(w => { delete w.demo; });
  const newest = Math.max(...seed.workouts.map(w => w.start)), d0 = new Date(); d0.setHours(18, 0, 0, 0); const sh = d0.getTime() - 2 * 864e5 - newest; seed.workouts.forEach(w => { w.start += sh; w.end += sh; });
  const errs = [], b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: 812 }, colorScheme: SCHEME, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load/.test(m.text())) errs.push(m.text()); });
  const tap = async sel => { const el = await p.$(sel); if (!el) { errs.push('NO ' + sel); return; } await el.click(); await p.waitForTimeout(350); };
  const esc = async () => { for (let i = 0; i < 5; i++) if (await p.$('#sheet-root .sheet')) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
  const shot = async n => { await p.waitForTimeout(400); await p.screenshot({ path: `${dir}/24-${SCHEME}-${W}-${n}.png` }); };
  const info = () => p.evaluate(() => ({ lvl: document.querySelector('.hero .lvl') && document.querySelector('.hero .lvl').innerText.replace(/\s+/g, ' '), chests: document.querySelector('.chestbtn b') && document.querySelector('.chestbtn b').textContent, gift: !!document.querySelector('.giftbtn'), title: document.querySelector('#sheet-title') && document.querySelector('#sheet-title').textContent }));
  try {
    await p.goto('http://127.0.0.1:8789/?debug=1'); await p.evaluate(() => localStorage.setItem('podhod-dbg-shift', '0'));
    await p.evaluate(async seed => {
      const db = await new Promise(res => { const r = indexedDB.open('podhod', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); });
      const put = (k, v) => new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; });
      await put('meta', { profiles: [{ id: 'main', name: 'Дима', color: 'lime', char: 'cat' }], cur: 'main', theme: 'auto', mode: 'solo', v2seen: true, v22seen: true, v23seen: true, chatSeen: Date.now() });
      await put('p:main', { profile: seed.profile, workouts: seed.workouts, active: null });
    }, seed);
    await p.reload(); await p.waitForTimeout(1500);
    console.log('first sheet:', (await info()).title); await shot('01-news');
    await esc(); console.log('home:', JSON.stringify(await info())); await shot('02-home');
    await tap('.tab[data-v="hero"]'); await tap('.giftbtn'); console.log('after gift:', JSON.stringify(await info()));
    await tap('.tab[data-v="hero"]'); await tap('.ch-btn.mate'); await p.waitForTimeout(600);
    console.log('wardrobe:', await p.$eval('.wstat b', e => e.textContent), '| slot chips:', await p.$$eval('.slots .chip', e => e.map(x => x.textContent).join(', ')));
    await shot('03-ward'); await tap('[data-act="shop"]'); await shot('04-shop');
    console.log('shop sections:', await p.$$eval('.sheet .sblock > b', e => e.map(x => x.textContent).join(' | ')));
    await esc();
    await tap('.hero .lvl'); await p.waitForTimeout(500); await shot('05-awards');
    await p.evaluate(() => { const r = document.querySelector('.ranks'); r && r.scrollIntoView(); }); await shot('06-ladder'); await esc();
    // push towards the next rank with debug workouts (one per day)
    let rank = null;
    for (let i = 0; i < 40 && !rank; i++) {
      await tap('.tab[data-v="today"]'); await tap('[data-act="dbgDay"][data-d="1"]'); await tap('[data-act="dbgWorkout"]'); await p.waitForTimeout(2600);
      const t = await p.evaluate(() => [...document.querySelectorAll('#sheet-title')].map(e => e.textContent).join('|'));
      if (/./.test(t) && await p.$('.rank-hero')) { rank = t; break; }
      await esc(); await tap('.tab[data-v="today"]');
    }
    console.log('rank-up after debug workouts:', rank);
    if (rank) { await shot('07-rankup'); await tap('[data-act="chestOpenFor"]'); await tap('.sheet-foot .btn-primary'); await p.waitForTimeout(1700); await shot('08-rankchest'); await esc(); }
    await tap('[data-act="dbgDay"][data-d="0"]');
    console.log('end:', JSON.stringify(await info()));
  } catch (e) { errs.push('TEST ' + e.message); }
  console.log('ERRORS', JSON.stringify(errs, null, 1));
  await b.close(); srv.kill();
})();
