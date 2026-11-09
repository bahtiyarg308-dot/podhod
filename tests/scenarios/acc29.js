// 2.9: sign-in gate, e-mail confirmation, reset by e-mail, Google, swipes — on the Firebase stand-in
const SERVER = require('../lib/server');
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
const ST = __dirname, MOCK = 'http://127.0.0.1:8899', SRC = process.env.SRC || process.env.REPO;
{ let s = fs.readFileSync(SRC + '/app.js', 'utf8'); const r = (a, b) => { if (!s.includes(a)) throw new Error('no ' + a); s = s.split(a).join(b); };
  r("idt:'https://identitytoolkit.googleapis.com/v1/accounts:'", `idt:'${MOCK}/idt/accounts:'`); r("stk:'https://securetoken.googleapis.com/v1/token'", `stk:'${MOCK}/stk'`); r("fs:'https://firestore.googleapis.com/v1/'", `fs:'${MOCK}/fs/'`);
  fs.mkdirSync(ST + '/v29', { recursive: true }); fs.writeFileSync(ST + '/v29/app.js', s); fs.copyFileSync(SRC + '/index.html', ST + '/v29/index.html'); fs.copyFileSync(SRC + '/sw.js', ST + '/v29/sw.js'); }
(async () => {
  const procs = [spawn('node', [ST + '/mock-fb.js'], { stdio: 'ignore', env: Object.assign({}, process.env, { GEMAIL: 'google.user@gmail.com' }) }), SERVER.start('8895', ST + '/v29')];
  await new Promise(r => setTimeout(r, 1200));
  const errs = [], say = (...a) => console.log(...a), b = await chromium.launch();
  const api = async (p) => (await fetch(MOCK + p)).json();
  const phone = async () => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 812 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
    p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    const cdp = await ctx.newCDPSession(p);
    p.tap = async (sel, w = 450) => { const el = await p.$(sel); if (!el) { errs.push('NO ' + sel); return false; } await el.click(); await p.waitForTimeout(w); return true; };
    p.txt = async sel => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
    p.swipe = async (x0, y0, x1, y1) => { const pt = (x, y) => [{ x, y }]; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(x0, y0) }); for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8) }); await p.waitForTimeout(12); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(500); };
    p.view = () => p.evaluate(() => (document.querySelector('.tab[aria-current]') || {}).dataset && document.querySelector('.tab[aria-current]').dataset.v);
    p.sheet = () => p.evaluate(() => { const s = document.querySelector('#sheet-root .sheet'); return s ? (s.dataset.gate ? 'gate:' : 'sheet:') + (document.querySelector('#sheet-title') || {}).textContent : null; });
    return p;
  };
  try {
    // ---- 1. a fresh install is locked ----
    const N = await phone(); await N.goto('http://127.0.0.1:8895/'); await N.waitForTimeout(1500);
    say('1 fresh install:', await N.sheet(), '| intro:', (await N.txt('.gate-intro') || '').slice(0, 40));
    await N.keyboard.press('Escape'); await N.waitForTimeout(300); const a1 = await N.sheet();
    await N.mouse.click(195, 30); await N.waitForTimeout(300); const a2 = await N.sheet();
    await N.swipe(195, 400, 195, 760); const a3 = await N.sheet(); await N.swipe(5, 400, 300, 410); const a4 = await N.sheet();
    say('1 cannot be closed (Esc, scrim, swipe down, edge swipe):', a1, a2, a3, a4, '| no close button:', !(await N.$('#sheet-root .sheet-head .icon-btn')));
    // ---- 2. sign up → confirm e-mail ----
    await N.tap('[data-act="accMode"][data-m="signup"]'); await N.fill('#acc-email', 'n@test.ru'); await N.fill('#acc-pass', '123456'); await N.tap('[data-act="accSignup"]', 2500);
    say('2 after sign-up:', await N.sheet(), '|', (await N.txt('#sheet-root .hint') || '').slice(0, 60));
    let ml = await api('/__mails'); say('2 mail:', JSON.stringify(ml.map(m => ({ t: m.type, to: m.email, ru: m.ru, back: m.cu }))));
    let st = await api('/__state'); say('2 cloud docs before confirming:', Object.keys(st.docs).length);
    await N.screenshot({ path: ST + '/shots28/waiting.png' }); await N.tap('[data-act="accCheck"]', 1500); say('2 «Я подтвердил» before clicking the link:', await N.txt('.acc-err'));
    await N.tap('[data-act="accResend"]', 900); ml = await api('/__mails'); say('2 resend sends one more mail:', ml.length, '| button now disabled:', await N.evaluate(() => { const b = document.querySelector('[data-act="accResend"]'); return b && b.disabled; }));
    await api('/__verify?email=n@test.ru'); await N.waitForTimeout(5500);
    await N.screenshot({ path: ST + '/shots28/verified.png' }); const tv = await N.sheet(); await N.tap('.sheet-foot [data-act="closeSheet"]', 700);
    say('2 after the link was opened (auto):', tv, '→ then', await N.sheet(), '| name field:', await N.evaluate(() => !!document.querySelector('#wl-name')));
    await N.fill('#wl-name', 'Нина'); await N.tap('[data-act="welcomeSave"]', 3000); await N.tap('.ph-act [data-act="settings"]'); say('2 account row:', (await N.txt('#sheet-root .acc-row') || '').slice(0, 70)); await N.keyboard.press('Escape'); await N.waitForTimeout(400);
    st = await api('/__state'); say('2 cloud docs after:', Object.keys(st.docs).filter(k => /pb\/main/.test(k)).length ? 'card written' : 'NO CARD');
    { const l0 = (await api('/__log')).length; await N.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await N.waitForTimeout(2500); say('2 idle sync calls:', (await api('/__log')).slice(l0).map(x => x.split(':').pop().split('/').pop()).join(' | ')); }
    // ---- 3. server refuses unconfirmed accounts ----
    const su = await (await fetch(MOCK + '/idt/accounts:signUp', { method: 'POST', body: JSON.stringify({ email: 'u@test.ru', password: 'secret1' }) })).json();
    const code = (await fetch(`${MOCK}/fs/projects/podhod-5d27f/databases/default/documents/users/${su.localId}/pb/main`, { headers: { Authorization: 'Bearer ' + su.idToken } })).status;
    say('3 unconfirmed account → cloud:', code);
    // ---- 4. swipes ----
    say('4 tab:', await N.view());
    await N.swipe(300, 500, 60, 505); const t1 = await N.view(); await N.swipe(80, 500, 330, 505); const t2 = await N.view();
    await N.swipe(300, 500, 60, 505); await N.swipe(300, 500, 60, 505); await N.swipe(300, 500, 60, 505); const t3 = await N.view();
    say('4 swipe left → next tab, right → back, 3× left:', t1, t2, t3);
    await N.tap('.tab[data-v="today"]'); await N.tap('.ph-act [data-act="settings"]', 700);
    await N.swipe(100, 500, 340, 505); const s1 = await N.sheet();
    await N.tap('.ph-act [data-act="settings"]', 700); await N.swipe(195, 450, 195, 780); const s2 = await N.sheet();
    await N.tap('.ph-act [data-act="settings"]', 700); await N.swipe(6, 400, 200, 405); const s3 = await N.sheet();
    await N.tap('.ph-act [data-act="settings"]', 700); await N.evaluate(() => { document.querySelector('#sheet-root .sheet-body').scrollTop = 300; }); await N.swipe(195, 450, 195, 780); const s4 = await N.sheet();
    say('4 sheet: right swipe / pull down / edge swipe closed:', s1, s2, s3, '| pull down while scrolled stays open:', s4);
    await N.keyboard.press('Escape'); await N.waitForTimeout(400);
    // ---- 5. password reset by e-mail ----
    await N.tap('.ph-act [data-act="settings"]'); await N.tap('#sheet-root .acc-row [data-act="accOpen"]'); await N.tap('[data-act="accMode"][data-m="pass"]');
    say('5 change password screen:', (await N.txt('#sheet-root .sheet-body') || '').slice(0, 90)); await N.tap('[data-act="accPassMail"]', 1500);
    ml = await api('/__mails'); const rs = ml.filter(m => m.type === 'reset'); say('5 reset mail sent:', rs.length, rs[0] && rs[0].ru, '| screen:', (await N.txt('#sheet-root .hint') || '').slice(0, 50));
    const R = await phone(); await R.goto(`http://127.0.0.1:8895/?mode=resetPassword&oobCode=${rs[0].code}`); await R.waitForTimeout(1800);
    say('5 link opens the new-password screen:', await R.sheet(), '| url cleaned:', await R.evaluate(() => !location.search));
    await R.fill('#acc-new', 'newpass1'); await R.tap('[data-act="accNewPass"]', 1200); say('5 saved:', (await R.txt('#sheet-root .hint') || '').slice(0, 40));
    await R.tap('[data-act="accMode"][data-m="login"]'); await R.fill('#acc-email', 'n@test.ru'); await R.fill('#acc-pass', 'secret1'); await R.tap('[data-act="accLogin"]', 1500); say('5 old password refused:', await R.txt('.acc-err'));
    await R.fill('#acc-pass', 'newpass1'); await R.tap('[data-act="accLogin"]', 4000); say('5 new password works:', await R.sheet() === null || /welcome|Добро/.test(String(await R.sheet())) ? 'in the app' : await R.sheet(), '| name restored:', await R.txt('.page-head h1'));
    // ---- 6. link from the verification mail opened in another browser ----
    const V = await phone(); await V.goto('http://127.0.0.1:8895/'); await V.waitForTimeout(1200); await V.tap('[data-act="accMode"][data-m="signup"]'); await V.fill('#acc-email', 'v@test.ru'); await V.fill('#acc-pass', 'secret1'); await V.tap('[data-act="accSignup"]', 2000);
    const vm = (await api('/__mails')).filter(m => m.type === 'verify' && m.email === 'v@test.ru').pop();
    const V2 = await phone(); await V2.goto(`http://127.0.0.1:8895/?mode=verifyEmail&oobCode=${vm.code}`); await V2.waitForTimeout(1500); say('6 link in another browser:', await V2.txt('.toast'));
    await V.waitForTimeout(5500); say('6 first phone moved on by itself:', await V.sheet());
    // ---- 7. Google at the gate ----
    const G = await phone(); await G.goto('http://127.0.0.1:8895/'); await G.waitForTimeout(1200); await G.tap('[data-act="accGoogle"]', 4000);
    say('7 Google:', await G.sheet(), '| name prefilled:', await G.evaluate(() => (document.querySelector('#wl-name') || {}).value));
    // ---- 8. sign out → locked again ----
    await N.keyboard.press('Escape'); await N.waitForTimeout(400); await N.keyboard.press('Escape'); await N.waitForTimeout(400); await N.tap('.ph-act [data-act="settings"]'); await N.tap('#sheet-root .acc-row [data-act="accOpen"]'); await N.tap('[data-act="accOut"]'); await N.tap('[data-act="accOut"]', 900); say('8 after sign-out:', await N.sheet());
    // ---- 9. local user with data meets the gate ----
    const L = await phone(); await L.goto('http://127.0.0.1:8895/');
    await L.evaluate(async () => { const db = await new Promise(res => { const r = indexedDB.open('podhod', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); }); const put = (k, v) => new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; });
      await put('meta', { profiles: [{ id: 'main', name: 'Дима', color: 'lime', char: 'owl' }], cur: 'main', mode: 'solo', v2seen: true, v22seen: true, v23seen: true, v24seen: true, v25seen: true, v26seen: true, v27seen: true, v271seen: true, v28seen: true });
      await put('p:main', { profile: {}, workouts: [{ id: 'w1', start: Date.now() - 864e5, end: Date.now() - 864e5 + 36e5, exercises: [] }], active: null }); });
    await L.reload(); await L.waitForTimeout(1500); say('9 existing local user:', await L.sheet());
    await L.tap('[data-act="accMode"][data-m="login"]'); await L.fill('#acc-email', 'n@test.ru'); await L.fill('#acc-pass', 'newpass1'); await L.tap('[data-act="accLogin"]', 4000);
    say('9 after sign-in:', await L.sheet(), '| greeting:', await L.txt('.page-head h1'));
    st = await api('/__state'); say('9 local workout reached the cloud:', Object.values(st.docs).some(d => d.j && d.j.includes('"w1"')));
  } catch (e) { errs.push('TEST ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  console.log('ERRORS', JSON.stringify(errs, null, 1));
  await b.close(); procs.forEach(x => x.kill());
})();
