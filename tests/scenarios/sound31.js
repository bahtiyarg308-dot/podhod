// 3.1: soft sound on pressing the glass tab bar, on any button, checkbox and select
const { chromium } = require('playwright'); const fs = require('fs');
const SERVER = require('../lib/server'), SITE = process.env.SITE, SEED = require('path').join(__dirname, '..', 'fixtures', 'seed.json');
(async () => {
  const srv = SERVER.start(8832, SITE); await new Promise(r => setTimeout(r, 700));
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8')); seed.workouts.forEach(w => { delete w.demo; });
  const newest = Math.max(...seed.workouts.map(w => w.start)), d0 = new Date(); d0.setHours(9, 0, 0, 0); const sh = d0.getTime() - 864e5 - newest; seed.workouts.forEach(w => { w.start += sh; w.end += sh; });
  const errs = [], say = (...a) => console.log(...a), b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  const tap = async (sel, w = 500) => { const el = await p.$(sel); if (!el) { errs.push('NO ' + sel); return false; } await el.click(); await p.waitForTimeout(w); return true; };
  const txt = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
  await p.goto(`http://127.0.0.1:8832/`); await p.waitForTimeout(1500); // let the very first launch finish before seeding
  await p.evaluate(async seed => { const db = await new Promise(res => { const r = indexedDB.open('podhod', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); }); const put = (k, v) => new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; });
    await put('meta', { profiles: [{ id: 'main', name: 'Дима', color: 'lime', char: 'owl' }], cur: 'main', mode: 'solo', v2seen: true, v22seen: true, v23seen: true, v24seen: true, v25seen: true, v26seen: true, v27seen: true, v271seen: true, v28seen: true, chatSeen: Date.now() });
    await put('p:main', { profile: Object.assign({}, seed.profile, { templates: [] }), workouts: seed.workouts, active: null }); }, seed);
  await p.reload(); await p.waitForTimeout(1600);
  await ctx.addInitScript(() => {
    window.__snd = 0; const C = window.AudioContext || window.webkitAudioContext;
    const o1 = C.prototype.createOscillator, o2 = C.prototype.createBufferSource;
    C.prototype.createOscillator = function () { window.__snd++; return o1.call(this); };
    C.prototype.createBufferSource = function () { window.__snd++; return o2.call(this); };
  });
  await p.reload(); await p.waitForTimeout(1600);
  const snd = () => p.evaluate(() => window.__snd), zero = () => p.evaluate(() => { window.__snd = 0; });
  const center = async sel => { const r = await (await p.$(sel)).boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
  // 1. pressing the glass bar makes a sound at once, before the finger is lifted
  await zero(); const [px, py] = await center('.tab[data-v="path"]');
  await p.mouse.move(px, py); await p.mouse.down(); await p.waitForTimeout(200);
  say('1 sound nodes while the finger is still down on a tab:', await snd());
  // 2. sliding to another tab plays another note
  await zero(); const [hx, hy] = await center('.tab[data-v="hero"]');
  await p.mouse.move(hx, hy, { steps: 10 }); await p.waitForTimeout(250);
  say('2 sound nodes after sliding to another tab:', await snd(), '| screen follows:', await p.$eval('.tab[aria-current]', e => e.dataset.v));
  await p.mouse.up(); await p.waitForTimeout(400);
  // 3. a plain tap on the bar (the click after it is swallowed) is not silent either
  await zero(); const [lx, ly] = await center('.tab[data-v="log"]');
  await p.mouse.move(lx, ly); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(400);
  say('3 plain tap on a tab:', await snd(), '| opened:', await p.$eval('.tab[aria-current]', e => e.dataset.v));
  // 4. a button without data-act, and a checkbox, also play the soft sound
  await p.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<button id="zz" style="position:fixed;left:10px;top:120px;z-index:99999">x</button><input id="zc" type="checkbox" style="position:fixed;left:10px;top:170px;z-index:99999">'); });
  await zero(); await p.click('#zz'); await p.waitForTimeout(250); say('4 plain button:', await snd());
  await zero(); await p.click('#zc'); await p.waitForTimeout(250); say('4 checkbox:', await snd());
  // 5. a normal data-act button still plays exactly one sound (no doubling)
  await zero(); await p.click('.tab[data-v="today"]', { force: true }); await p.waitForTimeout(100);
  await zero(); const el = await p.$('[data-act="settings"]'); await el.click(); await p.waitForTimeout(300); say('5 settings button (data-act):', await snd(), '(one soft tap = 3 nodes)');
  console.log('ERRORS', JSON.stringify(errs)); await b.close(); srv.kill();
})();
