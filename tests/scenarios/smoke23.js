// 2.3: solo / pair mode and sounds
const SERVER = require('../lib/server');
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const dir = __dirname + '/shots';
const SEED = require('path').join(__dirname, '..', 'fixtures', 'seed.json');
(async () => {
  const srv = SERVER.start('8797', process.env.SITE);
  await new Promise(r => setTimeout(r, 1000));
  const errs = [], b = await chromium.launch();
  const phone = async (tag, scheme = 'dark', w = 375) => {
    const ctx = await b.newContext({ viewport: { width: w, height: 812 }, colorScheme: scheme, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await ctx.addInitScript(() => {
      window.__snd = 0; const C = window.AudioContext || window.webkitAudioContext;
      const o1 = C.prototype.createOscillator, o2 = C.prototype.createBufferSource;
      C.prototype.createOscillator = function () { window.__snd++; return o1.call(this); };
      C.prototype.createBufferSource = function () { window.__snd++; return o2.call(this); };
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(tag + ' PAGEERR ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load/.test(m.text())) errs.push(tag + ' ' + m.text()); });
    p.tap = async sel => { const el = await p.$(sel); if (!el) { errs.push(tag + ' NO ' + sel); return; } await el.click(); await p.waitForTimeout(300); };
    p.esc = async () => { for (let i = 0; i < 4; i++) if (await p.$('#sheet-root .sheet')) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    p.snd = async (sel, wait = 300) => { await p.evaluate(() => { window.__snd = 0; }); await p.tap(sel); await p.waitForTimeout(wait); return p.evaluate(() => window.__snd); };
    p.tabs = () => p.$$eval('.tab', els => els.map(e => e.dataset.v).join(','));
    return p;
  };
  try {
    /* new user, default «один» */
    const N = await phone('N');
    await N.goto('http://127.0.0.1:8797/'); await N.waitForTimeout(900);
    await N.screenshot({ path: dir + '/23-welcome.png' });
    await N.fill('#wl-name', 'Саша'); await N.tap('[data-act="welcomeSave"]'); await N.esc();
    console.log('new solo tabs:', await N.tabs(), '| pair banner:', !!(await N.$('.banner [data-act="syncSetup"]')));
    await N.tap('[data-act="settings"]:not(.rlink)');
    const setBtn = await N.$('.ph-act [data-act="settings"]'); if (setBtn) { await N.esc(); await setBtn.click(); await N.waitForTimeout(400); }
    await N.screenshot({ path: dir + '/23-settings-solo.png' });
    console.log('sync block visible in solo:', await N.evaluate(() => { const b = [...document.querySelectorAll('.sblock')].find(x => /Синхронизация/.test(x.textContent)); return b && getComputedStyle(b).display !== 'none'; }));
    // sounds: switch, volume, demo
    console.log('sound: toggle switch ->', await N.snd('[data-act="sndVol"][data-v="3"]'));
    console.log('sound: demo ->', await N.snd('[data-act="sndDemo"]', 2600));
    await N.evaluate(() => { const s = [...document.querySelectorAll('.sblock')].find(x => /Звуки/.test(x.textContent)); s && s.scrollIntoView(); });
    await N.screenshot({ path: dir + '/23-settings-sound.png' });
    await N.tap('[data-act="setMode"][data-v="pair"]'); await N.esc();
    console.log('after switching to pair, tabs:', await N.tabs(), '| pair banner:', !!(await N.$('.banner [data-act="syncSetup"]')));
    console.log('sound: tab nav ->', await N.snd('.tab[data-v="log"]'));
    console.log('sound: companion tap ->', await N.snd('.tab[data-v="hero"]') , await N.snd('.ch-btn.mate', 800)); await N.esc();
    console.log('sound: chest shake+open ->', await N.snd('.chestbtn'), await N.snd('.sheet-foot .btn-primary', 1800)); await N.esc(); await N.tap('.tab[data-v="today"]');
    // workout sounds
    await N.tap('[data-act="startEmpty"]'); await N.tap('[data-act="addEx"]'); await N.tap('.pick-row'); await N.tap('[data-act="pickConfirm"]');
    const ins = await N.$$('.set-in'); await ins[0].fill('60'); await ins[1].fill('8');
    console.log('sound: set done ->', await N.snd('[data-act="setDone"]'));
    await N.screenshot({ path: dir + '/23-workout.png' });
    // sounds off -> silence
    await N.tap('.tab[data-v="log"]'); await N.tap('.ph-act [data-act="settings"]'); await N.tap('[data-act="sndToggle"]');
    await N.esc();
    console.log('sound OFF: nav ->', await N.snd('.tab[data-v="path"]'), '| set done ->', await (async () => { await N.tap('.tab[data-v="today"]'); return N.snd('.sets > .swp:nth-of-type(2) [data-act="setDone"]'); })());
    await N.tap('.tab[data-v="log"]');
    await N.tap('.ph-act [data-act="settings"]'); await N.tap('[data-act="setMode"][data-v="solo"]'); await N.esc();
    console.log('back to solo tabs:', await N.tabs());
    await N.goto('http://127.0.0.1:8797/#chat'); await N.waitForTimeout(900);
    console.log('#chat in solo opens view:', await N.evaluate(() => document.querySelector('.tab[aria-current]') && document.querySelector('.tab[aria-current]').dataset.v));

    /* existing 2.2 user without partner, and one with sync */
    const seed = JSON.parse(fs.readFileSync(SEED, 'utf8')); seed.workouts.forEach(w => { delete w.demo; });
    for (const [tag, sync] of [['E1', false], ['E2', true]]) {
      const E = await phone(tag, 'light', 320);
      await E.goto('http://127.0.0.1:8797/');
      await E.evaluate(async ([seed, sync]) => {
        const db = await new Promise(res => { const r = indexedDB.open('podhod', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); });
        const put = (k, v) => new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; });
        const meta = { profiles: [{ id: 'main', name: 'Дима', color: 'lime', char: 'cat', sid: 'sid1' }], cur: 'main', theme: 'auto', v2seen: true, v22seen: true, chatSeen: Date.now() };
        if (sync) meta.sync = { gist: 'gx', token: 'ghp_x', on: true, shareBody: false };
        await put('meta', meta); await put('p:main', { profile: seed.profile, workouts: seed.workouts, active: null });
      }, [seed, sync]);
      await E.reload(); await E.waitForTimeout(1300);
      const t = await E.evaluate(() => document.querySelector('#sheet-title') && document.querySelector('#sheet-title').textContent);
      await E.screenshot({ path: dir + `/23-${tag}-news.png` });
      await E.esc();
      console.log(tag, sync ? '(sync on)' : '(no partner)', 'news:', t, '| tabs:', await E.tabs());
      await E.screenshot({ path: dir + `/23-${tag}-today.png` });
    }
  } catch (e) { errs.push('TEST ' + e.message); }
  console.log('ERRORS', JSON.stringify(errs, null, 1));
  await b.close(); srv.kill();
})();
