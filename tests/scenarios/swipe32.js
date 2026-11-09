// 3.2: swipe a row to the left to delete it (journal, habits, supplements), undo, long swipe
const { chromium } = require('playwright'); const fs = require('fs');
const SERVER = require('../lib/server'), SITE = process.env.SITE, SEED = require('path').join(__dirname, '..', 'fixtures', 'seed.json');
(async () => {
  const srv = SERVER.start(8833, SITE); await new Promise(r => setTimeout(r, 700));
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8')); seed.workouts.forEach(w => { delete w.demo; });
  const newest = Math.max(...seed.workouts.map(w => w.start)), d0 = new Date(); d0.setHours(9, 0, 0, 0); const sh = d0.getTime() - 864e5 - newest; seed.workouts.forEach(w => { w.start += sh; w.end += sh; });
  const errs = [], say = (...a) => console.log(...a), b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  const tap = async (sel, w = 500) => { const el = await p.$(sel); if (!el) { errs.push('NO ' + sel); return false; } await el.click(); await p.waitForTimeout(w); return true; };
  const txt = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
  await p.goto(`http://127.0.0.1:8833/`); await p.waitForTimeout(1500); // let the very first launch finish before seeding
  await p.evaluate(async seed => { const db = await new Promise(res => { const r = indexedDB.open('podhod', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); }); const put = (k, v) => new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; });
    await put('meta', { profiles: [{ id: 'main', name: 'Дима', color: 'lime', char: 'owl' }], cur: 'main', mode: 'solo', v2seen: true, v22seen: true, v23seen: true, v24seen: true, v25seen: true, v26seen: true, v27seen: true, v271seen: true, v28seen: true, chatSeen: Date.now() });
    await put('p:main', { profile: Object.assign({}, seed.profile, { templates: [] }), workouts: seed.workouts, active: null }); }, seed);
  await p.reload(); await p.waitForTimeout(1600);
  const ev = fn => p.evaluate(`(() => { const { S, totalXP, normP, normW, habMerge, habXP, payload, saveProfile, render, dayKey } = window.__T; return (${fn.toString()})(); })()`);
  const box = async sel => { const el = await p.$(sel); return el ? el.boundingBox() : null; };
  const drag = async (sel, dx, dy = 0, steps = 14) => { const r = await box(sel); if (!r) { errs.push('NO ' + sel); return; } const x = r.x + r.width - 50, y = r.y + r.height / 2; await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + dx * .3, y + dy * .3, { steps: 4 }); await p.mouse.move(x + dx, y + dy, { steps }); await p.waitForTimeout(80); await p.mouse.up(); await p.waitForTimeout(450); };
  const n = () => ev(() => ({ w: S.workouts.length, del: S.profile.deleted.length, h: S.profile.habits.filter(h => !h.ar).length, hAll: S.profile.habits.length, s: S.profile.supps.length }));
  // ---- journal
  await tap('.tab[data-v="log"]', 800);
  const rows0 = await p.$$eval('.jrow', e => e.length), st0 = await n();
  say('1 rows:', rows0, '| swipeable:', await p.$$eval('.swp', e => e.length), '| workouts:', st0.w);
  await drag('.jrow', -140);
  say('2 short swipe -> row stays open on the red button:', await p.$eval('.swp', e => e.classList.contains('open')), '| offset:', await p.$eval('.swp-fg', e => e.style.transform));
  await drag('.jrow', 0, 0, 2); // a tap on an opened row only closes it
  say('3 tap on the opened row closes it, workout sheet not opened:', await p.$eval('.swp', e => !e.classList.contains('open')), '|', !(await p.$('#sheet-root .sheet')));
  await drag('.jrow', -140); { const r = await box('.swp.open'); await p.mouse.click(r.x + r.width - 40, r.y + r.height / 2); await p.waitForTimeout(900); }
  say('4 red button deletes -> rows:', await p.$$eval('.jrow', e => e.length), '(was ' + rows0 + ') | toast:', (await txt('.toast') || '').slice(0, 40), '| data still there:', (await n()).w === st0.w);
  await tap('[data-act="swipeUndo"]', 700);
  say('5 undo -> rows back:', await p.$$eval('.jrow', e => e.length), '| workouts:', (await n()).w, '| deleted marks:', (await n()).del);
  await drag('.jrow', -330, 6);
  say('6 long swipe -> row flies out, rows:', await p.$$eval('.jrow', e => e.length), '| not deleted yet:', (await n()).w === st0.w);
  await p.waitForTimeout(9300);
  const st1 = await n(); say('7 after the undo time: workouts', st0.w, '->', st1.w, '| deleted marks', st0.del, '->', st1.del, '| toast gone:', !(await p.$('.toast')));
  // vertical scroll gesture must not move a row
  await drag('.jrow', 6, 120, 8); say('8 vertical drag leaves the row alone:', await p.$$eval('.swp.open', e => e.length) === 0);
  // ---- habits
  await ev(() => { const t = Date.now(); S.profile.habits = [{ id: 'h1', name: 'Вода', ic: 'heart', cat: 'v', d: 0, days: [], auto: '', ts: t - 9e8 }, { id: 'h2', name: 'Чтение', ic: 'note', cat: 'r', d: 1, days: [], auto: '', ts: t - 9e8 }]; S.profile.hlog[dayKey(t)] = { h1: 5 }; saveProfile(); render(); });
  await tap('.tab[data-v="path"]', 800);
  say('9 habit rows swipeable:', await p.$$eval('.hab-list .swp', e => e.length));
  const xp0 = await ev(() => totalXP());
  await drag('.hab-list .swp .hab-row', -330, 4); await p.waitForTimeout(300);
  say('10 habit swiped away, rows:', await p.$$eval('.hab-list .hab-row', e => e.length), '| toast:', (await txt('.toast') || '').slice(0, 30));
  await p.waitForTimeout(9300);
  const hs2 = await n(); say('11 habit committed: active', hs2.h, 'of', hs2.hAll, '(one with history is archived, so the xp stays) | xp kept:', (await ev(() => totalXP())) === xp0);
  // ---- supplements
  await ev(() => { S.profile.supps = [{ id: 's1', name: 'Креатин', dose: 5, unit: 'г', when: 'am', days: [] }, { id: 's2', name: 'Омега-3', dose: 2, unit: 'капс.', when: 'day', days: [] }]; saveProfile(); render(); });
  await tap('.tab[data-v="more"]', 600); await tap('.more-row[data-v="supp"]', 800);
  say('12 supplement rows swipeable:', await p.$$eval('.sup-list .swp', e => e.length));
  await drag('.sup-list .swp .sup-row', -330, 4); await p.waitForTimeout(200);
  say('13 supplement swiped away, rows:', await p.$$eval('.sup-list .sup-row', e => e.length));
  await tap('[data-act="swipeUndo"]', 600); say('14 undo, rows:', await p.$$eval('.sup-list .sup-row', e => e.length), '| supps in data:', (await n()).s);
  await drag('.sup-list .swp .sup-row', -330, 4); await p.waitForTimeout(9300); say('15 committed, supps in data:', (await n()).s);
  // ---- a tab swipe must not start on a row (the screen stays)
  console.log('ERRORS', JSON.stringify(errs)); await b.close(); srv.kill();
})();
