// 3.2: swipe a row to the left to delete it everywhere (mouse and real touch), undo, refusal
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
  // ================= real touch gestures (Chrome DevTools touch events, so touch-action is respected) =================
  const cdp = await ctx.newCDPSession(p);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const tswipe = async (sel, dx, dy = 0, o = {}) => {
    const el = (await p.$$(sel))[o.i || 0]; if (!el) { errs.push('NO ' + sel); return; }
    await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(150); const r = await el.boundingBox(), x = r.x + r.width - 60, y = r.y + r.height / 2, N = o.steps || 12;
    await touch('touchStart', x, y); for (let k = 1; k <= N; k++) { await touch('touchMove', x + dx * k / N, y + dy * k / N); await p.waitForTimeout(o.gap ?? 16); }
    await p.waitForTimeout(o.hold ?? 60); await touch('touchEnd'); await p.waitForTimeout(550);
  };
  const tapPill = async sel => { const r = await box(sel); await p.touchscreen.tap(r.x + r.width - 40, r.y + r.height / 2); await p.waitForTimeout(900); };
  const nn = () => ev(() => ({ w: S.workouts.length, b: S.profile.body.length, m: S.profile.meas.length, cx: S.profile.custom.length, sets: S.active ? S.active.exercises[0].sets.length : -1, ti: (S.sheets.length && S.sheets[S.sheets.length - 1].draft) ? S.sheets[S.sheets.length - 1].draft.items.length : -1 }));
  say('--- touch ---');
  await tap('.tab[data-v="today"]', 500); await tap('.tab[data-v="log"]', 800); await tap('.train-seg [data-v="log"]', 500);
  const r0 = await p.$$eval('.jrow', e => e.length);
  await tswipe('.jrow', -130); say('T1 short touch swipe opens the pill:', await p.$eval('.swp', e => e.classList.contains('open')), '| pill width px:', await p.$eval('.swp .swp-btn', e => Math.round(e.getBoundingClientRect().width)));
  await tapPill('.swp.open'); say('T2 tap on the pill deletes:', await p.$$eval('.jrow', e => e.length), '(was ' + r0 + ') | toast:', (await txt('.toast') || '').slice(0, 24));
  await tap('[data-act="swipeUndo"]', 700); say('T3 undo restores:', await p.$$eval('.jrow', e => e.length));
  await tswipe('.jrow', -170, 0, { steps: 4, gap: 14 }); say('T4 a fast flick deletes at once:', await p.$$eval('.jrow', e => e.length));
  await tap('[data-act="swipeUndo"]', 700); say('T4 undo:', await p.$$eval('.jrow', e => e.length));
  const y0 = await p.evaluate(() => scrollY); await tswipe('.jrow', 4, -260, { i: 2 }); say('T5 vertical touch drag scrolls the page, no row opens:', (await p.evaluate(() => scrollY)) > y0, '|', await p.$$eval('.swp.open', e => e.length) === 0);
  // weight entries and measurements
  await ev(() => { const t = Date.now(); S.profile.body = [{ id: 'bw1', d: t - 2 * 864e5, w: 81.4 }, { id: 'bw2', d: t - 9 * 864e5, w: 82.0 }, { id: 'bw3', d: t - 20 * 864e5, w: 83.1 }]; S.profile.meas = [{ id: 'm1', d: t - 3 * 864e5, waist: 82 }, { id: 'm2', d: t - 12 * 864e5, waist: 83.5 }]; saveProfile(); render(); });
  await tap('.tab[data-v="more"]', 600); await tap('.more-row[data-v="body"]', 900);
  say('T6 weight rows swipeable:', await p.$$eval('.blist .swp', e => e.length));
  await tswipe('.blist .swp .swp-fg', -330, 0, { steps: 6 }); say('T7 weight entry deleted:', (await nn()).b, '(3 -> 2)'); await tap('[data-act="swipeUndo"]', 700); say('T7 undo:', (await nn()).b);
  await tap('[data-act="bodyTab"][data-t="m"]', 700); say('T8 measurement rows swipeable:', await p.$$eval('.mlist .swp', e => e.length));
  await tswipe('.mlist .swp .swp-fg', -330, 0, { steps: 6 }); say('T9 measurement deleted:', (await nn()).m, '(2 -> 1)'); await tap('[data-act="swipeUndo"]', 700); say('T9 undo:', (await nn()).m);
  // sets of a running workout
  await ev(() => { const t = Date.now(); S.active = normW({ id: 'act1', title: 'Тест', start: t - 600000, end: null, exercises: [{ k: 'xk1', ex: 'bench', sets: [{ w: 60, r: 8 }, { w: 62.5, r: 6 }, { w: 65, r: 5 }] }] }, 'act1'); render(); });
  await tap('.tab[data-v="today"]', 900); say('T10 set rows swipeable:', await p.$$eval('.sets .swp', e => e.length));
  await tswipe('.sets .swp .swp-fg', -330, 0, { steps: 6, i: 1 }); say('T11 set deleted:', (await nn()).sets, '(3 -> 2) | toast:', (await txt('.toast') || '').slice(0, 20));
  await tap('[data-act="swipeUndo"]', 700); say('T11 undo:', (await nn()).sets, '| order kept:', await ev(() => S.active.exercises[0].sets.map(s => s.w).join(',')));
  // programme items inside the programme editor
  await ev(() => { S.active = null; render(); }); await p.waitForTimeout(500);
  await tap('[data-act="tplNew"]', 800);
  await ev(() => { const sh = S.sheets[S.sheets.length - 1]; sh.draft.items.push({ ex: 'bench', sets: 3, reps: 8 }, { ex: 'squat', sets: 4, reps: 6 }); render(); }); await p.waitForTimeout(500);
  say('T12 programme items swipeable:', await p.$$eval('.tpl-items .swp', e => e.length));
  await tswipe('.tpl-items .swp .swp-fg', -330, 0, { steps: 6 }); say('T13 item removed:', (await nn()).ti, '(2 -> 1)'); await tap('[data-act="swipeUndo"]', 700); say('T13 undo:', (await nn()).ti);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  // own exercises in the settings sheet: one free, one used in the journal (must refuse)
  await ev(() => { S.profile.custom = [{ id: 'cx1', name: 'Моё жим', muscle: 'chest', kind: 'wr' }, { id: 'cx3', name: 'Моё в журнале', muscle: 'back', kind: 'wr' }]; S.workouts[0].exercises.push({ k: 'zz', ex: 'cx3', sets: [{ w: 10, r: 10 }] }); saveProfile(); render(); });
  await tap('.ph-act [data-act="settings"]', 900); say('T14 own exercises swipeable:', await p.$$eval('.sheet .blist .swp', e => e.length));
  await tswipe('.sheet .blist .swp .swp-fg', -330, 0, { steps: 6, i: 0 }); say('T15 free one deleted:', (await nn()).cx, '(2 -> 1)'); await tap('[data-act="swipeUndo"]', 700); say('T15 undo:', (await nn()).cx);
  await tswipe('.sheet .blist .swp .swp-fg', -330, 0, { steps: 6, i: 1 }); say('T16 used one refused, still there:', (await nn()).cx, '| rows:', await p.$$eval('.sheet .blist .swp', e => e.length), '| toast:', (await txt('.toast') || '').slice(0, 30));
  console.log('ERRORS', JSON.stringify(errs)); await b.close(); srv.kill();
})();
