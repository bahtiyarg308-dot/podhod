/* ================= 3.0: ready-made programs and the weekly summary ================= */
const PRESETS = [
  { id:'full', name:'Фулбоди', sub:'2 тренировки, чередуются · 3 раза в неделю', lvl:'новичок', days:[
    ['Фулбоди А', [['squat', 3, '6-8'], ['bench', 3, '6-8'], ['row', 3, '8-10'], ['ohp', 2, '8-10'], ['plank', 3, '']]],
    ['Фулбоди Б', [['deadlift', 3, '5'], ['incline-db', 3, '8-10'], ['lat-pulldown', 3, '8-10'], ['lunge', 3, '10'], ['db-curl', 2, '10-12'], ['triceps-push', 2, '10-12']]]] },
  { id:'ul', name:'Верх / Низ', sub:'4 тренировки · 4 раза в неделю', lvl:'средний', days:[
    ['Верх А', [['bench', 4, '6-8'], ['row', 4, '8'], ['ohp', 3, '8-10'], ['lat-pulldown', 3, '10'], ['db-curl', 3, '10-12'], ['triceps-push', 3, '10-12']]],
    ['Низ А', [['squat', 4, '6-8'], ['rdl', 3, '8-10'], ['leg-press', 3, '10-12'], ['leg-curl', 3, '10-12'], ['calf', 4, '12-15'], ['plank', 3, '']]],
    ['Верх Б', [['incline-db', 4, '8-10'], ['pullup', 4, '6-10'], ['db-press', 3, '10'], ['cable-row', 3, '10-12'], ['lateral', 3, '12-15'], ['hammer', 3, '10-12']]],
    ['Низ Б', [['deadlift', 3, '5'], ['bulgarian', 3, '8-10'], ['hip-thrust', 3, '8-10'], ['leg-ext', 3, '12'], ['seated-calf', 4, '12-15'], ['cable-crunch', 3, '12']]]] },
  { id:'ppl', name:'Тяни-толкай-ноги', sub:'3 тренировки · 3 или 6 раз в неделю', lvl:'средний', days:[
    ['Толкай', [['bench', 4, '6-8'], ['ohp', 3, '8-10'], ['incline-db', 3, '8-10'], ['lateral', 4, '12-15'], ['triceps-push', 3, '10-12'], ['overhead-ext', 3, '10-12']]],
    ['Тяни', [['row', 4, '8'], ['lat-pulldown', 4, '8-10'], ['cable-row', 3, '10-12'], ['face-pull', 3, '12-15'], ['db-curl', 3, '10-12'], ['hammer', 3, '10-12']]],
    ['Ноги', [['squat', 4, '6-8'], ['rdl', 3, '8-10'], ['leg-press', 3, '10-12'], ['leg-curl', 3, '10-12'], ['calf', 4, '12-15'], ['plank', 3, '']]]] },
  { id:'glutes', name:'Ягодицы и ноги', sub:'2 тренировки · акцент на ягодицы', lvl:'любой', days:[
    ['Ягодицы А', [['hip-thrust', 4, '8-12'], ['rdl', 3, '10'], ['bulgarian', 3, '10'], ['hip-abd', 3, '15'], ['calf', 3, '15']]],
    ['Ягодицы Б', [['squat', 3, '8-10'], ['step-up', 3, '10'], ['machine-thrust', 3, '12'], ['leg-curl', 3, '12'], ['cable-abd', 3, '15']]]] },
  { id:'home', name:'Дома без снаряжения', sub:'1 тренировка · 3 раза в неделю', lvl:'новичок', days:[
    ['Дома', [['pushup', 4, '8-15'], ['split-squat', 3, '10-12'], ['glute-bridge', 3, '15'], ['pike-pushup', 3, '8-10'], ['dead-bug', 3, '10'], ['plank', 3, '']]]] },
];
SHEETS.presets = sh => `${sheetHead('Готовые программы', 'Одним нажатием')}<div class="sheet-body">
  <p class="fine" style="margin-top:0">Выберите набор: он появится в ваших программах. Подходы, повторы и упражнения потом меняются как обычно.</p>
  <div class="preset-list">${PRESETS.map(p => { const open = sh.o === p.id;
    return `<div class="preset${open ? ' open' : ''}"><button class="preset-h" data-act="presetToggle" data-id="${p.id}" aria-expanded="${open}"><span><b>${esc(p.name)}</b><small>${esc(p.sub)} · ${esc(p.lvl)}</small></span>${icon('chevron')}</button>${open ? `<div class="preset-b">${p.days.map(([n, items]) => `<div class="preset-d"><b>${esc(n)}</b><ol>${items.map(([id, s, r]) => `<li>${esc(exById(id).name)} <span>${r ? s + '×' + r : s + ' ' + plural(s, ['подход', 'подхода', 'подходов'])}</span></li>`).join('')}</ol></div>`).join('')}<button class="btn btn-primary btn-block" data-act="presetAdd" data-id="${p.id}">Добавить в мои программы</button></div>` : ''}</div>`; }).join('')}</div></div>`;
/* weekly summary */
function weekStats(ws) {
  const we = addDays(ws, 7), list = S.workouts.filter(w => w.start >= ws && w.start < we), st = agg(list), prs = D.prEvents.filter(p => p.start >= ws && p.start < we), exs = {}, mus = {};
  list.forEach(w => workSets(w, (e, s, x) => { exs[x.ex] = (exs[x.ex] || 0) + 1; mus[e.muscle] = (mus[e.muscle] || 0) + 1; }));
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  return { ws, we, list, st, prs, topEx:top(exs), topM:top(mus), goal:S.profile.goal || 3 };
}
SHEETS.weekrep = sh => {
  const w = weekStats(sh.w), p = weekStats(addDays(sh.w, -7)), first = S.workouts.length ? weekStart(S.workouts[S.workouts.length - 1].start) : sh.w, live = sh.w >= weekStart(Date.now());
  const d1 = new Date(sh.w), d2 = new Date(addDays(sh.w, 6)), lbl = `${d1.getDate()}${d1.getMonth() !== d2.getMonth() ? ' ' + MON_GEN[d1.getMonth()] : ''} – ${d2.getDate()} ${MON_GEN[d2.getMonth()]}`;
  const dl = (x, y) => !y ? '' : `<small class="${x >= y ? 'up' : 'down'}">${x >= y ? '+' : '−'}${Math.abs(Math.round((x - y) / y * 100))}%</small>`;
  const kpi = (l, v, f, pv) => `<div><b>${f(v)}</b><span>${l}</span>${pv != null && !live ? dl(v, pv) : ''}</div>`;
  const nav = `<div class="sup-day" style="margin:0 0 12px"><button class="icon-btn" data-act="weekShift" data-d="-1" aria-label="Предыдущая неделя"${sh.w <= first ? ' disabled' : ''}>${icon('back')}</button><b>${lbl}</b><button class="icon-btn" data-act="weekShift" data-d="1" aria-label="Следующая неделя"${live ? ' disabled' : ''}>${icon('chevron')}</button></div>`;
  if (!w.list.length) return `${sheetHead('Итоги недели')}<div class="sheet-body">${nav}<div class="empty"><h3>На этой неделе тренировок нет</h3><p>Итоги появятся после первой тренировки недели.</p></div></div>`;
  const met = w.list.length >= w.goal, lag = lagMuscles()[0];
  return `${sheetHead('Итоги недели', esc(pname(curProf())))}<div class="sheet-body">${nav}
    <div class="kv k4 rep">${kpi('тренировок', w.list.length, v => nf(v, 0), p.list.length)}${kpi('тоннаж', w.st.vol, ton, p.st.vol)}${kpi('подходов', w.st.sets, v => nf(v, 0), p.st.sets)}${kpi('рекордов', w.prs.length, v => nf(v, 0), null)}</div>
    ${live ? '<p class="fine" style="margin:8px 0 0">Неделя ещё идёт — сравнение с прошлой появится, когда она закончится.</p>' : ''}
    <ul class="pr-list news" style="margin-top:14px">
      <li>${icon(met ? 'check' : 'target')}<span><b>${met ? 'Цель недели выполнена' : `До цели ${w.goal - w.list.length} ${plural(w.goal - w.list.length, ['тренировка', 'тренировки', 'тренировок'])}`}</b> · ${w.list.length} из ${w.goal}</span></li>
      ${w.topEx ? `<li>${icon('repeat')}<span><b>Главное упражнение:</b> ${esc(exById(w.topEx[0]).name)} — ${w.topEx[1]} ${plural(w.topEx[1], ['подход', 'подхода', 'подходов'])}</span></li>` : ''}
      ${w.topM ? `<li>${icon('flame')}<span><b>Больше всего:</b> ${MUSCLES[w.topM[0]] || w.topM[0]}</span></li>` : ''}
      ${lag ? `<li>${icon('up')}<span><b>Чего не хватило:</b> ${MUS[lag[0]][0].toLowerCase()} — ${nf(lag[1], 1)} подх. в неделю в среднем за месяц</span></li>` : ''}
    </ul>
    ${w.prs.length ? `<div class="sblock" style="border:0;padding-bottom:0"><b>Рекорды недели</b><ul class="prs">${w.prs.slice(0, 6).map(x => { const e = exById(x.ex); return `<li><span class="d">${dShort(x.start)}</span><span class="nv"><span class="n">${esc(e.name)}</span><span class="v">${esc(setLong(x.set, e.kind))}</span></span></li>`; }).join('')}</ul></div>` : ''}
  </div>`;
};
function weekBanner() {
  const dow = new Date(Date.now()).getDay(); if (dow !== 1 && dow !== 2) return '';
  const pw = addDays(weekStart(Date.now()), -7), k = dayKey(pw), m = S.meta || {};
  if (m.wkSeen === k || !S.workouts.some(w => w.start >= pw && w.start < weekStart(Date.now()))) return '';
  const st = weekStats(pw);
  return `<div class="banner"><div class="banner-t">${icon('progress')}<span><b>Итоги прошлой недели.</b> ${st.list.length} ${plural(st.list.length, ['тренировка', 'тренировки', 'тренировок'])}, ${ton(st.st.vol)}${st.prs.length ? `, рекордов: ${st.prs.length}` : ''}</span></div><div class="banner-a"><button class="btn btn-sm btn-primary" data-act="weekOpen" data-w="${pw}">Открыть</button><button class="btn btn-sm btn-ghost" data-act="weekHide" data-w="${pw}" aria-label="Скрыть">${icon('x')}</button></div></div>`;
}
Object.assign(A, {
  presetsOpen: () => openSheet({ type:'presets', o:null }),
  presetToggle: el => { const sh = top(); sh.o = sh.o === el.dataset.id ? null : el.dataset.id; render(); },
  presetAdd: el => {
    const p = PRESETS.find(x => x.id === el.dataset.id); if (!p) return;
    const have = new Set(S.profile.templates.map(t => t.name)), uniq = n => { let r = n, i = 2; while (have.has(r)) r = n + ' ' + i++; have.add(r); return r; };
    p.days.forEach(([n, items]) => S.profile.templates.push({ id:uid(), name:uniq(n), items:items.map(([ex, sets, reps]) => ({ ex, sets, reps })) }));
    saveProfile(); S.sheets = []; sfx('goal'); toast(`Добавлено программ: ${p.days.length}`); render();
  },
  weekOpen: el => { const w = el && el.dataset && el.dataset.w ? +el.dataset.w : weekStart(Date.now()); if (el && el.dataset && el.dataset.w) { ensureMeta().wkSeen = dayKey(w); saveMeta(); } openSheet({ type:'weekrep', w }); },
  weekHide: el => { ensureMeta().wkSeen = dayKey(+el.dataset.w); saveMeta(); render(); },
  weekShift: el => { const sh = top(); sh.w = addDays(sh.w, 7 * +el.dataset.d); render(); },
});
