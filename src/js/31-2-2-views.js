/* ================= 2.2 views ================= */
function hungerHTML() {
  const fz = frozenNow(S.profile.freeze), k = charOf(curProf()), nm = esc(mateName(k));
  if (fz) return `<div class="calm" data-key="calm-fz">${icon('snow')}<span><b>Заморозка до ${dayMonth(fz.to)}.</b> Сытость и серия недель на паузе — выздоравливайте и отдыхайте спокойно.</span></div>`;
  const s = satietyOf(S.workouts, S.profile.freeze); if (s.state === 'new' || s.state === 'fed') return '';
  const d = `${s.days} ${plural(s.days, ['день','дня','дней'])} без тренировки`;
  if (s.state === 'sleep') return `<div class="calm" data-key="calm-s">${icon('moon')}<span><b>${nm} ${vb(k, 'уснул', 'уснула')}</b> — ${d}. Любая тренировка разбудит, и сытость сразу станет 100%.</span></div>`;
  return `<div class="calm" data-key="calm-h">${icon('heart')}<span><b>${nm} ${vb(k, 'проголодался', 'проголодалась')}</b> — ${d}. Лёгкая тренировка вернёт в форму.</span></div>`;
}
function satHTML(sat, fz) {
  const v = sat.state === 'new' ? 0 : sat.v, cls = fz ? 'frz' : sat.v < 30 ? 'low' : sat.v < 60 ? 'mid' : '';
  return `<div class="sat"><div class="sat-top"><span>Сытость${fz ? ' · заморожено' : ''}</span><b>${sat.state === 'new' ? '—' : sat.v + '%'}</b></div><div class="sat-bar" role="progressbar" aria-label="Сытость" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}"><i class="${cls}" style="width:${v}%"></i></div></div>`;
}
function supCardHTML() {
  const p = S.profile; if (!p.supps.length) return '';
  const day = startOfDay(Date.now()), st = supDay(p, day), low = supLow(p);
  if (!st.due.length && !low.length) return '';
  const chips = st.due.map(s => { const on = st.taken.has(s.id); return `<button class="sup-chip${on ? ' on' : ''}" data-key="sc-${esc(s.id)}" data-act="supTake" data-id="${esc(s.id)}" data-day="${day}" aria-pressed="${on}" aria-label="${esc(s.name)}${on ? ', принято' : ''}">${icon(on ? 'check' : 'pill')}<span>${esc(s.name)}${s.dose ? `<small>${esc(doseTxt(s))}</small>` : ''}</span></button>`; }).join('');
  return `<section class="sec"><div class="sec-head"><h2 class="h2">${st.due.length ? `Добавки · ${st.done} из ${st.due.length}` : 'Добавки'}</h2><button class="btn btn-sm btn-ghost" data-act="nav" data-v="supp">Все ${icon('chevron')}</button></div>
    ${chips ? `<div class="sup-chips">${chips}</div>` : ''}${low.length ? `<p class="sup-low">${icon('box')}<span>Заканчивается: ${low.map(s => esc(s.name)).join(', ')}</span></p>` : ''}</section>`;
}
function dbgHTML() {
  if (!DBG) return '';
  const sh = dbgShift();
  return `<section class="dbg" aria-label="Режим отладки"><b>Отладка</b><span>Сегодня: ${dayMonth(Date.now())} (${sh >= 0 ? '+' : ''}${sh} дн.)</span>
    <div class="row"><button class="btn btn-sm" data-act="dbgDay" data-d="-1">−1 день</button><button class="btn btn-sm" data-act="dbgDay" data-d="1">+1 день</button><button class="btn btn-sm" data-act="dbgDay" data-d="0">Сброс</button>
    <button class="btn btn-sm" data-act="dbgWorkout">+ тренировка</button><button class="btn btn-sm" data-act="dbgChests">+3 сундука</button><button class="btn btn-sm" data-act="dbgOpenAll">Открыть все</button></div></section>`;
}
function tileHTML(it, own, on, act, extra = '') {
  return `<button class="tile${on ? ' on' : ''}${own ? '' : ' lock'}${it.s === 'bg' ? ' bgt' : ''}" style="--rc:${RAR[it.r].col}" data-key="t-${it.id}" data-act="${act}" data-id="${it.id}" aria-pressed="${!!on}" aria-label="${own ? esc(it.n) : 'Не найдена'}: ${RAR[it.r].n.toLowerCase()}, ${SLOTS[it.s].toLowerCase()}${on ? ', сейчас на напарнике' : ''}"><i class="rd"></i>${thumbSVG(it.id, null, !own)}<span>${own ? esc(it.n) : '???'}</span><small>${extra || (it.mo && !own ? 'сезон' : RAR[it.r].s)}</small></button>`;
}

function viewSupp() {
  const head = headHTML('Добавки', `${icon('pill')} Свой план приёма`);
  if (!ready()) return head + loadingHTML();
  const p = S.profile, today = startOfDay(Date.now());
  if (!p.supps.length) {
    return `${head}<div class="empty sup-empty"><h3>Составьте свой план</h3><p>Креатин, витамины, протеин — отмечайте приём галочкой каждый день. Доза, время, дни недели, курсы и запас — как вам удобно. План видите только вы.</p></div>
      <section class="sec"><div class="sec-head"><h2 class="h2">Быстрый старт</h2></div><div class="sup-quick">${SUP_QUICK.map(([n, d, u], i) => `<button class="chip" data-act="supQuick" data-i="${i}">${icon('plus')} ${esc(n)} <small>${esc(d)} ${esc(u)}</small></button>`).join('')}</div>
      <button class="btn btn-primary btn-block" style="margin-top:14px" data-act="supNew">${icon('plus')} Своя добавка</button></section>`;
  }
  if (S.supOrder) {
    const rows = p.supps.map((s, i) => `<div class="sup-ord" data-key="so-${esc(s.id)}"><span class="sup-ord-n">${i + 1}</span><span class="sup-ord-t"><b>${esc(s.name)}</b><small>${esc((SUP_WHEN.find(w => w[0] === s.when) || SUP_WHEN[5])[1])}${s.dose ? ' · ' + esc(doseTxt(s)) : ''}</small></span><button class="icon-btn" data-act="supMove" data-i="${i}" data-d="-1" aria-label="Выше: ${esc(s.name)}"${i ? '' : ' disabled'}>${icon('up')}</button><button class="icon-btn" data-act="supMove" data-i="${i}" data-d="1" aria-label="Ниже: ${esc(s.name)}"${i < p.supps.length - 1 ? '' : ' disabled'}>${icon('down')}</button></div>`).join('');
    return `${head}<section class="sec" style="margin-top:4px"><div class="sec-head"><h2 class="h2">Порядок приёма</h2><button class="btn btn-sm btn-primary" data-act="supOrder">Готово</button></div><div class="panel sup-list">${rows}</div><p class="fine">В этом порядке добавки стоят в списке внутри каждого времени приёма.</p></section>`;
  }
  const day = Math.max(addDays(today, -6), Math.min(today, S.supDay || today)), st = supDay(p, day), streak = supStreak(p), low = supLow(p);
  const lbl = day === today ? 'Сегодня' : day === addDays(today, -1) ? 'Вчера' : `${WD_FULL[new Date(day).getDay()]}, ${dayMonth(day)}`;
  const row = (s, on) => `${swOpen('s', s.id)}<div class="sup-row${on ? ' on' : ''}" data-key="sp-${esc(s.id)}"><button class="sup-check" data-act="supTake" data-id="${esc(s.id)}" data-day="${day}" aria-pressed="${on}" aria-label="${on ? 'Отменить приём' : 'Принял'}: ${esc(s.name)}">${icon('check')}</button><button class="sup-main" data-act="supEdit" data-id="${esc(s.id)}" aria-label="Изменить: ${esc(s.name)}"><b>${esc(s.name)}</b>${supSub(s, day) ? `<small>${esc(supSub(s, day))}</small>` : ''}</button></div>${swClose()}`;
  const groups = SUP_WHEN.map(([k, l]) => { const items = st.due.filter(s => (SUP_WHEN.some(w => w[0] === s.when) ? s.when : 'any') === k); return items.length ? `<section class="sec" data-key="sg-${k}"><div class="sec-head"><h2 class="h2">${l}</h2><span class="h2">${items.filter(s => st.taken.has(s.id)).length}/${items.length}</span></div><div class="panel sup-list">${items.map(s => row(s, st.taken.has(s.id))).join('')}</div></section>` : ''; }).join('');
  const rest = p.supps.filter(s => !st.due.includes(s) && !swHid(s.id));
  const restH = rest.length ? `<section class="sec" data-key="sg-off"><div class="sec-head"><h2 class="h2">Не в этот день</h2></div><div class="panel sup-list">${rest.map(s => `<div class="sup-row off" data-key="sx-${esc(s.id)}"><span class="sup-check" aria-hidden="true">${icon('moon')}</span><button class="sup-main" data-act="supEdit" data-id="${esc(s.id)}" aria-label="Изменить: ${esc(s.name)}"><b>${esc(s.name)}</b>${supSub(s, day) ? `<small>${esc(supSub(s, day))}</small>` : ''}</button></div>`).join('')}</div></section>` : '';
  const pct = st.due.length ? st.done / st.due.length * 100 : 0;
  return `${head}
    <div class="sup-day"><button class="icon-btn" data-act="supDayShift" data-d="-1" aria-label="Предыдущий день"${day <= addDays(today, -6) ? ' disabled' : ''}>${icon('back')}</button><b>${lbl}</b><button class="icon-btn" data-act="supDayShift" data-d="1" aria-label="Следующий день"${day >= today ? ' disabled' : ''}>${icon('chevron')}</button></div>
    <section class="panel sup-sum${st.full ? ' full' : ''}"><div class="sup-sum-top"><div class="hs"><b>${st.done}<small>/${st.due.length}</small></b><span>принято</span></div><div class="hs"><b>${icon('flame')}${streak}</b><span>${plural(streak, ['день','дня','дней'])} подряд</span></div><div class="hs"><b>+10</b><span>XP за полный день</span></div></div>
      <span class="q-bar"><i style="width:${pct.toFixed(1)}%"></i></span>${st.full ? `<p class="sup-done">${icon('check')} План на ${day === today ? 'сегодня' : 'этот день'} выполнен</p>` : !st.due.length ? '<p class="sup-done muted">В этот день по плану ничего нет</p>' : ''}</section>
    ${low.length ? `<div class="banner warn">${'<div class="banner-t">' + icon('box') + `<span><b>Заканчивается запас:</b> ${low.map(s => esc(s.name) + (s.stock <= 0 ? ' — закончился' : ` — ≈ ${supLeft(s)} ${plural(supLeft(s), ['день','дня','дней'])}`)).join(', ')}. Обновите запас в карточке добавки.</span></div>`}</div>` : ''}
    ${groups}${restH}
    <div class="row sup-actions"><button class="btn btn-add" data-act="supNew">${icon('plus')} Добавить</button>${p.supps.length > 1 ? `<button class="btn" data-act="supOrder">${icon('swap')} Порядок</button>` : ''}</div>
    <p class="fine">План видите только вы — партнёру он не передаётся. Полный день по плану — +10 XP, 7 и 30 дней подряд — достижения.</p>`;
}

