const SERVER = require('../lib/server');
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const dir = __dirname + '/shots';
const SEED = require('path').join(__dirname, '..', 'fixtures', 'seed.json');
const W = +(process.env.W || 375), SCHEME = process.env.SCHEME || 'dark';
(async () => {
  const srv = SERVER.start('8787', process.env.SITE);
  await new Promise(r => setTimeout(r, 1000));
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8')); seed.workouts.forEach(w => { delete w.demo; });
  const newest = Math.max(...seed.workouts.map(w => w.start)), d0 = new Date(); d0.setHours(9, 0, 0, 0); const sh = d0.getTime() - 2 * 864e5 - newest; seed.workouts.forEach(w => { w.start += sh; w.end += sh; });
  seed.profile.custom = [{ id: 'c-test', name: 'Тяга к поясу в тренажёре', muscle: 'back', equip: 'machine', kind: 'wr' }];
  const errs = [], b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: 812 }, colorScheme: SCHEME, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load/.test(m.text())) errs.push(m.text()); });
  const tap = async sel => { const el = await p.$(sel); if (!el) { errs.push('NO ' + sel); return; } await el.click(); await p.waitForTimeout(350); };
  const esc = async () => { for (let i = 0; i < 5; i++) if (await p.$('#sheet-root .sheet')) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
  const shot = async (n, o = {}) => { await p.waitForTimeout(o.wait ?? 350); await p.screenshot({ path: `${dir}/26-${SCHEME}-${W}-${n}.png`, fullPage: !!o.full }); };
  try {
    await p.goto('http://127.0.0.1:8787/?debug=1'); await p.evaluate(() => localStorage.setItem('podhod-dbg-shift', '0'));
    await p.evaluate(async seed => {
      const db = await new Promise(res => { const r = indexedDB.open('podhod', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); });
      const put = (k, v) => new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; });
      await put('meta', { profiles: [{ id: 'main', name: 'Дима', color: 'lime', char: 'cat' }], cur: 'main', theme: 'auto', mode: 'solo', v2seen: true, v22seen: true, v23seen: true, v24seen: true, v25seen: true, chatSeen: Date.now() });
      await put('p:main', { profile: seed.profile, workouts: seed.workouts, active: null });
    }, seed);
    await p.reload(); await p.waitForTimeout(1400);
    console.log('news:', await p.evaluate(() => document.querySelector('#sheet-title') && document.querySelector('#sheet-title').textContent));
    await shot('01-news'); await esc();
    await tap('[data-act="planOpen"]');
    const today = await p.evaluate(() => new Date().getDay());
    const opts = await p.$$eval(`select[data-ch="planDay"][data-d="${today}"] option`, o => o.map(x => x.value));
    await p.selectOption(`select[data-ch="planDay"][data-d="${today}"]`, opts[1]); await p.waitForTimeout(300);
    await p.selectOption(`select[data-ch="planDay"][data-d="${(today + 2) % 7}"]`, opts[2] || opts[1]); await p.waitForTimeout(300);
    await shot('02-plan'); await esc();
    console.log('plan card:', await p.evaluate(() => { const e = document.querySelector('.plan-today'); return e && e.innerText.replace(/\s+/g, ' '); }), '| planned days:', await p.$$eval('.wd.plan', e => e.length));
    await shot('03-today');
    await tap('.plan-today [data-act="startTpl"]');
    await tap('.xcard:nth-of-type(1) [data-act="exMenu"]'); await shot('04-exmenu');
    await tap('[data-act="exRest"][data-v="120"]'); await tap('[data-act="ssLink"]');
    console.log('superset tags:', await p.$$eval('.ss-tag', e => e.map(x => x.textContent).join(',')), '| rest chip:', await p.$eval('.xcard .x-rest', e => e.textContent.trim()));
    const fill = async card => { const ins = await p.$$(`.xcard:nth-of-type(${card}) .set-row:not(.set-hd):has(.set-n:not(.warm)) .set-in`); await ins[0].fill('50'); await ins[1].fill('10'); };
    await fill(1); await tap('.xcard:nth-of-type(1) .set-row:not(.set-hd):has(.set-n:not(.warm)) [data-act="setDone"]'); await p.waitForTimeout(500);
    console.log('after set in A1: rest shown?', await p.evaluate(() => !!document.getElementById('rest-time')), '| toast:', await p.evaluate(() => document.querySelector('.toast') && document.querySelector('.toast').innerText));
    await fill(2); await tap('.xcard:nth-of-type(2) .set-row:not(.set-hd):has(.set-n:not(.warm)) [data-act="setDone"]'); await p.waitForTimeout(500);
    console.log('after set in A2: rest:', await p.evaluate(() => { const t = document.getElementById('rest-time'); return t && t.textContent; }));
    await shot('05-superset');
    await tap('.xcard:nth-of-type(1) [data-act="exMenu"]'); await tap('[data-act="techOpen"]'); await shot('06-tech'); await esc();
    await tap('.ed-bar [data-act="finishOpen"]'); await tap('[data-act="finishSave"]'); await p.waitForTimeout(700); await esc(); await tap('.tab[data-v="today"]'); await tap('[data-act="dbgWorkout"]'); await p.waitForTimeout(700);
    for (let i = 0; i < 3; i++) { if (await p.$('.rank-hero, .grow-hero')) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } }
    const chestBtn = await p.$('[data-act="chestOpenFor"]');
    console.log('done sheet chest button:', !!chestBtn);
    if (chestBtn) { await chestBtn.click(); await p.waitForTimeout(400); await tap('.sheet-foot .btn-primary'); await shot('07-shake', { wait: 1000 }); await shot('08-open', { wait: 600 }); await shot('09-open-settled', { wait: 1000 }); }
    await esc();
    await tap('.tab[data-v="log"]'); await p.fill('#log-q', 'жим'); await p.waitForTimeout(400);
    console.log('search жим:', await p.evaluate(() => document.querySelector('.log-found') && document.querySelector('.log-found').textContent), '| rows:', await p.$$eval('.jrow', e => e.length));
    await shot('10-search');
    await p.fill('#log-q', 'ЁЛКИ'); await p.waitForTimeout(300); console.log('search nothing:', await p.evaluate(() => document.querySelector('.empty h3') && document.querySelector('.empty h3').textContent));
    await tap('[data-act="logClear"]');
    await tap('.ph-act [data-act="settings"]'); await tap('[data-act="cxEdit"]'); await p.fill('#cx-name', 'Тяга в тренажёре Хаммер'); await tap('[data-act="cxSave"]');
    console.log('renamed:', await p.evaluate(() => [...document.querySelectorAll('.blist li span')].map(e => e.textContent).filter(t => /Тяга/.test(t)).join('|')));
    await esc();
  } catch (e) { errs.push('TEST ' + e.message); }
  console.log('ERRORS', JSON.stringify(errs, null, 1));
  await b.close(); srv.kill();
})();
