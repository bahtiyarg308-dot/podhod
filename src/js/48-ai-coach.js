/* ================= 3.4: ИИ-тренер =================
   Ключи ИИ в приложении не хранятся: запросы идут к небольшому воркеру на Cloudflare (worker/podhod-ai.js), который проверяет вход,
   считает дневной лимит и спрашивает ИИ. Приложение отправляет вопрос и короткую сводку (без имени и почты) — только после согласия.
   Режимы: chat (вопрос-ответ), week (разбор недели), program (недельная программа, JSON), goal (шаги и привычки к цели, JSON). */
const AI_URL_DEFAULT = ''; // адрес воркера (https://…workers.dev); можно задать и на экране «ИИ-тренер», тогда он хранится на телефоне
const AI_KEEP = 30;
const aiUrl = () => { const u = String((S.meta && S.meta.aiUrl) || AI_URL_DEFAULT || '').trim().replace(/\/+$/, ''); return /^https:\/\/[^\s/]+(\/[^\s]*)?$/.test(u) ? u : ''; };
const aiOn = () => !!aiUrl();
const aiAcc = () => { const a = accOf(); return a && verOk(a) ? a : null; }; // только аккаунт ЭТОГО профиля: чужой аккаунт с этого телефона не подставляется
const AI_QUICK = [
  ['week', 'Разбор недели', 'Разберите мою прошлую и текущую неделю.'],
  ['program', 'Программа по моим данным', 'Составьте мне программу на неделю под мой уровень и цель.'],
  ['goal', 'Цель и привычки', 'Хочу поставить цель и завести пару полезных привычек. С чего начать?'],
  ['chat', 'Что тренировать сегодня?', 'Что мне лучше потренировать сегодня и почему?'],
];
const AI_ERR = {
  nourl: 'Адрес ИИ-посредника не указан.', noacc: 'ИИ-тренер работает только в профиле, привязанном к аккаунту. Войдите в аккаунт для этого профиля.', relogin: 'Нужно войти в аккаунт заново (настройки → аккаунт).', auth: 'Сервер не принял вход. Выйдите и войдите в аккаунт заново.',
  net: 'Нет связи. Проверьте интернет и повторите.', slow: 'ИИ отвечает слишком долго. Попробуйте ещё раз.', limit: 'На сегодня вопросы закончились. Они обновятся завтра.', limitAll: 'Сегодня ИИ-тренер уже ответил слишком многим. Загляните завтра.',
  forbidden: 'Этот аккаунт не допущен к ИИ-тренеру. Владелец воркера должен добавить вашу почту в список ALLOWED_EMAILS.', down: 'ИИ сейчас не отвечает. Попробуйте через минуту.', conf: 'ИИ-посредник ещё не настроен до конца (см. инструкцию).', bad: 'Не получилось отправить вопрос. Сократите его и повторите.',
};

/* ---------- сводка для ИИ: всё о вас, кроме переписки; без имени и почты, без фото и данных партнёра ---------- */
const AI_CONSENT = 2; // версия согласия: при расширении данных число растёт, и приложение спрашивает заново
const AI_CTX_MAX = 20000; // знаков; воркер принимает до 24000
const WDN = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
function aiSets(x, e) { // подходы одного упражнения коротко: «3x(82.5x8), 80x6»
  const out = []; let last = '', n = 0;
  const flush = () => { if (last) out.push(n > 1 ? `${n}x(${last})` : last); };
  (x.sets || []).forEach(s => { if (s.warm || !valid(s, e.kind)) return; const t = s.w != null || s.r != null ? `${s.w != null ? nf(s.w, 1) : ''}x${s.r != null ? s.r : ''}` : s.t != null || s.d != null ? `${s.d != null ? s.d + 'км ' : ''}${s.t != null ? s.t + 'с' : ''}`.trim() : '1'; if (t === last) n++; else { flush(); last = t; n = 1; } });
  flush(); return out.slice(0, 6).join(', ');
}
function aiContext() {
  const p = S.profile, now = Date.now(), ws = weekStart(now), L = levelOf(totalXP()), sd = startOfDay(now);
  const wk = x => { const s = weekStats(x); return { trainings: s.list.length, tons: Math.round(s.st.vol / 100) / 10, sets: s.st.sets, records: s.prs.length, top: s.topEx ? exById(s.topEx[0]).name : null }; };
  const ctx = { profile: { level: L.k, title: L.title, goalTrainingsPerWeek: p.goal || 3, weeksInARow: goalStreak().n || 0, trainingsTotal: S.workouts.length, firstTraining: S.workouts.length ? dayKey(S.workouts[S.workouts.length - 1].start) : null }, thisWeek: wk(ws), lastWeek: wk(addDays(ws, -7)) };
  if (p.sex) ctx.profile.sex = p.sex;
  const byMonth = {}; S.workouts.forEach(w => { const k = dayKey(w.start).slice(0, 7); (byMonth[k] || (byMonth[k] = [])).push(w); });
  ctx.months = Object.keys(byMonth).sort().reverse().slice(0, 12).map(k => { const a = agg(byMonth[k]); return { m: k, trainings: a.n, tons: Math.round(a.vol / 100) / 10 }; });
  const bw = [...(p.body || [])].sort((a, b) => b.d - a.d).slice(0, 15).map(e => ({ d: dayKey(e.d), kg: e.w })); if (bw.length) ctx.weight = bw;
  const ms = [...(p.meas || [])].sort((a, b) => b.d - a.d).slice(0, 6).map(e => { const o = { d: dayKey(e.d) }; MEAS.forEach(([k]) => { if (e[k] > 0) o[k] = e[k]; }); return o; }); if (ms.length) ctx.measurementsCm = ms;
  ctx.workouts = S.workouts.slice(0, 12).map(w => { const o = { d: dayKey(w.start), t: w.title || 'Тренировка' }; if (w.end > w.start) o.min = Math.round((w.end - w.start) / 60000); const f = FEELS.find(x => x[0] === w.feel); if (f) o.feel = f[1]; if (w.note) o.note = String(w.note).slice(0, 200); o.ex = (w.exercises || []).map(x => { const e = exById(x.ex), t = aiSets(x, e); return t ? `${e.name}: ${t}` : null; }).filter(Boolean).slice(0, 10); return o; });
  const top = Object.entries(D.usage).sort((a, b) => b[1] - a[1]).slice(0, 25);
  ctx.exercises = top.map(([id, n]) => { const e = exById(id), h = D.hist[id] || [], l = h[h.length - 1], bb = D.best[id] || {}; const o = { n: e.name, sessions: n, last: l ? dayKey(l.start) : null }; if (bb.maxW) o.maxKg = bb.maxW; const be = Math.round(Math.max(0, ...h.map(x => x.topE || 0))); if (be) { o.e1rmBest = be; o.e1rmLast = Math.round(l.topE || 0); } return o; });
  ctx.records = D.prEvents.slice(0, 8).map(r => ({ d: dayKey(r.start), ex: exById(r.ex).name, set: r.set && r.set.w != null ? `${nf(r.set.w, 1)}x${r.set.r != null ? r.set.r : ''}` : null }));
  if (p.templates.length) ctx.programs = p.templates.slice(0, 8).map(t => ({ name: t.name, ex: t.items.slice(0, 8).map(i => exById(i.ex).name) }));
  const plan = Object.entries(p.plan || {}).map(([d, id]) => { const t = p.templates.find(x => x.id === id); return t ? `${WDN[d]}: ${t.name}` : null; }).filter(Boolean); if (plan.length) ctx.weeklyPlan = plan;
  const hs = (p.habits || []).filter(h => !h.ar).slice(0, 15).map(h => ({ n: h.name, kind: habCat(h.cat)[1], paused: !!h.off || undefined, days: h.days && h.days.length ? h.days.map(d => WDN[d]).join(',') : 'каждый день', streak: habStreak(p, h), last14: Array.from({ length: 14 }, (_, i) => { const t = (p.hlog || {})[dayKey(addDays(sd, -i))]; return t && t[h.id] != null ? 1 : 0; }).join('') })); if (hs.length) ctx.habits = hs;
  const sp = (p.supps || []).slice(0, 12).map(x => ({ n: x.name, dose: x.dose ? `${x.dose} ${x.unit || ''}`.trim() : undefined, when: (SUP_WHEN.find(w => w[0] === x.when) || [])[1], paused: !!x.off || undefined, takenLast7: Array.from({ length: 7 }, (_, i) => ((p.slog || {})[dayKey(addDays(sd, -i))] || []).includes(x.id) ? 1 : 0).reduce((a, b) => a + b, 0) })); if (sp.length) ctx.supplements = sp;
  const lag = typeof lagMuscles === 'function' ? lagMuscles()[0] : null; if (lag) ctx.laggingMuscle = MUS[lag[0]] ? MUS[lag[0]][0] : lag[0];
  // too long: drop the least important detail first
  const size = () => JSON.stringify(ctx).length;
  while (size() > AI_CTX_MAX) { if (ctx.workouts.length > 5) ctx.workouts.pop(); else if (ctx.exercises.length > 12) ctx.exercises.pop(); else if (ctx.months.length > 6) ctx.months.pop(); else if (ctx.workouts.length > 2) ctx.workouts.pop(); else if (ctx.exercises.length > 4) ctx.exercises.pop(); else break; }
  return ctx;
}
const aiCtxText = () => JSON.stringify(aiContext(), null, 1);

/* ---------- запрос ---------- */
async function aiAsk(mode, messages, extra = {}) {
  const url = aiUrl(); if (!url) throw { code: 'nourl' };
  const acc = aiAcc(); if (!acc) throw { code: 'noacc' };
  let tok; try { tok = await accToken(acc); } catch (e) { throw { code: e && e.code === 'relogin' ? 'relogin' : 'net' }; }
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 35000); let r;
  try { r = await fetch(url + '/ask', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify({ mode, messages, context: aiContext(), ...extra }), signal: ctl.signal }); }
  catch (e) { throw { code: ctl.signal.aborted ? 'slow' : 'net' }; } finally { clearTimeout(timer); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw { code: r.status === 429 ? (j.why === 'global' ? 'limitAll' : 'limit') : r.status === 401 ? 'auth' : (r.status === 403 && j.error === 'not_allowed') ? 'forbidden' : r.status === 502 ? 'down' : r.status === 503 ? 'conf' : 'bad' };
  if (typeof j.text !== 'string' || !j.text.trim()) throw { code: 'down' };
  return j;
}
const aiJson = t => { const s = String(t), a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a < 0 || b <= a) return null; try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; } };
const aiStr = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n) : '';
const aiInt = (v, lo, hi, d) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
function aiExId(name) {
  const q = normQ(name).trim(); if (!q) return null;
  const list = allExercises(), exact = list.find(e => normQ(e.name) === q); if (exact) return exact.id;
  const part = list.filter(e => { const n = normQ(e.name); return n.includes(q) || q.includes(n); }).sort((a, b) => a.name.length - b.name.length)[0];
  return part ? part.id : null;
}
// ответ ИИ в виде JSON → безопасные данные для карточки; всё, чего нет в приложении, отбрасывается
function aiProgram(j) {
  if (!j || !Array.isArray(j.days)) return null; let skipped = 0;
  const days = j.days.slice(0, 6).map((d, i) => ({ name: aiStr(d && d.name, 40) || `День ${i + 1}`, items: (Array.isArray(d && d.items) ? d.items : []).slice(0, 10).map(it => { const id = aiExId(it && it.ex); if (!id) { skipped++; return null; } return { ex: id, sets: aiInt(it.sets, 1, 8, 3), reps: aiInt(it.reps, 1, 60, 10) }; }).filter(Boolean) })).filter(d => d.items.length);
  return days.length ? { name: aiStr(j.name, 40) || 'Программа от ИИ', note: aiStr(j.note, 200), days, skipped } : null;
}
function aiGoal(j) {
  if (!j || typeof j !== 'object') return null;
  const steps = (Array.isArray(j.steps) ? j.steps : []).map(s => aiStr(s, 120)).filter(Boolean).slice(0, 6);
  const habits = (Array.isArray(j.habits) ? j.habits : []).slice(0, 5).map(h => ({ name: aiStr(h && h.name, 40), cat: HAB_CATS.some(c => c[0] === (h && h.cat)) ? h.cat : 'd', d: aiInt(h && h.d, 0, 2, 1), days: [...new Set((Array.isArray(h && h.days) ? h.days : []).map(x => aiInt(x, 0, 6, -1)).filter(x => x >= 0))].sort() })).filter(h => h.name);
  const summary = aiStr(j.summary, 300); return summary || steps.length || habits.length ? { summary, steps, habits } : null;
}
function aiMd(t) {
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); let out = '', ul = false;
  for (const ln of String(t).split('\n')) {
    const m = ln.match(/^\s*[-•*]\s+(.*)$/);
    if (m) { if (!ul) { out += '<ul>'; ul = true; } out += '<li>' + inl(m[1]) + '</li>'; continue; }
    if (ul) { out += '</ul>'; ul = false; }
    if (ln.trim()) out += '<p>' + inl(ln) + '</p>';
  }
  return out + (ul ? '</ul>' : '');
}

/* ---------- разговор: хранится только на телефоне ---------- */
const coachS = () => S.coach || (S.coach = { pid: null, msgs: [], draft: '', busy: false, mode: 'chat', left: null, cfg: false, cfgUrl: '' });
function coachLoad() {
  const c = coachS(); if (c.pid === S.pid) return c.loading || Promise.resolve();
  const pid = c.pid = S.pid; c.msgs = []; c.err = ''; c.retry = null;
  return c.loading = KV.get('coach:' + pid).then(list => { c.loading = null; if (c.pid === pid && Array.isArray(list)) c.msgs = list.filter(m => m && typeof m.t === 'string').slice(-AI_KEEP); S.coachScroll = true; render(); });
}
const coachSave = () => { const c = coachS(); KV.set('coach:' + c.pid, c.msgs.slice(-AI_KEEP).map(m => ({ r: m.r, t: m.t, at: m.at, mode: m.mode, data: m.data }))); };
async function coachSend(text, mode) {
  const c = coachS(); text = String(text || '').trim().slice(0, 1000); if (!text || c.busy || !(S.meta && S.meta.aiOk === AI_CONSENT) || !aiOn() || !aiAcc()) return;
  await coachLoad(); if (c.busy) return;
  c.mode = mode || 'chat'; c.err = ''; c.draft = ''; c.msgs.push({ r: 'u', t: text, at: Date.now() }); c.busy = true; S.coachScroll = true; sfx('send'); render();
  const hist = c.msgs.slice(-8).map(m => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.t.slice(0, 1500) })); while (hist.length && hist[0].role !== 'user') hist.shift();
  try {
    const extra = c.mode === 'program' ? { names: allExercises().map(e => e.name).slice(0, 500) } : {};
    const j = await aiAsk(c.mode, hist, extra); let data = null;
    if (c.mode === 'program') data = aiProgram(aiJson(j.text)); else if (c.mode === 'goal') data = aiGoal(aiJson(j.text));
    const a = { r: 'a', t: data ? (c.mode === 'program' ? data.note || 'Вот программа.' : data.summary || 'Вот с чего можно начать.') : j.text, at: Date.now(), mode: c.mode };
    if (data) a.data = data; else if (c.mode === 'program' || c.mode === 'goal') a.t = 'ИИ ответил не в том виде. Попробуйте ещё раз или переформулируйте.';
    c.msgs.push(a); if (Number.isFinite(j.left)) c.left = j.left; sfx('tab'); coachSave();
  } catch (e) { c.err = AI_ERR[e && e.code] || AI_ERR.bad; c.errCode = e && e.code; c.retry = { text, mode: c.mode }; coachSave(); }
  c.busy = false; S.coachScroll = true; render();
}

/* ---------- экран ---------- */
const AI_DAY = d => ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][d];
function coachCard(m, i) {
  const d = m.data; if (!d) return '';
  if (m.mode === 'program') return `<div class="ai-card" data-key="aic-${i}"><b>${esc(d.name)}</b>${d.days.map(x => `<div class="ai-day"><span>${esc(x.name)}</span><small>${x.items.map(it => `${esc(exById(it.ex).name)} ${it.sets}×${it.reps}`).join(' · ')}</small></div>`).join('')}${d.skipped ? `<small class="muted">Без ${d.skipped} ${plural(d.skipped, ['упражнения', 'упражнений', 'упражнений'])}, которых нет в приложении.</small>` : ''}<button class="btn btn-primary btn-block" data-act="coachAddProg" data-i="${i}">${icon('plus')} Добавить в программы</button></div>`;
  if (m.mode === 'goal') return `<div class="ai-card" data-key="aic-${i}">${d.steps.length ? `<b>Шаги</b><ol>${d.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}${d.habits.length ? `<b>Привычки</b>${d.habits.map((h, k) => { const have = S.profile.habits.some(x => !x.ar && normQ(x.name) === normQ(h.name)); return `<div class="ai-day"><span>${esc(h.name)}</span><small>${esc(habCat(h.cat)[1])} · ${h.days.length ? h.days.map(AI_DAY).join(', ') : 'каждый день'}</small><button class="btn btn-sm${have ? '' : ' btn-primary'}" data-act="coachAddHab" data-i="${i}" data-k="${k}"${have ? ' disabled' : ''}>${have ? 'Уже есть' : 'Добавить'}</button></div>`; }).join('')}` : ''}</div>`;
  return '';
}
function viewCoach() {
  const head = headHTML('ИИ-тренер', `${icon('spark')} Умный помощник`);
  if (!ready()) return head + loadingHTML(); coachLoad(); const c = coachS(), on = aiOn(), ok = !!(S.meta && S.meta.aiOk === AI_CONSENT);
  const setup = `<section class="panel ai-setup"><h3>Подключение</h3><p>Ключи ИИ не хранятся в приложении: вопросы идут через ваш небольшой посредник на Cloudflare. Инструкция на 10 минут — по ссылке ниже; после неё вы получите адрес вида <b>https://podhod-ai.….workers.dev</b>.</p>
    <label class="lbl">Адрес посредника<input class="field" id="ai-url" data-in="aiUrl" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://podhod-ai.имя.workers.dev" value="${esc(c.cfgUrl || (S.meta && S.meta.aiUrl) || '')}"></label>
    <div class="row" style="margin-top:12px"><button class="btn btn-primary" data-act="aiSaveUrl">Подключить</button>${on ? '<button class="btn" data-act="aiCfgToggle">Отмена</button>' : ''}</div>
    <p class="fine"><a href="worker/" target="_blank" rel="noopener">Как создать посредника</a></p></section>`;
  if (!on || c.cfg) return head + setup;
  if (!aiAcc()) return `${head}<section class="panel ai-setup"><h3>Нужен аккаунт</h3><p>ИИ-тренер видит только данные этого профиля и только если профиль привязан к вашему аккаунту. Другие профили на телефоне, чужие аккаунты и облако приложения ему недоступны.</p><button class="btn btn-primary btn-block" data-act="accOpen">Войти в аккаунт</button></section>`;
  if (!ok) return `${head}<section class="panel ai-setup"><h3>Перед началом</h3><p>Чтобы ИИ видел вашу картину целиком, с каждым вопросом в сервис уходит сводка о вас: уровень, вся история тренировок (последние подробно, остальное цифрами), рекорды, программы и расписание, привычки, добавки, замеры, вес и ваши заметки к тренировкам. <b>Не отправляются:</b> переписка с партнёром, фото, данные партнёра, имя и почта. Тренер видит только данные этого профиля, привязанного к вашему аккаунту: другие профили на телефоне, чужие аккаунты и облако приложения ему недоступны.</p><p>Ответы могут быть неточными и не заменяют врача или тренера.</p><button class="btn btn-block" data-act="aiCtxOpen">Посмотреть, что именно уйдёт</button><button class="btn btn-primary btn-block" data-act="aiConsent">Понятно, включить</button><p class="fine"><button class="btn btn-ghost btn-sm" data-act="aiCfgToggle">Изменить адрес посредника</button></p></section>`;
  const msgs = c.msgs.map((m, i) => `<div class="msg ai-msg${m.r === 'u' ? ' me' : ''}" data-key="am-${m.at}-${i}">${m.r === 'u' ? '' : `<span class="ai-ava">${icon('spark')}</span>`}<div class="msg-b ai-b">${m.r === 'u' ? esc(m.t) : aiMd(m.t)}${m.r === 'a' ? coachCard(m, i) : ''}</div></div>`).join('');
  const empty = !c.msgs.length && !c.busy ? `<div class="empty ai-empty"><h3>Спросите что угодно о тренировках</h3><p>Тренер видит вашу историю: упражнения, веса, привычки. Выберите готовый вопрос или напишите свой.</p></div>` : '';
  const chips = `<div class="chips ai-chips" role="group" aria-label="Готовые вопросы">${AI_QUICK.map(([m, l, t], i) => `<button class="chip" data-act="coachQuick" data-i="${i}"${c.busy ? ' disabled' : ''}>${esc(l)}</button>`).join('')}</div>`;
  const err = c.err ? `<div class="ai-err" role="alert">${esc(c.err)}${c.retry && !['limit', 'limitAll', 'noacc', 'relogin', 'auth', 'conf', 'nourl', 'forbidden'].includes(c.errCode) ? ' <button class="btn btn-sm" data-act="coachRetry">Повторить</button>' : ''}</div>` : '';
  return `${head}<div class="chat ai-chat" id="coach-list">${empty}${msgs}${c.busy ? `<div class="msg ai-msg" data-key="am-busy"><span class="ai-ava">${icon('spark')}</span><div class="msg-b ai-b ai-dots" aria-label="Тренер думает"><i></i><i></i><i></i></div></div>` : ''}${err}</div>
    <div class="ai-foot">${chips}<div class="ai-meta"><span>${c.left != null ? `Осталось вопросов сегодня: ${c.left}` : 'ИИ может ошибаться'}</span><span><button class="btn btn-ghost btn-sm" data-act="aiCtxOpen">Что видит тренер</button><button class="btn btn-ghost btn-sm" data-act="coachClear"${c.msgs.length ? '' : ' disabled'}>Очистить</button><button class="btn btn-ghost btn-sm" data-act="aiCfgToggle">Адрес</button></span></div></div>
    <div class="composer ai-composer"><textarea id="coach-in" data-in="coachText" rows="1" placeholder="Вопрос тренеру" aria-label="Вопрос тренеру" enterkeyhint="send" maxlength="1000">${esc(c.draft)}</textarea><button class="btn btn-primary" data-act="coachSend" aria-label="Отправить"${c.busy ? ' disabled' : ''}>${icon('send')}</button></div>`;
}

/* ---------- действия ---------- */
SHEETS.aictx = sh => `${sheetHead('Что видит тренер', 'уходит с каждым вопросом')}<div class="sheet-body">
  <p class="fine" style="margin:0 0 10px">Это сводка, которую приложение прикладывает к вопросу (${nf(sh.text.length, 0)} знаков). Имя и почта в неё не входят, переписки с партнёром, фото, данных партнёра и других профилей в ней нет. Ничего из этого не хранится в сервисе: он использует сводку, чтобы ответить.</p>
  <pre class="ai-pre">${esc(sh.text)}</pre></div>`;
Object.assign(IN, { coachText: el => { coachS().draft = el.value; }, aiUrl: el => { coachS().cfgUrl = el.value; } });
Object.assign(A, {
  aiSaveUrl: () => {
    const c = coachS(), v = String(c.cfgUrl || ($('#ai-url') || {}).value || '').trim().replace(/\/+$/, '');
    if (!/^https:\/\/[^\s/]+(\/[^\s]*)?$/.test(v)) { toast('Нужен адрес вида https://…workers.dev'); return; }
    ensureMeta().aiUrl = v; saveMeta(); c.cfg = false; c.cfgUrl = ''; sfx('tab'); toast('ИИ-тренер подключён'); render();
  },
  aiCfgToggle: () => { const c = coachS(); c.cfg = !c.cfg; c.cfgUrl = (S.meta && S.meta.aiUrl) || ''; render(); },
  aiCtxOpen: () => openSheet({ type: 'aictx', text: aiCtxText() }),
  aiConsent: () => { ensureMeta().aiOk = AI_CONSENT; saveMeta(); sfx('tab'); render(); },
  coachSend: () => { const c = coachS(), v = c.draft || ($('#coach-in') || {}).value || ''; coachSend(v, 'chat'); },
  coachQuick: el => { const q = AI_QUICK[+el.dataset.i]; if (q) coachSend(q[2], q[0]); },
  coachRetry: () => { const c = coachS(); if (c.retry) { c.msgs = c.msgs.filter((m, i) => !(i === c.msgs.length - 1 && m.r === 'u' && m.t === c.retry.text)); coachSend(c.retry.text, c.retry.mode); } },
  coachClear: () => { const c = coachS(); c.msgs = []; c.err = ''; c.retry = null; coachSave(); render(); },
  coachAddProg: el => {
    const m = coachS().msgs[+el.dataset.i], d = m && m.data; if (!d || !d.days) return;
    const have = new Set(S.profile.templates.map(t => t.name)), uniq = n => { let r = n, i = 2; while (have.has(r)) r = n + ' ' + i++; have.add(r); return r; };
    d.days.forEach(x => S.profile.templates.push({ id: uid(), name: uniq(x.name), items: x.items.map(it => ({ ex: it.ex, sets: it.sets, reps: it.reps })) }));
    saveProfile(); sfx('goal'); toast(`Добавлено программ: ${d.days.length}`); render();
  },
  coachAddHab: el => {
    const m = coachS().msgs[+el.dataset.i], h = m && m.data && m.data.habits && m.data.habits[+el.dataset.k]; if (!h) return;
    if (S.profile.habits.some(x => !x.ar && normQ(x.name) === normQ(h.name))) return;
    S.profile.habits.push({ id: uid(), name: h.name, ic: 'check', cat: h.cat, d: h.d, days: [...h.days], auto: '', ts: Date.now() });
    habSyncAuto(); saveProfile(); sfx('sup'); toast(`«${h.name}» в привычках`); render();
  },
  coachWeek: () => { S.sheets = []; go('coach'); coachSend(AI_QUICK[0][2], 'week'); },
});
