/* ================= 2.2 sheets ================= */
SHEETS.ward = sh => {
  const p = curProf(), kind = charOf(p), m = mateOf(S.profile, S.workouts), coll = m.coll, cs = chestState(), slot = sh.slot || 'all';
  const own = Object.keys(coll.cnt), cnt = s => own.filter(id => ITEM[id].s === s).length;
  const tiles = ITEMS.filter(it => slot === 'all' || it.s === slot).map(it => tileHTML(it, coll.has(it.id), m.gear[it.s] === it.id, 'wear', coll.cnt[it.id] > 1 ? `×${coll.cnt[it.id]} · ${RAR[it.r].s}` : '')).join('');
  return `${sheetHead('Гардероб', `${esc(mateName(kind))} · ${stName(m.stage, kind)}`)}<div class="sheet-body">
    <div class="wardtop">${mateCell(kind, 'happy', { stage:m.stage.k, gear:m.gear, label:`${mateName(kind)} в гардеробе` }, 'mate-l')}<div class="wt-main">
      <div class="wstat"><b>${coll.uniq} / ${ITEMS.length}</b><span>собрано вещей</span></div><div class="wbar"><i style="width:${(coll.uniq / ITEMS.length * 100).toFixed(1)}%"></i></div>
      <div class="spark">${icon('spark', 'ic-f')} ${coll.sparks} ${plural(coll.sparks, ['искра','искры','искр'])}</div>
      <div class="row"><button class="btn btn-sm" data-act="shop">Обменять искры</button>${cs.closed.length ? `<button class="btn btn-sm btn-primary" data-act="chestOpenNext">${icon('chest')} Сундуки: ${cs.closed.length}</button>` : ''}</div></div></div>
    <div class="chips slots" role="group" aria-label="Слот">${[['all', 'Все', own.length], ...SLOT_ORDER.map(s => [s, SLOTS[s], cnt(s)])].map(([k, l, n]) => `<button class="chip" data-act="wardSlot" data-s="${k}" aria-pressed="${slot === k}">${l} ${n}</button>`).join('')}</div>
    <div class="tiles">${tiles}</div>
    <p class="hint2">Нажмите на вещь, чтобы надеть или снять. Рекорд в тренировке повышает шанс редкой вещи. Повторы и подарки дня дают искры: 100 — обычная вещь, 300 — редкая, 700 — эпическая. Сундук — за тренировку от ${CH_MIN_SETS} рабочих подходов (один в день), за каждый новый ранг и за каждый седьмой подарок дня. Сезонные вещи выпадают только в свой месяц.</p></div>`;
};
SHEETS.shop = sh => {
  const coll = collOf(S.profile, S.workouts), sel = sh.sel && ITEM[sh.sel], cost = sel ? SHOP_COST[sel.r] : 0;
  const sec = (r, c) => { const list = POOL[r].filter(it => !coll.has(it.id) && inSeason(it)); return `<div class="sblock"><b>${r === 'c' ? 'Обычные' : r === 'r' ? 'Редкие' : 'Эпические'} · ${c} искр</b>${list.length ? `<div class="tiles">${list.map(it => tileHTML(it, true, sh.sel === it.id, 'shopSel', `${c} искр`)).join('')}</div>` : '<p class="fine">Все уже собраны.</p>'}</div>`; };
  return `${sheetHead('Обмен искр', `${icon('spark', 'ic-f')} ${coll.sparks} ${plural(coll.sparks, ['искра','искры','искр'])}`)}<div class="sheet-body">
    <p class="fine" style="margin-top:0">Повтор из сундука — 10 искр, подарок дня — от 5 до 15. Выберите вещь, которой ещё нет. Легендарные — только из сундуков, сезонные — только в свой месяц.</p>
    ${sec('c', 100)}${sec('r', 300)}${sec('e', 700)}</div>
    <footer class="sheet-foot"><button class="btn" data-act="closeSheet">Назад</button><button class="btn btn-primary" data-act="shopBuy"${sel && coll.sparks >= cost ? '' : ' disabled'}>${sel ? (coll.sparks >= cost ? `Взять «${esc(sel.n)}» за ${cost}` : `Нужно ${cost} искр`) : 'Выберите вещь'}</button></footer>`;
};
SHEETS.chest = sh => {
  const cs = chestState(), ch = cs.all.find(x => x.id === sh.cid);
  if (!ch) return `${sheetHead('Сундук')}<div class="sheet-body"><p class="muted">Этот сундук больше не доступен: тренировку удалили.</p></div>`;
  const kind = charOf(curProf()), m = mateOf(S.profile, S.workouts), type = ch.gold ? 'gold' : 'std';
  const from = ch.rank != null ? `За ранг «${esc(rankName(ch.rank * 5 + 1))}»` : ch.gift ? 'Подарок за 7 дней' : ch.starter ? 'Стартовый сундук' : `За «${esc(ch.title || 'Тренировка')}» · ${dayMonth(ch.start)}`;
  const left = cs.closed.filter(x => x.id !== ch.id).length;
  if (sh.phase !== 'open') {
    const why = ch.rank != null ? 'Награда за новый ранг. Внутри минимум редкая вещь, а шанс эпической и легендарной выше.' : ch.gift ? 'Каждый седьмой подарок дня — сундук.' : ch.gold ? 'Золотой сундук — за неделю со всеми заданиями. Внутри минимум редкая вещь.' : ch.prs ? `Рекорд${ch.prs > 1 ? 'ы' : ''} в тренировке ${ch.prs > 1 ? 'подняли' : 'поднял'} шанс редкой вещи.` : ch.starter ? 'Подарок к новой версии: напарник может носить вещи.' : 'Внутри — вещь для напарника.';
    return `${closeOnly()}<div class="sheet-body"><div class="reveal"><button class="chest-tap${sh.phase === 'shake' ? ' busy' : ''}" data-act="chestOpen" aria-label="Открыть сундук">${chestSVG(type, false, sh.phase === 'shake' && ITEM[cs.op[ch.id]] ? ITEM[cs.op[ch.id]].r : 'c', sh.phase === 'shake' ? 'shake' : 'idle')}</button>
      <div class="eyebrow">${from}</div><h2 id="sheet-title" class="big-title">${ch.gold ? 'Золотой сундук' : 'Сундук'}</h2><p>${why}</p></div></div>
      <footer class="sheet-foot"><button class="btn btn-primary btn-lg btn-block" data-act="chestOpen"${sh.phase === 'shake' ? ' disabled' : ''}>${sh.phase === 'shake' ? 'Открываем…' : 'Открыть'}</button></footer>`;
  }
  const id = cs.op[ch.id], it = ITEM[id]; if (!it) return `${sheetHead('Сундук')}<div class="sheet-body"><p class="muted">Пусто.</p></div>`;
  const preview = { ...m.gear, [it.s]:id }, on = m.gear[it.s] === id;
  return `${closeOnly()}<div class="sheet-body"><div class="reveal rr-${it.r}">${chestSVG(type, true, it.r)}${mateCell(kind, 'fire', { stage:m.stage.k, gear:preview, still:true }, 'mate-r')}
    <span class="rch" style="--rc:${RAR[it.r].col}">${RAR[it.r].n} · ${SLOTS[it.s]}</span><h2 id="sheet-title" class="big-title">${esc(it.n)}</h2>
    <p>${sh.dup ? 'Такая вещь уже была — повтор превратился в 10 искр.' : 'Новая вещь в гардеробе.'}</p></div></div>
    <footer class="sheet-foot">${on ? `<button class="btn" disabled>${icon('check')} На напарнике</button>` : `<button class="btn" data-act="chestWear" data-id="${id}">Надеть</button>`}${left ? `<button class="btn btn-primary" data-act="chestOpenNext">Ещё сундук · ${left}</button>` : `<button class="btn btn-primary" data-act="closeSheet">Готово</button>`}</footer>`;
};
SHEETS.grow = sh => {
  const kind = charOf(curProf()), m = mateOf(S.profile, S.workouts), st = STAGES[sh.k] || STAGES[0], nx = STAGES[sh.k + 1], n = S.workouts.length;
  return `${closeOnly()}<div class="sheet-body"><div class="done-hero grow-hero">${mateCell(kind, 'fire', { stage:st.k, gear:m.gear }, 'mate-g')}
    <h2 id="sheet-title" class="big-title">${esc(mateName(kind))} ${vb(kind, 'вырос', 'выросла')}: ${stName(st, kind).toLowerCase()}!</h2><p>${GROW_TXT[st.k] || ''}</p>
    ${nx ? `<span class="xp-chip">До «${stName(nx, kind)}» — ${cntW(nx.from - n)}</span>` : '<span class="xp-chip">Высшая стадия</span>'}</div></div>
    <footer class="sheet-foot"><button class="btn btn-primary btn-lg btn-block" data-act="closeSheet">Ура!</button></footer>`;
};
SHEETS.sup = sh => {
  const d = sh.d, unitOk = SUP_UNITS.includes(d.unit);
  return `${sheetHead(sh.isNew ? 'Новая добавка' : 'Добавка')}<div class="sheet-body">
    <label class="lbl">Название<input class="field" id="sup-name" data-in="supF" data-f="name" value="${esc(d.name)}" placeholder="Например, креатин" autocomplete="off" maxlength="40"></label>
    <div class="sup-dose"><label class="lbl">Доза<input class="field" id="sup-dose" data-in="supF" data-f="dose" value="${esc(d.dose)}" placeholder="5" inputmode="decimal" autocomplete="off" maxlength="8"></label>
      <div class="lbl">Единица<div class="chips wrap" role="group" aria-label="Единица">${SUP_UNITS.map(u => `<button class="chip" data-act="supSet" data-f="unit" data-v="${esc(u)}" aria-pressed="${d.unit === u}">${esc(u)}</button>`).join('')}${!unitOk && d.unit ? `<button class="chip" aria-pressed="true" disabled>${esc(d.unit)}</button>` : ''}</div></div></div>
    <div class="lbl" style="margin-top:12px">Когда принимать<div class="chips wrap" role="group" aria-label="Время приёма">${SUP_WHEN.map(([k, l]) => `<button class="chip" data-act="supSet" data-f="when" data-v="${k}" aria-pressed="${d.when === k}">${l}</button>`).join('')}</div></div>
    <div class="lbl" style="margin-top:12px">Дни недели<div class="chips wrap" role="group" aria-label="Дни недели"><button class="chip" data-act="supAllDays" aria-pressed="${!d.days.length}">Каждый день</button>${WD_ORDER.map(n => `<button class="chip" data-act="supDayT" data-v="${n}" aria-pressed="${d.days.includes(n)}">${WD[n]}</button>`).join('')}</div></div>
    <div class="srow"><div class="srow-t"><b>Курс</b><span>${d.course ? 'Добавка появляется в плане только на время курса' : 'Без срока — принимать постоянно'}</span></div><button class="switch" role="switch" aria-checked="${!!d.course}" aria-label="Курс" data-act="supCourseT"></button></div>
    ${d.course ? `<div class="sup-course"><label class="lbl">Начало<input class="field" type="date" id="sup-cf" data-in="supF" data-f="cf" value="${esc(d.cf)}"></label><div class="lbl">Длительность<div class="chips wrap" role="group" aria-label="Длительность курса">${[2, 4, 6, 8, 12].map(n => `<button class="chip" data-act="supSet" data-f="cw" data-v="${n}" aria-pressed="${+d.cw === n}">${n} нед.</button>`).join('')}</div></div></div>` : ''}
    <label class="lbl" style="margin-top:12px">Запас<input class="field" id="sup-stock" data-in="supF" data-f="stock" value="${esc(d.stock)}" placeholder="Например, 300" inputmode="decimal" autocomplete="off" maxlength="9"></label>
    <p class="fine" style="margin-top:6px">В тех же единицах, что и доза${d.unit ? ` (${esc(d.unit)})` : ''}. Каждая галочка уменьшает запас на дозу, а за неделю до конца появится напоминание. Пусто — не считать.</p>
    <label class="lbl" style="margin-top:12px">Заметка<input class="field" id="sup-note" data-in="supF" data-f="note" value="${esc(d.note)}" placeholder="После еды, запивать водой" autocomplete="off" maxlength="60"></label>
    ${sh.isNew ? '' : `<div class="srow"><div class="srow-t"><b>Пауза</b><span>Не показывать в плане, пока не включите снова</span></div><button class="switch" role="switch" aria-checked="${!!d.off}" aria-label="Пауза" data-act="supOffT"></button></div>`}
  </div><footer class="sheet-foot">${sh.isNew ? '' : `<button class="btn ${sh.confirm ? 'btn-danger' : 'btn-danger-soft'}" data-act="supDel">${sh.confirm ? 'Точно удалить' : 'Удалить'}</button>`}<button class="btn btn-primary" data-act="supSave">Сохранить</button></footer>`;
};

