/* ================= rendering ================= */
let enterT = null;
function render() { S.gsC = {}; try { return render0(); } finally { S.gsC = null; } }
function render0() {
  const ae = document.activeElement, fid = ae && ae.id; let sel = null;
  try { if (fid && typeof ae.selectionStart === 'number') sel = [ae.selectionStart, ae.selectionEnd]; } catch (e) { sel = null; }
  CH = {};
  if (S.metaLoaded && ready() && !gateOk()) { if (!gateSheet()) { const unv = !!unverAcc(); S.sheets = [{ type:'acc', gate:true, mode:unv ? 'verify' : Object.keys(accs()).length ? 'login' : 'start', email:'', pass:'', busy:false, err:'', key:uid() }]; if (unv) verifyWatch(true); if (!curProf().name) applyAccent(); } }
  else if (gateSheet()) gateDone();
  if (!S.welcomed && S.metaLoaded && !S.meta && ready() && !S.sheets.length) { S.welcomed = true; S.sheets.push({ type:'welcome', name:'', color:'lime', char:'cat', key:uid() }); applyAccent('lime'); }
  if (S.metaLoaded && S.meta && !S.meta.v22seen && ready() && !S.sheets.length && !S.active) { S.meta.v22seen = true; S.meta.v23seen = true; S.meta.v24seen = true; S.meta.v25seen = true; S.meta.v26seen = true; S.meta.v27seen = true; S.meta.v271seen = true; S.meta.v28seen = true; S.meta.v2seen = true; saveMeta(); S.sheets.push({ type:'news', key:uid() }); }
  else if (S.metaLoaded && S.meta && !S.meta.v23seen && ready() && !S.sheets.length && !S.active) { S.meta.v23seen = true; S.meta.v24seen = true; S.meta.v25seen = true; S.meta.v26seen = true; S.meta.v27seen = true; S.meta.v271seen = true; S.meta.v28seen = true; saveMeta(); S.sheets.push({ type:'news23', key:uid() }); }
  else if (S.metaLoaded && S.meta && !S.meta.v24seen && ready() && !S.sheets.length && !S.active) { S.meta.v24seen = true; S.meta.v25seen = true; S.meta.v26seen = true; S.meta.v27seen = true; S.meta.v271seen = true; S.meta.v28seen = true; saveMeta(); S.sheets.push({ type:'news24', key:uid() }); }
  else if (S.metaLoaded && S.meta && !S.meta.v25seen && ready() && !S.sheets.length && !S.active) { S.meta.v25seen = true; S.meta.v26seen = true; S.meta.v27seen = true; S.meta.v271seen = true; S.meta.v28seen = true; saveMeta(); S.sheets.push({ type:'news25', key:uid() }); }
  else if (S.metaLoaded && S.meta && !S.meta.v26seen && ready() && !S.sheets.length && !S.active) { S.meta.v26seen = true; S.meta.v27seen = true; S.meta.v271seen = true; S.meta.v28seen = true; saveMeta(); S.sheets.push({ type:'news26', key:uid() }); }
  else if (S.metaLoaded && S.meta && !S.meta.v27seen && ready() && !S.sheets.length && !S.active) { S.meta.v27seen = true; S.meta.v271seen = true; S.meta.v28seen = true; saveMeta(); S.sheets.push({ type:'news27', key:uid() }); }
  else if (S.metaLoaded && S.meta && !S.meta.v271seen && ready() && !S.sheets.length && !S.active) { S.meta.v271seen = true; S.meta.v28seen = true; saveMeta(); S.sheets.push({ type:'news271', key:uid() }); }
  else if (S.metaLoaded && S.meta && !S.meta.v28seen && ready() && !S.sheets.length && !S.active) { S.meta.v28seen = true; saveMeta(); if (!cloudOn()) S.sheets.push({ type:'news28', key:uid() }); }
  if (S.view === 'chat' && S.metaLoaded && !pairOn()) S.view = 'today';
  const main = $('#main');
  const vk = [S.view, S.pid, S.view === 'today' && S.active ? 'live:' + S.active.id : '', S.view === 'editor' && S.editing ? S.editing.id : '', ready() ? 'r' : 'l'].join('|');
  const html = `<div class="view">${viewHTML()}</div>`;
  if (main.dataset.vk !== vk) {
    main.innerHTML = html; main.dataset.vk = vk;
    main.classList.add('enter'); S.chartsLater = true;
    clearTimeout(enterT); enterT = setTimeout(() => main.classList.remove('enter'), 1200);
    S.countUp = true;
  } else {
    const tmp = document.createElement('div'); tmp.innerHTML = html; morphChildren(main, tmp);
  }
  renderNav(); renderSheet(); renderRest();
  if (S.chartsLater) { S.chartsLater = false; requestAnimationFrame(() => setTimeout(() => drawCharts(), 0)); } else drawCharts();
  if (S.view === 'chat' && S.chatScroll) { S.chatScroll = false; requestAnimationFrame(() => window.scrollTo(0, document.documentElement.scrollHeight)); }
  if (S.countUp) { S.countUp = false; countUp(main); }
  S.justKey = null;
  if (fid) { const el = document.getElementById(fid); if (el && el !== document.activeElement) { el.focus({ preventScroll:true }); if (sel) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* not a text field */ } } }
}
function buildNav() {
  const tabs = tabsNow(), tb = $('#tabbar'); tb.dataset.sig = tabs.map(t => t[0]).join(); tb.style.setProperty('--n', tabs.length);
  const b = (cls, [v, l, ic]) => `<button class="${cls}" data-act="nav" data-v="${v}">${icon(ic)}<span>${l}</span><i class="badge" hidden aria-label="идёт тренировка"></i>${v === 'more' ? '<i class="cnt" hidden></i>' : ''}</button>`;
  tb.innerHTML = '<span class="tab-ind" aria-hidden="true"></span>' + tabs.map(t => b('tab', t)).join('');
  $('#rail-links').innerHTML = '<span class="rail-ind" aria-hidden="true"></span>' + tabs.map(t => b('rlink', t)).join('');
}
function renderNav() {
  if ($('#tabbar').dataset.sig !== tabsNow().map(t => t[0]).join()) buildNav();
  const cur = tabOf(S.view);
  $$('.tab,.rlink').forEach(b => {
    if (b.dataset.v === cur) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    const bd = b.querySelector('.badge'); if (bd) bd.hidden = !(b.dataset.v === 'today' && S.active && cur !== 'today');
    const cn = b.querySelector('.cnt'); if (cn) { const n = S.view === 'chat' ? 0 : chatUnread(); cn.hidden = !n; cn.textContent = n > 9 ? '9+' : String(n); cn.setAttribute('aria-label', n + ' непрочитанных'); }
  });
  moveInd();
  const p = curProf();
  const rp = $('#rail-prof'), html = `<button class="rail-prof" data-act="profiles">${ava(p)}<span>${esc(pname(p))}<small>${profiles().length > 1 ? 'Сменить профиль' : 'Профиль'}</small></span></button>`;
  if (rp.dataset.h !== html) { rp.innerHTML = html; rp.dataset.h = html; }
}
const WIDE = matchMedia('(min-width:960px)');
function moveInd() {
  const tb = $('#tabbar'), ti = tb && tb.querySelector('.tab-ind');
  if (ti) { const i = [...tb.querySelectorAll('.tab')].findIndex(t => t.hasAttribute('aria-current')); ti.hidden = i < 0; if (i >= 0) { if (!tb.classList.contains('press')) tb.style.setProperty('--ti', i); if (!ti.classList.contains('ready')) requestAnimationFrame(() => ti.classList.add('ready')); } }
  if (!WIDE.matches) return; // the side rail is shown only on wide screens
  const r = $('.rlink[aria-current]'), ri = $('.rail-ind');
  if (r && ri && r.offsetHeight) { ri.style.transform = `translateY(${r.offsetTop}px)`; requestAnimationFrame(() => ri.classList.add('ready')); }
}
function viewHTML() {
  if (S.view === 'editor' && S.editing) return editorHTML(S.editing, 'edit');
  if (S.view === 'log') return viewLog();
  if (S.view === 'progress') return viewProgress();
  if (S.view === 'body') return viewBody();
  if (S.view === 'chat') return viewChat();
  if (S.view === 'supp') return viewSupp();
  if (S.view === 'path') return viewPath();
  if (S.view === 'hero') return viewHero();
  if (S.view === 'more') return viewMore();
  return viewToday();
}
function headHTML(title, eyebrow, extra = '') {
  const p = curProf();
  return `<header class="page-head"><div class="ph-text"><div class="eyebrow">${eyebrow}</div><h1 class="h1">${title}</h1></div><div class="ph-act">${extra}<button class="ava-btn" data-act="profiles" aria-label="Профиль: ${esc(pname(p))}">${ava(p)}</button><button class="icon-btn" data-act="settings" aria-label="Настройки">${icon('settings')}</button></div></header>`;
}
function loadingHTML() { return `<div class="loading" aria-busy="true"><div class="sk s2"></div><div class="sk"></div><div class="sk"></div></div>`; }
function bannersHTML() {
  let h = '';
  if (S.updateReady) h += `<div class="banner"><div class="banner-t">${icon('download')}<span><b>Вышло обновление.</b> Нажмите, чтобы установить — данные не пропадут.</span></div><div class="banner-a"><button class="btn btn-sm btn-primary" data-act="applyUpdate">Обновить</button></div></div>`;
  const m = S.meta || {};
  h += clashHTML();
  if (S.sync.status === 'error' && syncCfg()) h += `<div class="banner warn"><div class="banner-t">${icon('cloud')}<span><b>Синхронизация остановилась.</b> ${esc(S.sync.msg)}</span></div><div class="banner-a"><button class="btn btn-sm btn-primary" data-act="settings">Настройки</button></div></div>`;
  if (pairOn() && !syncCfg() && !cloudPartnersN() && !(m.pairHide > Date.now())) h += `<div class="banner"><div class="banner-t">${icon('users')}<span><b>Тренируетесь вдвоём в разных залах?</b> Подключите партнёра — будете видеть тренировки и рекорды друг друга.</span></div><div class="banner-a"><button class="btn btn-sm btn-primary" data-act="pairConnect">Подключить</button><button class="btn btn-sm btn-ghost" data-act="hidePair" aria-label="Скрыть">${icon('x')}</button></div></div>`;
  if (!isStandalone() && !(m.installHide > Date.now()) && (S.installEvt || isIOS() || /android/i.test(navigator.userAgent))) {
    h += `<div class="banner"><div class="banner-t">${icon('phone')}<span><b>Установите на главный экран</b> — так «Подход» работает без интернета и открывается как обычное приложение.</span></div><div class="banner-a">${S.installEvt ? `<button class="btn btn-sm btn-primary" data-act="install">Установить</button>` : `<button class="btn btn-sm btn-primary" data-act="help">Как</button>`}<button class="btn btn-sm btn-ghost" data-act="hideInstall" aria-label="Скрыть">${icon('x')}</button></div></div>`;
  }
  const total = profiles().reduce((a, p) => a + ((p.id === S.pid ? S.workouts : (S.store[p.id] && S.store[p.id].workouts)) || []).length, 0);
  const lastB = m.lastBackup || 0;
  if (total >= 3 && Date.now() - lastB > 14 * DAY && !(m.backupSnooze > Date.now())) {
    h += `<div class="banner warn"><div class="banner-t">${icon('shield')}<span><b>Сохраните резервную копию.</b> ${lastB ? `Последняя — ${relDays(lastB)}.` : 'Её ещё не было.'} Данные хранятся только на этом телефоне.</span></div><div class="banner-a"><button class="btn btn-sm btn-primary" data-act="backupShare">Сохранить</button><button class="btn btn-sm btn-ghost" data-act="snoozeBackup" aria-label="Напомнить позже">${icon('x')}</button></div></div>`;
  }
  return h;
}

/* ---------- today ---------- */
function heroHTML() {
  const m = moodNow(), st = gameStats(), L = levelOf(totalXP(st)), gs = goalStreak(), p = curProf(), kind = charOf(p);
  const fr = S.profile.freeze, fz = frozenNow(fr), sat = satietyOf(S.workouts, fr), mt = mateOf(S.profile, S.workouts), nx = STAGES[mt.stage.k + 1], cs = chestState();
  const bk = bubbleKey(m);
  if (!S.bubble || S.bubble.mood !== bk || S.bubble.pid !== S.pid || S.bubble.n !== m.n) S.bubble = { mood:bk, pid:S.pid, n:m.n, text:bubbleText(m) };
  if (S.ateAt && !S.sheets.length) { S.eatUntil = Date.now() + 2600; S.ateAt = 0; const fd = S.wasHungry; S.wasHungry = false; setTimeout(() => sfx(fd ? 'fed' : 'nom'), 300); }
  const eat = !RM && S.eatUntil > Date.now();
  const streakSub = gs.curMet ? 'серия недель' : gs.frozen ? 'серия · заморожена' : gs.n ? `серия · ещё ${gs.left} за ${gs.daysLeft} ${plural(gs.daysLeft, ['день','дня','дней'])}` : 'серия недель';
  const gold = cs.closed.some(c => c.gold);
  if (S.profile.chest && !S.sheets.length && (S.profile.chest.rk == null || L.rank > S.profile.chest.rk)) setTimeout(() => { const nr = rankSync(); if (nr != null && !S.sheets.length) { openSheet({ type:'rankup', r:nr }); sfx('rank'); confetti(innerWidth / 2, innerHeight * .35, 110); } else render(); }, 0);
  return `<section class="hero" aria-label="Напарник и прогресс недели">
    <button class="ch-btn mate${mt.gear.bg ? ' has-bg' : ''}${eat ? ' eat' : ''}" data-act="mate" aria-label="${esc(mateName(kind))}, ${stName(mt.stage, kind).toLowerCase()}: открыть гардероб">${mt.gear.bg ? bgSVG(mt.gear.bg) : ''}${charSVG(kind, m.mood, { cls:S.poke ? 'poke' : '', stage:mt.stage.k, gear:mt.gear }).replace('<svg ', `<svg data-mood="${m.mood}${S.poke}${kind}" `)}${eat ? '<span class="yum" aria-hidden="true">Ням!</span>' : ''}</button>
    <div class="hero-main"><p class="bubble" data-key="bubble-${hash(S.bubble.text)}">${esc(S.bubble.text)}</p>
      <div class="hero-stats">
        <div class="hs"><b>${Math.min(m.n, m.goal)}<small>/${m.goal}</small></b><span>цель недели</span></div>
        <div class="hs${!gs.curMet && gs.n && !gs.frozen ? ' warn' : ''}"><b>${icon(gs.frozen ? 'snow' : 'flame')}${gs.n}</b><span>${streakSub}</span></div>
      </div></div>
    <div class="sat-row">${satHTML(sat, fz)}<button class="stg" data-act="ward" aria-label="Стадия: ${stName(mt.stage, kind)}${nx ? `, до стадии «${stName(nx, kind)}» ${cntW(nx.from - S.workouts.length)}` : ''}. Открыть гардероб">${stName(mt.stage, kind)}<small>${nx ? `до «${stName(nx, kind)}» ${nx.from - S.workouts.length}` : 'высшая стадия'}</small></button></div>
    <button class="lvl" data-act="awards" aria-label="Уровень ${L.k}: ${esc(L.title)}">${rankBadge(L.k)}<span class="lvl-main"><b>${esc(L.title)}</b><span class="lvl-bar"><i style="width:${L.pct.toFixed(1)}%"></i></span></span><span class="lvl-xp">${L.cur}/${L.need} XP</span></button>
    ${giftToday() ? `<button class="giftbtn" data-act="gift">${icon('gift')}<span><b>Подарок дня</b><small>Искры, а каждый седьмой — сундук</small></span>${icon('chevron')}</button>` : ''}
    ${cs.closed.length ? `<button class="chestbtn" data-act="chestOpenNext">${chestSVG(gold ? 'gold' : 'std', false)}<span><b>Сундуки: ${cs.closed.length}</b><small>${gold ? 'Есть золотой! ' : ''}Внутри — вещи для напарника</small></span>${icon('chevron')}</button>` : ''}
  </section>`;
}
function questsHTML() {
  const ws = weekStart(Date.now()), q = questsFor(ctxLocal(), ws), d = q.filter(x => x.done).length;
  const left = Math.max(1, Math.round((addDays(ws, 7) - Date.now()) / DAY));
  const rows = q.map(x => `<div class="q${x.done ? ' done' : ''}" data-key="q-${x.id}"><span class="q-ic">${icon(x.done ? 'check' : x.ic)}</span><span class="q-t"><b>${esc(x.t)}</b><span class="q-bar"><i style="width:${Math.min(100, x.cur / x.target * 100).toFixed(1)}%"></i></span></span><span class="q-v">${x.done ? '+' + QXP + ' XP' : `${esc(x.fmt(x.cur))} / ${esc(x.fmt(x.target))}`}<small>${x.done ? 'выполнено' : 'осталось ' + esc(x.fmt(Math.max(0, x.target - x.cur)))}</small></span></div>`).join('');
  return `<section class="sec"><div class="sec-head"><h2 class="h2">Задания недели · ${d} из ${q.length}</h2><span class="h2">${left} ${plural(left, ['день','дня','дней'])}</span></div>
    <div class="panel quests">${rows}<div class="q-foot"><span>${d === q.length ? 'Идеальная неделя' : 'Все три задания'}</span><b>${d === q.length ? '+' + QBONUS + ' XP получено' : '+' + QBONUS + ' XP бонус'}</b></div></div></section>`;
}
function viewToday() {
  const now = Date.now(), d = new Date(now), p = curProf();
  const eb = `${LOGO}${WD_FULL[d.getDay()]}, ${dayMonth(now)}`;
  const title = p.name ? `Привет, ${esc(p.name)}` : 'Привет';
  if (!ready()) return headHTML('Подход', eb) + loadingHTML();
  if (S.active) return editorHTML(S.active, 'active');
  const ws = weekStart(now), trained = new Set(S.workouts.map(w => dayKey(w.start)));
  const days = Array.from({ length:7 }, (_, i) => { const t = addDays(ws, i), dd = new Date(t); const cls = [trained.has(dayKey(t)) ? 'on' : '', dayKey(t) === dayKey(now) ? 'today' : '', t > now ? 'future' : '', S.profile.plan && S.profile.templates.some(x => x.id === S.profile.plan[dd.getDay()]) ? 'plan' : ''].join(' '); return `<div class="wd ${cls}"><span>${WD[dd.getDay()]}</span><b style="--i:${i}">${dd.getDate()}</b></div>`; }).join('');
  const thisWeek = S.workouts.filter(w => w.start >= ws), a = agg(thisWeek);
  const sum = thisWeek.length ? `${a.n} ${plural(a.n, ['тренировка','тренировки','тренировок'])} · ${ton(a.vol)} · ${fmtDur(a.dur)}` : 'На этой неделе тренировок пока нет';
  const tpls = S.profile.templates, last = S.workouts[0];
  return `${headHTML(title, eb)}
    ${dbgHTML()}${hungerHTML()}${heroMini()}${dayCardHTML()}
    <section class="week" aria-label="Эта неделя">${days}</section>
    <p class="week-sum">${sum}</p>
    ${planTodayHTML()}<button class="btn btn-primary btn-lg btn-block start" data-act="startEmpty">${icon('play', 'ic-f')} Начать тренировку</button>
    ${habCardHTML()}
    ${reportBanner()}${weekBanner()}${bannersHTML()}
    ${supCardHTML()}
    ${recCardHTML()}
    ${pairCard()}
    <section class="sec"><div class="sec-head"><h2 class="h2">Программы</h2>${S.profile.templates.length ? `<button class="btn btn-sm btn-ghost" data-act="planOpen">${icon('today')} План недели</button>` : ''}</div>
      <div class="progs">${tpls.map(progCard).join('')}<button class="prog prog-new" data-act="tplNew">${icon('plus')}<span>Новая программа</span><small>Набор упражнений с подходами, чтобы начинать тренировку в одно касание</small></button><button class="prog prog-new" data-act="presetsOpen">${icon('log')}<span>Готовые программы</span><small>Фулбоди, верх/низ, тяни-толкай, дома</small></button></div>
    </section>
    ${last ? `<section class="sec"><div class="sec-head"><h2 class="h2">Последняя тренировка</h2><button class="btn btn-sm btn-ghost" data-act="nav" data-v="log">Весь журнал ${icon('chevron')}</button></div><ul>${jrow(last, 0)}</ul></section>` : firstRun()}`;
}
function kudosBtns(sid, wid) {
  const key = sid + '/' + wid, cur = S.profile.kudos[key];
  return `<span class="kudos">${KUDOS.map(([k, l]) => `<button class="kd${cur === k ? ' on' : ''}" data-act="kudo" data-sid="${esc(sid)}" data-id="${esc(wid)}" data-k="${k}" aria-pressed="${cur === k}" aria-label="${l}">${icon(k, k === 'flame' ? '' : 'ic-f')}</button>`).join('')}</span>`;
}
function feedRow(m, w, withAva) {
  const st = wStats(w), pr = rdFor(m.id).prCount[w.id] || 0;
  return `<div class="feed-row" data-key="fd-${esc(m.id)}-${esc(w.id)}"><button class="feed-main" data-act="rwd" data-sid="${esc(m.id)}" data-id="${esc(w.id)}">${withAva ? ava(m) : ''}<span><span class="feed-t">${withAva ? `<b>${esc(m.name || 'Партнёр')}</b> · ` : ''}${esc(w.title || 'Тренировка')}</span><small>${relDays(w.start)} · ${st.vol ? ton(st.vol) : st.sets + ' подх.'}${pr ? ` · ${pr} PR` : ''}</small></span></button>${kudosBtns(m.id, w.id)}</div>`;
}
function pairCard() {
  const ps = profiles(), rs = Object.values(S.remote); if (ps.length + rs.length < 2) return '';
  const ws = weekStart(Date.now());
  const dotsOf = (s, c) => Array.from({ length:7 }, (_, i) => `<i class="${s.days.has(dayKey(addDays(ws, i))) ? 'on' : ''}" style="--pc:${c}"></i>`).join('');
  const rows = ps.map(p => {
    const s = weekSummary(p.id === S.pid ? S.workouts : (S.store[p.id] && S.store[p.id].workouts));
    const pw = p.id === S.pid ? S.workouts : ((S.store[p.id] && S.store[p.id].workouts) || []), pp = p.id === S.pid ? S.profile : normP(S.store[p.id] && S.store[p.id].profile), pm = mateOf(pp, pw);
    return `<div class="pair-row" data-key="pair-${esc(p.id)}"><button class="pair-who" data-act="switchProf" data-id="${esc(p.id)}" aria-label="Открыть профиль ${esc(pname(p))}">${charSVG(charOf(p), mateMood(pw, pp.goal, p.id === S.pid && !!S.active, pp.freeze), { color:pcolor(p), stage:pm.stage.k, gear:pm.gear, still:true })}<span>${esc(pname(p))}${p.id === S.pid && ps.length > 1 ? ' <small>· открыт</small>' : ''}</span></button><span class="pair-dots" aria-label="${s.n} тренировок на этой неделе">${dotsOf(s, col(p)[0])}</span><span class="pair-n">${s.n}</span></div>`;
  }).concat(rs.map(m => {
    const s = weekSummary(m.workouts), live = m.live && Date.now() - m.live.start < 4 * 3600e3;
    const rpf = normP(m.profile), rm = mateOf(rpf, m.workouts);
    return `<div class="pair-row" data-key="pair-r-${esc(m.id)}"><button class="pair-who" data-act="friend" data-sid="${esc(m.id)}" aria-label="Открыть ${esc(m.name || 'партнёра')}">${charSVG(charOf(m), mateMood(m.workouts, rpf.goal, live, rpf.freeze), { color:pcolor(m), stage:rm.stage.k, gear:rm.gear, still:true })}<span>${esc(m.name || 'Партнёр')}${live ? ' <small class="live-txt">· тренируется</small>' : ''}</span></button><span class="pair-dots" aria-label="${s.n} тренировок на этой неделе">${dotsOf(s, col(m)[0])}</span><span class="pair-n">${s.n}</span></div>`;
  })).join('');
  const recent = rs.flatMap(m => m.workouts.filter(w => Date.now() - w.start < 10 * DAY).slice(0, 3).map(w => [m, w])).sort((a, b) => b[1].start - a[1].start).slice(0, 3);
  const note = syncCfg() ? `<p class="sync-note">${esc(syncStatusText())}</p>` : cloudPartnersN() ? `<p class="sync-note">${esc(cloudText())}</p>` : '';
  return `<section class="sec"><div class="sec-head"><h2 class="h2">Неделя вместе</h2><span class="h2">пн — вс</span></div><div class="panel pair">${rows}${recent.length ? `<div class="feed">${recent.map(([m, w]) => feedRow(m, w, true)).join('')}</div>` : ''}</div>${note}</section>`;
}
function firstRun() {
  return `<section class="sec"><div class="sec-head"><h2 class="h2">Как это работает</h2><button class="btn btn-sm btn-ghost" data-act="help">${icon('help')} Подробнее</button></div><ol class="steps">
    <li><span><b>Начните тренировку</b> — пустую или по программе. Добавьте упражнения из списка или создайте свои.</span></li>
    <li><span><b>Отмечайте подходы галочкой.</b> Серые цифры — ваш прошлый результат, а после подхода сам запускается таймер отдыха.</span></li>
    <li><span><b>Завершите тренировку</b> — начислится опыт, рекорды отметятся сами, а в «Прогрессе» появятся графики.</span></li>
  </ol></section>`;
}
function progCard(t) {
  const names = t.items.map(i => exById(i.ex).name), lastUse = S.workouts.find(w => w.tpl === t.id);
  return `<article class="prog" data-key="tpl-${esc(t.id)}"><div class="prog-top"><h3 class="prog-name">${esc(t.name)}</h3><button class="icon-btn" data-act="tplEdit" data-id="${esc(t.id)}" aria-label="Изменить программу «${esc(t.name)}»">${icon('more', 'ic-f')}</button></div>
    <p class="prog-list">${esc(names.join(' · '))}</p>
    <div class="prog-foot"><span class="prog-meta">${t.items.length} ${plural(t.items.length, ['упражнение','упражнения','упражнений'])}${lastUse ? ' · ' + relDays(lastUse.start) : ''}</span><button class="btn btn-sm btn-soft" data-act="startTpl" data-id="${esc(t.id)}">${icon('play', 'ic-f')} Начать</button></div></article>`;
}

/* ---------- editor ---------- */
function editorHTML(w, mode) {
  const prs = livePRs(w), st = wStats(w, mode === 'active');
  const bar = mode === 'active'
    ? `<div class="ed-bar"><div class="ed-clock"><span class="live-dot" aria-hidden="true"></span><span class="mono" data-tick="elapsed">${fmtClock((Date.now() - w.start) / 1000)}</span></div><button class="btn btn-primary btn-sm" data-act="finishOpen">Завершить</button></div>`
    : `<div class="ed-bar"><button class="btn btn-ghost btn-sm" data-act="editCancel">Отмена</button><span class="eyebrow">${w.isNew ? 'Прошедшая' : 'Редактирование'}</span><button class="btn btn-primary btn-sm" data-act="editSave">Сохранить</button></div>`;
  const when = mode === 'edit' ? `<div class="ed-when"><label class="lbl">Начало<input type="datetime-local" class="field" id="ed-start" data-in="edStart" value="${toLocalInput(w.start)}"></label><label class="lbl">Длительность, мин<input class="field" id="ed-dur" data-in="edDur" inputmode="numeric" autocomplete="off" value="${Math.round((w.end - w.start) / 60000)}"></label></div>` : '';
  return `<div class="editor">${bar}
    <input id="w-title" class="ed-title" data-in="title" value="${esc(w.title || '')}" placeholder="${mode === 'active' ? 'Тренировка' : 'Название'}" aria-label="Название тренировки" autocomplete="off" enterkeyhint="done">
    ${when}
    <div class="ed-stats"><div><b id="st-vol">${ton(st.vol)}</b><span>объём</span></div><div><b id="st-sets">${st.sets}</b><span>${mode === 'active' ? 'подходов сделано' : 'подходов'}</span></div><div class="${prs.size ? 'is-pr' : ''}"><b id="st-pr" class="${S.bumpPr ? 'bump' : ''}">${prs.size}</b><span>${plural(prs.size, ['рекорд','рекорда','рекордов'])}</span></div></div>
    ${w.exercises.length ? '' : `<div class="ed-empty">Добавьте первое упражнение. Если вы уже его делали, рядом с каждым подходом будет виден прошлый результат.</div>`}
    <div class="xlist">${w.exercises.map((x, xi) => xcardHTML(w, x, xi, prs)).join('')}</div>
    <button class="btn btn-add ed-add" data-act="addEx">${icon('plus')} Добавить упражнение</button>
    ${mode === 'active' ? `<div class="ed-foot"><button class="btn btn-primary btn-lg btn-block" data-act="finishOpen">Завершить тренировку</button><button class="btn btn-ghost btn-block" data-act="discardOpen">Отменить тренировку</button></div>` : ''}
  </div>`;
}
function xcardHTML(w, x, xi, prs) {
  const ex = exById(x.ex), K = KINDS[ex.kind] || KINDS.wr;
  const last = lastEntry(x.ex, w.id, w.start), prev = last ? last.all : [];
  let n = 0;
  const rows = x.sets.map((s, si) => {
    if (!s.warm) n++;
    const p = prevSet(last, x, si), gh = ghost(w, x, si, ex.kind), pr = prs.has(xi + ':' + si), just = S.justKey === x.k + ':' + si;
    const inputs = K.f.map(([f, label, im], fi) => {
      let v = s[f], ph = gh[f];
      if (f === 't' && ex.kind === 'cardio') { v = v != null ? v / 60 : v; ph = ph != null ? ph / 60 : ph; }
      return `<input id="s-${x.k}-${si}-${f}" class="set-in" data-in="set" data-x="${xi}" data-i="${si}" data-f="${f}" inputmode="${im}" enterkeyhint="${fi ? 'done' : 'next'}" autocomplete="off" value="${fmtIn(v)}" placeholder="${fmtIn(ph)}" aria-label="${label}, подход ${si + 1}">`;
    }).join('');
    return `${swOpen('set', xi + ':' + si)}<div class="set-row${s.done ? ' done' : ''}${pr ? ' pr' : ''}${just ? ' just' : ''}" data-key="r-${x.k}-${si}">
      <button class="set-n${s.warm ? ' warm' : ''}" data-act="setWarm" data-x="${xi}" data-i="${si}" title="${s.warm ? 'Разминочный подход' : 'Рабочий подход'}. Нажмите, чтобы переключить" aria-label="${s.warm ? 'Разминочный подход' : 'Подход ' + n}">${s.warm ? 'Р' : n}</button>
      <button class="set-prev" data-act="copyPrev" data-x="${xi}" data-i="${si}"${p ? ` title="Подставить прошлый результат"` : ' disabled'}>${p ? esc(setShort(p, ex.kind)) : '—'}</button>
      ${inputs}
      <button class="set-check" data-act="setDone" data-x="${xi}" data-i="${si}" aria-pressed="${!!s.done}" aria-label="${s.done ? 'Снять отметку' : 'Подход выполнен'}">${pr ? icon('star', 'ic-f') : icon('check')}${s.done && s.rir != null ? `<span class="rv">${s.rir >= 3 ? '3+' : s.rir}</span>` : ''}</button>
      <button class="set-del" data-act="setDel" data-x="${xi}" data-i="${si}" aria-label="Удалить подход">${icon('x')}</button>
    </div>${swClose()}${S.rirAsk === x.k + ':' + si && s.done ? `<div class="rir-ask" data-key="ra-${x.k}-${si}"><span>Сколько ещё могли?</span>${[0, 1, 2, 3].map(v => `<button class="chip" data-act="setRir" data-x="${xi}" data-i="${si}" data-v="${v}" aria-pressed="${s.rir === v}">${v === 3 ? '3+' : v}</button>`).join('')}<button class="icon-btn" data-act="rirSkip" aria-label="Не отмечать">${icon('x')}</button></div>` : ''}`;
  }).join('');
  const sub = `${MUSCLES[ex.muscle] || ''} · ${EQUIP[ex.equip] || ''} · ${last ? 'прошлый раз ' + dShort(last.start) : 'впервые'}`;
  const plates = ex.equip === 'barbell' ? `<div class="plates" id="pl-${x.k}">${platesHTML(topWeight(w, x, ex.kind), S.profile.bar)}</div>` : '';
  const ss = ssOf(w, xi);
  return `<article class="xcard${ss ? ' ss' + (ss.first ? ' ss-first' : '') + (ss.last ? ' ss-last' : '') : ''}" data-key="x-${x.k}">
    <div class="x-head"><div>${ss ? `<span class="ss-tag">${icon('link')} Суперсет ${ss.letter}</span>` : ''}<h3 class="x-name">${esc(ex.name)}</h3><p class="x-sub">${esc(sub)}</p></div><button class="icon-btn" data-act="exMenu" data-x="${xi}" aria-label="Действия с упражнением">${icon('more', 'ic-f')}</button></div>
    ${hintHTML(x, xi, ex, last)}
    ${x.note != null ? `<div class="x-note"><textarea class="field" id="xn-${x.k}" data-in="exNote" data-x="${xi}" placeholder="Заметка: техника, ощущения, настройки тренажёра" aria-label="Заметка к упражнению">${esc(x.note)}</textarea></div>` : ''}
    <div class="sets"><div class="set-row set-hd" aria-hidden="true"><span>#</span><span>Прошлый</span><span>${K.f[0][1]}</span><span>${K.f[1][1]}</span><span></span><span></span></div>${rows}</div>
    <div class="x-foot"><span class="x-btns"><button class="btn btn-sm btn-soft" data-act="setAdd" data-x="${xi}">${icon('plus')} Подход</button>${ex.kind === 'wr' && !x.sets.some(q => q.warm) ? `<button class="btn btn-sm" data-act="warmup" data-x="${xi}">${icon('flame')} Разминка</button>` : ''}<button class="btn btn-sm btn-ghost x-rest" data-act="exMenu" data-x="${xi}" aria-label="Отдых после подхода: ${fmtClock(restFor(x.ex))}. Изменить">${icon('clock')} ${fmtClock(restFor(x.ex))}</button></span><span class="x-sum" id="xs-${x.k}">${xSummary(x, ex.kind)}</span></div>
    ${plates}
  </article>`;
}
/* progress hint: double progression from the last session of this exercise */
const INC = { barbell:2.5, dumbbell:2, machine:2.5, cable:2.5, smith:2.5, kettlebell:4, band:1, body:2.5, other:2.5 };
function hintFor(x, ex, last) {
  if (!last) return null;
  const ws = last.all.filter(s => !s.warm); if (!ws.length) return null;
  if (ex.kind === 'wr' || (ex.kind === 'bw' && ws.some(s => num(s.w) > 0))) {
    const topW = Math.max(...ws.map(s => num(s.w) || 0)); if (!(topW > 0)) return null;
    const top = ws.filter(s => (num(s.w) || 0) === topW), reps = top.map(s => num(s.r) || 0), r0 = reps[0];
    if (!(r0 > 0)) return null;
    const rirs = top.map(s => s.rir).filter(v => v != null), rir = rirs.length ? Math.min(...rirs) : null;
    const inc = INC[ex.equip] || 2.5, held = reps.every(r => r >= r0), up = k => Math.round((topW + inc * k) * 100) / 100;
    const prevTxt = `${reps.length}×${r0} · ${nf(topW, 2)} кг${rir == null ? '' : ', запас ' + (rir >= 3 ? '3+' : rir)}`;
    const lbl = (w, r) => `${nf(w, 2)} кг × ${r}`;
    if (held && rir != null && rir >= 3 && r0 >= 5) { const w = up(2); return { w, r:r0, label:lbl(w, r0), why:`В прошлый раз ${prevTxt}: было легко — прибавьте смелее` }; }
    if (held && rir === 0) return { w:topW, r:r0, label:lbl(topW, r0), why:`В прошлый раз ${prevTxt}: подходы на пределе — закрепите этот вес` };
    if (held && r0 >= 5) { const w = up(1); return { w, r:r0, label:lbl(w, r0), why:`В прошлый раз ${prevTxt}: все подходы взяты — прибавьте вес` }; }
    if (held) return { w:topW, r:r0 + 1, label:lbl(topW, r0 + 1), why:`В прошлый раз ${prevTxt}: закрепите вес и добавьте повтор` };
    return { w:topW, r:r0, label:lbl(topW, r0), why:`В прошлый раз повторы просели (${reps.join(', ')}) — добейте ${r0} во всех подходах` };
  }
  if (ex.kind === 'bw') { const mr = Math.max(...ws.map(s => num(s.r) || 0)); if (!mr) return null; return { r:mr + 1, label:`${mr + 1} ${plural(mr + 1, ['повтор','повтора','повторов'])}`, why:`Лучший подход в прошлый раз — ${mr}. Добавьте один повтор` }; }
  if (ex.kind === 'time') { const mt = Math.max(...ws.map(s => num(s.t) || 0)); if (!mt) return null; return { t:mt + 5, label:fmtClock(mt + 5), why:`В прошлый раз ${fmtClock(mt)} — попробуйте на 5 секунд дольше` }; }
  return null;
}
function hintHTML(x, xi, ex, last) {
  const h = hintFor(x, ex, last); if (!h) return '';
  return `<button class="x-hint" data-act="applyHint" data-x="${xi}">${icon('up')}<span>Цель: <b>${esc(h.label)}</b><small>${esc(h.why)}</small></span><span class="go">Подставить</span></button>`;
}
function warmupSets(W, ex, bar) {
  const step = ex.equip === 'dumbbell' ? 1 : 2.5, rnd = v => Math.round(v / step) * step, out = [];
  if (ex.equip === 'barbell') { if (W <= bar) return out; out.push({ w:bar, r:10 }); }
  [[.5, 5], [.75, 3], [.875, 1]].forEach(([p, r]) => {
    const w = rnd(W * p), prev = out.length ? out[out.length - 1].w : 0;
    if (w > prev && w <= W - step && (ex.equip !== 'barbell' || w > bar)) out.push({ w, r });
  });
  return out;
}
function xSummary(x, kind) {
  const ws = x.sets.filter(s => !s.warm && valid(s, kind));
  if (!ws.length) return '';
  if (kind === 'wr') { const e = Math.max(...ws.map(s => e1rm(num(s.w) || 0, num(s.r) || 0))); const v = ws.reduce((a, s) => a + tonnage(s, kind), 0); return `${e ? 'e1RM ' + nf(e, 1) + ' · ' : ''}${ton(v)}`; }
  if (kind === 'bw') { const r = ws.reduce((a, s) => a + (num(s.r) || 0), 0); return `всего ${r} ${plural(r, ['повтор','повтора','повторов'])}`; }
  if (kind === 'time') return 'итого ' + fmtClock(ws.reduce((a, s) => a + (num(s.t) || 0), 0));
  const d = ws.reduce((a, s) => a + (num(s.d) || 0), 0), t = ws.reduce((a, s) => a + (num(s.t) || 0), 0);
  return [d ? nf(d, 2) + ' км' : '', t ? fmtClock(t) : ''].filter(Boolean).join(' · ');
}
function topWeight(w, x, kind) {
  let m = 0; x.sets.forEach(s => { if (!s.warm) m = Math.max(m, num(s.w) || 0); });
  if (!m) x.sets.forEach((s, si) => { if (!s.warm) m = Math.max(m, ghost(w, x, si, kind).w || 0); });
  return m;
}
function platesHTML(W, bar) {
  if (!(W > 0)) return `<span class="pl-txt">Введите вес — здесь появится, какие блины повесить на каждую сторону.</span>`;
  if (W <= bar) return `<span class="pl-txt"><b>${nf(W, 2)} кг</b> — ${W === bar ? 'пустой гриф' : 'меньше веса грифа (' + nf(bar, 2) + ' кг)'}</span>`;
  let side = (W - bar) / 2; const out = [];
  for (const p of [25, 20, 15, 10, 5, 2.5, 1.25]) while (side >= p - 1e-9) { out.push(p); side -= p; }
  const rest = side > 1e-6;
  return `<span class="pl-vis" aria-hidden="true"><i class="pl-collar"></i>${out.map(p => `<i class="pl p${String(p).replace('.', '_')}"></i>`).join('')}<i class="pl-sleeve"></i></span><span class="pl-txt"><b>${nf(W, 2)} кг</b> · на сторону ${out.map(p => nf(p, 2)).join(' + ')}${rest ? ` <span class="muted">(ещё ${nf(side, 2)} кг не набрать блинами)</span>` : ''}</span>`;
}
function liveStats(w) {
  const st = wStats(w, isLive(w));
  const v = $('#st-vol'); if (v) v.textContent = ton(st.vol);
  const s = $('#st-sets'); if (s) s.textContent = st.sets;
  w.exercises.forEach(x => { const el = document.getElementById('xs-' + x.k); if (el) el.textContent = xSummary(x, exById(x.ex).kind); });
}

/* ---------- journal ---------- */
function exLine(w) {
  return (w.exercises || []).map(x => {
    const ex = exById(x.ex), ws = x.sets.filter(s => !s.warm && valid(s, ex.kind));
    if (!ws.length) return null;
    let sm;
    if (ex.kind === 'cardio' || ex.kind === 'time') sm = xSummary(x, ex.kind).replace(/^итого /, '');
    else { const reps = ws.map(s => num(s.r)); sm = reps.every(r => r === reps[0]) ? `${ws.length}×${reps[0]}` : `${ws.length} подх.`; }
    return `${esc(ex.name)} <i>${esc(sm)}</i>`;
  }).filter(Boolean).join(' · ');
}
function jrow(w, i = 0) {
  const d = new Date(w.start), st = wStats(w), pr = D.prCount[w.id] || 0, kg = kudosFor(w.id);
  return `<li data-key="j-${esc(w.id)}">${swOpen('w', w.id)}<button class="jrow" style="--i:${Math.min(i, 12)}" data-act="openWorkout" data-id="${esc(w.id)}"><span class="jdate"><b>${d.getDate()}</b><span>${WD[d.getDay()]}</span></span><span class="jmain"><span class="jtitle">${esc(w.title || 'Тренировка')}${pr ? `<span class="pr-chip">${icon('star', 'ic-f')}${pr} PR</span>` : ''}${kg.length ? `<span class="kd-got" aria-label="Реакции: ${kg.length}">${kg.map(k => icon(k.t, k.t === 'flame' ? '' : 'ic-f')).join('')}</span>` : ''}</span><span class="jex">${exLine(w)}</span></span><span class="jnums"><b>${st.vol ? ton(st.vol) : st.sets + ' подх.'}</b><span>${fmtDur(st.dur)}</span></span></button>${swClose()}</li>`;
}
function viewLog() {
  const LW = swVis(S.workouts);
  const add = `<button class="btn btn-sm" data-act="addPast" aria-label="Записать прошедшую тренировку">${icon('plus')}<span class="ph-l">Прошедшая</span></button>`;
  const head = headHTML('Журнал', LW.length ? `${LW.length} ${plural(LW.length, ['тренировка','тренировки','тренировок'])}` : 'Все тренировки', add) + trainSeg();
  if (!ready()) return head + loadingHTML();
  if (!LW.length) return `${head}<div class="empty"><h3>Здесь появятся ваши тренировки</h3><p>Начните тренировку на вкладке «Сегодня» или запишите ту, что уже прошла.</p><button class="btn btn-primary" data-act="nav" data-v="today">${icon('play', 'ic-f')} К тренировке</button></div>`;
  const q = normQ(S.logQ).trim(), words = q.split(/\s+/).filter(Boolean), list = words.length ? LW.filter(w => logMatch(w, words)) : LW;
  const search = `<div class="log-search">${icon('search')}<input class="field" type="search" id="log-q" data-in="logQ" value="${esc(S.logQ || '')}" placeholder="Поиск: жим, «Верх», заметка" autocomplete="off" aria-label="Поиск по журналу">${S.logQ ? `<button class="icon-btn" data-act="logClear" aria-label="Очистить поиск">${icon('x')}</button>` : ''}</div>${words.length ? `<p class="log-found">Найдено: ${list.length} ${plural(list.length, ['тренировка','тренировки','тренировок'])}</p>` : ''}`;
  if (words.length && !list.length) return `${head}${search}<div class="empty"><h3>Ничего не нашлось</h3><p>Попробуйте часть слова: «жим», «прис», «тяг».</p></div>`;
  const groups = []; let cur = null; const lim = words.length ? 1e9 : (S.logN || 40);
  list.slice(0, lim).forEach(w => { const d = new Date(w.start), key = d.getFullYear() * 12 + d.getMonth(); if (!cur || cur.key !== key) { cur = { key, y:d.getFullYear(), m:d.getMonth(), list:[] }; groups.push(cur); } cur.list.push(w); });
  const thisY = new Date().getFullYear(); let idx = 0;
  return `${head}${search}${groups.map(g => { const a = agg(g.list); return `<section class="month" data-key="m-${g.key}"><div class="month-head"><h2>${MON_NOM[g.m]}${g.y !== thisY ? ' ' + g.y : ''}</h2><span>${a.n} ${plural(a.n, ['трен.','трен.','трен.'])} · ${ton(a.vol)}</span></div><ul>${g.list.map(w => jrow(w, idx++)).join('')}</ul></section>`; }).join('')}${list.length > lim ? `<button class="btn btn-block log-more" data-act="logMore">Показать ещё · ${list.length - lim}</button>` : ''}`;
}

/* ---------- progress ---------- */
const METRICS = {
  wr:[['topE','e1RM', v => nf(v, 1) + ' кг'], ['maxW','Макс. вес', v => nf(v, 2) + ' кг'], ['vol','Объём', v => ton(v)]],
  bw:[['maxR','Лучший подход', v => nf(v, 0) + ' повт.'], ['totR','Всего повторов', v => nf(v, 0) + ' повт.']],
  time:[['maxT','Лучшее время', v => fmtClock(v)]],
  cardio:[['maxD','Дистанция', v => nf(v, 2) + ' км'], ['pace','Темп', v => fmtClock(v * 60) + '/км']],
};
function awardsPanel0() {
  const st = gameStats(), L = levelOf(totalXP(st)), un = new Set(unlockedBadges(st));
  return `<section class="panel lvl-card" aria-label="Уровень и достижения">
    <button class="lvl" style="margin-top:0" data-act="awards">${rankBadge(L.k)}<span class="lvl-main"><b>${esc(L.title)}</b><span class="lvl-bar"><i style="width:${L.pct.toFixed(1)}%"></i></span></span><span class="lvl-xp">${L.cur}/${L.need} XP</span></button>
    <div class="medals">${BADGES.map((b, i) => medalHTML(b, i, un.has(b[0]), false, false)).join('')}</div>
    <p class="fine" style="margin:0">Получено ${un.size} из ${BADGES.length}. Нажмите на значок, чтобы узнать условия.</p>
  </section>`;
}
function strengthHTML(exIds, from, per) {
  const rows = exIds.filter(id => exById(id).kind === 'wr').slice(0, 6).map(id => {
    const h = (D.hist[id] || []).filter(x => x.topE > 0); if (!h.length) return '';
    const inP = h.filter(x => x.start >= from), before = h.filter(x => x.start < from);
    if (!inP.length) return '';
    const cur = Math.max(...inP.map(x => x.topE)), base = before.length ? Math.max(...before.map(x => x.topE)) : (inP.length > 1 ? inP[0].topE : null);
    const d = base ? Math.round((cur - base) / base * 100) : null;
    return `<li data-key="str-${esc(id)}"><span class="n">${esc(exById(id).name)}</span><span class="v">${nf(cur, 1)} кг</span><span class="d ${d == null || d === 0 ? 'flat' : d > 0 ? 'up' : 'down'}">${d == null ? '—' : (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(d) + '%'}</span></li>`;
  }).join('');
  return `<section class="sec"><div class="sec-head"><h2 class="h2">Сила · e1RM</h2><span class="h2">${per.l}</span></div><div class="panel">${rows ? `<ul class="str">${rows}</ul><p class="footnote">Лучший расчётный максимум за период и изменение к лучшему результату до него.</p>` : '<div class="chart-empty">Появится после тренировок с весом</div>'}</div></section>`;
}
function muscleLoadHTML() {
  const tw = weekStart(Date.now()), lw = addDays(tw, -7);
  const sets = (a, b) => { const o = {}; S.workouts.forEach(w => { if (w.start >= a && w.start < b) workSets(w, e => { o[e.muscle] = (o[e.muscle] || 0) + 1; }); }); return o; };
  const cur = sets(tw, addDays(tw, 7)), last = sets(lw, tw), max = Math.max(24, ...Object.values(cur), ...Object.values(last));
  const pct = v => (v / max * 100).toFixed(1);
  const rows = ['chest', 'back', 'legs', 'glutes', 'shoulders', 'arms', 'core'].map((m, i) => { const v = cur[m] || 0, l = last[m] || 0;
    return `<div class="ml" data-key="ml-${m}"><span>${MUSCLES[m]}</span><span class="ml-t"><span class="ml-zone" style="left:${pct(10)}%;width:${pct(10)}%"></span><i style="width:${pct(v)}%;--i:${i}"></i>${l ? `<span class="ml-prev" style="left:${pct(l)}%"></span>` : ''}</span><span class="ml-v">${v}</span></div>`; }).join('');
  return `<section class="sec"><div class="sec-head"><h2 class="h2">Нагрузка на мышцы · эта неделя</h2><span class="h2">подходы</span></div><div class="panel"><div class="mload">${rows}</div>
    <div class="ml-legend"><span><i style="background:var(--accent)"></i>эта неделя</span><span><i style="background:var(--ink-2);width:3px"></i>прошлая</span><span><i style="background:color-mix(in oklab, var(--good) 14%, transparent)"></i>10–20 подходов — рабочий диапазон</span></div></div></section>`;
}
function viewProgress() {
  const P = S.prog, per = PERIODS[P.period] || PERIODS['90'];
  const seg = `<div class="seg" role="group" aria-label="Период">${Object.entries(PERIODS).map(([k, v]) => `<button data-act="period" data-p="${k}" aria-pressed="${P.period === k}">${v.l}</button>`).join('')}</div>`;
  const head = headHTML('Прогресс', 'Уровень, нагрузка и рекорды') + trainSeg();
  if (!ready()) return head + loadingHTML();
  if (!S.workouts.length) return `${head}${awardsPanel()}<div class="empty" style="margin-top:20px"><h3>Графики появятся после первых тренировок</h3><p>Здесь будет видно, как растут веса, объём и регулярность, а ещё — свежие рекорды.</p><button class="btn btn-primary" data-act="nav" data-v="today">${icon('play', 'ic-f')} К тренировке</button></div>`;
  const now = Date.now(), from = per.d ? now - per.d * DAY : 0, pfrom = per.d ? now - 2 * per.d * DAY : 0;
  const cur = S.workouts.filter(w => w.start >= from), prev = per.d ? S.workouts.filter(w => w.start >= pfrom && w.start < from) : null;
  const a = agg(cur), b = prev && agg(prev);
  const delta = (x, y) => { if (!b) return '<span class="flat">за всё время</span>'; if (!y) return '<span class="flat">не с чем сравнить</span>'; const p = Math.round((x - y) / y * 100); return p === 0 ? '<span class="flat">как в прошлом периоде</span>' : `<span class="${p > 0 ? 'up' : 'down'}">${p > 0 ? '+' : '−'}${Math.abs(p)}% к прошлому</span>`; };
  const kpis = [['Тренировки', a.n, b && b.n, 'int'], ['Тоннаж', a.vol, b && b.vol, 'ton'], ['Время в зале', a.dur, b && b.dur, 'h'], ['Рабочие подходы', a.sets, b && b.sets, 'int']];
  const map = new Map(); S.workouts.forEach(w => { const k = dayKey(w.start), v = map.get(k) || { vol:0, titles:[] }; v.vol += wStats(w).vol; v.titles.push(w.title || 'Тренировка'); map.set(k, v); });
  const streak = weekStreak(), weeksSpan = per.d ? per.d / 7 : Math.max(1, (now - Math.min(...S.workouts.map(w => w.start))) / (7 * DAY));
  const tw = weekStart(now), wk = Array.from({ length:12 }, (_, i) => { const s = addDays(tw, -(11 - i) * 7), e = addDays(s, 7); const vol = S.workouts.filter(w => w.start >= s && w.start < e).reduce((acc, w) => acc + wStats(w).vol, 0); return { v:vol, cur:i === 11, label:dShort(s), title:i === 11 ? 'эта неделя' : 'неделя с ' + dShort(s) }; });
  const exIds = Object.keys(D.hist).sort((x, y) => (D.usage[y] || 0) - (D.usage[x] || 0));
  if (!P.ex || !D.hist[P.ex]) P.ex = exIds.find(id => exById(id).kind === 'wr') || exIds[0];
  const ex = exById(P.ex), mets = METRICS[ex.kind] || METRICS.wr;
  if (!P.metric || !mets.find(m => m[0] === P.metric)) P.metric = mets[0][0];
  const met = mets.find(m => m[0] === P.metric);
  const pts = (D.hist[P.ex] || []).filter(h => h.start >= from && h[P.metric] > 0).map(h => ({ x:h.start, y:h[P.metric] }));
  const bst = D.best[P.ex] || { v:{}, at:{} };
  let bests = '';
  if (ex.kind === 'wr' || (ex.kind === 'bw' && bst.v.e)) {
    const e = bst.at.e;
    bests = `<div><span>Лучший e1RM</span><b>${bst.v.e ? nf(bst.v.e, 1) + ' кг' : '—'}</b>${e ? `<small>${esc(setLong(e.set, ex.kind))} · ${dShort(e.start)}</small>` : ''}</div>
      <div><span>Макс. вес</span><b>${bst.maxW ? nf(bst.maxW, 2) + ' кг' : '—'}</b>${bst.maxWat ? `<small>× ${num(bst.maxWat.set.r)} · ${dShort(bst.maxWat.start)}</small>` : ''}</div>
      <div><span>Объём за тренировку</span><b>${bst.vol ? ton(bst.vol) : '—'}</b>${bst.volAt ? `<small>${dShort(bst.volAt)}</small>` : ''}</div>
      <div><span>Рабочих подходов</span><b>${nf(bst.sets || 0, 0)}</b><small>за ${D.usage[P.ex] || 0} ${plural(D.usage[P.ex] || 0, ['тренировку','тренировки','тренировок'])}</small></div>`;
  } else {
    const k = ex.kind === 'bw' ? 'r' : ex.kind === 'time' ? 't' : (bst.v.d ? 'd' : 't'), at = bst.at[k];
    const fmtB = k === 'r' ? v => nf(v, 0) + ' повт.' : k === 't' ? v => fmtClock(v) : v => nf(v, 2) + ' км';
    bests = `<div><span>Лучший результат</span><b>${bst.v[k] ? fmtB(bst.v[k]) : '—'}</b>${at ? `<small>${dShort(at.start)}</small>` : ''}</div><div><span>Подходов всего</span><b>${nf(bst.sets || 0, 0)}</b><small>за ${D.usage[P.ex] || 0} ${plural(D.usage[P.ex] || 0, ['тренировку','тренировки','тренировок'])}</small></div>`;
  }
  const mus = {}; cur.forEach(w => w.exercises.forEach(x => { const e = exById(x.ex); x.sets.forEach(s => { if (!s.warm && valid(s, e.kind)) mus[e.muscle] = (mus[e.muscle] || 0) + 1; }); }));
  const mrows = Object.entries(mus).sort((p, q) => q[1] - p[1]); const mmax = Math.max(1, ...mrows.map(r => r[1]));
  const prs = D.prEvents.filter(p => p.start >= from).slice(0, 8);
  return `${head}
    ${awardsPanel()}
    ${recoveryHTML()}
    <div class="ptools" style="margin-top:26px">${seg}</div>
    <div class="kpis">${kpis.map(([l, x, y, f]) => `<div class="kpi"><div class="kpi-l">${l}</div><div class="kpi-v" ${cnt(x, f)}>${FMT[f](x)}</div><div class="kpi-d">${delta(x, y)}</div></div>`).join('')}</div>
    <button class="btn btn-block rep-btn" data-act="weekOpen">${icon('today')} Итоги недели</button>
    <button class="btn btn-block rep-btn" data-act="repOpen">${icon('progress')} Отчёт за месяц</button>
    <section class="sec"><div class="sec-head"><h2 class="h2">Регулярность</h2></div><div class="panel">
      <div class="streak"><div><b ${cnt(streak, 'int')}>${streak}</b><span>${plural(streak, ['неделя','недели','недель'])} подряд</span></div><div><b>${nf(a.n / Math.max(1, weeksSpan), 1)}</b><span>тренировки в неделю · ${per.l.toLowerCase()}</span></div></div>
      ${chart('heat', 'ch-heat', map, { h:136 })}
      <div class="hm-legend"><span>Цвет — объём за день</span><span class="hm-scale">меньше <i style="background:var(--h1)"></i><i style="background:var(--h2)"></i><i style="background:var(--h3)"></i><i style="background:var(--h4)"></i> больше</span></div>
    </div></section>
    <section class="sec"><div class="sec-head"><h2 class="h2">Тоннаж по неделям</h2><span class="h2">12 недель</span></div><div class="panel">${chart('bar', 'ch-week', wk, { h:180, fa:v => v >= 1000 ? nf(v / 1000, 0) + 'т' : nf(v, 0), fy:ton, aria:'Тоннаж по неделям за 12 недель' })}</div></section>
    <section class="sec"><div class="sec-head"><h2 class="h2">Упражнение</h2></div><div class="panel">
      <div class="ex-tools"><label class="select"><span class="sr">Упражнение</span><select class="field" id="prog-ex" data-ch="progEx">${exIds.map(id => `<option value="${esc(id)}"${id === P.ex ? ' selected' : ''}>${esc(exById(id).name)} · ${D.usage[id]}</option>`).join('')}</select></label>
      ${mets.length > 1 ? `<div class="seg" role="group" aria-label="Показатель">${mets.map(m => `<button data-act="metric" data-m="${m[0]}" aria-pressed="${P.metric === m[0]}">${m[1]}</button>`).join('')}</div>` : ''}</div>
      ${chart('line', 'ch-ex', pts, { h:220, key:P.ex + P.metric + P.period, fy:met[2], fa:v => P.metric === 'pace' ? fmtClock(v * 60) : P.metric === 'maxT' ? fmtClock(v) : v >= 10000 ? nf(v / 1000, 1) + 'т' : nf(v, 1), empty:`За ${per.l.toLowerCase()} нет данных по этому упражнению`, aria:`${ex.name}: ${met[1]}` })}
      <div class="bests">${bests}</div>
      ${ex.kind === 'wr' ? '<p class="footnote">e1RM — расчётный максимум на один повтор по формуле Эпли: вес × (1 + повторы / 30). Помогает сравнивать подходы с разным числом повторений.</p>' : ''}
    </div></section>
    ${strengthHTML(exIds, from, per)}
    ${muscleLoadHTML()}
    ${balanceHTML()}
    ${forecastHTML()}
    <section class="sec"><div class="sec-head"><h2 class="h2">Подходы по группам мышц · ${per.l.toLowerCase()}</h2></div><div class="panel">
      ${mrows.length ? `<div class="mbars">${mrows.map(([m, n], i) => `<div class="mbar" data-key="mb-${m}"><span>${MUSCLES[m] || m}</span><span class="mbar-t"><i style="width:${(n / mmax * 100).toFixed(1)}%;--i:${i}"></i></span><span class="mbar-v">${n}</span></div>`).join('')}</div>` : `<div class="chart-empty">За ${per.l.toLowerCase()} тренировок нет</div>`}
    </div></section>
    <section class="sec"><div class="sec-head"><h2 class="h2">Свежие рекорды</h2></div><div class="panel">
      ${prs.length ? `<ul class="prs">${prs.map(p => { const e = exById(p.ex); return `<li><span class="d">${dShort(p.start)}</span><span class="nv"><span class="n">${esc(e.name)}</span><span class="v">${esc(setLong(p.set, e.kind))}</span></span></li>`; }).join('')}</ul>` : `<div class="chart-empty">Рекорды появятся, когда вы превзойдёте прошлые результаты</div>`}
    </div></section>`;
}

/* ---------- body ---------- */
const MEAS = [['chest', 'Грудь'], ['waist', 'Талия'], ['hips', 'Бёдра'], ['arm', 'Рука'], ['thigh', 'Нога']];
const PHURL = new Map();
function viewBody() {
  const head = headHTML('Тело', 'Вес, замеры и фото');
  if (!ready()) return head + loadingHTML();
  const t = S.bodyTab || 'w';
  const tabs = `<div class="seg body-tabs" role="group" aria-label="Раздел">${[['w', 'Вес'], ['m', 'Замеры'], ['p', 'Фото']].map(([k, l]) => `<button data-act="bodyTab" data-t="${k}" aria-pressed="${t === k}">${l}</button>`).join('')}</div>`;
  const lost = S.profile.bodyLost && t === 'w' ? `<div class="banner warn" role="status" style="margin:0 0 14px"><span class="banner-t">${icon('help')}<span><b>Пропали записи веса?</b> В версии 2.7.0 выбор тела на карте мышц мог стереть журнал веса. Ошибка исправлена. Если у вас есть резервная копия, восстановите её: Настройки → «Восстановить из файла» — записи вернутся.</span></span><span class="banner-a"><button class="btn btn-sm" data-act="bodyLostOk">Понятно</button></span></div>` : '';
  return head + tabs + lost + (t === 'm' ? measHTML() : t === 'p' ? photosHTML() : weightHTML());
}
function weightHTML() {
  const list = [...S.profile.body].sort((a, b) => b.d - a.d);
  const now = Date.now(), lastW = list[0];
  const ago = list.find(e => e.d <= now - 30 * DAY) || list[list.length - 1];
  const ws = list.map(e => e.w), diff = lastW && ago && ago !== lastW ? lastW.w - ago.w : null;
  const pts = [...list].reverse().map(e => ({ x:e.d, y:e.w }));
  return `<div class="panel"><div class="bform">
      <label class="lbl">Дата<input type="date" class="field" id="b-date" value="${dayKey(now)}" max="${dayKey(now)}"></label>
      <label class="lbl">Вес, кг<input class="field mono" id="b-w" inputmode="decimal" autocomplete="off" placeholder="${lastW ? fmtIn(lastW.w) : '60,0'}" enterkeyhint="done"></label>
      <button class="btn btn-primary" data-act="bodyAdd">Записать</button>
    </div></div>
    ${list.length ? `
    <section class="sec"><div class="kpis">
      <div class="kpi"><div class="kpi-l">Сейчас</div><div class="kpi-v" ${cnt(lastW.w, 'kg1')}>${nf(lastW.w, 1)} кг</div><div class="kpi-d flat">${dShort(lastW.d)}</div></div>
      <div class="kpi"><div class="kpi-l">За 30 дней</div><div class="kpi-v">${diff == null ? '—' : (diff > 0 ? '+' : diff < 0 ? '−' : '') + nf(Math.abs(diff), 1) + ' кг'}</div><div class="kpi-d flat">${ago && ago !== lastW ? 'с ' + dShort(ago.d) : 'нужно больше записей'}</div></div>
      <div class="kpi"><div class="kpi-l">Минимум</div><div class="kpi-v">${nf(Math.min(...ws), 1)} кг</div><div class="kpi-d flat">${dShort(list.find(e => e.w === Math.min(...ws)).d)}</div></div>
      <div class="kpi"><div class="kpi-l">Максимум</div><div class="kpi-v">${nf(Math.max(...ws), 1)} кг</div><div class="kpi-d flat">${dShort(list.find(e => e.w === Math.max(...ws)).d)}</div></div>
    </div></section>
    <section class="sec"><div class="sec-head"><h2 class="h2">Динамика</h2></div><div class="panel">${chart('line', 'ch-body', pts, { h:220, fy:v => nf(v, 1) + ' кг', fa:v => nf(v, 1), aria:'Вес тела' })}</div></section>
    <section class="sec"><div class="sec-head"><h2 class="h2">Записи</h2></div><div class="panel"><ul class="blist">${list.map((e, i) => { const nx = list[i + 1]; const dl = nx ? e.w - nx.w : 0; return `<li data-key="b-${esc(e.id)}" class="swp-li">${swOpen('bw', e.id, 'sw-b')}<span>${dayMonth(e.d)} <span class="muted">${new Date(e.d).getFullYear() !== new Date().getFullYear() ? new Date(e.d).getFullYear() : ''}</span></span><span class="dl flat">${nx ? (dl > 0 ? '+' : dl < 0 ? '−' : '±') + nf(Math.abs(dl), 1) : ''}</span><span class="w">${nf(e.w, 1)} кг</span><button class="icon-btn" data-act="bodyDel" data-id="${esc(e.id)}" aria-label="Удалить запись">${icon('x')}</button>${swClose()}</li>`; }).join('')}</ul></div></section>`
    : `<div class="sec empty"><h3>Записывайте вес раз в несколько дней</h3><p>Утром натощак — так цифры честнее. Здесь появится график и изменение за месяц.</p></div>`}`;
}
function measHTML() {
  const list = [...S.profile.meas].sort((a, b) => b.d - a.d), now = Date.now(), key = S.measKey || 'waist';
  const form = `<div class="panel"><div class="mform">
      <label class="lbl" style="grid-column:1/-1">Дата<input type="date" class="field" id="m-date" value="${dayKey(now)}" max="${dayKey(now)}"></label>
      ${MEAS.map(([k, l]) => { const last = list.find(e => e[k] > 0); return `<label class="lbl">${l}, см<input class="field mono" id="m-${k}" inputmode="decimal" autocomplete="off" placeholder="${last ? fmtIn(last[k]) : '—'}"></label>`; }).join('')}
      <button class="btn btn-primary" data-act="measAdd">Записать замеры</button>
    </div><p class="fine">Можно заполнить не все поля. Мерьте утром, сантиметровой лентой, в одних и тех же местах.</p></div>`;
  if (!list.length) return form + `<div class="sec empty"><h3>Замеры показывают то, чего не видно на весах</h3><p>Вес может стоять на месте, а талия — уменьшаться. Записывайте замеры раз в 2–4 недели.</p></div>`;
  const kv = MEAS.map(([k, l]) => {
    const vals = list.filter(e => e[k] > 0); if (!vals.length) return `<div><b>—</b><span>${l}</span></div>`;
    const cur = vals[0], first = vals[vals.length - 1], d = vals.length > 1 ? cur[k] - first[k] : null;
    return `<div><b>${nf(cur[k], 1)} см</b><span>${l}</span>${d == null ? '' : `<small class="kd2">${d > 0 ? '+' : d < 0 ? '−' : '±'}${nf(Math.abs(d), 1)} см с ${dShort(first.d)}</small>`}</div>`;
  }).join('');
  const pts = [...list].reverse().filter(e => e[key] > 0).map(e => ({ x:e.d, y:e[key] }));
  const lbl = (MEAS.find(m => m[0] === key) || MEAS[1])[1];
  return form + `
    <section class="sec"><div class="kv k5">${kv}</div></section>
    <section class="sec"><div class="sec-head"><h2 class="h2">Динамика · ${lbl.toLowerCase()}</h2></div><div class="panel">
      <div class="seg" role="group" aria-label="Замер" style="margin-bottom:12px">${MEAS.map(([k, l]) => `<button data-act="measKey" data-k="${k}" aria-pressed="${key === k}">${l}</button>`).join('')}</div>
      ${chart('line', 'ch-meas', pts, { h:200, key, fy:v => nf(v, 1) + ' см', fa:v => nf(v, 0), empty:'Нет записей для этого замера', aria:'Замер: ' + lbl })}</div></section>
    <section class="sec"><div class="sec-head"><h2 class="h2">Записи</h2></div><div class="panel"><ul class="mlist">${list.map(e => `<li data-key="ms-${esc(e.id)}" class="swp-li">${swOpen('ms', e.id, 'sw-m')}<span><b>${dShort(e.d)}</b> ${MEAS.filter(([k]) => e[k] > 0).map(([k, l]) => `<span class="muted">${l}</span> ${nf(e[k], 1)}`).join(' · ')}</span><button class="icon-btn" data-act="measDel" data-id="${esc(e.id)}" aria-label="Удалить замеры">${icon('x')}</button>${swClose()}</li>`).join('')}</ul></div></section>`;
}
async function loadPhotos() {
  const pid = S.pid; if (S.photosLoading === pid) return; S.photosLoading = pid;
  const list = (await KV.get('ph:' + pid)) || [];
  for (const p of list) if (!PHURL.has(p.id)) { const b = await KV.get('pb:' + p.id); if (b instanceof Blob) PHURL.set(p.id, URL.createObjectURL(b)); }
  S.photos = { pid, list:list.sort((a, b) => a.d - b.d), cmp:(S.photos && S.photos.pid === pid && S.photos.cmp) || [] }; S.photosLoading = null; render();
}
function shrinkImage(file, max, q) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob(b => b ? res(b) : rej(new Error('blob')), 'image/jpeg', q); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
    img.src = url;
  });
}
function photosHTML() {
  const P = S.photos; if (!P || P.pid !== S.pid) { loadPhotos(); return loadingHTML(); }
  const list = P.list, today = dayKey(Date.now());
  const add = `<div class="panel"><div class="bform">
      <label class="lbl">Дата снимка<input type="date" class="field" id="ph-date" value="${today}" max="${today}"></label>
      <label class="btn btn-primary" for="ph-file" role="button" tabindex="0">${icon('plus')} Добавить фото</label><input type="file" id="ph-file" accept="image/*" data-ch="phAdd" hidden>
    </div><p class="fine">Фото хранятся только на этом телефоне: они не уходят партнёру и не попадают в резервную копию.</p></div>`;
  if (!list.length) return add + `<div class="sec empty"><h3>Фото «до / после»</h3><p>Снимайте раз в 2–4 недели в одном месте, при одном свете и в одной позе — тогда разница будет видна честно.</p></div>`;
  const pickP = (i, def) => list.find(p => p.id === P.cmp[i]) || def;
  const a = pickP(0, list[0]), b = pickP(1, list[list.length - 1]);
  const wAt = d => { const e = [...S.profile.body].sort((x, y) => Math.abs(x.d - d) - Math.abs(y.d - d))[0]; return e && Math.abs(e.d - d) < 10 * DAY ? nf(e.w, 1) + ' кг' : ''; };
  const fig = (l, p) => `<figure><img src="${PHURL.get(p.id) || ''}" alt="${l}, ${dShort(p.d)}"><figcaption><b>${l}</b> · ${dShort(p.d)}${wAt(p.d) ? ' · ' + wAt(p.d) : ''}</figcaption></figure>`;
  const days = Math.round((b.d - a.d) / DAY);
  const cmp = list.length > 1 && a !== b ? `<section class="sec"><div class="sec-head"><h2 class="h2">До / после</h2><span class="h2">${days} ${plural(days, ['день','дня','дней'])}</span></div><div class="cmp">${fig('До', a)}${fig('После', b)}</div><p class="fine">Нажмите на любое фото ниже, чтобы выбрать его как «до» или «после».</p></section>` : '';
  const grid = `<section class="sec"><div class="sec-head"><h2 class="h2">Все фото · ${list.length}</h2></div><div class="phs">${[...list].reverse().map(p => `<button class="ph" data-act="phOpen" data-id="${esc(p.id)}" data-key="ph-${esc(p.id)}"><img src="${PHURL.get(p.id) || ''}" alt="Фото ${dShort(p.d)}"><span>${dShort(p.d)}</span></button>`).join('')}</div></section>`;
  return add + cmp + grid;
}

