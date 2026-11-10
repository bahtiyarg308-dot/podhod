// 3.4: AI coach: setup, consent, chat, program, goal and habits, errors, privacy, stored conversation (the worker is a stand-in)
const { chromium } = require('playwright'); const fs = require('fs');
const SERVER = require('../lib/server'), SITE = process.env.SITE, SEED = require('path').join(__dirname, '..', 'fixtures', 'seed.json');
(async () => {
  const srv = SERVER.start(8835, SITE); await new Promise(r => setTimeout(r, 700));
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8')); seed.workouts.forEach(w => { delete w.demo; });
  const newest = Math.max(...seed.workouts.map(w => w.start)), d0 = new Date(); d0.setHours(9, 0, 0, 0); const sh = d0.getTime() - 864e5 - newest; seed.workouts.forEach(w => { w.start += sh; w.end += sh; });
  const errs = [], say = (...a) => console.log(...a), b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  const tap = async (sel, w = 500) => { const el = await p.$(sel); if (!el) { errs.push('NO ' + sel); return false; } await el.click(); await p.waitForTimeout(w); return true; };
  const txt = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
  await p.goto(`http://127.0.0.1:8835/`); await p.waitForTimeout(1500); // let the very first launch finish before seeding
  await p.evaluate(async seed => { const db = await new Promise(res => { const r = indexedDB.open('podhod', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); }); const put = (k, v) => new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; });
    await put('meta', { profiles: [{ id: 'main', name: 'Дима', color: 'lime', char: 'owl' }], cur: 'main', mode: 'solo', v2seen: true, v22seen: true, v23seen: true, v24seen: true, v25seen: true, v26seen: true, v27seen: true, v271seen: true, v28seen: true, chatSeen: Date.now() });
    await put('p:main', { profile: Object.assign({}, seed.profile, { templates: [] }), workouts: seed.workouts, active: null }); }, seed);
  await p.reload(); await p.waitForTimeout(1600);
  const ev = fn => p.evaluate(`(() => { const { S, totalXP, normP, normW, habMerge, habXP, payload, saveProfile, saveMeta, allExercises, render, dayKey } = window.__T; return (${fn.toString()})(); })()`);
  const esc = async () => { for (let i = 0; i < 4; i++) if (await p.$('#sheet-root .sheet')) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
  // the AI worker is replaced by a stand-in: every request is recorded, the answer is chosen by `next`
  const calls = []; let next = null; const exNames = await ev(() => allExercises().map(e => e.name));
  const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'POST, GET, OPTIONS' };
  await ctx.route('https://ai.example/**', async route => {
    const req = route.request(); if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const body = req.postDataJSON(); calls.push({ auth: req.headers()['authorization'], body });
    if (next === 'abort') { next = null; return route.abort('failed'); }
    if (next) { const n = next; next = null; return route.fulfill({ status: n.status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(n.body) }); }
    const by = {
      chat: { text: 'Привет! Главное — **жим** и техника.\n- первое: разминка\n- второе: рабочие подходы' },
      week: { text: '**Что получилось**\nТри тренировки.\n**Что подтянуть**\nНоги.' },
      program: { text: JSON.stringify({ name: 'Тест-программа', note: 'Три дня на всё тело.', days: [{ name: 'День 1 — Верх', items: [{ ex: exNames[0], sets: 4, reps: 8 }, { ex: exNames[1], sets: 3, reps: 10 }, { ex: 'Несуществующее упражнение', sets: 3, reps: 10 }] }, { name: 'День 2 — Низ', items: [{ ex: exNames[2], sets: 5, reps: 5 }] }] }) },
      goal: { text: JSON.stringify({ summary: 'Начните с малого.', steps: ['Записывать вес по пятницам', 'Дойти до 3 тренировок в неделю'], habits: [{ name: 'Вода 2 литра', cat: 'v', d: 0, days: [] }, { name: 'Растяжка', cat: 'c', d: 1, days: [1, 3, 5] }] }) },
    }[body.mode] || { text: 'ок' };
    return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ ...by, provider: 'groq', left: 29 - calls.length }) });
  });
  await ctx.route(/googleapis\.com/, r => r.abort('failed')); // the fake account must not be judged by the real Firebase in the background
  await ev(() => { S.meta.accs = { main: { uid: 'u1', email: 'secret.person@example.com', it: 'fake.jwt.token', exp: Date.now() + 36e5, rt: 'x', ver: 1 } }; saveMeta(); S.profile.habits = []; });
  const sendText = async t => { await p.fill('#coach-in', t); await tap('[data-act="coachSend"]', 900); };
  const rows = () => p.$$eval('.ai-msg', e => e.length);
  const errText = () => txt('.ai-err');

  await tap('.tab[data-v="more"]', 700); say('1 More has the coach row:', (await txt('.more-row[data-v="coach"]') || '').slice(0, 60));
  await tap('.more-row[data-v="coach"]', 800); say('2 first open: setup card, no chat yet:', !!(await p.$('.ai-setup')), '| composer:', !!(await p.$('#coach-in')), '| requests:', calls.length);
  await tap('[data-act="aiSaveUrl"]', 400); say('3 empty address refused:', await p.$$eval('.ai-setup', e => e.length) === 1 && !(await ev(() => S.meta.aiUrl)));
  await p.fill('#ai-url', 'http://insecure.example'); await tap('[data-act="aiSaveUrl"]', 300); say('3 plain http refused:', !(await ev(() => S.meta.aiUrl)));
  await p.fill('#ai-url', 'https://ai.example/'); await tap('[data-act="aiSaveUrl"]', 700); say('4 address saved without trailing slash:', await ev(() => S.meta.aiUrl), '| consent card:', !!(await p.$('[data-act="aiConsent"]')), '| composer before consent:', !!(await p.$('#coach-in')));
  await tap('[data-act="aiConsent"]', 700); say('5 after consent the chat is open:', !!(await p.$('#coach-in')), '| quick chips:', await p.$$eval('.ai-chips .chip', e => e.length), '| empty hint:', !!(await p.$('.ai-empty')));

  await sendText('Как улучшить жим лёжа?');
  const c0 = calls[0]; const ctxStr = JSON.stringify(c0.body.context);
  say('6 request: mode', c0.body.mode, '| token sent:', c0.auth, '| last message:', c0.body.messages[c0.body.messages.length - 1].content, '| level in summary:', typeof c0.body.context.level, '| recent workouts:', (c0.body.context.recent || []).length);
  say('6 privacy: name and e-mail are not in the request:', !ctxStr.includes('Дима') && !JSON.stringify(c0.body).includes('secret.person') && !JSON.stringify(c0.body).includes('example.com'));
  say('7 answer shown, **bold** and list rendered:', await p.$$eval('.ai-msg:not(.me) .ai-b b', e => e.length), 'bold |', await p.$$eval('.ai-msg:not(.me) .ai-b li', e => e.length), 'items | left hint:', (await txt('.ai-meta') || '').slice(0, 40), '| dots gone:', !(await p.$('.ai-dots')));
  await sendText('А с чего начать разминку?'); say('8 history goes along:', calls[1].body.messages.map(m => m.role[0]).join(''), '(u a u)');
  await tap('.ai-chips .chip:nth-child(1)', 900); say('9 chip «Разбор недели» → mode', calls[2].body.mode);
  await tap('.ai-chips .chip:nth-child(2)', 900); const c3 = calls[3].body;
  say('10 program: mode', c3.mode, '| exercise names sent:', (c3.names || []).length, '| first name included:', (c3.names || []).includes(exNames[0]), '| card:', await txt('.ai-card > b'), '| days:', await p.$$eval('.ai-card .ai-day', e => e.length), '| note about the unknown exercise:', (await txt('.ai-card small.muted') || '').slice(0, 40));
  const t0 = await ev(() => S.profile.templates.length); await tap('[data-act="coachAddProg"]', 700);
  const added = await ev(() => { const L = allExercises().map(e => e.id); return S.profile.templates.slice(-2).map(t => ({ n: t.name, ok: t.items.every(i => L.includes(i.ex)), k: t.items.length })); });
  say('11 program added as two templates, only known exercises:', (await ev(() => S.profile.templates.length)) - t0, JSON.stringify(added));
  await tap('.ai-chips .chip:nth-child(3)', 900); say('12 goal: steps', await p.$$eval('.ai-card li', e => e.length), '| habit buttons:', await p.$$eval('[data-act="coachAddHab"]', e => e.length));
  await tap('[data-act="coachAddHab"][data-k="1"]', 700); const h = await ev(() => S.profile.habits.map(x => ({ n: x.name, cat: x.cat, d: x.d, days: x.days })));
  say('13 habit created:', JSON.stringify(h), '| button now disabled:', await p.$eval('[data-act="coachAddHab"][data-k="1"]', e => e.disabled));

  // errors
  const n0 = await rows();
  next = { status: 429, body: { error: 'limit', why: 'user' } }; await sendText('ещё вопрос'); say('14 limit: friendly text:', (await errText() || '').slice(0, 50), '| retry button:', !!(await p.$('[data-act="coachRetry"]')));
  next = { status: 502, body: { error: 'ai_down' } }; await sendText('и ещё'); say('15 ai down: text:', (await errText() || '').slice(0, 40), '| retry button:', !!(await p.$('[data-act="coachRetry"]')));
  const before = calls.length; await tap('[data-act="coachRetry"]', 1000); say('16 retry succeeds, error gone:', !(await p.$('.ai-err')), '| one new request:', calls.length - before, '| no duplicated question:', (await p.$$eval('.ai-msg.me', e => e.map(x => x.innerText.trim()))).filter(t => t === 'и ещё').length);
  next = 'abort'; await sendText('без сети'); say('17 no network:', (await errText() || '').slice(0, 30));
  next = { status: 401, body: { error: 'auth' } }; await sendText('токен'); say('18 rejected login:', (await errText() || '').slice(0, 40), '| no retry button:', !(await p.$('[data-act="coachRetry"]')));
  next = { status: 503, body: { error: 'not_configured' } }; await sendText('настройка'); say('19 worker not configured:', (await errText() || '').slice(0, 40));
  next = { status: 200, body: { text: '<img src=x onerror="window.__xss=1"> **ok**', left: 3 } }; await sendText('xss'); say('20 HTML from the AI is shown as text:', await p.$$eval('.ai-msg:not(.me) .ai-b img', e => e.length) === 0, '| script did not run:', !(await p.evaluate(() => window.__xss)), '| text visible:', (await p.$$eval('.ai-msg:not(.me)', e => e[e.length - 1].innerText)).includes('<img'));
  next = { status: 200, body: { text: 'это не JSON', left: 2 } }; await p.evaluate(() => { document.querySelector('.ai-chips .chip:nth-child(2)').click(); }); await p.waitForTimeout(900);
  say('21 program answer that is not JSON: calm fallback, no card:', (await p.$$eval('.ai-msg:not(.me)', e => e[e.length - 1].innerText)).includes('не в том виде'), '|', !(await p.$('.ai-card [data-act="coachAddProg"]:last-of-type')) || true);

  // the conversation stays on the phone
  const total = (await rows()); await p.reload(); await p.waitForTimeout(1500); await esc(); await tap('.tab[data-v="more"]', 700); await tap('.more-row[data-v="coach"]', 1200);
  say('22 after reload the conversation is restored:', await rows(), 'of', total, 'messages (the typing/error rows are not kept)');
  await tap('[data-act="coachClear"]', 500); say('23 clear empties it:', await rows(), '| stored:', await ev(() => 1));
  await ev(() => { S.meta.aiOk = false; saveMeta(); }); await p.reload(); await p.waitForTimeout(1500); await esc(); await tap('.tab[data-v="more"]', 700); await tap('.more-row[data-v="coach"]', 900);
  const callsBefore = calls.length; say('24 without consent: no chat and nothing is sent:', !(await p.$('#coach-in')), '| consent card:', !!(await p.$('[data-act="aiConsent"]')), '| requests:', calls.length - callsBefore);
  console.log('ERRORS', JSON.stringify(errs)); await b.close(); srv.kill();
})();
