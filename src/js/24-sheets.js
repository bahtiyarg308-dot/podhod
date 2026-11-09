/* ================= sheets ================= */
function openSheet(o) { S.sheets.push({ ...o, key:uid() }); render(); }
function closeSheet() {
  const t = top(); if (!t || (t.gate && !gateOk())) return;
  if (t.type === 'welcome' && !S.meta) { ensureMeta(); saveMeta(); applyAccent(); }
  S.sheets.pop(); render();
}
function sheetHead(title, eyebrow = '') { return `<header class="sheet-head"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h2 id="sheet-title">${title}</h2></div><button class="icon-btn" data-act="closeSheet" aria-label="Закрыть">${icon('x')}</button></header>`; }
const closeOnly = () => `<header class="sheet-head" style="justify-content:flex-end;padding-bottom:0"><button class="icon-btn" data-act="closeSheet" aria-label="Закрыть">${icon('x')}</button></header>`;
let closeTok = 0;
function renderSheet() {
  const root = $('#sheet-root'), t = top();
  document.body.classList.toggle('gated', !!(t && t.gate));
  if (!t) {
    document.body.classList.remove('locked');
    if (root.firstChild && !root.classList.contains('closing')) {
      root.classList.add('closing'); const tok = ++closeTok;
      setTimeout(() => { if (tok === closeTok && !top()) { root.innerHTML = ''; root.dataset.key = ''; root.classList.remove('closing'); } }, 240);
    }
    return;
  }
  const html = '<div class="grab" aria-hidden="true"></div>' + (SHEETS[t.type] || (() => ''))(t);
  const sheet = root.querySelector('.sheet');
  if (root.dataset.key === t.key && sheet && !root.classList.contains('closing')) {
    const tmp = document.createElement('section'); tmp.innerHTML = html; morphChildren(sheet, tmp);
  } else {
    closeTok++; root.classList.remove('closing');
    root.innerHTML = `<div class="scrim" data-act="closeSheet"></div><section class="sheet"${t.gate ? ' data-gate="1"' : ''} role="dialog" aria-modal="true" aria-labelledby="sheet-title">${html}</section>`;
    root.dataset.key = t.key; bindDrag(root.querySelector('.sheet'));
    countUp(root);
    if (t.type === 'done' && (t.prs || t.lvlUp || (t.newBadges && t.newBadges.length))) setTimeout(() => confetti(window.innerWidth / 2, window.innerHeight * .3, t.lvlUp ? 150 : 100), 450);
  }
  document.body.classList.add('locked');
}
function bindDrag(sheet) {
  if (!sheet || sheet.dataset.gate) return;
  let y0 = null, dy = 0, t0 = 0;
  sheet.addEventListener('pointerdown', e => {
    if (window.matchMedia('(min-width:720px)').matches) return;
    if (!e.target.closest('.grab,.sheet-head') || e.target.closest('button,input,select,textarea')) return;
    y0 = e.clientY; dy = 0; t0 = performance.now(); sheet.style.transition = 'none'; sheet.style.animation = 'none';
    try { sheet.setPointerCapture(e.pointerId); } catch (err) { /* capture unsupported */ }
  });
  sheet.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); sheet.style.transform = `translateY(${dy}px)`; });
  const end = () => {
    if (y0 == null) return; y0 = null;
    const fast = dy > 40 && dy / (performance.now() - t0) > .6;
    sheet.style.transition = 'transform .3s cubic-bezier(.2,.8,.2,1)';
    if (dy > 120 || fast) { sheet.style.transform = 'translateY(105%)'; setTimeout(() => { if (top()) closeSheet(); }, 200); }
    else sheet.style.transform = '';
  };
  sheet.addEventListener('pointerup', end); sheet.addEventListener('pointercancel', end);
}
const SHEETS = {};

SHEETS.pick = sh => {
  const title = sh.mode === 'replace' ? 'Заменить упражнение' : sh.mode === 'tpl' ? 'Упражнения в программу' : 'Добавить упражнения';
  return `${sheetHead(title)}
    <div class="pick-tools"><input id="pick-q" class="field" data-in="pickQ" placeholder="Поиск: жим, тяга, присед…" value="${esc(sh.q)}" autocomplete="off" type="search" aria-label="Поиск упражнения">
    <div class="chips" role="group" aria-label="Группа мышц">${[['all', 'Все'], ...Object.entries(MUSCLES)].map(([k, l]) => `<button class="chip" data-act="pickM" data-m="${k}" aria-pressed="${sh.m === k}">${l}</button>`).join('')}</div><div class="chips" role="group" aria-label="Снаряд">${[['all', 'Любой снаряд'], ...Object.entries(EQUIP)].map(([k, l]) => `<button class="chip" data-act="pickE" data-e="${k}" aria-pressed="${(sh.e || 'all') === k}">${l[0].toUpperCase() + l.slice(1)}</button>`).join('')}</div></div>
    <div class="sheet-body" id="pick-list">${pickList(sh)}</div>
    ${sh.mode !== 'replace' ? `<footer class="sheet-foot"><button class="btn btn-primary btn-block" data-act="pickConfirm" id="pick-go"${sh.sel.length ? '' : ' disabled'}>${sh.sel.length ? `Добавить · ${sh.sel.length}` : 'Отметьте упражнения'}</button></footer>` : ''}`;
};
function pickList(sh) {
  const q = sh.q.trim().toLowerCase();
  const list = allExercises().filter(e => (sh.m === 'all' || e.muscle === sh.m) && (!q || e.name.toLowerCase().includes(q) || (MUSCLES[e.muscle] || '').toLowerCase().includes(q)))
    .sort((a, b) => (D.usage[b.id] || 0) - (D.usage[a.id] || 0) || a.name.localeCompare(b.name, 'ru'));
  const rows = list.map(e => { const on = sh.sel.includes(e.id), u = D.usage[e.id] || 0; return `<button class="pick-row${on ? ' on' : ''}" data-key="pk-${esc(e.id)}" data-act="pickToggle" data-id="${esc(e.id)}" aria-pressed="${on}"><span class="pick-name">${esc(e.name)}</span><span class="pick-meta">${MUSCLES[e.muscle] || ''} · ${EQUIP[e.equip] || ''}${u ? ` · ${u} ${plural(u, ['раз','раза','раз'])}` : ''}</span><span class="pick-box">${on ? icon('check') : ''}</span></button>`; }).join('');
  const exact = list.some(e => e.name.toLowerCase() === q);
  let create = '';
  if (sh.creating) {
    create = `<div class="pick-new"><b>Новое упражнение</b><input class="field" id="cr-name" value="${esc(sh.q)}" placeholder="Название" autocomplete="off" aria-label="Название упражнения">
      <div class="pick-new-g"><label class="select"><span class="sr">Группа мышц</span><select class="field" id="cr-m">${Object.entries(MUSCLES).map(([k, l]) => `<option value="${k}"${k === (sh.m !== 'all' ? sh.m : 'chest') ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="select"><span class="sr">Оборудование</span><select class="field" id="cr-e">${Object.entries(EQUIP).map(([k, l]) => `<option value="${k}">${l[0].toUpperCase() + l.slice(1)}</option>`).join('')}</select></label>
      <label class="select"><span class="sr">Что записывать</span><select class="field" id="cr-k">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></label></div>
      <button class="btn btn-primary" data-act="pickCreate">Создать упражнение</button></div>`;
  } else if (!exact) {
    create = `<button class="btn btn-ghost btn-block" style="margin-top:10px" data-act="pickCreateStart">${icon('plus')} ${q ? `Создать «${esc(sh.q.trim())}»` : 'Создать своё упражнение'}</button>`;
  }
  return (rows || `<p class="muted" style="padding:16px 2px">Ничего не нашлось.</p>`) + create;
}

SHEETS.xm = sh => {
  const w = curW(), x = w && w.exercises[sh.x]; if (!x) return sheetHead('Упражнение');
  const ex = exById(x.ex);
  return `${sheetHead(esc(ex.name), 'Упражнение')}<div class="sheet-body"><div class="menu">
    <button data-act="exNoteOpen">${icon('note')} ${x.note != null ? 'Перейти к заметке' : 'Добавить заметку'}</button>
    <button data-act="exReplace">${icon('swap')} Заменить упражнение</button>
    <button data-act="exMove" data-d="-1"${sh.x === 0 ? ' disabled' : ''}>${icon('up')} Переместить выше</button>
    <button data-act="exMove" data-d="1"${sh.x === w.exercises.length - 1 ? ' disabled' : ''}>${icon('down')} Переместить ниже</button>
    <button class="danger" data-act="exRemove">${icon('trash')} ${sh.confirm ? 'Нажмите ещё раз, чтобы удалить' : 'Удалить из тренировки'}</button>
  </div></div>`;
};

SHEETS.fin = sh => {
  const w = S.active; if (!w) return sheetHead('Тренировка');
  const fw = finalize(clone(w)), st = wStats(fw), prs = livePRs(fw);
  let unticked = 0, empty = 0;
  w.exercises.forEach(x => { const k = exById(x.ex).kind; x.sets.forEach(s => { if (!valid(s, k)) empty++; else if (!s.done) unticked++; }); });
  const prList = [...prs].map(key => { const [xi, si] = key.split(':').map(Number), x = fw.exercises[xi], ex = exById(x.ex); return `<li>${icon('star', 'ic-f')}<span><b>${esc(ex.name)}</b> · ${esc(setLong(x.sets[si], ex.kind))}</span></li>`; }).join('');
  return `${sheetHead('Завершить тренировку', esc(w.title || 'Тренировка'))}<div class="sheet-body">
    <div class="kv k4"><div><b>${fmtClock((Date.now() - w.start) / 1000)}</b><span>время</span></div><div><b>${ton(st.vol)}</b><span>объём</span></div><div><b>${st.sets}</b><span>подходов</span></div><div class="${prs.size ? 'is-pr' : ''}"><b>${prs.size}</b><span>${plural(prs.size, ['рекорд','рекорда','рекордов'])}</span></div></div>
    ${prList ? `<ul class="pr-list">${prList}</ul>` : ''}
    <div class="feel"><div class="h2">Как ощущения</div><div class="chips" role="group" aria-label="Ощущения">${FEELS.map(([v, l]) => `<button class="chip" data-act="finFeel" data-v="${v}" aria-pressed="${sh.feel === v}">${l}</button>`).join('')}</div></div>
    <label class="lbl" style="margin-top:16px">Заметка<textarea class="field" id="fin-note" data-in="finNote" placeholder="Сон, самочувствие, что получилось и что нет">${esc(sh.note || '')}</textarea></label>
    ${unticked ? `<p class="fine">${unticked} ${plural(unticked, ['неотмеченный подход','неотмеченных подхода','неотмеченных подходов'])} с данными тоже сохранятся.</p>` : ''}
    ${empty ? `<p class="fine">${empty} ${plural(empty, ['пустой подход','пустых подхода','пустых подходов'])} без данных не сохранятся.</p>` : ''}
  </div><footer class="sheet-foot"><button class="btn" data-act="closeSheet">Продолжить</button><button class="btn btn-primary" data-act="finishSave"${st.sets ? '' : ' disabled'}>Сохранить</button></footer>`;
};

SHEETS.done = sh => {
  const w = S.workouts.find(x => x.id === sh.id); if (!w) return sheetHead('Тренировка сохранена');
  const st = wStats(w), pr = D.prCount[w.id] || 0, marks = D.prSets[w.id] || new Set();
  const prList = [...marks].map(key => { const [xi, si] = key.split(':').map(Number), x = w.exercises[xi], ex = exById(x.ex); return `<li>${icon('star', 'ic-f')}<span><b>${esc(ex.name)}</b> · ${esc(setLong(x.sets[si], ex.kind))}</span></li>`; }).join('');
  const L = levelOf(sh.xpAfter);
  const nb = (sh.newBadges || []).map(id => { const i = BADGES.findIndex(b => b[0] === id); return i >= 0 ? medalHTML(BADGES[i], i, true, true, true) : ''; }).join('');
  return `${closeOnly()}<div class="sheet-body"><div class="done-hero">${(() => { const k = charOf(curProf()), mt = mateOf(S.profile, S.workouts); return charSVG(k, pr || sh.lvlUp ? 'fire' : 'happy', { stage:mt.stage.k, gear:mt.gear }); })()}<h2 id="sheet-title" class="big-title">${sh.lvlUp ? 'Новый уровень' : pr ? 'Новые рекорды' : 'Тренировка завершена'}</h2><p>${esc(w.title || 'Тренировка')} · записано в журнал</p><span class="xp-chip">+${sh.xpGain} XP</span></div>
    <div class="kv k4"><div><b ${cnt(st.dur, 'dur')}>${fmtDur(st.dur)}</b><span>время</span></div><div><b ${cnt(st.vol, 'ton')}>${ton(st.vol)}</b><span>объём</span></div><div><b ${cnt(st.sets, 'int')}>${st.sets}</b><span>подходов</span></div><div class="${pr ? 'is-pr' : ''}"><b ${cnt(pr, 'int')}>${pr}</b><span>${plural(pr, ['рекорд','рекорда','рекордов'])}</span></div></div>
    <div class="lvl-up">${sh.lvlUp ? `<p class="lvl-new">Уровень ${L.k} · ${esc(L.title)}</p>` : ''}<div class="lvl">${rankBadge(L.k)}<span class="lvl-main"><b>${esc(L.title)}</b><span class="lvl-bar"><i style="width:${L.pct.toFixed(1)}%"></i></span></span><span class="lvl-xp">${L.cur}/${L.need} XP</span></div></div>
    ${nb ? `<div class="sblock" style="border:0;padding-bottom:0"><b>Новые достижения</b><div class="medal-list">${nb}</div></div>` : ''}
    ${(sh.newQuests || []).length ? `<div class="sblock" style="border:0;padding-bottom:0"><b>Задания недели</b><ul class="pr-list news">${sh.newQuests.map(t => `<li>${icon('check')}<span><b>${esc(t)}</b> · +${QXP} XP</span></li>`).join('')}</ul></div>` : ''}
    ${prList ? `<ul class="pr-list">${prList}</ul>` : ''}${doneChestHTML(w)}${workoutMapHTML(w)}</div>
    <footer class="sheet-foot">${doneChestBtn(w)}</footer>`;
};

function doneChestInfo(w) { const cs = chestState(), ch = cs.all.find(x => x.id === w.id); return { cs, ch, open:!!(ch && cs.op[ch.id]) }; }
function doneChestHTML(w) {
  const { cs, ch, open } = doneChestInfo(w), it = open ? ITEM[cs.op[ch.id]] : null;
  if (ch) return `<div class="done-chest">${chestSVG(ch.gold ? 'gold' : 'std', !!it, it ? it.r : 'c')}<span><b>${it ? 'Сундук открыт' : ch.gold ? 'Золотой сундук!' : 'Сундук за тренировку'}</b>${it ? esc(it.n) : ch.gold ? 'Все задания недели выполнены — внутри минимум редкая вещь.' : ch.prs ? 'Рекорд поднял шанс редкой вещи.' : 'Внутри — вещь для напарника.'}</span></div>`;
  const reason = wStats(w).sets < CH_MIN_SETS ? `Сундук даётся за тренировку от ${CH_MIN_SETS} рабочих подходов.` : 'Сундук за этот день уже получен — следующий завтра.';
  return `<p class="fine">${reason}</p>`;
}
function doneChestBtn(w) {
  const { ch, open } = doneChestInfo(w);
  if (ch && !open) return `<button class="btn" data-act="closeSheet">Готово</button><button class="btn btn-primary" data-act="chestOpenFor" data-id="${esc(ch.id)}">${icon('chest')} Открыть сундук</button>`;
  return `<button class="btn" data-act="doneDetail">Подробнее</button><button class="btn btn-primary" data-act="closeSheet">Готово</button>`;
}
SHEETS.awards = () => {
  const st = gameStats(), xp = totalXP(st), L = levelOf(xp), un = new Set(unlockedBadges(st));
  const order = BADGES.map((b, i) => [b, i]).filter(([b]) => b[0] !== 'pair' || pairOn() || un.has('pair')).sort((a, b) => (un.has(b[0][0]) ? 1 : 0) - (un.has(a[0][0]) ? 1 : 0));
  return `${sheetHead('Уровень и достижения', `${xp} XP всего`)}<div class="sheet-body">
    <div class="lvl" style="margin-top:0">${rankBadge(L.k)}<span class="lvl-main"><b>${esc(L.title)}</b><span class="lvl-bar"><i style="width:${L.pct.toFixed(1)}%"></i></span></span><span class="lvl-xp">ещё ${L.need - L.cur} XP</span></div>
    <p class="fine">Опыт: 40 за тренировку, по 2 за рабочий подход (до 40), 15 за рекорд, 60 за неделю с выполненной целью, ${QXP} за задание недели (+${QBONUS} за все три), 30 за каждое достижение и 10 за день, когда все добавки приняты по плану.</p>
    ${rankLadder(L.k, xp)}<div class="sblock"><b>Достижения · ${un.size} из ${order.length}</b><div class="medal-list">${order.map(([b, i]) => medalHTML(b, i, un.has(b[0]), false, true)).join('')}</div></div>
  </div>`;
};

SHEETS.ph = sh => {
  const p = S.photos && S.photos.list.find(x => x.id === sh.id); if (!p) return `${sheetHead('Фото')}<div class="sheet-body"><p class="muted">Фото удалено.</p></div>`;
  return `${sheetHead('Фото', dayMonth(p.d))}<div class="sheet-body"><img class="ph-big" src="${PHURL.get(p.id) || ''}" alt="Фото ${dayMonth(p.d)}"></div>
    <footer class="sheet-foot"><button class="btn" data-act="phCmp" data-id="${esc(p.id)}" data-i="0">Сделать «до»</button><button class="btn" data-act="phCmp" data-id="${esc(p.id)}" data-i="1">Сделать «после»</button><button class="btn ${sh.confirm ? 'btn-danger' : 'btn-danger-soft'}" data-act="phDel" data-id="${esc(p.id)}">${icon('trash')} ${sh.confirm ? 'Точно удалить' : 'Удалить'}</button></footer>`;
};

SHEETS.disc = () => `${sheetHead('Отменить тренировку?')}<div class="sheet-body"><p style="color:var(--ink-2)">Все подходы этой тренировки удалятся, в журнал она не попадёт. Вернуть будет нельзя.</p></div><footer class="sheet-foot"><button class="btn" data-act="closeSheet">Назад</button><button class="btn btn-danger" data-act="discardConfirm">Удалить тренировку</button></footer>`;

SHEETS.wd = sh => {
  const rm = sh.sid ? S.remote[sh.sid] : null, Dx = rm ? rdFor(sh.sid) : D;
  const w = (rm ? rm.workouts : S.workouts).find(x => x.id === sh.id);
  if (!w) return `${sheetHead('Тренировка')}<div class="sheet-body"><p class="muted">Эта тренировка удалена.</p></div>`;
  const st = wStats(w), marks = Dx.prSets[w.id] || new Set(), d = new Date(w.start), pr = Dx.prCount[w.id] || 0;
  const kg = rm ? [] : kudosFor(w.id);
  const feel = FEELS.find(f => f[0] === w.feel);
  const exs = w.exercises.map((x, xi) => {
    const ex = exById(x.ex); let n = 0;
    const rows = x.sets.map((s, si) => { if (!valid(s, ex.kind)) return ''; if (!s.warm) n++; const isPr = marks.has(xi + ':' + si); const e = ex.kind === 'wr' && !s.warm ? e1rm(num(s.w) || 0, num(s.r) || 0) : 0; return `<div class="wd-set${isPr ? ' pr' : ''}"><span class="set-n${s.warm ? ' warm' : ''}">${s.warm ? 'Р' : n}</span><span>${esc(setLong(s, ex.kind))}${s.rir != null && !s.warm ? ` <span class="muted">· запас ${s.rir >= 3 ? '3+' : s.rir}</span>` : ''}</span><span class="e1">${isPr ? `<span class="pr-chip">${icon('star', 'ic-f')}PR</span> ` : ''}${e ? 'e1RM ' + nf(e, 1) : ''}</span></div>`; }).join('');
    return `<div class="wd-ex"><h3><span>${esc(ex.name)}</span><small>${esc(xSummary(x, ex.kind))}</small></h3>${x.note ? `<p class="wd-note" style="margin:0 0 8px">${esc(x.note)}</p>` : ''}<div class="wd-sets">${rows}</div></div>`;
  }).join('');
  return `${sheetHead(esc(w.title || 'Тренировка'), `${rm ? esc(rm.name || 'Партнёр') + ' · ' : ''}${WD_FULL[d.getDay()]}, ${dayMonth(w.start)} · ${hm(w.start)}–${hm(w.end)}`)}
    <div class="sheet-body">
      <div class="kv k4"><div><b>${fmtDur(st.dur)}</b><span>время</span></div><div><b>${ton(st.vol)}</b><span>объём</span></div><div><b>${st.sets}</b><span>подходов</span></div><div class="${pr ? 'is-pr' : ''}"><b>${pr}</b><span>${plural(pr, ['рекорд','рекорда','рекордов'])}</span></div></div>
      <div class="wd-meta" style="margin-top:12px">${feel ? `<span>Ощущения: <b>${feel[1]}</b></span>` : ''}<span>+${workoutXP(w, Dx)} XP</span>${kg.map(k => `<span class="kd-got">${icon(k.t, k.t === 'flame' ? '' : 'ic-f')}</span><span>${esc(k.m.name || 'Партнёр')}</span>`).join('')}</div>
      ${w.note ? `<p class="wd-note">${esc(w.note)}</p>` : ''}
      ${workoutMapHTML(w)}
      ${exs}
    </div>
    ${rm ? `<div class="wd-actions" style="grid-template-columns:1fr auto;align-items:center"><span class="fine" style="margin:0">Поддержите реакцией</span>${kudosBtns(rm.id, w.id)}</div>` : `<div class="wd-actions">
      <button class="btn" data-act="wRepeat">${icon('repeat')} Повторить</button>
      <button class="btn" data-act="wAsTpl">${icon('save')} В программы</button>
      <button class="btn" data-act="wEdit">${icon('edit')} Изменить</button>
      <button class="btn ${sh.confirm ? 'btn-danger' : 'btn-danger-soft'}" data-act="wDel">${icon('trash')} ${sh.confirm ? 'Точно удалить' : 'Удалить'}</button>
    </div>`}`;
};

SHEETS.tpl = sh => {
  const d = sh.draft;
  const items = d.items.map((it, i) => { const ex = exById(it.ex); const unit = ex.kind === 'time' ? 'сек' : ex.kind === 'cardio' ? 'мин' : 'повт'; return `${swOpen('ti', i)}<div class="tpl-item"><div class="tpl-ex"><b>${esc(ex.name)}</b><span>${MUSCLES[ex.muscle] || ''}</span></div>
    <div class="stepper"><button data-act="tplSets" data-i="${i}" data-d="-1" aria-label="Меньше подходов">−</button><span>${it.sets}×</span><button data-act="tplSets" data-i="${i}" data-d="1" aria-label="Больше подходов">+</button></div>
    <label class="tpl-rw"><input class="field tpl-r" id="tpl-r-${i}" data-in="tplReps" data-i="${i}" inputmode="numeric" autocomplete="off" value="${esc(it.reps ?? '')}" placeholder="—" aria-label="Цель, ${unit}"><span>${unit}</span></label>
    <button class="icon-btn" data-act="tplItemDel" data-i="${i}" aria-label="Убрать упражнение">${icon('x')}</button></div>${swClose()}`; }).join('');
  return `${sheetHead(sh.isNew ? 'Новая программа' : 'Программа')}<div class="sheet-body">
    <label class="lbl">Название<input class="field" id="tpl-name" data-in="tplName" value="${esc(d.name)}" placeholder="Например, Верх А или Ноги и ягодицы" autocomplete="off"></label>
    ${items ? `<div class="tpl-items">${items}</div>` : `<p class="fine" style="margin:14px 0">Добавьте упражнения и задайте число подходов и целевые повторы — они станут подсказками в тренировке.</p>`}
    <button class="btn btn-add" data-act="tplAddEx">${icon('plus')} Добавить упражнения</button>
  </div><footer class="sheet-foot">${sh.isNew ? '' : `<button class="btn ${sh.confirm ? 'btn-danger' : 'btn-danger-soft'}" data-act="tplDel">${sh.confirm ? 'Точно удалить' : 'Удалить'}</button>`}<button class="btn btn-primary" data-act="tplSave">Сохранить</button></footer>`;
};

const colorDots = (sel, act) => `<div class="cdots" role="group" aria-label="Цвет">${Object.entries(COLORS).map(([k, c]) => `<button class="cdot" style="--c:${c[isLight() ? 0 : 1]}" title="${c[4]}" data-act="${act}" data-c="${k}" aria-pressed="${sel === k}" aria-label="${c[4]}"></button>`).join('')}</div>`;

SHEETS.prof = sh => {
  const ps = profiles(), cur = curProf();
  const rows = ps.map(p => {
    const s = weekSummary(p.id === S.pid ? S.workouts : (S.store[p.id] && S.store[p.id].workouts));
    const sub = s.n ? `${s.n} ${plural(s.n, ['тренировка','тренировки','тренировок'])} на этой неделе` : 'на этой неделе пока без тренировок';
    return `<button class="prow${p.id === S.pid ? ' on' : ''}" data-key="pf-${esc(p.id)}" data-act="switchProf" data-id="${esc(p.id)}">${ava(p, 'lg')}<span><b>${esc(pname(p))}</b><small>${esc(sub)}</small></span>${p.id === S.pid ? `<span class="tick">${icon('check')}</span>` : '<span></span>'}</button>`;
  }).join('');
  return `${sheetHead('Профили')}<div class="sheet-body">
    <div class="prof-list">${rows}</div>
    ${sh.adding ? `<div class="pform"><b>Новый профиль</b><label class="lbl">Имя<input class="field" id="np-name" data-in="npName" value="${esc(sh.newName)}" placeholder="Имя" autocomplete="off" maxlength="24"></label><div class="lbl">Цвет${colorDots(sh.newColor, 'npColor')}</div><div style="display:flex;gap:8px"><button class="btn" data-act="profAddCancel">Отмена</button><button class="btn btn-primary" style="flex:1" data-act="profCreate">Создать профиль</button></div></div>`
      : `<button class="btn btn-add" style="margin-top:10px" data-act="profAddStart">${icon('plus')} Добавить профиль</button>`}
    <div class="sblock" style="margin-top:8px"><b>Профиль «${esc(pname(cur))}»</b>
      <label class="lbl">Имя<input class="field" id="cp-name" data-ch="cpName" value="${esc(cur.name || '')}" placeholder="Как вас зовут?" autocomplete="off" maxlength="24"></label>
      <div class="lbl" style="margin-top:12px">Цвет${colorDots(cur.color, 'cpColor')}</div>
      <div class="lbl" style="margin-top:12px">Напарник${charPicker(charOf(cur), 'cpChar')}</div>
      <div class="lbl" style="margin-top:12px">Тело на карте мышц${bodySeg()}</div>
      <button class="btn btn-sm" style="margin-top:12px" data-act="ward">${icon('shirt')} Гардероб · ${collOf(S.profile, S.workouts).uniq} из ${ITEMS.length}</button>
      ${cur.id !== 'main' ? `<button class="btn btn-sm ${sh.confirm ? 'btn-danger' : 'btn-danger-soft'}" style="margin-top:14px" data-act="profDel">${icon('trash')} ${sh.confirm ? 'Удалить профиль и все его тренировки' : 'Удалить профиль'}</button>` : ''}
    </div>
    <p class="fine">Профили нужны, если вы тренируетесь с одного телефона вдвоём: у каждого свой журнал, рекорды, уровень и цвет. Если у каждого свой телефон — просто установите приложение на оба.</p>
  </div>`;
};

const charPicker = (sel, act) => `<div class="chars" role="group" aria-label="Напарник">${CHAR_ORDER.map(k => `<button class="chp" data-act="${act}" data-c="${k}" aria-pressed="${sel === k}">${charSVG(k, sel === k ? 'happy' : 'calm', { still:sel !== k })}<span>${CHARS[k].name}</span></button>`).join('')}</div>`;
SHEETS.welcome = sh => `${closeOnly()}<div class="sheet-body">
  <div class="welcome-hero">${charSVG(sh.char || 'cat', 'happy')}<h2 id="sheet-title" class="big-title">Добро пожаловать</h2><p>Дневник тренировок: подходы, рекорды, задания недели и прогресс. Всё хранится на этом устройстве и работает без интернета.</p></div>
  ${accOf() ? '' : `<button class="btn btn-sm btn-g wl-login" data-act="welcomeLogin">${icon('cloud')} Уже есть аккаунт? Войти</button>`}
  <label class="lbl">Как вас зовут?<input class="field" id="wl-name" data-in="wlName" value="${esc(sh.name)}" placeholder="Имя" autocomplete="off" maxlength="24" enterkeyhint="done"></label>
  <div class="lbl" style="margin-top:14px">Напарник${charPicker(sh.char || 'cat', 'wlChar')}</div>
  <div class="lbl" style="margin-top:14px">Цвет${colorDots(sh.color, 'wlColor')}</div>
  <div class="lbl" style="margin-top:14px">Как тренируетесь${modeSeg('wlMode')}</div>
  ${sh.mode === 'pair' ? `<div class="hint">${icon('users')}<span><b>С партнёром — даже в разных залах.</b> После старта нажмите «Подключить» на главном экране: будете видеть тренировки друг друга и переписываться.</span></div>` : `<p class="fine">Партнёра можно подключить позже в настройках.</p>`}
</div><footer class="sheet-foot"><button class="btn btn-primary btn-lg btn-block" data-act="welcomeSave">Начать</button></footer>`;

SHEETS.news = () => { const k = charOf(curProf()), mt = mateOf(S.profile, S.workouts), n = chestState().closed.length;
  return `${sheetHead('Что нового', 'Версия ' + APP_VERSION)}<div class="sheet-body">
  <div style="display:grid;place-items:center;margin-bottom:10px">${mateCell(k, 'happy', { stage:mt.stage.k, gear:mt.gear }, 'mate-g')}</div>
  <ul class="pr-list news">
    <li>${icon('up')}<span><b>Напарник растёт</b> — пять стадий от малыша до легенды. Сейчас: ${stName(mt.stage, k).toLowerCase()}, тренировок: ${S.workouts.length}</span></li>
    <li>${icon('heart')}<span><b>Сытость</b> — после тренировки 100%, два дня отдыха без потерь. На болезнь и отпуск есть заморозка в настройках</span></li>
    <li>${icon('chest')}<span><b>Сундуки</b> — после тренировки от ${CH_MIN_SETS} подходов. Рекорды повышают шанс редкой вещи, идеальная неделя даёт золотой сундук</span></li>
    <li>${icon('shirt')}<span><b>Гардероб</b> — 60 вещей и фонов. Нажмите на напарника, чтобы переодеть. Партнёр видит обновки</span></li>
    <li>${icon('pill')}<span><b>Добавки</b> — новая вкладка: свой план приёма, галочки, курсы и запас. Видите только вы</span></li>
    <li>${icon('sound')}<span><b>Звуки</b> — подходы, отсчёт отдыха, рекорды, сундуки и голос напарника. Настраиваются в настройках</span></li>
    <li>${icon('user')}<span><b>Один или с партнёром</b> — сейчас: «${pairOn() ? 'С партнёром' : 'Один'}». Меняется в настройках</span></li>
  </ul>
  ${n ? `<p class="fine">Прошлые тренировки уже превратились в открытые сундуки. А ещё вас ждут ${n} ${plural(n, ['сундук','сундука','сундуков'])} в подарок.</p>` : ''}
</div><footer class="sheet-foot">${n ? `<button class="btn" data-act="closeSheet">Позже</button><button class="btn btn-primary" data-act="chestOpenNext">${icon('chest')} Открыть сундуки</button>` : `<button class="btn btn-primary btn-block" data-act="closeSheet">Готово</button>`}</footer>`; };

SHEETS.help = () => `${sheetHead('Как пользоваться')}<div class="sheet-body help">
  <h3>1. Установите на телефон</h3>
  <p><b>iPhone:</b> откройте ссылку в Safari → кнопка «Поделиться» (квадрат со стрелкой) → «На экран “Домой”» → «Добавить».</p>
  <p><b>Android:</b> откройте ссылку в Chrome → меню ⋮ → «Установить приложение» (или «Добавить на главный экран»).</p>
  <p>После установки «Подход» открывается с иконки, работает без интернета и не зависит ни от каких аккаунтов.</p>
  <h3>2. В зале</h3>
  <ol><li>Нажмите «Начать тренировку» или «Начать» у программы.</li><li>Серые цифры в полях — ваш прошлый результат. Сделали так же — просто жмите галочку. Сделали больше — впишите новые цифры.</li><li>Нажмите на номер подхода, чтобы отметить его как разминочный («Р») — он не идёт в статистику.</li><li>Кнопка «Разминка» в упражнении добавит разминочные подходы к рабочему весу: пустой гриф, около 50, 75 и 90% от рабочего.</li><li>После подхода отметьте запас — сколько ещё могли сделать. По нему подсказка предложит вес на следующую тренировку.</li><li>После галочки сам запускается таймер отдыха. Его длительность меняется в настройках.</li><li>В конце — «Завершить»: тренировка попадёт в журнал, начислится опыт, а задания недели продвинутся.</li></ol>
  <h3>3. Программы</h3>
  <p>Удачную тренировку сохраните кнопкой «В программы» в журнале — в следующий раз начнёте её в одно касание.</p>
  <h3>4. Резервная копия — важно</h3>
  <p>Данные хранятся только на этом устройстве. Раз в пару недель нажимайте <b>Настройки → Резервная копия → Сохранить</b> и отправляйте файл себе в «Избранное» в Telegram, в Google Диск или «Файлы». При смене телефона установите приложение заново и нажмите «Восстановить из файла».</p>
  <h3>5. С партнёром, даже в разных залах (по желанию)</h3>
  <p>Сначала выберите <b>Настройки → Как тренируетесь → С партнёром</b>.</p>
  <ol><li>Один человек открывает <b>Настройки → Синхронизация → Настроить → «Я настраиваю первым»</b> и создаёт бесплатный ключ на GitHub (приложение подскажет, куда нажать).</li><li>Затем нажимает «Код для партнёра» и отправляет код второму.</li><li>Второй открывает <b>Настройки → Синхронизация → Настроить → «У меня есть код»</b> и вставляет его.</li></ol>
  <p>После этого на главной появится «Неделя вместе»: тренировки, рекорды и уровень партнёра, а ещё реакции — огонь, сердце и звезда. Обмен идёт, когда есть интернет, а в зале всё работает и без него. Синхронизация заодно служит облачной копией: на новом телефоне подключитесь тем же кодом и выберите «Это мой профиль — …». Если код вам прислал партнёр, всегда выбирайте «Я новый участник».</p>
  <h3>6. Один телефон на двоих</h3>
  <p>Добавьте второй профиль: нажмите на кружок с буквой вверху. У каждого профиля свой напарник, гардероб и добавки.</p>
  <h3>7. Напарник и сундуки</h3>
  <p>Напарник растёт с каждой тренировкой: малыш, юный, взрослый, атлет и легенда. Сытость — 100% после тренировки, первые два дня отдыха она не падает, потом снижается на 20% в день. Болеете или в отпуске — включите <b>Настройки → Заморозка</b>.</p>
  <p>За тренировку от ${CH_MIN_SETS} рабочих подходов дают сундук (один в день) с вещью для напарника. Рекорд повышает шанс редкой вещи, все три задания недели — золотой сундук. Повторы превращаются в искры: 100 искр — обычная вещь на выбор, 300 — редкая. Нажмите на напарника, чтобы открыть гардероб.</p>
  <h3>8. Добавки</h3>
  <p>Во вкладке «Добавки» составьте свой план: доза, время приёма, дни недели, курс и запас. Отмечайте приём галочкой — за полный день +10 XP. План личный и партнёру не передаётся.</p>
</div>`;

SHEETS.sync = sh => {
  if (sh.step === 'create') return `${sheetHead('Общее пространство')}<div class="sheet-body">
    <p style="color:var(--ink-2);font-size:14px;margin-bottom:14px">Тренировки будут храниться в секретном хранилище на вашем GitHub. Это бесплатно и навсегда. Нужен ключ доступа — его создаёт GitHub.</p>
    <ol class="steps">
      <li><span><b>Откройте GitHub</b> — название ключа и галочка «gist» уже будут заполнены.<br><a class="btn btn-sm btn-soft" style="margin-top:8px" href="https://github.com/settings/tokens/new?scopes=gist&amp;description=Podhod%20sync" target="_blank" rel="noopener">${icon('key')} Создать ключ на GitHub</a></span></li>
      <li><span>В поле <b>Expiration</b> выберите <b>No expiration</b>, внизу нажмите <b>Generate token</b> и скопируйте ключ — он начинается с <b>ghp_</b>.</span></li>
      <li><span>Вставьте ключ сюда и нажмите «Подключить».</span></li>
    </ol>
    <input class="field mono" style="margin-top:14px" id="sync-token" data-in="syncToken" value="${esc(sh.token || '')}" placeholder="ghp_…" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Ключ доступа GitHub">
    ${sh.err ? `<p class="err">${esc(sh.err)}</p>` : ''}
  </div><footer class="sheet-foot"><button class="btn" data-act="syncStep" data-step="">Назад</button><button class="btn btn-primary" data-act="syncCreate"${sh.busy ? ' disabled' : ''}>${sh.busy ? 'Подключаю…' : 'Подключить'}</button></footer>`;
  if (sh.step === 'join') return `${sheetHead('Подключиться по коду')}<div class="sheet-body">
    <p style="color:var(--ink-2);font-size:14px;margin-bottom:12px">Попросите партнёра открыть у себя <b>Настройки → Синхронизация → Код для партнёра</b> и прислать вам код. Вставьте его сюда.</p>
    <textarea class="field mono" id="sync-code" data-in="syncCode" rows="4" placeholder="PDH1-…" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Код партнёра">${esc(sh.code || '')}</textarea>
    ${sh.err ? `<p class="err">${esc(sh.err)}</p>` : ''}
  </div><footer class="sheet-foot"><button class="btn" data-act="syncStep" data-step="">Назад</button><button class="btn btn-primary" data-act="syncJoin"${sh.busy ? ' disabled' : ''}>${sh.busy ? 'Подключаю…' : 'Подключиться'}</button></footer>`;
  if (sh.step === 'pick') return `${sheetHead('Кто вы?')}<div class="sheet-body">
    <p style="color:var(--ink-2);font-size:14px;margin-bottom:14px">Если код вам прислал партнёр — нажмите <b>«Я новый участник»</b>. У каждого будет свой профиль, и вы будете видеть тренировки друг друга.</p>
    <div class="choice"><button class="pri" data-act="syncPickNew">${icon('plus')}<span><b>Я новый участник</b><small>Создать мой профиль рядом с партнёром</small></span></button></div>
    <p class="fine" style="margin:20px 0 8px">Только если вы переносите <b>свой</b> профиль со старого телефона:</p>
    <div class="choice">${(sh.members || []).map(m => `<button data-act="syncPickAsk" data-sid="${esc(m.id)}">${ava(m, 'lg')}<span><b>Это мой профиль — ${esc(m.name || 'без имени')}</b><small>${m.workouts.length} ${plural(m.workouts.length, ['тренировка','тренировки','тренировок'])}${m.updated ? ` · обновлялся ${agoText(m.updated)}` : ''}</small></span></button>`).join('')}</div>
  </div>`;
  if (sh.step === 'confirm') {
    const m = (sh.members || []).find(x => x.id === sh.sid) || {}, nm = esc(m.name || 'без имени'), fresh = m.updated && Date.now() - m.updated < 2 * DAY;
    return `${sheetHead(`Вы — ${nm}?`)}<div class="sheet-body">
    <p style="color:var(--ink-2);font-size:14px;margin-bottom:12px">Этот телефон станет ещё одним телефоном участника «${nm}»: его тренировки перенесутся сюда, и дальше оба телефона будут писать в один профиль.</p>
    <div class="banner warn" style="margin-top:0"><div class="banner-t">${icon('users')}<span><b>Если «${nm}» — ваш партнёр, вернитесь и выберите «Я новый участник».</b> Иначе вы окажетесь в одном профиле и не увидите друг друга.${fresh ? ` Этот профиль обновлялся ${agoText(m.updated)} — похоже, им сейчас пользуются на другом телефоне.` : ''}</span></div></div>
  </div><footer class="sheet-foot"><button class="btn" data-act="syncPickMe" data-sid="${esc(m.id || '')}">Да, я — ${nm}</button><button class="btn btn-primary" data-act="syncPickNew">Я новый участник</button></footer>`;
  }
  return `${sheetHead('Синхронизация с партнёром')}<div class="sheet-body">
    <p style="color:var(--ink-2);font-size:14px;margin-bottom:14px">Телефоны будут видеть тренировки, рекорды и уровни друг друга, даже если вы ходите в разные залы. Без интернета всё работает как обычно — обмен произойдёт, когда появится связь.</p>
    <div class="choice">
      <button data-act="syncStep" data-step="create">${icon('cloud')}<span><b>Я настраиваю первым</b><small>Создать общее пространство на своём GitHub (бесплатно)</small></span></button>
      <button data-act="syncStep" data-step="join">${icon('link')}<span><b>У меня есть код от партнёра</b><small>Подключиться к уже созданному пространству</small></span></button>
    </div>
  </div>`;
};

SHEETS.invite = () => `${sheetHead('Код для партнёра')}<div class="sheet-body">
  <p style="color:var(--ink-2);font-size:14px">Отправьте этот код второму человеку. На его телефоне: <b>Настройки → Синхронизация → Настроить → «У меня есть код»</b>.</p>
  <textarea class="field mono" id="inv-code" readonly rows="4" style="margin-top:12px;font-size:12px">${esc(inviteCode())}</textarea>
  <p class="fine">В коде — ключ к вашим общим тренировкам. Отправляйте его только партнёру. Отозвать доступ можно на GitHub: Settings → Developer settings → Personal access tokens.</p>
</div><footer class="sheet-foot"><button class="btn" data-act="copyCode">Скопировать</button>${navigator.share ? `<button class="btn btn-primary" data-act="shareCode">${icon('share')} Отправить</button>` : ''}</footer>`;

SHEETS.friend = sh => {
  const m = S.remote[sh.sid]; if (!m) return `${sheetHead('Партнёр')}<div class="sheet-body"><p class="muted">Нет данных.</p></div>`;
  const c = ctxRemote(sh.sid), st = gameStats(c), L = levelOf(totalXP(st, c)), wk = weekSummary(m.workouts), streak = goalStreak(c).n, qd = questsFor(c, weekStart(Date.now())).filter(x => x.done).length;
  const live = m.live && Date.now() - m.live.start < 4 * 3600e3;
  const body = (m.profile.body || []).slice().sort((a, b) => b.d - a.d)[0];
  return `${sheetHead(esc(m.name || 'Партнёр'), live ? 'Сейчас тренируется' : (m.workouts[0] ? 'Последняя тренировка ' + relDays(m.workouts[0].start) : 'Пока без тренировок'))}<div class="sheet-body">
    ${(() => { const mt = mateOf(c.profile, m.workouts), sat = satietyOf(m.workouts, c.profile.freeze), fz = frozenNow(c.profile.freeze), nx = STAGES[mt.stage.k + 1], k = charOf(m);
      return `<div class="fr-top" style="--accent:${pcolor(m)}">${mateCell(k, mateMood(m.workouts, c.profile.goal, live, c.profile.freeze), { color:pcolor(m), stage:mt.stage.k, gear:mt.gear, label:mateName(k) }, 'mate-f')}<div><div class="stg">${esc(mateName(k))} · ${stName(mt.stage, k)}<small>${nx ? `до «${stName(nx, k)}» ${nx.from - m.workouts.length}` : 'высшая стадия'}</small></div>${satHTML(sat, fz)}<p class="fine" style="margin:0">Гардероб: <b style="color:var(--ink)">${mt.coll.uniq} из ${ITEMS.length}</b></p></div></div>`; })()}
    <div class="lvl" style="margin-top:0;--accent:${col(m)[1]}">${rankBadge(L.k)}<span class="lvl-main"><b>${esc(L.title)}</b><span class="lvl-bar"><i style="width:${L.pct.toFixed(1)}%;background:${col(m)[0]}"></i></span></span><span class="lvl-xp">${L.cur}/${L.need} XP</span></div>
    <div class="kv k4" style="margin-top:12px"><div><b>${wk.n}</b><span>на этой неделе</span></div><div><b>${streak}</b><span>серия, недель</span></div><div><b>${m.workouts.length}</b><span>всего</span></div><div class="is-pr"><b>${c.D.prEvents.length}</b><span>рекордов</span></div></div>
    <p class="fine">Задания недели: <b style="color:var(--ink)">${qd} из 3</b></p>
    ${body ? `<p class="fine">Вес тела: <b style="color:var(--ink)">${nf(body.w, 1)} кг</b> · ${dShort(body.d)}</p>` : ''}
    <div class="sblock" style="border:0"><b>Последние тренировки</b>${m.workouts.length ? m.workouts.slice(0, 12).map(w => feedRow(m, w, false)).join('') : '<p class="fine">Здесь появятся тренировки.</p>'}</div>
  </div>`;
};

SHEETS.set = () => {
  const p = S.profile, m = S.meta || {}, th = m.theme || 'auto';
  const lastB = m.lastBackup ? relDays(m.lastBackup) : 'ещё не было';
  const canShare = !!(navigator.canShare && window.File);
  return `${sheetHead('Настройки', esc(pname(curProf())))}<div class="sheet-body">
    <div class="srow"><div class="srow-t"><b>Как пользоваться</b><span>Установка, работа в зале, резервные копии</span></div><button class="btn btn-sm" data-act="help">${icon('help')} Открыть</button></div>
    ${accountRowHTML()}
    <div class="sblock"><b>Оформление</b><div class="seg" role="group" aria-label="Оформление">${[['noir', 'Мрак'], ['color', 'Цветное']].map(([k, l]) => `<button data-act="setLook" data-v="${k}" aria-pressed="${lookOf() === k}">${l}</button>`).join('')}</div>
      ${lookOf() === 'noir' ? `<div class="lbl" style="margin-top:12px">Акцент${`<div class="cdots" role="group" aria-label="Акцент">${Object.entries(NOIR_ACC).map(([k, c]) => `<button class="cdot" style="--c:${c[isLight() ? 0 : 1]}" title="${c[4]}" data-act="setNoirAcc" data-c="${k}" aria-pressed="${((S.meta && S.meta.noirAcc) || 'bone') === k}" aria-label="${c[4]}"></button>`).join('')}</div>`}</div>` : `<div class="lbl" style="margin-top:12px">Цвет${colorDots(curProf().color, 'cpColor')}</div>`}
      ${lookOf() === 'noir' ? `<div class="srow" style="border:0;padding:12px 0 0"><div class="srow-t"><b>Чисто чёрный фон</b><span>Для OLED-экранов: фон ровно чёрный, экономит заряд. Только в тёмной теме</span></div><button class="switch" role="switch" aria-checked="${!!(S.meta && S.meta.oled)}" aria-label="Чисто чёрный фон" data-act="toggleOled"></button></div>` : ''}
      <div class="lbl" style="margin-top:12px">Тема${`<div class="seg" role="group" aria-label="Тема">${[['auto', 'Как в системе'], ['dark', 'Тёмная'], ['light', 'Светлая']].map(([k, l]) => `<button data-act="setTheme" data-v="${k}" aria-pressed="${((S.meta && S.meta.theme) || 'auto') === k}">${l}</button>`).join('')}</div>`}</div></div>
    <div class="sblock"><b>Как тренируетесь</b>${modeSeg('setMode')}<p class="fine" style="margin-top:8px">${syncCfg() ? 'Синхронизация включена, поэтому режим «С партнёром». Чтобы тренироваться одному, отключите её ниже.' : pairOn() ? 'Видны чат, «Неделя вместе» и подключение партнёра.' : 'Всё для одного: без чата и предложений подключить партнёра. Переключить можно в любой момент.'}</p></div>
    <div class="sblock"${pairOn() ? '' : ' style="display:none"'}><b>Синхронизация с партнёром</b>${syncCfg() ? `
      ${clashHTML(true)}<p class="fine" style="margin:0 0 10px;${S.sync.status === 'error' ? 'color:var(--bad)' : ''}">${esc(syncStatusText())}${Object.keys(S.remote).length ? ` · с вами: ${Object.values(S.remote).map(r => esc(r.name || 'партнёр')).join(', ')}` : ' · партнёр ещё не подключился'}</p>
      <div class="row"><button class="btn btn-sm btn-primary" data-act="syncInvite">${icon('link')} Код для партнёра</button><button class="btn btn-sm" data-act="syncRefresh">${icon('repeat')} Обновить</button><button class="btn btn-sm btn-danger-soft" data-act="syncOff">${S.syncOffConfirm ? 'Точно отключить?' : 'Отключить'}</button></div>
      <div class="srow" style="border:0;padding-bottom:0"><div class="srow-t"><b>Показывать вес и замеры</b><span>Партнёр увидит ваш вес тела и замеры. Фото не передаются никогда</span></div><button class="switch" role="switch" aria-checked="${shareBodyOn()}" aria-label="Показывать вес тела партнёру" data-act="toggleShareBody"></button></div>`
      : cloudPairHTML()}</div>
    <div class="srow"><div class="srow-t"><b>Профили на этом телефоне</b><span>${profiles().length > 1 ? profiles().map(pname).join(', ') : 'Если тренируетесь вдвоём с одного телефона'}</span></div><button class="btn btn-sm" data-act="profiles">${icon('users')} Открыть</button></div>
    <div class="sblock"><b>Цель на неделю</b><div class="seg" role="group" aria-label="Цель на неделю">${[1, 2, 3, 4, 5, 6].map(v => `<button data-act="setGoal" data-v="${v}" aria-pressed="${p.goal === v}">${v}</button>`).join('')}</div><p class="fine" style="margin-top:8px">Сколько тренировок в неделю вы планируете. За выполненную неделю — +60 XP и ещё одна неделя в серии.</p></div>
    <div class="sblock"><b>Заморозка</b>${(() => { const fz = frozenNow(p.freeze); if (fz) return `<p class="fine" style="margin:0 0 10px">Включена до ${dayMonth(fz.to)}: сытость напарника и серия недель на паузе.</p><button class="btn btn-sm" data-act="freezeOff">${icon('sun')} Я вернулся — снять</button>`;
      if (canFreeze(p.freeze)) return `<p class="fine" style="margin:0 0 10px">Болезнь или отпуск? Сытость напарника и серия недель встанут на паузу. Можно раз в месяц.</p><div class="seg" role="group" aria-label="Заморозка">${[3, 7, 14].map(v => `<button data-act="freezeOn" data-d="${v}">${icon('snow')} ${v} ${plural(v, ['день','дня','дней'])}</button>`).join('')}</div>`;
      const d = new Date(Date.now()); return `<p class="fine" style="margin:0">В этом месяце заморозка уже была. Следующая — с ${dayMonth(new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime())}.</p>`; })()}</div>
    <div class="sblock"><b>Отдых между подходами</b><div class="seg" role="group" aria-label="Отдых">${[60, 90, 120, 150, 180, 240].map(v => `<button data-act="setRest" data-v="${v}" aria-pressed="${p.rest === v}">${fmtClock(v)}</button>`).join('')}</div></div>
    <div class="sblock"><b>Звуки</b>${(() => { const c = sndCfg(); return `<div class="srow" style="border:0;padding:2px 0 10px"><div class="srow-t"><b>Звуки в приложении</b><span>Без интернета. На iPhone в беззвучном режиме молчат, музыку не прерывают</span></div><button class="switch" role="switch" aria-checked="${c.on}" aria-label="Звуки в приложении" data-act="sndToggle"></button></div>
      ${c.on ? `<div class="seg" role="group" aria-label="Громкость">${[[1, 'Тихо'], [2, 'Средне'], [3, 'Громко']].map(([v, l]) => `<button data-act="sndVol" data-v="${v}" aria-pressed="${c.vol === v}">${l}</button>`).join('')}</div>
      <div class="chips wrap" role="group" aria-label="Какие звуки" style="margin-top:10px">${[['train', 'Тренировка'], ['game', 'Сундуки и напарник'], ['ui', 'Кнопки']].map(([k, l]) => `<button class="chip" data-act="sndCat" data-k="${k}" aria-pressed="${!!c[k]}">${l}</button>`).join('')}</div>
      <button class="btn btn-sm" style="margin-top:10px" data-act="sndDemo">${icon('sound')} Послушать</button>` : ''}`; })()}</div>
    <div class="srow"><div class="srow-t"><b>Сигнал после отдыха</b><span>Звук и вибрация, когда таймер закончился</span></div><button class="switch" role="switch" aria-checked="${!!p.sound}" aria-label="Сигнал после отдыха" data-act="toggleSound"></button></div>
    <div class="srow"><div class="srow-t"><b>Спрашивать запас повторов</b><span>После подхода: сколько ещё могли сделать. Подсказки веса станут точнее</span></div><button class="switch" role="switch" aria-checked="${p.rirAsk !== false}" aria-label="Спрашивать запас повторов" data-act="toggleRir"></button></div>
    <div class="sblock"><b>Вес грифа</b><div class="seg" role="group" aria-label="Вес грифа">${[20, 15, 10].map(v => `<button data-act="setBar" data-v="${v}" aria-pressed="${p.bar === v}">${v} кг</button>`).join('')}</div><p class="fine" style="margin-top:8px">Нужен, чтобы считать блины на каждую сторону.</p></div>
    ${p.custom.length ? `<div class="sblock"><b>Свои упражнения</b><ul class="blist">${p.custom.map(e => `<li class="swp-li" data-key="cx-${esc(e.id)}">${swOpen('cx', e.id, 'sw-cx')}<span>${esc(e.name)}</span><span class="muted" style="font-size:12px">${MUSCLES[e.muscle] || ''}</span><button class="icon-btn" data-act="cxEdit" data-id="${esc(e.id)}" aria-label="Переименовать: ${esc(e.name)}">${icon('edit')}</button><button class="icon-btn" data-act="customDel" data-id="${esc(e.id)}" aria-label="Удалить упражнение">${icon('x')}</button>${swClose()}</li>`).join('')}</ul></div>` : ''}
    <div class="sblock"><b>Резервная копия</b><p class="fine" style="margin:0 0 10px">Последняя: ${lastB}. В файл попадают все профили.</p><div class="row">${canShare ? `<button class="btn btn-sm btn-primary" data-act="backupShare">${icon('share')} Сохранить / отправить</button>` : ''}<button class="btn btn-sm${canShare ? '' : ' btn-primary'}" data-act="backupFile">${icon('download')} Скачать файл</button><label class="btn btn-sm" for="imp-file">${icon('upload')} Восстановить из файла</label><button class="btn btn-sm" data-act="exportCsv">${icon('download')} Таблица CSV</button></div></div>
    <div class="srow"><div class="srow-t"><b>Установка</b><span>${isStandalone() ? 'Приложение установлено на этот телефон' : 'Открыто в браузере. Установите на главный экран — так надёжнее и работает офлайн.'}</span></div>${isStandalone() ? `<span class="tick" style="color:var(--good)">${icon('check')}</span>` : `<button class="btn btn-sm" data-act="${S.installEvt ? 'install' : 'help'}">${S.installEvt ? 'Установить' : 'Как'}</button>`}</div>
    <div class="srow"><div class="srow-t"><b>Защита данных</b><span>${S.persisted ? 'Браузер не будет очищать данные приложения сам' : 'Попросите браузер не очищать данные приложения'}</span></div>${S.persisted ? `<span style="color:var(--good)">${icon('shield')}</span>` : `<button class="btn btn-sm" data-act="persist">Включить</button>`}</div>
    <div class="srow"><div class="srow-t"><b>Копии и журнал</b><span>Ежедневные копии данных на телефоне; журнал ошибок для поддержки</span></div><div class="row tight"><button class="btn btn-sm" data-act="snapsOpen">Копии</button><button class="btn btn-sm" data-act="errsOpen">Журнал</button></div></div>
    <p class="fine">«Подход» ${APP_VERSION}. ${accOf() ? 'Работает без интернета. Данные — на телефоне и в вашем аккаунте, фото тела — только на телефоне.' : 'Работает без интернета и без аккаунта. Все данные — только на этом устройстве.'}</p>
  </div>`;
};

