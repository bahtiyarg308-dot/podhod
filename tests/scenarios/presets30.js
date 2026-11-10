// ready-made programs (add + start one) and the weekly summary (button, week switch, Monday banner)
const { chromium } = require('playwright'); const fs = require('fs');
const SERVER = require('../lib/server'), SITE = process.env.SITE, SEED = require('path').join(__dirname, '..', 'fixtures', 'seed.json');
(async () => {
  const srv = SERVER.start(8821, SITE); await new Promise(r => setTimeout(r, 700));
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8')); seed.workouts.forEach(w => { delete w.demo; });
  const newest = Math.max(...seed.workouts.map(w => w.start)), d0 = new Date(); d0.setHours(9, 0, 0, 0); const sh = d0.getTime() - 864e5 - newest; seed.workouts.forEach(w => { w.start += sh; w.end += sh; });
  const errs = [], say = (...a) => console.log(...a), b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  const tap = async (sel, w = 500) => { const el = await p.$(sel); if (!el) { errs.push('NO ' + sel); return false; } await el.click(); await p.waitForTimeout(w); return true; };
  const txt = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
  await p.goto(`http://127.0.0.1:8821/`); await p.waitForTimeout(1500); // let the very first launch finish before seeding
  await p.evaluate(async seed => { const db = await new Promise(res => { const r = indexedDB.open('podhod', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); }); const put = (k, v) => new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; });
    await put('meta', { profiles: [{ id: 'main', name: 'Дима', color: 'lime', char: 'owl' }], cur: 'main', mode: 'solo', v2seen: true, v22seen: true, v23seen: true, v24seen: true, v25seen: true, v26seen: true, v27seen: true, v271seen: true, v28seen: true, chatSeen: Date.now() });
    await put('p:main', { profile: Object.assign({}, seed.profile, { templates: [] }), workouts: seed.workouts, active: null }); }, seed);
  await p.reload(); await p.waitForTimeout(1600);
  const progs = () => p.$$eval('.progs .prog:not(.prog-new)', e => e.length);
  say('1 programs before:', await progs());
  await tap('[data-act="presetsOpen"]', 700); say('2 sheet:', await txt('#sheet-title'), '| sets:', await p.$$eval('.preset', e => e.length));
  await tap('[data-act="presetToggle"][data-id="ul"]', 500); say('2 expanded Верх/Низ:', (await txt('.preset.open .preset-b') || '').slice(0, 120));
  await tap('[data-act="presetAdd"][data-id="ul"]', 900); say('3 programs after adding Верх/Низ:', await progs(), '| toast:', await txt('.toast'));
  await tap('[data-act="presetsOpen"]', 600); await tap('[data-act="presetToggle"][data-id="ul"]', 300); await tap('[data-act="presetAdd"][data-id="ul"]', 900); const names = await p.$$eval('.progs .prog:not(.prog-new) b, .progs .prog:not(.prog-new) strong, .progs .prog:not(.prog-new) h3', e => e.map(x => x.innerText)); say('3 second add gets unique names:', await progs(), JSON.stringify(names.slice(0, 8)));
  const first = await p.$('.progs .prog:not(.prog-new) [data-act="startTpl"]'); if (first) { await first.click(); await p.waitForTimeout(900); }
  say('4 started a ready program:', await p.$$eval('.xcard', e => e.length), 'exercises |', await p.$$eval('.xcard .xname, .xcard h3, .xcard b', e => e.slice(0, 3).map(x => x.innerText).join(' / ')));
  await tap('[data-act="discardOpen"]', 400); await tap('[data-act="discardConfirm"]', 700);
  // weekly summary
  await tap('.tab[data-v="log"]', 400); await tap('.train-seg [data-v="progress"]', 900); await tap('[data-act="weekOpen"]', 700);
  say('5 week sheet:', await txt('#sheet-title'), '|', (await txt('.sheet .kv') || '').slice(0, 80)); say('5 bullets:', (await txt('.sheet .pr-list') || '').slice(0, 160));
  await tap('[data-act="weekShift"][data-d="-1"]', 400); say('5 previous week:', (await txt('.sheet .sup-day') || '').slice(0, 40), '|', (await txt('.sheet .kv') || '').slice(0, 50));
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  // Monday banner
  // the Monday after the week of the newest workout, so the test does not depend on the weekday it is run on
  const nd = new Date(newest + sh); nd.setDate(nd.getDate() - ((nd.getDay() + 6) % 7) + 7); nd.setHours(10, 0, 0, 0); await ctx.clock.setFixedTime(nd); const d = await p.evaluate(() => new Date().getDay());
  await p.reload(); await p.waitForTimeout(1500); await tap('.tab[data-v="today"]', 600); say('6 fake day of week:', d, '| banner:', (await txt('.banner b') || '').slice(0, 40));
  await tap('[data-act="weekOpen"][data-w]', 700); say('6 opened from banner:', await txt('#sheet-title'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.reload(); await p.waitForTimeout(1200); say('6 banner after opening:', await p.$$eval('[data-act="weekOpen"][data-w]', e => e.length));
  console.log('ERRORS', JSON.stringify(errs)); await b.close(); srv.kill();
})();
