// 2.7.1 audit: walk every view/sheet at a given width, catch JS errors, detect overlapping text and horizontal overflow
const SERVER = require('../lib/server');
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const dir = __dirname + '/shots271';
fs.mkdirSync(dir, { recursive: true });
const SEED = require('path').join(__dirname, '..', 'fixtures', 'seed.json');
const W = +(process.env.W || 432), SCHEME = process.env.SCHEME || 'dark', MODE = process.env.MODE || 'pair', ROOT = process.env.ROOT || process.env.SITE;
const PORT = 8790 + (W % 7) + (SCHEME === 'dark' ? 0 : 10);
const SHOTS = process.env.SHOTS !== '0', SEX = process.env.SEX || '';
(async () => {
  const srv = SERVER.start(String(PORT), ROOT);
  await new Promise(r => setTimeout(r, 900));
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8')); seed.workouts.forEach(w => { delete w.demo; });
  const newest = Math.max(...seed.workouts.map(w => w.start)), d0 = new Date(); d0.setHours(9, 0, 0, 0); const sh = d0.getTime() - 1 * 864e5 - newest; seed.workouts.forEach(w => { w.start += sh; w.end += sh; });
  const errs = [], issues = [], b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: 860 }, colorScheme: SCHEME, isMobile: true, hasTouch: true, serviceWorkers: 'block', deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load/.test(m.text())) errs.push(m.text()); });
  const wait = ms => p.waitForTimeout(ms);
  const tap = async (sel, o = {}) => { const el = await p.$(sel); if (!el) { if (!o.opt) errs.push('NO ' + sel); return false; } await el.click({ force: !!o.force }); await wait(o.w ?? 420); return true; };
  const esc = async () => { for (let i = 0; i < 6; i++) if (await p.$('#sheet-root .sheet')) { await p.keyboard.press('Escape'); await wait(320); } };
  const shot = async (n, o = {}) => { if (!SHOTS) return; await wait(o.wait ?? 300); await p.screenshot({ path: `${dir}/${SCHEME}-${W}-${MODE}-${n}.png`, fullPage: !!o.full }); };
  // overlap detector — text boxes of different leaf elements that intersect, and content wider than the viewport
  const audit = async name => {
    const r = await p.evaluate(() => {
      const root = document.querySelector('#sheet-root .sheet') || document.querySelector('#main');
      const vis = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; } return true; };
      const leaves = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const t = walker.currentNode; if (!t.nodeValue.trim()) continue;
        const el = t.parentElement; if (!el || el.closest('svg') || el.closest('[aria-hidden="true"]') || el.closest('.sr-only') || !vis(el)) continue;
        const rg = document.createRange(); rg.selectNodeContents(t);
        for (const q of rg.getClientRects()) if (q.width > 1 && q.height > 1) leaves.push({ el, q, txt: t.nodeValue.trim().slice(0, 24) });
      }
      // effective clip box: nearest ancestor with overflow hidden/auto
      const clipOf = el => { let x0 = -1e9, y0 = -1e9, x1 = 1e9, y1 = 1e9; for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (/(hidden|auto|scroll|clip)/.test(cs.overflowX + cs.overflowY)) { const b = e.getBoundingClientRect(); x0 = Math.max(x0, b.left); y0 = Math.max(y0, b.top); x1 = Math.min(x1, b.right); y1 = Math.min(y1, b.bottom); } } return { x0, y0, x1, y1 }; };
      const out = [];
      for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
        const a = leaves[i], c = leaves[j]; if (a.el === c.el || a.el.contains(c.el) || c.el.contains(a.el)) continue;
        const ca = clipOf(a.el), cc = clipOf(c.el);
        const ra = { l:Math.max(a.q.left, ca.x0), r:Math.min(a.q.right, ca.x1), t:Math.max(a.q.top, ca.y0), b:Math.min(a.q.bottom, ca.y1) };
        const rc = { l:Math.max(c.q.left, cc.x0), r:Math.min(c.q.right, cc.x1), t:Math.max(c.q.top, cc.y0), b:Math.min(c.q.bottom, cc.y1) };
        const ix = Math.min(ra.r, rc.r) - Math.max(ra.l, rc.l), iy = Math.min(ra.b, rc.b) - Math.max(ra.t, rc.t);
        if (ix > 2 && iy > 3) out.push(`overlap «${a.txt}»[${a.el.className || a.el.tagName}] × «${c.txt}»[${c.el.className || c.el.tagName}] (${Math.round(ix)}×${Math.round(iy)}) y=${Math.round(a.q.top + scrollY)}`);
      }
      // text cut by its own box (ellipsis is fine; hard clip in non-ellipsis box is not)
      for (const { el, q, txt } of leaves) {
        const cb = clipOf(el), vis2 = Math.min(q.right, cb.x1) - Math.max(q.left, cb.x0) > 2;
        if (vis2 && (Math.min(q.right, cb.x1) > innerWidth + 1 || Math.max(q.left, cb.x0) < -1)) out.push(`offscreen «${txt}» ${Math.round(q.left)}..${Math.round(q.right)}`);
        // text cut without an ellipsis: visible part is narrower than the text and the clipping box has no text-overflow
        if (vis2 && q.right > cb.x1 + 2 && q.left < cb.x1) { let e = el, ell = false; for (; e && e !== document.body; e = e.parentElement) { { const cs = getComputedStyle(e); if (cs.textOverflow === 'ellipsis' || /(auto|scroll)/.test(cs.overflowX)) { ell = true; break; } } } if (!ell) out.push(`clipped «${txt}» ${Math.round(q.right - cb.x1)}px`); }
      }
      const de = document.documentElement; if (de.scrollWidth > de.clientWidth + 1) out.push(`page h-scroll ${de.scrollWidth}>${de.clientWidth}`);
      return [...new Set(out)].slice(0, 30);
    });
    r.forEach(x => issues.push(name + ': ' + x));
  };
  const tabs = async () => p.evaluate(() => { const tb = document.querySelector('#tabbar'), ind = document.querySelector('.tab-ind'), cur = document.querySelector('.tab[aria-current]'); if (!tb || !cur) return 'no tabbar'; const bt = tb.getBoundingClientRect(), bi = ind.getBoundingClientRect(), bc = cur.getBoundingClientRect(); const ts = [...tb.querySelectorAll('.tab')].map(t => { const r = t.getBoundingClientRect(), s = t.querySelector('span'); return `${s.textContent}:${Math.round(r.left - bt.left)}+${Math.round(r.width)}${s.scrollWidth > s.clientWidth + 1 ? '(cut)' : ''}`; }); return `bar ${Math.round(bt.left)}..${Math.round(bt.right)} ind ${Math.round(bi.left)}..${Math.round(bi.right)} cur ${Math.round(bc.left)}..${Math.round(bc.right)} | ${ts.join(' ')}`; });
  try {
    await p.goto(`http://127.0.0.1:${PORT}/`);
    await p.evaluate(async ([seed, MODE, SEX]) => {
      const db = await new Promise(res => { const r = indexedDB.open('podhod', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); });
      const put = (k, v) => new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; });
      const prof = Object.assign({}, seed.profile); if (SEX) prof.body = SEX; // simulate 2.7.0 bug: sex stored over the weight log
      await put('meta', { profiles: [{ id: 'main', name: 'Бахтияр', color: 'lime', char: 'owl' }], cur: 'main', theme: 'auto', mode: MODE, v2seen: true, v22seen: true, v23seen: true, v24seen: true, v25seen: true, v26seen: true, v27seen: true, v271seen: true, chatSeen: Date.now() });
      await put('p:main', { profile: prof, workouts: seed.workouts, active: null });
    }, [seed, MODE, SEX]);
    await p.reload(); await wait(1600); await esc();
    const t0 = Date.now();
    console.log('tabs:', await tabs());
    await audit('today'); await shot('01-today'); await shot('01b-today-full', { full: true });
    const HOME = { progress:'log', supp:'more', chat:'more', body:'more', coach:'more' };
    for (const v of ['path', 'log', 'progress', 'hero', 'more', 'supp', 'chat', 'body', 'coach']) {
      let ok = true;
      if (HOME[v]) { await tap(`.tab[data-v="${HOME[v]}"]`, { w: 400 }); ok = await tap(HOME[v] === 'log' ? `.train-seg [data-v="${v}"]` : `.more-row[data-v="${v}"]`, { opt: v === 'chat' && MODE === 'solo', w: 650 }); }
      else ok = await tap(`.tab[data-v="${v}"]`, { w: 650 });
      if (!ok) continue;
      const cur = await p.evaluate(() => document.querySelector('.tab[aria-current]') && document.querySelector('.tab[aria-current]').dataset.v);
      if (cur !== (HOME[v] || v)) errs.push(`tab ${v} did not open (current ${cur})`);
      await audit(v); await shot('02-' + v); await shot('02-' + v + '-full', { full: true });
      if (v === 'body') { for (const t of ['m', 'p', 'w']) { await tap(`[data-act="bodyTab"][data-t="${t}"]`); await audit('body-' + t); } }
      if (v === 'progress') console.log('tabs@progress:', await tabs());
    }
    await tap('.tab[data-v="hero"]', { w: 650 });
    // sheets (awards and the companion live on the Hero tab)
    const sheets = [['awards', '[data-act="awards"]'], ['companion', '[data-act="mate"]'], ['settings', '.ph-act [data-act="settings"]'], ['profiles', '.ava-btn']];
    for (const [n, sel] of sheets) {
      const el = await p.$(sel); if (!el) { issues.push('no trigger for ' + n); continue; }
      await el.click(); await wait(700); await audit('sheet-' + n); await shot('03-' + n); await shot('03-' + n + '-full', { full: true });
      if (n === 'awards') { await p.evaluate(() => { const s = document.querySelector('#sheet-root .sheet-body'); s && (s.scrollTop = 99999); }); await wait(200); await shot('03-awards-end'); }
      await esc();
    }
    await tap('.tab[data-v="today"]', { w: 650 });
    // workout flow
    await tap('[data-act="startEmpty"]', { opt: true }); await audit('live'); await shot('04-live');
    await tap('[data-act="addEx"]', { opt: true }); await audit('picker'); await shot('05-picker');
    const first = await p.$('#pick-list .pick-w'); if (first) { await first.click(); await wait(400); }
    await esc(); await audit('live-ex'); await shot('06-live-ex', { full: true });
    await tap('[data-act="discardOpen"]', { opt: true }); await tap('[data-act="discardConfirm"]', { opt: true });
    // log detail
    await tap('.tab[data-v="log"]'); await tap('[data-act="openWorkout"]', { opt: true }); await audit('workout'); await shot('07-workout', { full: true }); await esc();
    console.log('walk ms', Date.now() - t0);
  } catch (e) { errs.push('TEST ' + e.message); }
  console.log(`== ${W} ${SCHEME} ${MODE} ${SEX}`);
  console.log('ISSUES', issues.length, JSON.stringify(issues, null, 1));
  console.log('ERRORS', JSON.stringify(errs, null, 1));
  await b.close(); srv.kill();
})();
