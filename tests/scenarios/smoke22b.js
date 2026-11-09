// 2.2 flows in debug mode: stage-up, chest after a workout, «ate», hunger, sleep, freeze, delete
const SERVER = require('../lib/server');
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const dir = __dirname + '/shots';
const SEED = require('path').join(__dirname, '..', 'fixtures', 'seed.json');
const W = +(process.env.W || 375), SCHEME = process.env.SCHEME || 'dark', N = +(process.env.N || 19), LAG = +(process.env.LAG || 5);
(async () => {
  const srv = SERVER.start('8792', process.env.SITE);
  await new Promise(r => setTimeout(r, 1000));
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  seed.workouts.forEach(w => { delete w.demo; }); (seed.profile.body || []).forEach(b => { delete b.demo; }); delete seed.profile.demo;
  seed.workouts.sort((a, b) => b.start - a.start); seed.workouts = seed.workouts.slice(0, N);
  const newest = Math.max(...seed.workouts.map(w => w.start));
  const d = new Date(); d.setHours(18, 0, 0, 0); const shift = d.getTime() - LAG * 864e5 - newest;
  seed.workouts.forEach(w => { w.start += shift; w.end += shift; });
  const errs = [];
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: 812 }, deviceScaleFactor: 1, colorScheme: SCHEME, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const shot = async (n, full, wait = 450) => { await p.waitForTimeout(wait); await p.screenshot({ path: `${dir}/b-${SCHEME}-${W}-${n}.png`, fullPage: !!full }); };
  const tap = async sel => { const el = await p.$(sel); if (!el) { errs.push('NO ELEMENT ' + sel); return false; } await el.click(); await p.waitForTimeout(350); return true; };
  const esc = async () => { for (let i = 0; i < 4; i++) if (await p.$('#sheet-root .sheet')) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
  const state = () => p.evaluate(() => { const t = document.querySelector('.sat-top b'), st = document.querySelector('.stg'), calm = document.querySelector('.calm'), cb = document.querySelector('.chestbtn b'); return { sat: t && t.textContent, stage: st && st.textContent, calm: calm && calm.textContent.slice(0, 90), chests: cb && cb.textContent, title: document.querySelector('#sheet-title') && document.querySelector('#sheet-title').textContent }; });
  try {
    await p.goto('http://127.0.0.1:8792/?debug=1');
    await p.evaluate(() => localStorage.setItem('podhod-dbg-shift', '0'));
    await p.evaluate(async seed => {
      const db = await new Promise(res => { const r = indexedDB.open('podhod', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); });
      const put = (k, v) => new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; });
      await put('meta', { profiles: [{ id: 'main', name: 'Аня', color: 'coral', char: 'fox' }], cur: 'main', theme: 'auto', v2seen: true, chatSeen: Date.now() });
      await put('p:main', { profile: seed.profile, workouts: seed.workouts, active: null });
    }, seed);
    await p.reload(); await p.waitForTimeout(1400);
    await esc();
    console.log('start', JSON.stringify(await state()));
    await shot('01-hungry');
    await tap('[data-act="dbgWorkout"]'); await p.waitForTimeout(500);
    console.log('after workout', JSON.stringify(await state()));
    await shot('02-grow', false, 900);
    await tap('.sheet-foot .btn-primary'); // Ура → done sheet
    await shot('03-done');
    await tap('[data-act="chestOpenFor"]'); await shot('04-chest');
    await tap('.sheet-foot .btn-primary'); await p.waitForTimeout(1700); await shot('05-chest-open');
    await esc();
    await tap('.tab[data-v="today"]'); await p.waitForTimeout(250); await shot('06-eat', false, 250);
    console.log('after eat', JSON.stringify(await state()));
    // second workout the same day: no chest
    await tap('[data-act="dbgWorkout"]'); await p.waitForTimeout(500); await shot('07-done-nochest');
    const txt = await p.evaluate(() => document.querySelector('.sheet .fine') && [...document.querySelectorAll('.sheet .fine')].map(e => e.textContent).join(' / '));
    console.log('second same day:', txt);
    await esc(); await tap('.tab[data-v="today"]');
    for (const [dd, name] of [[3, '08-plus3'], [3, '09-plus6'], [3, '10-plus9-sleep']]) { for (let i = 0; i < dd; i++) { await tap('[data-act="dbgDay"][data-d="1"]'); } console.log(name, JSON.stringify(await state())); await shot(name); }
    // freeze 7 days, then 5 days later satiety is unchanged
    await tap('[data-act="dbgDay"][data-d="0"]'); await tap('[data-act="dbgDay"][data-d="1"]');
    console.log('day+1', JSON.stringify(await state()));
    await tap('[data-act="settings"]'); await tap('[data-act="freezeOn"][data-d="7"]'); await esc();
    for (let i = 0; i < 5; i++) await tap('[data-act="dbgDay"][data-d="1"]');
    console.log('frozen +5', JSON.stringify(await state())); await shot('11-frozen');
    await tap('[data-act="settings"]'); await shot('12-settings-frozen'); await tap('[data-act="freezeOff"]'); await esc();
    console.log('unfrozen', JSON.stringify(await state()));
    await tap('[data-act="dbgDay"][data-d="0"]');
    // open all + wardrobe, equip something then delete its workout
    await tap('[data-act="dbgChests"]'); await tap('[data-act="dbgOpenAll"]');
    const g = await p.evaluate(() => { const out = []; return out; });
    await tap('.tab[data-v="hero"]'); await tap('.ch-btn.mate'); await p.waitForTimeout(600); await shot('13-ward');
    await esc();
    console.log('final', JSON.stringify(await state()));
  } catch (e) { errs.push('TEST ERROR ' + e.message); }
  console.log('ERRORS', JSON.stringify(errs, null, 1));
  await b.close(); srv.kill();
})();
