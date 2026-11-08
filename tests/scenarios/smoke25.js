const SERVER = require('../lib/server');
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const dir = __dirname + '/shots';
const SEED = require('path').join(__dirname, '..', 'fixtures', 'seed.json');
const W = +(process.env.W || 375), SCHEME = process.env.SCHEME || 'dark';
(async () => {
  const srv = SERVER.start('8788', process.env.SITE);
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
  try {
    await p.goto('http://127.0.0.1:8788/?debug=1'); await p.evaluate(() => localStorage.setItem('podhod-dbg-shift', '0'));
    await p.evaluate(async seed => {
      const db = await new Promise(res => { const r = indexedDB.open('podhod', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); });
      const put = (k, v) => new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; });
      await put('meta', { profiles: [{ id: 'main', name: 'Дима', color: 'lime', char: 'cat' }], cur: 'main', theme: 'auto', mode: 'solo', v2seen: true, v22seen: true, v23seen: true, v24seen: true, chatSeen: Date.now() });
      await put('p:main', { profile: seed.profile, workouts: seed.workouts, active: null });
    }, seed);
    await p.reload(); await p.waitForTimeout(1500);
    console.log('news:', await p.evaluate(() => document.querySelector('#sheet-title') && document.querySelector('#sheet-title').textContent));
    await p.screenshot({ path: `${dir}/25-${SCHEME}-${W}-news.png` });
    await esc();
    console.log('today card:', await p.evaluate(() => { const r = document.querySelector('.rec-mini'); return r && r.innerText.replace(/\s+/g, ' '); }));
    await tap('.rec-mini'); await p.waitForTimeout(500);
    await p.screenshot({ path: `${dir}/25-${SCHEME}-${W}-progress.png`, fullPage: true });
    console.log('sections:', await p.$$eval('.sec-head .h2:first-child', e => e.map(x => x.textContent).join(' | ')));
    console.log('balance:', await p.evaluate(() => { const r = document.querySelector('.bal'); return r && r.innerText.replace(/\s+/g, ' ').slice(0, 300); }));
    console.log('forecast:', await p.evaluate(() => { const r = document.querySelector('.fc'); return r && r.innerText.replace(/\s+/g, ' ').slice(0, 300); }));
    await tap('[data-act="repOpen"]'); await p.waitForTimeout(500); await p.screenshot({ path: `${dir}/25-${SCHEME}-${W}-report.png` });
    await tap('[data-act="repShift"][data-d="-1"]'); console.log('prev month report:', await p.evaluate(() => document.querySelector('.rep') ? document.querySelector('.rep').innerText.replace(/\s+/g, ' ') : document.querySelector('.sheet-body').innerText.slice(0, 80)));
    await esc();
    // banner in the first days of the next month
    const days = await p.evaluate(() => { const d = new Date(Date.now()); return new Date(d.getFullYear(), d.getMonth() + 1, 2).getDate() && Math.round((new Date(d.getFullYear(), d.getMonth() + 1, 2) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5); });
    await p.evaluate(n => localStorage.setItem('podhod-dbg-shift', String(n)), days); await p.reload(); await p.waitForTimeout(1300); await esc(); await tap('.tab[data-v="today"]');
    console.log('banner on day 2:', await p.evaluate(() => { const b = [...document.querySelectorAll('.banner')].find(x => /отчёт/.test(x.textContent)); return b && b.innerText.replace(/\s+/g, ' '); }));
    await p.screenshot({ path: `${dir}/25-${SCHEME}-${W}-banner.png` });
    await tap('.banner [data-act="repOpen"]'); await p.waitForTimeout(400); await esc();
    console.log('banner after open:', !!(await p.evaluate(() => [...document.querySelectorAll('.banner')].find(x => /отчёт/.test(x.textContent)))));
    await p.evaluate(() => localStorage.setItem('podhod-dbg-shift', '0'));
  } catch (e) { errs.push('TEST ' + e.message); }
  console.log('ERRORS', JSON.stringify(errs, null, 1));
  await b.close(); srv.kill();
})();
