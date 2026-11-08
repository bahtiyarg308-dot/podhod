const SERVER = require('../lib/server');
const { chromium } = require('playwright');
const { spawn } = require('child_process');
(async () => {
  const srv = SERVER.start('8795', process.env.SITE);
  await new Promise(r => setTimeout(r, 1000));
  const errs = [], b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load/.test(m.text())) errs.push(m.text()); });
  const tap = async sel => { const el = await p.$(sel); if (!el) { errs.push('NO ' + sel); return; } await el.click(); await p.waitForTimeout(350); };
  const esc = async () => { for (let i = 0; i < 4; i++) if (await p.$('#sheet-root .sheet')) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
  const ward = async () => { await tap('.tab[data-v="today"]'); await tap('.ch-btn.mate'); await p.waitForTimeout(600); const r = await p.evaluate(() => ({ count: document.querySelector('.wstat b').textContent, on: [...document.querySelectorAll('.tile.on span')].map(e => e.textContent) })); await esc(); return r; };
  try {
    await p.goto('http://127.0.0.1:8795/?debug=1'); await p.evaluate(() => localStorage.setItem('podhod-dbg-shift', '0')); await p.reload(); await p.waitForTimeout(1000);
    await p.fill('#wl-name', 'Тест'); await tap('[data-act="welcomeSave"]'); await esc();
    console.log('new user chests:', await p.evaluate(() => document.querySelector('.chestbtn b') && document.querySelector('.chestbtn b').textContent));
    await tap('[data-act="dbgWorkout"]'); await p.waitForTimeout(400);
    await tap('[data-act="chestOpenFor"]'); await tap('.sheet-foot .btn-primary'); await p.waitForTimeout(1600);
    const item = await p.evaluate(() => document.querySelector('#sheet-title').textContent);
    await tap('[data-act="chestWear"]'); await esc();
    console.log('opened & wearing:', item, JSON.stringify(await ward()));
    // delete that workout
    await tap('.tab[data-v="log"]'); await tap('[data-act="openWorkout"]'); await tap('[data-act="wDel"]'); await tap('[data-act="wDel"]'); await esc();
    console.log('after delete:', JSON.stringify(await ward()));
    // second profile on the same phone
    await tap('.ava-btn'); await tap('[data-act="profAddStart"]'); await p.fill('#np-name', 'Маша'); await tap('[data-act="profCreate"]'); await esc();
    const s2 = await p.evaluate(() => ({ chests: document.querySelector('.chestbtn b') && document.querySelector('.chestbtn b').textContent, stage: document.querySelector('.stg') && document.querySelector('.stg').textContent }));
    console.log('second profile:', JSON.stringify(s2), JSON.stringify(await ward()));
    await tap('.tab[data-v="supp"]'); console.log('second profile supps empty:', !!(await p.$('.sup-empty')));
    await p.reload(); await p.waitForTimeout(1200); await esc();
    console.log('after reload (Маша):', JSON.stringify(await ward()));
  } catch (e) { errs.push('TEST ' + e.message); }
  console.log('ERRORS', JSON.stringify(errs));
  await b.close(); srv.kill();
})();
