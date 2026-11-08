/* ================= 2.4: ranks with rewards, daily gift ================= */
/* every new rank (5 levels) brings a golden chest; the first run gives one chest for the current rank */
function rankSync() {
  const ch = S.profile.chest; if (!ch) return null;
  const r = rankIdx(levelOf(totalXP(gameStats())).k);
  if (ch.rk == null) { ch.rk = r; ch.st.push(`rk-${r}-${uid()}`); markDirty(); schedulePush(); return null; }
  if (r <= ch.rk) return null;
  for (let i = ch.rk + 1; i <= r; i++) ch.st.push(`rk-${i}-${uid()}`);
  ch.rk = r; saveProfile(); return r;
}
const giftToday = () => { const ch = S.profile.chest; return !!ch && ((ch.gift || {}).d || '') !== dayKey(Date.now()); };
function rankLadder(k, xp) {
  const cur = rankIdx(k), last = Math.max(RANKS.length - 1, cur);
  const rows = Array.from({ length:last + 1 }, (_, i) => { const lv = i * 5 + 1, on = k >= lv; return `<div class="rkrow${on ? ' on' : ''}${i === cur ? ' cur' : ''}">${rankBadge(lv)}<span><b>${esc(rankName(lv))}</b><small>уровни ${lv}–${lv + 4}${i === cur ? ' · вы здесь' : on ? ' · пройден' : ` · ещё ${nf(lvlNeed(lv) - xp, 0)} XP`}</small></span></div>`; }).join('');
  return `<div class="sblock"><b>Лестница рангов · ${cur + 1} из ${last + 1}</b><p class="fine" style="margin:4px 0 0">Каждый ранг — 5 уровней и золотой сундук в награду. После «Олимпийца» начинаются ранги «Бессмертный» без потолка.</p><div class="ranks">${rows}</div></div>`;
}
const levelXP = () => totalXP(gameStats());
SHEETS.rankup = sh => {
  const k = sh.r * 5 + 1, cs = chestState(), ch = cs.closed.find(x => x.rank === sh.r), nx = k + 5;
  return `${closeOnly()}<div class="sheet-body"><div class="done-hero rank-hero">${rankBadge(k, 'big')}<div class="eyebrow">Новый ранг</div><h2 id="sheet-title" class="big-title">${esc(rankName(k))}</h2>
    <p>Уровень ${k}. Следующий ранг — «${esc(rankName(nx))}» на ${nx} уровне.</p><span class="xp-chip">Награда: золотой сундук</span></div></div>
    <footer class="sheet-foot">${ch ? `<button class="btn" data-act="closeSheet">Позже</button><button class="btn btn-primary" data-act="chestOpenFor" data-id="${esc(ch.id)}">${icon('chest')} Открыть сундук</button>` : '<button class="btn btn-primary btn-block" data-act="closeSheet">Отлично</button>'}</footer>`;
};
SHEETS.news24 = () => {
  const L = levelOf(levelXP()), k = charOf(curProf()), mt = mateOf(S.profile, S.workouts), n = chestState().closed.length;
  return `${sheetHead('Что нового', 'Версия ' + APP_VERSION)}<div class="sheet-body">
  <div class="news-top">${rankBadge(L.k, 'big')}<div><div class="eyebrow">Ваш ранг</div><b class="news-rank">${esc(L.title)}</b><span class="fine">Уровень ${L.k} из 100 · дальше «Бессмертный»</span></div></div>
  <ul class="pr-list news">
    <li>${icon('trophy')}<span><b>100 уровней и 20 рангов</b> — от новичка через разряды, КМС и мастера спорта до олимпийца. За каждый ранг — золотой сундук</span></li>
    <li>${icon('shirt')}<span><b>${ITEMS.length} вещей</b> — новые слоты: спина (плащи и крылья), спутник и аура. Эпическая редкость и сезонные вещи</span></li>
    <li>${icon('gift')}<span><b>Подарок дня</b> — заходите за искрами, каждый седьмой подарок — сундук. Пропуски ничего не сжигают</span></li>
    <li>${icon('star')}<span><b>Новые стадии</b> — «Мифический» после 300 тренировок и «Бессмертный» после 500</span></li>
  </ul>
  <div style="display:grid;place-items:center;margin-top:12px">${mateCell(k, 'happy', { stage:mt.stage.k, gear:mt.gear }, 'mate-g')}</div>
</div><footer class="sheet-foot">${n ? `<button class="btn" data-act="closeSheet">Позже</button><button class="btn btn-primary" data-act="chestOpenNext">${icon('chest')} Сундуки · ${n}</button>` : '<button class="btn btn-primary btn-block" data-act="closeSheet">Готово</button>'}</footer>`;
};
Object.assign(A, {
  gift: () => {
    const ch = S.profile.chest; if (!ch || !giftToday()) return;
    const g = ch.gift = Object.assign({ d:'', n:0, s:0 }, ch.gift || {}); g.d = dayKey(Date.now()); g.n = (+g.n || 0) + 1;
    if (g.n % 7 === 0) { ch.st.push('gf-' + uid()); sfx('openc'); toast('Подарок дня: сундук! Каждый седьмой подарок — сундук'); }
    else { const v = 5 + Math.floor(mulberry32(seed32((curProf().sid || S.pid) + g.d))() * 11); g.s = (+g.s || 0) + v; sfx('gift'); toast(`Подарок дня: +${v} искр · до сундука ${7 - g.n % 7}`); }
    buzz([10, 30, 10]); saveProfile(); render();
  },
});

