/* ================= 3.1: habits, tab «Путь», «Герой», «Ещё», «Сегодня» as one plan =================
   habits live in the private profile:
     habits : [{ id, name, ic, cat, d (0..2), days:[0..6]|[], off, ar, auto:'workout'|'supp'|'', ts }]
     hlog   : { 'YYYY-MM-DD': { habitId: xpGivenWhenTicked } }   — xp is fixed at the moment of the tick, so edits and deletes never rewrite history
     hfull  : ['YYYY-MM-DD', …]                                  — days when every habit due that day was done
   xp: a tick gives 5/10/15 by difficulty, at most HAB_CAP a day, +HAB_FULL for a full day. Automatic habits give 0 (the workout or the supplements already pay). */
const HAB_CATS = [['s', 'Сила', '#D96B5F'], ['v', 'Выносливость', '#E3A857'], ['d', 'Дисциплина', '#8FA8C8'], ['r', 'Разум', '#A78BD6'], ['c', 'Спокойствие', '#6FBFA5'], ['z', 'Достаток', '#D8C45F']];
const HAB_DIFF = [['Лёгкая', 5], ['Средняя', 10], ['Трудная', 15]];
const HAB_ICONS = ['check', 'flame', 'heart', 'sun', 'moon', 'target', 'star', 'spark', 'clock', 'pill', 'note', 'sound', 'today', 'trophy', 'shield', 'body'];
const HAB_CAP = 40, HAB_FULL = 10;
const HAB_QUICK = [['Вода 2 литра', 'heart', 'v', 0], ['Чтение 20 минут', 'note', 'r', 1], ['Прогулка 30 минут', 'sun', 'v', 1], ['Растяжка', 'body', 'v', 0], ['Без сахара', 'flame', 'd', 2], ['Сон до 23:00', 'moon', 'c', 1], ['Медитация 10 минут', 'spark', 'c', 1], ['Дневник', 'note', 'c', 0], ['Учёба 30 минут', 'target', 'r', 1], ['Отложить деньги', 'box', 'z', 1]];
const HAB_AUTO = [['', 'Вручную'], ['workout', 'По тренировке'], ['supp', 'По добавкам']];
const habCat = k => HAB_CATS.find(c => c[0] === k) || HAB_CATS[2];

function habDue(h, day) {
  if (!h || h.off || h.ar || swHid(h.id)) return false;
  if (h.ts && day < startOfDay(h.ts)) return false;
  if (Array.isArray(h.days) && h.days.length && !h.days.includes(new Date(day).getDay())) return false;
  return true;
}
function habDay(p, day) {
  const due = (p.habits || []).filter(h => habDue(h, day)), t = (p.hlog || {})[dayKey(day)] || {};
  const done = due.filter(h => t[h.id] != null).length;
  return { due, taken:t, done, full:due.length > 0 && done === due.length };
}
const habDayXP = t => Math.min(HAB_CAP, Object.values(t || {}).reduce((a, v) => a + (+v || 0), 0));
function habXP(p) {
  let n = 0; const l = p.hlog || {};
  for (const k in l) n += habDayXP(l[k]);
  return n + (Array.isArray(p.hfull) ? p.hfull.length : 0) * HAB_FULL;
}
const habShared = p => habXP(p); // the partner only gets one number
const habTodayXP = (p, day) => { const k = dayKey(day); return habDayXP((p.hlog || {})[k]) + ((p.hfull || []).includes(k) ? HAB_FULL : 0); };
function habFullFix(p, day) {
  const k = dayKey(day), st = habDay(p, day), f = new Set(p.hfull || []);
  if (st.full) f.add(k); else f.delete(k);
  p.hfull = [...f].sort();
}
function habToggle(id, day) {
  const p = S.profile, h = p.habits.find(x => x.id === id); if (!h || h.auto) return null;
  const k = dayKey(day), t = p.hlog[k] || (p.hlog[k] = {}), on = t[id] == null;
  if (on) t[id] = HAB_DIFF[h.d || 0][1]; else delete t[id];
  if (!Object.keys(t).length) delete p.hlog[k];
  habFullFix(p, day);
  const full = habDay(p, day).full;
  saveProfile();
  return { on, full };
}
function habAutoOk(h, day) {
  if (h.auto === 'workout') { const k = dayKey(day); return S.workouts.some(w => dayKey(w.start) === k); }
  if (h.auto === 'supp') return (S.profile.supps || []).length > 0 && supDay(S.profile, day).full;
  return false;
}
// automatic habits follow the real data of the last week; idempotent, called from derive()
function habSyncAuto() {
  const p = S.profile; if (!p || !Array.isArray(p.habits) || !p.habits.some(h => h.auto)) return;
  const today = startOfDay(Date.now());
  for (let i = 0; i < 8; i++) {
    const day = addDays(today, -i), k = dayKey(day); let chg = false;
    p.habits.forEach(h => {
      if (!h.auto) return;
      const t = p.hlog[k] || (p.hlog[k] = {}), has = t[h.id] != null, ok = habDue(h, day) && habAutoOk(h, day);
      if (ok && !has) { t[h.id] = 0; chg = true; } else if (!ok && has) { delete t[h.id]; chg = true; }
      if (!Object.keys(t).length) delete p.hlog[k];
    });
    if (chg) habFullFix(p, day);
  }
}
function habStreak(p, h, now = Date.now()) {
  const start = h.ts ? startOfDay(h.ts) : 0, L = p.hlog || {}, done = d => { const t = L[dayKey(d)]; return !!t && t[h.id] != null; };
  let day = startOfDay(now), n = 0;
  if (!done(day)) day = addDays(day, -1); // today is still in progress
  for (let i = 0; i < 800 && day >= start; i++) { if (done(day)) n++; else if (habDue(h, day)) break; day = addDays(day, -1); }
  return n;
}
function habFullStreak(p, now = Date.now()) {
  const full = new Set(p.hfull || []); if (!full.size) return 0;
  const first = keyDay([...full].sort()[0]); let day = startOfDay(now), n = 0;
  if (!full.has(dayKey(day))) day = addDays(day, -1);
  for (let i = 0; i < 800 && day >= first; i++) { const k = dayKey(day); if (full.has(k)) n++; else if ((p.habits || []).some(h => habDue(h, day))) break; day = addDays(day, -1); }
  return n;
}
// cloud / second phone: add what the other phone has, never remove
function habMerge(l, r) {
  const have = new Set(l.habits.map(o => o.id)); r.habits.forEach(o => { if (!have.has(o.id)) l.habits.push(o); });
  Object.entries(r.hlog || {}).forEach(([k, v]) => { if (v && typeof v === 'object') l.hlog[k] = Object.assign({}, v, l.hlog[k] || {}); });
  l.hfull = [...new Set([...(l.hfull || []), ...(r.hfull || [])])].sort();
}
const habSub = (p, h, day) => {
  const parts = [habCat(h.cat)[1]], n = habStreak(p, h, day === startOfDay(Date.now()) ? Date.now() : day + DAY - 1);
  if (n >= 2) parts.push(`${n} ${plural(n, ['день', 'дня', 'дней'])} подряд`);
  if (h.auto) parts.push(h.auto === 'workout' ? 'по тренировке' : 'по добавкам'); else parts.push('+' + HAB_DIFF[h.d || 0][1]);
  if (Array.isArray(h.days) && h.days.length && h.days.length < 7) parts.push(WD_ORDER.filter(d => h.days.includes(d)).map(d => WD[d]).join(', '));
  return parts.join(' · ');
};
const habDots = (p, h, day) => Array.from({ length:7 }, (_, i) => {
  const d = addDays(day, i - 6), t = (p.hlog || {})[dayKey(d)], on = !!t && t[h.id] != null;
  return `<i class="${on ? 'on' : habDue(h, d) && d < day ? 'miss' : ''}"></i>`;
}).join('');

/* ---------- the plan of the day ---------- */
function dayPlan() {
  const p = S.profile, today = startOfDay(Date.now()), k = dayKey(today), hs = habDay(p, today), ss = p.supps.length ? supDay(p, today) : { due:[], done:0, full:false };
  const planned = !!(p.plan && p.plan[new Date(today).getDay()] && p.templates.some(t => t.id === p.plan[new Date(today).getDay()]));
  const trained = S.workouts.some(w => dayKey(w.start) === k), wk = (planned || trained) ? 1 : 0;
  const xp = habTodayXP(p, today) + S.workouts.filter(w => dayKey(w.start) === k).reduce((a, w) => a + workoutXP(w, D), 0) + (ss.full ? 10 : 0);
  return { total:hs.due.length + ss.due.length + wk, done:hs.done + ss.done + (trained ? wk : 0), xp, habits:hs };
}
const ringSVG = (pct, sz = 58, w = 6) => { const r = (sz - w) / 2, c = 2 * Math.PI * r; return `<svg class="dring" width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" aria-hidden="true"><circle cx="${sz / 2}" cy="${sz / 2}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="${w}"/><circle cx="${sz / 2}" cy="${sz / 2}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${(c * Math.max(0, Math.min(100, pct)) / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${sz / 2} ${sz / 2})"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" class="dring-t">${Math.round(pct)}%</text></svg>`; };
function dayCardHTML() {
  const pl = dayPlan(); if (!pl.total) return '';
  return `<section class="day-card${pl.done >= pl.total ? ' full' : ''}" aria-label="Сегодня: выполнено ${pl.done} из ${pl.total}">${ringSVG(pl.done / pl.total * 100)}<div class="dc-t"><b>${pl.done} из ${pl.total}</b><span>${pl.done >= pl.total ? 'день закрыт' : 'за сегодня'}${pl.xp ? ` · +${pl.xp} XP` : ''}</span></div></section>`;
}
function heroMini() {
  const L = levelOf(totalXP()), kind = charOf(curProf()), m = moodNow(), mt = mateOf(S.profile, S.workouts);
  if (S.ateAt && !S.sheets.length) { S.eatUntil = Date.now() + 2600; S.ateAt = 0; const fd = S.wasHungry; S.wasHungry = false; setTimeout(() => sfx(fd ? 'fed' : 'nom'), 300); }
  if (S.profile.chest && !S.sheets.length && (S.profile.chest.rk == null || L.rank > S.profile.chest.rk)) setTimeout(() => { const nr = rankSync(); if (nr != null && !S.sheets.length) { openSheet({ type:'rankup', r:nr }); sfx('rank'); confetti(innerWidth / 2, innerHeight * .35, 110); } else render(); }, 0);
  return `<button class="hmini" data-act="nav" data-v="hero" aria-label="Герой: ${esc(L.title)}, уровень ${L.k}">${charSVG(kind, m.mood, { stage:mt.stage.k, gear:mt.gear })}<span class="hm-t"><b>${esc(L.title)}</b><span class="lvl-bar"><i style="width:${L.pct.toFixed(1)}%"></i></span></span><span class="lvl-xp">${L.cur}/${L.need} XP</span></button>`;
}
function habCardHTML() {
  const p = S.profile, today = startOfDay(Date.now()), live = p.habits.filter(h => !h.ar && !h.off);
  if (!live.length) return `<section class="sec"><div class="sec-head"><h2 class="h2">Привычки</h2></div><button class="prog prog-new hab-new" data-act="nav" data-v="path">${icon('plus')}<span>Добавьте первую привычку</span><small>Вода, чтение, сон — отмечайте и растите серию</small></button></section>`;
  const st = habDay(p, today); if (!st.due.length) return '';
  const rows = st.due.map(h => habRow(p, h, today, st.taken[h.id] != null)).join('');
  return `<section class="sec" data-key="hab-card"><div class="sec-head"><h2 class="h2">Привычки · ${st.done} из ${st.due.length}</h2><button class="btn btn-sm btn-ghost" data-act="nav" data-v="path">Все ${icon('chevron')}</button></div><div class="panel sup-list hab-list">${rows}</div></section>`;
}
function habRow(p, h, day, on, sw) {
  const c = habCat(h.cat), row = `<div class="sup-row hab-row${on ? ' on' : ''}" data-key="hb-${esc(h.id)}" style="--hc:${c[2]}"><button class="sup-check" data-act="habTake" data-id="${esc(h.id)}" data-day="${day}" aria-pressed="${on}"${h.auto ? ' disabled' : ''} aria-label="${h.auto ? 'Отмечается само' : on ? 'Отменить' : 'Сделал'}: ${esc(h.name)}">${icon(on ? 'check' : h.ic || 'check')}</button><button class="sup-main" data-act="habEdit" data-id="${esc(h.id)}" aria-label="Изменить: ${esc(h.name)}"><b>${esc(h.name)}</b><small>${esc(habSub(p, h, day))}</small></button><span class="hab-dots" aria-hidden="true">${habDots(p, h, day)}</span></div>`;
  return sw ? swOpen('h', h.id) + row + swClose() : row;
}

/* ---------- tab «Путь» ---------- */
function viewPath() {
  const head = headHTML('Путь', `${icon('repeat')} Привычки`);
  if (!ready()) return head + loadingHTML();
  const p = S.profile, today = startOfDay(Date.now()), hs = p.habits.filter(h => !h.ar && !swHid(h.id));
  if (!hs.length) {
    return `${head}<div class="empty sup-empty"><h3>Первая привычка</h3><p>Вода, чтение, сон, растяжка — всё, что хотите делать каждый день. Отмечайте галочкой, растите серию, получайте опыт и прокачивайте героя. Привычки видите только вы.</p></div>
      <section class="sec"><div class="sec-head"><h2 class="h2">Быстрый старт</h2></div><div class="sup-quick">${HAB_QUICK.map(([n, ic], i) => `<button class="chip" data-act="habQuick" data-i="${i}">${icon(ic)} ${esc(n)}</button>`).join('')}</div>
      <button class="btn btn-primary btn-block" style="margin-top:14px" data-act="habNew">${icon('plus')} Своя привычка</button></section>`;
  }
  const day = Math.max(addDays(today, -6), Math.min(today, S.habDay || today)), st = habDay(p, day), streak = habFullStreak(p), pct = st.due.length ? st.done / st.due.length * 100 : 0;
  const lbl = day === today ? 'Сегодня' : day === addDays(today, -1) ? 'Вчера' : `${WD_FULL[new Date(day).getDay()]}, ${dayMonth(day)}`;
  const live = hs.filter(h => !h.off && !st.due.includes(h)), paused = hs.filter(h => h.off);
  const off = (h, ic) => `<div class="sup-row off hab-row" data-key="hx-${esc(h.id)}"><span class="sup-check" aria-hidden="true">${icon(ic)}</span><button class="sup-main" data-act="habEdit" data-id="${esc(h.id)}"><b>${esc(h.name)}</b><small>${ic === 'moon' ? 'не в этот день' : 'на паузе'}</small></button></div>`;
  return `${head}
    <div class="sup-day"><button class="icon-btn" data-act="habDayShift" data-d="-1" aria-label="Предыдущий день"${day <= addDays(today, -6) ? ' disabled' : ''}>${icon('back')}</button><b>${lbl}</b><button class="icon-btn" data-act="habDayShift" data-d="1" aria-label="Следующий день"${day >= today ? ' disabled' : ''}>${icon('chevron')}</button></div>
    <section class="panel sup-sum${st.full ? ' full' : ''}"><div class="sup-sum-top"><div class="hs"><b>${st.done}<small>/${st.due.length}</small></b><span>сделано</span></div><div class="hs"><b>${icon('flame')}${streak}</b><span>${plural(streak, ['день', 'дня', 'дней'])} подряд</span></div><div class="hs"><b>+${habTodayXP(p, day)}</b><span>XP за день</span></div></div>
      <span class="q-bar"><i style="width:${pct.toFixed(1)}%"></i></span>${st.full ? `<p class="sup-done">${icon('check')} Все привычки ${day === today ? 'на сегодня' : 'этого дня'} выполнены</p>` : !st.due.length ? '<p class="sup-done muted">В этот день привычек по плану нет</p>' : ''}</section>
    ${st.due.length ? `<section class="sec" data-key="hab-due"><div class="sec-head"><h2 class="h2">По плану</h2><span class="h2">${st.done}/${st.due.length}</span></div><div class="panel sup-list hab-list">${st.due.map(h => habRow(p, h, day, st.taken[h.id] != null, true)).join('')}</div></section>` : ''}
    ${live.length || paused.length ? `<section class="sec" data-key="hab-rest"><div class="sec-head"><h2 class="h2">Остальные</h2></div><div class="panel sup-list">${live.map(h => off(h, 'moon')).join('')}${paused.map(h => off(h, 'snow')).join('')}</div></section>` : ''}
    <div class="row sup-actions"><button class="btn btn-add" data-act="habNew">${icon('plus')} Добавить</button></div>
    <p class="fine">Привычки видите только вы — партнёру уходит лишь общий опыт. Сделанная привычка даёт 5, 10 или 15 XP (не больше ${HAB_CAP} в день), полный день — ещё +${HAB_FULL}.</p>`;
}

/* ---------- tab «Герой» ---------- */
function viewHero() {
  const head = headHTML('Герой', `${icon('shield')} Уровень и напарник`);
  if (!ready()) return head + loadingHTML();
  return `${head}${hungerHTML()}${heroHTML()}${questsHTML()}
    <section class="sec"><div class="more-list"><button class="more-row" data-act="awards">${icon('trophy')}<span><b>Достижения</b><small>Награды за серии, рекорды и дисциплину</small></span>${icon('chevron')}</button></div></section>`;
}

/* ---------- tab «Ещё» ---------- */
function viewMore() {
  const head = headHTML('Ещё', `${icon('more')} Разделы и настройки`);
  if (!ready()) return head + loadingHTML();
  const n = chatUnread();
  const row = (act, v, ic, t, sub, badge) => `<button class="more-row" data-act="${act}"${v ? ` data-v="${v}"` : ''}>${icon(ic)}<span><b>${t}</b><small>${sub}</small></span>${badge ? `<i class="cnt" aria-label="${badge} непрочитанных">${badge > 9 ? '9+' : badge}</i>` : ''}${icon('chevron')}</button>`;
  return `${head}<section class="sec"><div class="more-list">
    ${pairOn() ? row('nav', 'chat', 'chat', 'Чат', 'Переписка с партнёром', n) : ''}
    ${row('nav', 'body', 'body', 'Тело', 'Вес, замеры и фото')}
    ${row('nav', 'supp', 'pill', 'Добавки', 'Свой план приёма')}
    ${row('awards', '', 'trophy', 'Достижения', 'Награды и ранги')}
    ${row('settings', '', 'settings', 'Настройки', 'Профиль, вид, облако, копии')}
  </div></section>`;
}
const trainSeg = () => `<div class="seg train-seg" role="group" aria-label="Раздел">${[['log', 'Журнал'], ['progress', 'Прогресс']].map(([v, l]) => `<button data-act="nav" data-v="${v}" aria-pressed="${S.view === v}">${l}</button>`).join('')}</div>`;

/* ---------- sheet, actions ---------- */
function habDraft(h) { return { name:h ? h.name : '', ic:h ? (h.ic || 'check') : 'check', cat:h ? h.cat : 'd', d:h ? (h.d || 0) : 1, days:h && Array.isArray(h.days) ? [...h.days] : [], auto:h ? (h.auto || '') : '', off:!!(h && h.off) }; }
SHEETS.hab = sh => {
  const d = sh.d;
  return `${sheetHead(sh.isNew ? 'Новая привычка' : 'Привычка')}<div class="sheet-body">
    <label class="lbl">Название<input class="field" id="hab-name" data-in="habF" data-f="name" value="${esc(d.name)}" placeholder="Например, чтение 20 минут" autocomplete="off" maxlength="40"></label>
    <div class="lbl" style="margin-top:12px">Значок<div class="hab-ics" role="group" aria-label="Значок">${HAB_ICONS.map(i => `<button class="hab-ic" data-act="habSet" data-f="ic" data-v="${i}" aria-pressed="${d.ic === i}" aria-label="${i}">${icon(i)}</button>`).join('')}</div></div>
    <div class="lbl" style="margin-top:12px">Что прокачивает<div class="chips wrap" role="group" aria-label="Атрибут">${HAB_CATS.map(c => `<button class="chip" data-act="habSet" data-f="cat" data-v="${c[0]}" aria-pressed="${d.cat === c[0]}"><i class="hab-dot" style="background:${c[2]}"></i>${c[1]}</button>`).join('')}</div></div>
    <div class="lbl" style="margin-top:12px">Сложность<div class="chips wrap" role="group" aria-label="Сложность">${HAB_DIFF.map(([n, x], i) => `<button class="chip" data-act="habSet" data-f="d" data-v="${i}" aria-pressed="${+d.d === i}">${n} · +${x}</button>`).join('')}</div></div>
    <div class="lbl" style="margin-top:12px">Дни недели<div class="chips wrap" role="group" aria-label="Дни недели"><button class="chip" data-act="habAllDays" aria-pressed="${!d.days.length}">Каждый день</button>${WD_ORDER.map(n => `<button class="chip" data-act="habDayT" data-v="${n}" aria-pressed="${d.days.includes(n)}">${WD[n]}</button>`).join('')}</div></div>
    <div class="lbl" style="margin-top:12px">Как отмечать<div class="chips wrap" role="group" aria-label="Как отмечать">${HAB_AUTO.map(([k, l]) => `<button class="chip" data-act="habSet" data-f="auto" data-v="${k}" aria-pressed="${d.auto === k}">${l}</button>`).join('')}</div></div>
    ${d.auto ? `<p class="fine" style="margin-top:6px">${d.auto === 'workout' ? 'Отметится сама, когда запишете тренировку.' : 'Отметится сама, когда отметите все добавки за день.'} Опыт даёт сама тренировка или план добавок.</p>` : ''}
    ${sh.isNew ? '' : `<div class="srow"><div class="srow-t"><b>Пауза</b><span>Не показывать в плане, пока не включите снова</span></div><button class="switch" role="switch" aria-checked="${!!d.off}" aria-label="Пауза" data-act="habOffT"></button></div>`}
  </div><footer class="sheet-foot">${sh.isNew ? '' : `<button class="btn ${sh.confirm ? 'btn-danger' : 'btn-danger-soft'}" data-act="habDel">${sh.confirm ? 'Точно удалить' : 'Удалить'}</button>`}<button class="btn btn-primary" data-act="habSave">${sh.isNew ? 'Добавить' : 'Сохранить'}</button></footer>`;
};
Object.assign(IN, { habF: el => { const sh = top(); if (sh && sh.d) sh.d[el.dataset.f] = el.value; } });
Object.assign(A, {
  habTake: el => {
    const r = habToggle(el.dataset.id, +el.dataset.day || startOfDay(Date.now())); if (!r) return;
    if (r.on) buzz(r.full ? [10, 40, 10] : 10); sfx(r.full ? 'supFull' : r.on ? 'sup' : 'unset'); if (r.full && r.on) toast(`Все привычки за день · +${HAB_FULL} XP`);
    S.bubble = null; render();
  },
  habDayShift: el => { const today = startOfDay(Date.now()), cur = Math.min(today, S.habDay || today); S.habDay = Math.max(addDays(today, -6), Math.min(today, addDays(cur, +el.dataset.d))); render(); },
  habNew: () => openSheet({ type:'hab', isNew:true, id:uid(), d:habDraft(null), confirm:false }),
  habQuick: el => { const q = HAB_QUICK[+el.dataset.i]; if (!q) return; const d = habDraft(null); d.name = q[0]; d.ic = q[1]; d.cat = q[2]; d.d = q[3]; openSheet({ type:'hab', isNew:true, id:uid(), d, confirm:false }); },
  habEdit: el => { const h = S.profile.habits.find(x => x.id === el.dataset.id); if (h) openSheet({ type:'hab', isNew:false, id:h.id, d:habDraft(h), confirm:false }); },
  habSet: el => { const sh = top(); sh.d[el.dataset.f] = el.dataset.f === 'd' ? +el.dataset.v : el.dataset.v; render(); },
  habAllDays: () => { top().d.days = []; render(); },
  habDayT: el => { const d = top().d, v = +el.dataset.v, i = d.days.indexOf(v); if (i >= 0) d.days.splice(i, 1); else d.days.push(v); if (d.days.length === 7) d.days = []; render(); },
  habOffT: () => { const d = top().d; d.off = !d.off; render(); },
  habSave: () => {
    const sh = top(), d = sh.d, name = (d.name || '').trim();
    if (!name) { toast('Введите название'); const n = $('#hab-name'); if (n) n.focus(); return; }
    const list = S.profile.habits, i = list.findIndex(x => x.id === sh.id), old = i >= 0 ? list[i] : null;
    const h = { id:sh.id, name:name.slice(0, 40), ic:HAB_ICONS.includes(d.ic) ? d.ic : 'check', cat:habCat(d.cat)[0], d:Math.max(0, Math.min(2, +d.d || 0)), days:[...d.days].sort(), auto:d.auto === 'workout' || d.auto === 'supp' ? d.auto : '', ts:old ? old.ts : Date.now() };
    if (d.off) h.off = true;
    if (old && old.ar) h.ar = true;
    if (i >= 0) list[i] = h; else list.push(h);
    habSyncAuto();
    const today = startOfDay(Date.now()); habFullFix(S.profile, today); // the plan for today may have changed; past days stay as they were
    saveProfile(); S.sheets.pop(); buzz(10); toast(i >= 0 ? 'Сохранено' : `«${h.name}» в привычках`); render();
  },
  habDel: () => {
    const sh = top(); if (!sh.confirm) { sh.confirm = true; render(); return; }
    habRemove(sh.id); S.sheets.pop(); toast('Привычка удалена'); render();
  },
});
