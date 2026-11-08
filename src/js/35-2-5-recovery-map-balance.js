/* ================= 2.5: recovery map, balance, forecasts, monthly report ================= */
/* secondary muscles of compound lifts (share of a set) */
const SECOND = (() => {
  const o = {}, put = (ids, m) => ids.split(' ').forEach(id => { o[id] = Object.assign(o[id] || {}, m); });
  put('bench incline-bench db-bench incline-db chest-press dips pushup', { shoulders:.5, arms:.5 });
  put('fly crossover', { shoulders:.3 });
  put('deadlift', { legs:.5, glutes:.5, core:.3 });
  put('rdl', { glutes:.5, back:.3 });
  put('hyperext', { glutes:.4 });
  put('pullup assist-pullup row db-row lat-pulldown cable-row t-row', { arms:.5, shoulders:.3 });
  put('squat front-squat goblet leg-press lunge bulgarian', { glutes:.5, core:.3 });
  put('hip-thrust glute-bridge step-up', { legs:.4 });
  put('ohp db-press', { arms:.5, core:.2 });
  put('cg-bench', { chest:.5, shoulders:.3 });
  put('face-pull rear-delt', { back:.3 });
  put('shrug', { back:.4 });
  put('row-erg', { back:.3, legs:.3 });
  put('run treadmill stairs bike ellipse jump-rope', { legs:.3 });
  return o;
})();
const MAIN_M = ['chest', 'back', 'shoulders', 'arms', 'core', 'legs', 'glutes'];
const MBIG = { chest:1, back:1, legs:1, glutes:1 };
const PULL_EX = new Set('pullup assist-pullup row db-row lat-pulldown cable-row t-row curl db-curl hammer face-pull rear-delt shrug deadlift'.split(' '));
const PUSH_EX = new Set('bench incline-bench db-bench incline-db fly crossover chest-press dips pushup ohp db-press lateral triceps-push skull cg-bench'.split(' '));
const pushPull = (id, e) => PULL_EX.has(id) ? 'pull' : PUSH_EX.has(id) ? 'push' : e.muscle === 'chest' || e.muscle === 'shoulders' ? 'push' : e.muscle === 'back' ? 'pull' : null;
const RCACHE = { k:'', v:null };
/* recovery: each session tires the muscles it worked; big muscles need longer, more sets — longer, «на пределе» — longer still */
function recoveryOf(list, now = Date.now()) {
  const key = (list[0] ? list[0].id + list[0].u : '') + list.length + '|' + Math.floor(now / 6e5);
  if (RCACHE.k === key) return RCACHE.v;
  const out = {}; MAIN_M.forEach(m => { out[m] = { pct:100, left:0, last:null, days:null }; });
  for (const w of list) {
    const end = w.end || w.start, h = (now - end) / 3600e3; if (h < 0) continue;
    const load = {};
    workSets(w, (e, s, x) => { load[e.muscle] = (load[e.muscle] || 0) + 1; const sec = SECOND[x.ex]; if (sec) for (const m in sec) load[m] = (load[m] || 0) + sec[m]; });
    for (const m in load) {
      if (!out[m]) continue;
      if (out[m].last == null) { out[m].last = end; out[m].days = Math.floor(h / 24); }
      if (h > 120) continue;
      const k = w.feel === 4 ? 1.15 : w.feel === 1 ? .85 : 1, need = ((MBIG[m] ? 24 : 18) + Math.min(MBIG[m] ? 48 : 36, load[m] * (MBIG[m] ? 3.5 : 3))) * k;
      const pct = Math.max(0, Math.min(100, h / need * 100));
      if (pct < out[m].pct) Object.assign(out[m], { pct, left:Math.max(0, need - h) });
    }
    if (MAIN_M.every(m => out[m].last != null) && h > 120) break;
  }
  RCACHE.k = key; RCACHE.v = out; return out;
}
const recState = r => r.last == null || r.days >= 10 ? 'idle' : r.pct >= 90 ? 'ok' : r.pct >= 50 ? 'mid' : 'low';
const hoursTxt = h => h < 1 ? 'меньше часа' : h < 24 ? `${Math.round(h)} ч` : `${Math.round(h / 24)} ${plural(Math.round(h / 24), ['день','дня','дней'])}`;
function recTip(r) {
  const ready = MAIN_M.filter(m => r[m].pct >= 90).sort((a, b) => (r[b].days ?? 99) - (r[a].days ?? 99));
  const best = ready.slice(0, 3).map(m => MUSCLES[m]);
  const tired = MAIN_M.filter(m => r[m].pct < 90).sort((a, b) => r[b].left - r[a].left);
  return { best, tired, text: best.length ? `Сегодня лучше всего: ${best.join(', ')}` : 'Мышцы ещё восстанавливаются — подойдёт лёгкая тренировка или кардио' };
}
/* stylised body, front and back; every region coloured by its muscle */
function bodySVG(r, cls = '') {
  const c = m => `rg rg-${recState(r[m])}`, n = 'rg rg-n';
  const front = `<circle class="${n}" cx="30" cy="10" r="7"/><rect class="${n}" x="27" y="16" width="6" height="5"/>
    <ellipse class="${c('shoulders')}" cx="16.5" cy="26" rx="6" ry="5.2"/><ellipse class="${c('shoulders')}" cx="43.5" cy="26" rx="6" ry="5.2"/>
    <path class="${c('chest')}" d="M20.5 22 Q29.5 20.5 29.5 22.5 V33 Q24 36.5 19.5 32.5Z M39.5 22 Q30.5 20.5 30.5 22.5 V33 Q36 36.5 40.5 32.5Z"/>
    <rect class="${c('arms')}" x="8.5" y="30" width="6.5" height="18" rx="3.2"/><rect class="${c('arms')}" x="45" y="30" width="6.5" height="18" rx="3.2"/>
    <rect class="${c('arms')}" x="6.5" y="49.5" width="5.5" height="16" rx="2.7"/><rect class="${c('arms')}" x="48" y="49.5" width="5.5" height="16" rx="2.7"/>
    <rect class="${c('core')}" x="22" y="35.5" width="16" height="22" rx="4"/>
    <path class="${n}" d="M21.5 58 H38.5 L39.5 65 H20.5Z"/>
    <rect class="${c('legs')}" x="19.5" y="64" width="9.5" height="29" rx="4.6"/><rect class="${c('legs')}" x="31" y="64" width="9.5" height="29" rx="4.6"/>
    <rect class="${n}" x="20.5" y="95" width="7.5" height="27" rx="3.6"/><rect class="${n}" x="32" y="95" width="7.5" height="27" rx="3.6"/>`;
  const back = `<circle class="${n}" cx="30" cy="10" r="7"/><rect class="${n}" x="27" y="16" width="6" height="5"/>
    <ellipse class="${c('shoulders')}" cx="16.5" cy="26" rx="6" ry="5.2"/><ellipse class="${c('shoulders')}" cx="43.5" cy="26" rx="6" ry="5.2"/>
    <path class="${c('back')}" d="M21 21 Q30 18.5 39 21 L40.5 34 Q36 46 32 52 H28 Q24 46 19.5 34Z"/>
    <rect class="${c('back')}" x="24" y="51" width="12" height="7" rx="2"/>
    <rect class="${c('arms')}" x="8.5" y="30" width="6.5" height="18" rx="3.2"/><rect class="${c('arms')}" x="45" y="30" width="6.5" height="18" rx="3.2"/>
    <rect class="${n}" x="6.5" y="49.5" width="5.5" height="16" rx="2.7"/><rect class="${n}" x="48" y="49.5" width="5.5" height="16" rx="2.7"/>
    <circle class="${c('glutes')}" cx="24.6" cy="64" r="6.6"/><circle class="${c('glutes')}" cx="35.4" cy="64" r="6.6"/>
    <rect class="${c('legs')}" x="19.5" y="70" width="9.5" height="23" rx="4.6"/><rect class="${c('legs')}" x="31" y="70" width="9.5" height="23" rx="4.6"/>
    <rect class="${c('legs')}" x="20.5" y="95" width="7.5" height="27" rx="3.6"/><rect class="${c('legs')}" x="32" y="95" width="7.5" height="27" rx="3.6"/>`;
  return `<svg class="body${cls ? ' ' + cls : ''}" viewBox="0 0 136 126" role="img" aria-label="Карта восстановления мышц"><g>${front}</g><g transform="translate(76 0)">${back}</g><text x="30" y="125.5" text-anchor="middle" class="body-t">спереди</text><text x="106" y="125.5" text-anchor="middle" class="body-t">сзади</text></svg>`;
}
function recRows(r) {
  return MAIN_M.map(m => { const x = r[m], st = recState(x); return `<div class="rr" data-key="rr-${m}"><span>${MUSCLES[m]}</span><span class="rr-t"><i class="rg-${st}" style="width:${st === 'idle' ? 100 : Math.max(4, x.pct).toFixed(0)}%"></i></span><span class="rr-v">${st === 'idle' ? (x.last == null ? 'не было' : `${x.days} дн.`) : x.pct >= 100 ? 'готово' : 'через ' + hoursTxt(x.left)}</span></div>`; }).join('');
}
function recoveryHTML() {
  if (!S.workouts.length) return '';
  const r = recoveryOf(S.workouts), t = recTip(r);
  return `<section class="sec"><div class="sec-head"><h2 class="h2">Готовность мышц</h2><span class="h2">сейчас</span></div><div class="panel rec">
    <div class="rec-fig">${bodySVG(r)}</div><div class="rec-side"><p class="rec-tip">${icon('target')}<span>${esc(t.text)}</span></p><div class="rrs">${recRows(r)}</div></div>
    <div class="rec-legend"><span><i class="rg-ok"></i>готово</span><span><i class="rg-mid"></i>восстанавливается</span><span><i class="rg-low"></i>устали</span><span><i class="rg-idle"></i>давно не было</span></div>
    <p class="footnote">Оценка: крупным мышцам нужно 1–3 суток, мелким — 1–2, больше подходов и «на пределе» — дольше. Сложные упражнения нагружают и соседние мышцы.</p></div></section>`;
}
function recCardHTML() {
  if (!S.workouts.length) return '';
  const r = recoveryOf(S.workouts), t = recTip(r), soon = t.tired.filter(m => recState(r[m]) !== 'idle')[0];
  return `<section class="sec"><button class="panel rec-mini" data-act="recOpen" aria-label="Готовность мышц: ${esc(t.text)}">${bodySVG(r, 'mini')}<span class="rec-mini-t"><b>${esc(t.text)}</b>${soon ? `<small>${MUSCLES[soon]} восстановятся через ${hoursTxt(r[soon].left)}</small>` : '<small>Все мышцы отдохнули</small>'}</span>${icon('chevron')}</button></section>`;
}
/* balance over four weeks: pushes vs pulls, upper vs lower, lagging muscles */
function balanceHTML() {
  const from = Date.now() - 28 * DAY, list = S.workouts.filter(w => w.start >= from); if (!list.length) return '';
  const m = {}, pp = { push:0, pull:0 };
  list.forEach(w => workSets(w, (e, s, x) => { m[e.muscle] = (m[e.muscle] || 0) + 1; const k = pushPull(x.ex, e); if (k) pp[k]++; }));
  const upper = ['chest', 'back', 'shoulders', 'arms'].reduce((a, k) => a + (m[k] || 0), 0), lower = (m.legs || 0) + (m.glutes || 0);
  const split = (a, b, la, lb) => { const t = a + b || 1, pa = Math.round(a / t * 100); return `<div class="split"><div class="split-l"><span>${la} · ${a}</span><span>${lb} · ${b}</span></div><div class="split-b"><i style="width:${pa}%"></i><i style="width:${100 - pa}%"></i></div></div>`; };
  const ratio = pp.push ? pp.pull / pp.push : null, tips = [];
  if (pp.push + pp.pull >= 12 && ratio != null) tips.push(ratio < .8 ? ['warn', 'Тяговых упражнений меньше, чем жимовых. Добавьте тяги и подтягивания — это бережёт плечи и осанку.'] : ratio > 1.3 ? ['warn', 'Жимов заметно меньше, чем тяг. Добавьте жимы лёжа или стоя.'] : ['ok', 'Жимы и тяги в балансе.']);
  if (upper + lower >= 16) tips.push(lower / Math.max(1, upper) < .45 ? ['warn', 'Ноги и ягодицы отстают от верха. Хотя бы одна тренировка ног в неделю.'] : ['ok', 'Верх и низ нагружены равномерно.']);
  const lag = MAIN_M.filter(k => k !== 'core').map(k => [k, (m[k] || 0) / 4]).filter(([, v]) => v < 6).sort((a, b) => a[1] - b[1]);
  return `<section class="sec"><div class="sec-head"><h2 class="h2">Баланс · 4 недели</h2><span class="h2">рабочие подходы</span></div><div class="panel bal">
    ${split(pp.push, pp.pull, 'Жимы', 'Тяги')}${split(upper, lower, 'Верх', 'Низ')}
    ${tips.map(([k, t]) => `<p class="bal-tip ${k}">${icon(k === 'ok' ? 'check' : 'up')}<span>${t}</span></p>`).join('')}
    ${(() => { const l = lagMuscles(); return l.length ? `<p class="bal-lag"><b>Мало нагрузки:</b> ${l.map(([k, v]) => `${MUS[k][0].toLowerCase()} — ${nf(v, 1)} подх. в неделю`).join(', ')}. Для роста обычно нужно хотя бы 6–10 подходов в неделю на мышцу.</p>` : ''; })()}</div></section>`;
}
/* forecast: a straight line through the best e1RM of every session over the last 4 months */
function forecastOf(id, now = Date.now()) {
  const h = (D.hist[id] || []).filter(x => x.topE > 0 && now - x.start < 120 * DAY); if (h.length < 4) return null;
  const xs = h.map(x => (x.start - h[0].start) / (7 * DAY)), ys = h.map(x => x.topE), n = xs.length;
  const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0); if (sxx < 1) return null;
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx, nowX = (now - h[0].start) / (7 * DAY);
  const curFit = my + slope * (nowX - mx), best = Math.max(...ys), cur = Math.max(curFit, ys[n - 1] * .97);
  const stepT = best >= 100 ? 10 : 5, target = Math.ceil((best + .01) / stepT) * stepT, weeks = slope > .05 ? (target - cur) / slope : null;
  return { slope, cur, best, month:cur + slope * 4.3, target, date: weeks != null && weeks > 0 && weeks < 52 ? now + weeks * 7 * DAY : null };
}
function forecastHTML() {
  const ids = Object.keys(D.hist).filter(id => exById(id).kind === 'wr').sort((a, b) => (D.usage[b] || 0) - (D.usage[a] || 0)).slice(0, 6);
  const rows = ids.map(id => [id, forecastOf(id)]).filter(([, f]) => f).slice(0, 3); if (!rows.length) return '';
  return `<section class="sec"><div class="sec-head"><h2 class="h2">Прогноз рекордов</h2><span class="h2">e1RM</span></div><div class="panel fc">
    ${rows.map(([id, f]) => `<div class="fc-row"><b>${esc(exById(id).name)}</b><span class="fc-now">${nf(f.cur, 1)} кг <small>${f.slope > .05 ? `+${nf(f.slope, 1)} кг в неделю` : f.slope < -.05 ? 'снижается' : 'держится'}</small></span>
      <span class="fc-tip">${f.slope > .05 ? `Через месяц ≈ ${nf(f.month, 1)} кг.${f.date ? ` ${f.target} кг — примерно к ${dayMonth(f.date)}.` : ''}` : f.slope < -.05 ? 'Результат проседает: проверьте сон, питание и восстановление или сделайте разгрузочную неделю.' : 'Плато. Помогает смена схемы: другие повторы, пауза внизу или новое упражнение.'}</span></div>`).join('')}
    <p class="footnote">Прогноз строится по линии через лучший расчётный максимум каждой тренировки за 4 месяца. Это ориентир, а не обещание.</p></div></section>`;
}
/* monthly report */
const monthStart = ms => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const monthAdd = (ms, n) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime(); };
function monthStats(a) {
  const b = monthAdd(a, 1), list = S.workouts.filter(w => w.start >= a && w.start < b), st = agg(list), days = new Set(list.map(w => dayKey(w.start))).size;
  const prs = D.prEvents.filter(p => p.start >= a && p.start < b), exs = {}, mus = {};
  list.forEach(w => workSets(w, (e, s, x) => { exs[x.ex] = (exs[x.ex] || 0) + 1; mus[e.muscle] = (mus[e.muscle] || 0) + 1; }));
  const topEx = Object.entries(exs).sort((p, q) => q[1] - p[1])[0], topM = Object.entries(mus).sort((p, q) => q[1] - p[1])[0];
  const best = list.reduce((x, w) => !x || wStats(w).vol > wStats(x).vol ? w : x, null), xp = list.reduce((x, w) => x + workoutXP(w), 0);
  const op = (S.profile.chest || {}).op || {}, chests = list.filter(w => op[w.id]).length;
  const sup = S.profile.supps.length ? (S.profile.sfull || []).filter(k => { const t = keyDay(k); return t >= a && t < b; }).length : null;
  return { a, b, list, st, days, prs, topEx, topM, best, xp, chests, sup };
}
SHEETS.report = sh => {
  const m = monthStats(sh.m), p = monthStats(monthAdd(sh.m, -1)), d = new Date(sh.m), first = S.workouts.length ? monthStart(S.workouts[S.workouts.length - 1].start) : sh.m;
  const dl = (x, y) => !y ? '' : `<small class="${x >= y ? 'up' : 'down'}">${x >= y ? '+' : '−'}${Math.abs(Math.round((x - y) / y * 100))}%</small>`;
  const live = sh.m >= monthStart(Date.now()), kpi = (l, v, f, pv) => `<div><b>${f(v)}</b><span>${l}</span>${pv != null && !live ? dl(v, pv) : ''}</div>`;
  const nav = `<div class="sup-day" style="margin:0 0 12px"><button class="icon-btn" data-act="repShift" data-d="-1" aria-label="Предыдущий месяц"${sh.m <= first ? ' disabled' : ''}>${icon('back')}</button><b>${MON_NOM[d.getMonth()]} ${d.getFullYear()}</b><button class="icon-btn" data-act="repShift" data-d="1" aria-label="Следующий месяц"${sh.m >= monthStart(Date.now()) ? ' disabled' : ''}>${icon('chevron')}</button></div>`;
  if (!m.list.length) return `${sheetHead('Отчёт за месяц')}<div class="sheet-body">${nav}<div class="empty"><h3>В этом месяце тренировок нет</h3><p>Отчёт появится после первой тренировки месяца.</p></div></div>`;
  return `${sheetHead('Отчёт за месяц', esc(pname(curProf())))}<div class="sheet-body">${nav}
    <div class="kv k4 rep">${kpi('тренировок', m.list.length, v => nf(v, 0), p.list.length)}${kpi('тоннаж', m.st.vol, ton, p.st.vol)}${kpi('в зале', m.st.dur, v => nf(v / 3.6e6, 1) + ' ч', p.st.dur)}${kpi('рекордов', m.prs.length, v => nf(v, 0), p.prs.length)}</div>
    ${live ? '<p class="fine" style="margin:8px 0 0">Месяц ещё идёт — сравнение с прошлым появится, когда он закончится.</p>' : ''}
    <ul class="pr-list news" style="margin-top:14px">
      <li>${icon('today')}<span><b>${m.days} ${plural(m.days, ['день','дня','дней'])} в зале</b> · ${nf(m.list.length / ((Math.min(Date.now(), m.b) - m.a) / (7 * DAY)), 1)} тренировки в неделю</span></li>
      ${m.topEx ? `<li>${icon('repeat')}<span><b>Главное упражнение:</b> ${esc(exById(m.topEx[0]).name)} — ${m.topEx[1]} ${plural(m.topEx[1], ['подход','подхода','подходов'])}</span></li>` : ''}
      ${m.topM ? `<li>${icon('target')}<span><b>Больше всего:</b> ${MUSCLES[m.topM[0]] || m.topM[0]} — ${m.topM[1]} ${plural(m.topM[1], ['подход','подхода','подходов'])}</span></li>` : ''}
      ${m.best ? `<li>${icon('flame')}<span><b>Самая объёмная:</b> «${esc(m.best.title || 'Тренировка')}», ${dayMonth(m.best.start)} — ${ton(wStats(m.best).vol)}</span></li>` : ''}
      <li>${icon('star')}<span><b>+${nf(m.xp, 0)} XP</b> за тренировки${m.chests ? ` · ${m.chests} ${plural(m.chests, ['сундук','сундука','сундуков'])} открыто` : ''}</span></li>
      ${m.sup != null ? `<li>${icon('pill')}<span><b>Добавки:</b> ${m.sup} ${plural(m.sup, ['полный день','полных дня','полных дней'])} по плану</span></li>` : ''}
    </ul>
    ${m.prs.length ? `<div class="sblock" style="border:0;padding-bottom:0"><b>Рекорды месяца</b><ul class="prs">${m.prs.slice(0, 6).map(x => { const e = exById(x.ex); return `<li><span class="d">${dShort(x.start)}</span><span class="nv"><span class="n">${esc(e.name)}</span><span class="v">${esc(setLong(x.set, e.kind))}</span></span></li>`; }).join('')}</ul></div>` : ''}
  </div>${navigator.share ? `<footer class="sheet-foot"><button class="btn btn-primary btn-block" data-act="repShare">${icon('share')} Поделиться</button></footer>` : ''}`;
};
function reportBanner() {
  const now = new Date(Date.now()); if (now.getDate() > 7) return '';
  const pm = monthAdd(monthStart(Date.now()), -1), k = dayKey(pm).slice(0, 7), m = S.meta || {};
  if (m.repSeen === k || !S.workouts.some(w => w.start >= pm && w.start < monthStart(Date.now()))) return '';
  const st = monthStats(pm), mn = MON_NOM[new Date(pm).getMonth()].toLowerCase();
  return `<div class="banner"><div class="banner-t">${icon('progress')}<span><b>Готов отчёт за ${mn}.</b> ${st.list.length} ${plural(st.list.length, ['тренировка','тренировки','тренировок'])}, ${ton(st.st.vol)}${st.prs.length ? `, ${st.prs.length} ${plural(st.prs.length, ['рекорд','рекорда','рекордов'])}` : ''}.</span></div><div class="banner-a"><button class="btn btn-sm btn-primary" data-act="repOpen" data-m="${pm}">Открыть</button></div></div>`;
}
Object.assign(A, {
  recOpen: () => go('progress'),
  repOpen: el => { const m = el && el.dataset && el.dataset.m ? +el.dataset.m : monthStart(Date.now()); const k = dayKey(m).slice(0, 7); if (el && el.dataset && el.dataset.m) { ensureMeta().repSeen = k; saveMeta(); } openSheet({ type:'report', m }); },
  repShift: el => { const sh = top(); sh.m = monthAdd(sh.m, +el.dataset.d); render(); },
  repShare: async () => {
    const sh = top(), m = monthStats(sh.m), d = new Date(sh.m);
    const t = `«Подход» · ${MON_NOM[d.getMonth()]} ${d.getFullYear()}: ${m.list.length} ${plural(m.list.length, ['тренировка','тренировки','тренировок'])}, ${ton(m.st.vol)}, ${nf(m.st.dur / 3.6e6, 1)} ч в зале, ${m.prs.length} ${plural(m.prs.length, ['рекорд','рекорда','рекордов'])}.`;
    try { await navigator.share({ text:t }); } catch (e) { /* cancelled */ }
  },
});
SHEETS.news25 = () => `${sheetHead('Что нового', 'Версия ' + APP_VERSION)}<div class="sheet-body">
  ${S.workouts.length ? `<div style="display:grid;place-items:center;margin-bottom:12px">${bodySVG(recoveryOf(S.workouts), 'news')}</div>` : ''}
  <ul class="pr-list news">
    <li>${icon('target')}<span><b>Готовность мышц</b> — карта тела: какие мышцы отдохнули, а каким нужно ещё время, и что лучше тренировать сегодня</span></li>
    <li>${icon('swap')}<span><b>Баланс</b> — жимы и тяги, верх и низ, отстающие группы мышц за 4 недели</span></li>
    <li>${icon('up')}<span><b>Прогноз рекордов</b> — куда идёт расчётный максимум в главных упражнениях и когда ждать круглую цифру</span></li>
    <li>${icon('progress')}<span><b>Отчёт за месяц</b> — итоги, сравнение с прошлым месяцем и рекорды. Можно поделиться</span></li>
  </ul></div><footer class="sheet-foot"><button class="btn" data-act="closeSheet">Готово</button><button class="btn btn-primary" data-act="newsProgress">Посмотреть</button></footer>`;
Object.assign(A, { newsProgress: () => { S.sheets = []; go('progress'); } });

