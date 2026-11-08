/* ================= 2.7.1: achievements with progress, new sounds ================= */
ICONS.lock = '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>';
/* how far each badge is: [stat, target, unit] */
const BPROG = { w10:['n', 10], w25:['n', 25], w50:['n', 50], w100:['n', 100], w250:['n', 250], st3:['bestStreak', 3, 'нед.'], st8:['bestStreak', 8, 'нед.'], st26:['bestStreak', 26, 'нед.'],
  q25:['quests', 25], pr10:['prs', 10], pr50:['prs', 50], bench60:['bench', 60, 'кг'], bench100:['bench', 100, 'кг'], squat100:['squat', 100, 'кг'], dead140:['dead', 140, 'кг'], hip100:['hip', 100, 'кг'],
  pull10:['pull', 10, 'повт.'], t1:['tonTotal', 1e3, 'т'], t10:['tonTotal', 1e4, 'т'], t100:['tonTotal', 1e5, 'т'], t1000:['tonTotal', 1e6, 'т'], body:['bodyN', 5], coll30:['uniq', 30], coll75:['uniq', 75],
  collAll:['uniq', () => ITEMS.length], sup7:['supBest', 7, 'дн.'], sup30:['supBest', 30, 'дн.'], gift7:['gifts', 7] };
function badgeProg(b, st) {
  const d = BPROG[b[0]]; if (!d || !st) return null;
  const T = typeof d[1] === 'function' ? d[1]() : d[1], cur = Math.max(0, +st[d[0]] || 0), u = d[2] || '';
  const f = u === 'т' ? v => nf(v / 1000, v >= 1e4 ? 0 : 1) : v => nf(v, u === 'кг' ? 1 : 0);
  return { pct:Math.min(1, cur / T), txt:`${f(Math.min(cur, T))} из ${f(T)}${u ? ' ' + u : ''}` };
}
const badgeGlyph = b => b[3].startsWith('@') ? icon(b[3].slice(1)) : esc(b[3]);
const badgeList = un => BADGES.filter(b => b[0] !== 'pair' || pairOn() || un.has('pair'));
function medalRow(b, got, st, isNew) {
  const pr = got ? null : badgeProg(b, st);
  return `<div class="medal-row ${got ? 'got' : 'locked'}${isNew ? ' new' : ''}"><span class="medal-c" aria-hidden="true">${badgeGlyph(b)}</span><span class="mr-t"><b>${esc(b[1])}</b><small>${esc(b[2])}</small>${pr ? `<span class="mr-p"><span class="mr-bar" aria-hidden="true"><i style="width:${Math.max(3, pr.pct * 100).toFixed(1)}%"></i></span><em>${esc(pr.txt)}</em></span>` : ''}</span><span class="mr-s" aria-label="${got ? 'получено' : 'ещё не получено'}">${got ? icon('check') : pr ? Math.floor(pr.pct * 100) + '%' : icon('lock')}</span></div>`;
}
function awardsPanel() {
  const st = gameStats(), L = levelOf(totalXP(st)), un = new Set(unlockedBadges(st)), list = badgeList(un);
  const got = list.filter(b => un.has(b[0])).reverse();
  const near = list.filter(b => !un.has(b[0])).map(b => [b, badgeProg(b, st)]).filter(x => x[1]).sort((a, b) => b[1].pct - a[1].pct).slice(0, 2);
  return `<section class="panel lvl-card" aria-label="Уровень и достижения">
    <button class="lvl" style="margin-top:0" data-act="awards">${rankBadge(L.k)}<span class="lvl-main"><b>${esc(L.title)}</b><span class="lvl-bar"><i style="width:${L.pct.toFixed(1)}%"></i></span></span><span class="lvl-xp">${L.cur}/${L.need} XP</span></button>
    ${got.length ? `<div class="aw-strip" role="list" aria-label="Полученные достижения">${got.map((b, i) => `<button class="aw-m medal" role="listitem" style="--i:${Math.min(i, 12)}" data-act="awards" aria-label="${esc(b[1])}"><span class="medal-c">${badgeGlyph(b)}</span></button>`).join('')}</div>` : ''}
    ${near.length ? `<div class="aw-near"><b class="aw-h">Ближе всего</b><div class="medal-list">${near.map(([b]) => medalRow(b, false, st)).join('')}</div></div>` : ''}
    <button class="btn btn-block aw-all" data-act="awards">${icon('trophy')} Все достижения · ${got.length} из ${list.length}</button>
  </section>`;
}
SHEETS.awards = sh => {
  const st = gameStats(), xp = totalXP(st), L = levelOf(xp), un = new Set(unlockedBadges(st)), tab = sh.tab || 'b', list = badgeList(un);
  const got = list.filter(b => un.has(b[0])).reverse();
  const next = list.filter(b => !un.has(b[0])).map(b => [b, badgeProg(b, st)]).sort((a, b) => (b[1] ? b[1].pct : -1) - (a[1] ? a[1].pct : -1));
  const near = next.filter(x => x[1]).slice(0, 3), rest = next.filter(x => !near.includes(x));
  const seg = `<div class="seg aw-seg" role="group" aria-label="Раздел">${[['b', 'Достижения', `${got.length}/${list.length}`], ['r', 'Ранги', `${rankIdx(L.k) + 1}/${Math.max(RANKS.length, rankIdx(L.k) + 1)}`]].map(([k, l, n]) => `<button data-act="awTab" data-t="${k}" aria-pressed="${tab === k}">${l}<small> · ${n}</small></button>`).join('')}</div>`;
  const grp = (t, rows) => rows ? `<div class="sblock"><b>${t}</b><div class="medal-list">${rows}</div></div>` : '';
  const body = tab === 'r'
    ? `<p class="fine" style="margin:0">Опыт: 40 за тренировку, по 2 за рабочий подход (до 40), 15 за рекорд, 60 за неделю с выполненной целью, ${QXP} за задание недели (+${QBONUS} за все три), 30 за каждое достижение и 10 за день, когда все добавки приняты по плану.</p>${rankLadder(L.k, xp)}`
    : grp('Ближе всего', near.map(([b]) => medalRow(b, false, st)).join('')) + grp(`Получено · ${got.length}`, got.map(b => medalRow(b, true)).join('')) + grp(`Ещё впереди · ${rest.length}`, rest.map(([b]) => medalRow(b, false, st)).join(''));
  return `${sheetHead('Уровень и достижения', `${xp} XP всего`)}<div class="sheet-body">
    <div class="lvl" style="margin-top:0">${rankBadge(L.k)}<span class="lvl-main"><b>${esc(L.title)}</b><span class="lvl-bar"><i style="width:${L.pct.toFixed(1)}%"></i></span></span><span class="lvl-xp">ещё ${L.need - L.cur} XP</span></div>
    ${seg}${body}
  </div>`;
};

/* ---- new sounds ---- */
Object.assign(SFX_CAT, { quest:'game', badge:'game', goal:'game', fed:'game', mus:'ui', rest:'train', ten:'train' });
Object.assign(SFX, {
  /* daily gift: paper rustle, ribbon pop and a sparkle */
  gift:o => { hiss(o, 0, .22, .12, 900, 3800, 1.2); tone(o, 740, .16, .05, .16, 'triangle', 1100); arp(o, [1319, 1760, 2093], .07, .22, .13, 'triangle', .24); [2637, 3136, 3951].forEach((f, i) => tone(o, f, .46 + i * .05, .2, .045)); },
  /* weekly quest done: two bright bells */
  quest:o => { tone(o, 1047, 0, .28, .17, 'triangle'); tone(o, 1568, .11, .4, .17, 'triangle'); tone(o, 3136, .11, .3, .05); },
  /* new badge: a metal medal clinks, then shines */
  badge:o => { [1210, 2780, 4410].forEach((f, i) => tone(o, f, 0, .5 - i * .12, .13 / (i + 1), 'sine')); tone(o, 1210, .14, .4, .08, 'sine'); arp(o, [1568, 2093, 2637], .06, .28, .1, 'triangle', .28); },
  /* weekly goal reached: short brass-like fanfare */
  goal:o => { [523, 659, 784].forEach(f => tone(o, f, 0, .16, .12, 'sawtooth')); [659, 784, 1047].forEach(f => tone(o, f, .19, .6, .1, 'sawtooth', null, .02)); tone(o, 2093, .2, .55, .06); hiss(o, .19, .3, .03, 5000, null, 1, 'highpass'); },
  /* the companion eats: two munches and a happy «м-м» */
  nom:o => { [0, .17].forEach((t, i) => { hiss(o, t, .07, .2, 700, 300, 1, 'lowpass'); tone(o, 340 - i * 30, t, .07, .2, 'sine', 210); }); const os = tone(o, 520, .38, .32, .16, 'sine', null, .04); const T = actx.currentTime + .38; os.frequency.setValueAtTime(520, T); os.frequency.linearRampToValueAtTime(760, T + .16); os.frequency.linearRampToValueAtTime(640, T + .34); },
  /* hungry companion is fed again: munches, then a rising «ура» */
  fed:o => { SFX.nom(o); arp(o, [784, 988, 1175, 1568], .07, .2, .12, 'triangle', .78); },
  /* tapping a muscle on the map */
  mus:o => { tone(o, 210, 0, .06, .2, 'sine', 140); hiss(o, 0, .02, .05, 2400, null, 2); },
  /* rest starts: a soft breath out */
  rest:o => { hiss(o, .16, .32, .05, 2400, 500, .8); tone(o, 587, .16, .22, .05, 'sine', 440, .03); },
  /* 10 seconds of rest left */
  ten:o => { tone(o, 988, 0, .05, .13, 'triangle'); tone(o, 988, .15, .05, .13, 'triangle'); },
});
Object.assign(A, {
  awTab: el => { const t = top(); if (!t) return; t.tab = el.dataset.t; sfx('tab'); render(); const b = $('#sheet-root .sheet-body'); if (b) b.scrollTop = 0; },
  logMore: () => { S.logN = (S.logN || 40) + 60; render(); },
});

SHEETS.news271 = () => `${sheetHead('Что нового', 'Версия ' + APP_VERSION)}<div class="sheet-body">
  <ul class="pr-list news">
    <li>${icon('body')}<span><b>Вкладка «Тело» снова открывается.</b> Выбор мужского или женского тела теперь хранится отдельно и не трогает журнал веса</span></li>
    <li>${icon('trophy')}<span><b>Достижения</b> — ровные значки, прогресс до каждого («7 из 10») и отдельные разделы «Достижения» и «Ранги»</span></li>
    <li>${icon('today')}<span><b>Нижняя панель</b> — шесть ровных вкладок, подсветка под иконкой</span></li>
    <li>${icon('flame')}<span><b>Быстрее</b> — вкладки переключаются без задержки, длинный журнал открывается сразу</span></li>
    <li>${icon('sound')}<span><b>Новые звуки</b> — подарок дня, задание недели, новое достижение, цель недели, сытый напарник, нажатие на мышцу, начало отдыха и «осталось 10 секунд»</span></li>
  </ul>
</div><footer class="sheet-foot"><button class="btn" data-act="sndDemo271">${icon('sound')} Послушать</button><button class="btn btn-primary" data-act="closeSheet">Готово</button></footer>`;
A.sndDemo271 = () => {
  const m = ensureMeta(); if (!sndCfg().on) { m.snd = Object.assign(sndCfg(), { on:true }); saveMeta(); render(); }
  ['gift', 'quest', 'badge', 'goal', 'fed', 'ten'].forEach((n, i) => setTimeout(() => sfx(n), i * 1300));
};


