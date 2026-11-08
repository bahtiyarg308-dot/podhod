// data safety: daily copy, update copy, restore after "losing" data, error log
const SERVER = require('../lib/server');
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
const NG = process.env.SITE, SEED = require('path').join(__dirname, '..', 'fixtures', 'seed.json');
(async () => {
  const srv = SERVER.start('8819', NG); await new Promise(r => setTimeout(r, 900));
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8')); seed.workouts.forEach(w => { delete w.demo; });
  const newest = Math.max(...seed.workouts.map(w => w.start)), d0 = new Date(); d0.setHours(9, 0, 0, 0); const sh = d0.getTime() - 864e5 - newest; seed.workouts.forEach(w => { w.start += sh; w.end += sh; });
  const errs = [], say = (...a) => console.log(...a), b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' }); await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const p = await ctx.newPage(); p.on('pageerror', e => { if (!/test boom/.test(e.message)) errs.push(e.message); });
  const idb = (fn, arg) => p.evaluate(async ([fn, arg]) => { const db = await new Promise(res => { const r = indexedDB.open('podhod', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); }); const st = (m) => db.transaction('kv', m).objectStore('kv'); const f = { get: k => new Promise(r => { const q = st('readonly').get(k); q.onsuccess = () => r(q.result); }), put: ([k, v]) => new Promise(r => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = r; }) }[fn]; return f(arg); }, [fn, arg]);
  const tap = async (sel, w = 500) => { const el = await p.$(sel); if (!el) { errs.push('NO ' + sel); return false; } await el.click(); await p.waitForTimeout(w); return true; };
  await p.goto('http://127.0.0.1:8819/');
  await idb('put', ['meta', { profiles: [{ id: 'main', name: 'Дима', color: 'lime', char: 'owl' }], cur: 'main', mode: 'solo', lastVer: '2.0.0', v2seen: true, v22seen: true, v23seen: true, v24seen: true, v25seen: true, v26seen: true, v27seen: true, v271seen: true, v28seen: true, chatSeen: Date.now() }]);
  await idb('put', ['p:main', { profile: seed.profile, workouts: seed.workouts, active: null }]);
  await p.reload(); await p.waitForTimeout(1800);
  let idx = await idb('get', 'snaps'); say('1 errlog:', JSON.stringify(await idb('get', 'errlog'))); say('1 after launch, copies:', JSON.stringify((idx || []).map(x => x.why + ':' + x.w)), '| meta:', JSON.stringify(await idb('get', 'meta').then(m => ({ lastVer: m.lastVer, schema: m.schema }))));
  // "lose" the data like a bug would, reopen
  await idb('put', ['p:main', { profile: seed.profile, workouts: [], active: null }]); await p.reload(); await p.waitForTimeout(1600);
  await tap('.tab[data-v="log"]'); say('2 journal after data loss:', await p.evaluate(() => document.querySelector('.page-head .eyebrow').innerText));
  idx = await idb('get', 'snaps'); say('2 the good daily copy survived the next launch:', JSON.stringify(idx.map(x => x.why + ':' + x.w)));
  await tap('.tab[data-v="today"]'); await tap('.ph-act [data-act="settings"]', 700); await tap('[data-act="snapsOpen"]', 700);
  say('3 copies list:', (await p.evaluate(() => [...document.querySelectorAll('.snap-list li')].map(li => li.innerText.replace(/\s+/g, ' ')))).join(' || '));
  const first = await p.$('.snap-list li:first-child [data-act="snapGo"]'); const big = await p.evaluate(() => { const rows = [...document.querySelectorAll('.snap-list li')]; return rows.findIndex(r => /26/.test(r.innerText)); });
  const target = `.snap-list li:nth-child(${big + 1}) [data-act="snapGo"]`; await tap(target, 400); say('3 confirm text:', await p.evaluate((t) => document.querySelector(t).innerText, target)); await tap(target, 1500);
  await p.waitForTimeout(500); await tap('.tab[data-v="log"]'); say('4 journal after restore:', await p.evaluate(() => document.querySelector('.page-head .eyebrow').innerText), '| toast earlier shown');
  idx = await idb('get', 'snaps'); say('4 copies now (pre-restore one added):', JSON.stringify(idx.map(x => x.why + ':' + x.w)));
  // error log
  await p.evaluate(() => { setTimeout(() => { throw new Error('test boom: проверка журнала'); }, 10); }); await p.waitForTimeout(500);
  say('5 toast after a crash:', await p.evaluate(() => (document.querySelector('.toast') || {}).innerText || null));
  say('5 stored log:', JSON.stringify((await idb('get', 'errlog') || []).map(x => x.m)));
  await tap('.tab[data-v="today"]'); await tap('.ph-act [data-act="settings"]', 700); await tap('[data-act="errsOpen"]', 600);
  say('6 log text has the error:', await p.evaluate(() => /test boom/.test(document.querySelector('.errpre').innerText)), '| has version/device:', await p.evaluate(() => /Подход 2\./.test(document.querySelector('.errpre').innerText)));
  await tap('[data-act="errCopy"]', 500); say('6 copy:', await p.evaluate(() => (document.querySelector('.toast') || {}).innerText || null), '| clipboard has it:', await p.evaluate(async () => { try { return /test boom/.test(await navigator.clipboard.readText()); } catch (e) { return 'n/a'; } }));
  await tap('[data-act="errClear"]', 500); say('6 cleared:', JSON.stringify(await idb('get', 'errlog')));
  console.log('ERRORS', JSON.stringify(errs)); await b.close(); srv.kill();
})();
