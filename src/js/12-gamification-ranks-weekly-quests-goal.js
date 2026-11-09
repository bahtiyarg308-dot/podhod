/* ================= gamification: ranks, weekly quests, goal streaks, achievements ================= */
const RANKS = ['Новичок','Любитель','III юношеский','II юношеский','I юношеский','III разряд','II разряд','I разряд','КМС','Мастер спорта','МСМК','ЗМС','Чемпион города','Чемпион страны','Чемпион Европы','Чемпион мира','Рекордсмен','Легенда спорта','Титан','Олимпиец'];
const RANK_COL = ['#8E9399','#A9AEB5','#B8743A','#C4823F','#D09048','#8C99A6','#A9B5C1','#C5CFD9','#2FBF7A','#E0A800','#F2C230','#FFD23F','#FF8A70','#FF6B6B','#F2476E','#D93670','#A88BFF','#8E6BFF','#3EA8F2','#2ED3CC'];
const rankIdx = k => Math.floor((k - 1) / 5);
const rankName = k => rankIdx(k) < RANKS.length ? RANKS[rankIdx(k)] : 'Бессмертный ' + (rankIdx(k) - RANKS.length + 1);
const lvlNeed = k => 100 * (k - 1) + 20 * k * (k - 1); // total XP needed to reach level k: about 6 years of steady training to level 100
function rankBadge(k, cls = '') {
  const r = rankIdx(k), c = r < RANK_COL.length ? RANK_COL[r] : '#FFD23F', div = (k - 1) % 5 + 1;
  const dots = [0, 1, 2, 3, 4].map(i => `<circle cx="${12 + i * 4}" cy="34.5" r="1.45" style="fill:${i < div ? '#fff' : 'rgba(0,0,0,.28)'}"/>`).join('');
  return `<svg class="rk${cls ? ' ' + cls : ''}" viewBox="0 0 40 46" aria-hidden="true"><path d="M20 1.5 L37.5 7.5 V22 C37.5 33 29 40.5 20 44.5 C11 40.5 2.5 33 2.5 22 V7.5Z" style="fill:${c}"/><path d="M20 5.5 L33.5 10.2 V22 C33.5 30.6 27 36.6 20 40 C13 36.6 6.5 30.6 6.5 22 V10.2Z" style="fill:rgba(0,0,0,.2)"/>${r >= 20 ? '<path d="M14 4 L20 1 L26 4 L24 7 H16Z" style="fill:#fff;opacity:.8"/>' : ''}<text x="20" y="27" text-anchor="middle" class="rk-n">${k}</text>${dots}${cls.includes('big') ? `<clipPath id="rkc${k}"><path d="M20 1.5 L37.5 7.5 V22 C37.5 33 29 40.5 20 44.5 C11 40.5 2.5 33 2.5 22 V7.5Z"/></clipPath><g clip-path="url(#rkc${k})"><rect class="rk-shine" x="-30" y="-4" width="12" height="54" transform="skewX(-18)"/></g>` : ''}</svg>`;
}
function levelOf(xp) { let k = 1; while (xp >= lvlNeed(k + 1)) k++; const a = lvlNeed(k), b = lvlNeed(k + 1); return { k, title:rankName(k), rank:rankIdx(k), div:(k - 1) % 5 + 1, cur: xp - a, need: b - a, pct: Math.min(100, (xp - a) / (b - a) * 100), xp }; }
const workoutXP = (w, Dx = D) => 40 + Math.min(40, wStats(w).sets * 2) + (Dx.prCount[w.id] || 0) * 15;
function weekCounts(list) { const m = new Map(); list.forEach(w => { const k = weekStart(w.start); m.set(k, (m.get(k) || 0) + 1); }); return m; }
const ctxLocal = () => ({ workouts:S.workouts, profile:S.profile, D, local:true });
const rdFor = sid => S.rd[sid] || (S.rd[sid] = deriveFrom(S.remote[sid] ? S.remote[sid].workouts : []));
const ctxRemote = sid => { const m = S.remote[sid] || {}; return { workouts:m.workouts || [], profile:normP(m.profile), D:rdFor(sid) }; };

/* Weekly quests are derived from the data alone (no stored state), so every phone computes the same ones — for the partner too. */
const QXP = 50, QBONUS = 50, MAIN_MUSCLES = ['chest', 'back', 'legs', 'shoulders', 'arms', 'glutes'];
const inWeek = (list, ws) => { const we = addDays(ws, 7); return list.filter(w => w.start >= ws && w.start < we); };
const workSets = (w, f) => (w.exercises || []).forEach(x => { const e = exById(x.ex); (x.sets || []).forEach(s => { if (!s.warm && valid(s, e.kind)) f(e, s, x); }); });
function questsFor(c, ws, upto) {
  const list = c.workouts, goal = c.profile.goal || 3, wk = inWeek(list, ws).filter(w => upto == null || w.start <= upto);
  const prev = [1, 2, 3, 4].map(i => inWeek(list, addDays(ws, -7 * i))).filter(l => l.length);
  const avg = f => prev.length ? prev.reduce((a, l) => a + f(l), 0) / prev.length : 0;
  const volOf = l => l.reduce((a, w) => a + wStats(w).vol, 0), setsOf = l => l.reduce((a, w) => a + wStats(w).sets, 0);
  const exOf = l => { const u = new Set(); l.forEach(w => workSets(w, (e, s, x) => u.add(x.ex))); return u.size; };
  const step = (v, k) => Math.max(k, Math.round(v / k) * k);
  const q = [{ id:'n', ic:'target', t:`${goal} ${plural(goal, ['тренировка','тренировки','тренировок'])} за неделю`, cur:wk.length, target:goal, fmt:v => nf(v, 0) }];
  const av = avg(volOf);
  if (av > 0) { const tg = step(av * 1.1, 500); q.push({ id:'vol', ic:'up', t:`Тоннаж ${ton(tg)} за неделю`, cur:volOf(wk), target:tg, fmt:v => ton(v) }); }
  else { const tg = step(Math.max(avg(setsOf) * 1.1, 15), 5); q.push({ id:'sets', ic:'up', t:`${tg} рабочих подходов`, cur:setsOf(wk), target:tg, fmt:v => nf(v, 0) }); }
  const hist = list.some(w => w.start < ws), rot = ((Math.round(ws / (7 * DAY)) % 3) + 3) % 3;
  if (hist && rot === 0) {
    const n = c.D.prEvents.filter(p => p.start >= ws && p.start < addDays(ws, 7) && (upto == null || p.start <= upto)).length;
    q.push({ id:'pr', ic:'star', t:'Побить личный рекорд', cur:n, target:1, fmt:v => nf(v, 0) });
  } else if (hist && rot === 2) {
    const ms = {}; MAIN_MUSCLES.forEach(m => { ms[m] = 0; }); prev.flat().forEach(w => workSets(w, e => { if (e.muscle in ms) ms[e.muscle]++; }));
    const m = MAIN_MUSCLES.reduce((a, b) => ms[b] < ms[a] ? b : a);
    let n = 0; wk.forEach(w => workSets(w, e => { if (e.muscle === m) n++; }));
    q.push({ id:'mus', ic:'today', t:`${MUSCLES[m]}: 6 рабочих подходов`, cur:n, target:6, fmt:v => nf(v, 0) });
  } else {
    const tg = Math.max(5, Math.round(avg(exOf) * 1.2) || 5);
    q.push({ id:'var', ic:'repeat', t:`${tg} разных упражнений`, cur:exOf(wk), target:tg, fmt:v => nf(v, 0) });
  }
  q.forEach(x => { x.done = x.cur >= x.target; });
  return q;
}
const QCACHE = new WeakMap();
function questLog(c) {
  const goal = c.profile.goal || 3, hit = QCACHE.get(c.D);
  if (hit && hit.goal === goal && hit.n === c.workouts.length) return hit;
  let xp = 0, done = 0, perfect = 0;
  [...new Set(c.workouts.map(w => weekStart(w.start)))].forEach(ws => {
    const q = questsFor(c, ws), d = q.filter(x => x.done).length;
    done += d; xp += d * QXP; if (d === q.length) { perfect++; xp += QBONUS; }
  });
  const r = { goal, n:c.workouts.length, xp, done, perfect }; QCACHE.set(c.D, r); return r;
}
function goalStreak(c = ctxLocal()) {
  const goal = c.profile.goal || 3, wc = weekCounts(c.workouts), now = weekStart(Date.now());
  const cur = wc.get(now) || 0, curMet = cur >= goal, fr = c.profile.freeze, first = c.workouts.length ? weekStart(c.workouts[c.workouts.length - 1].start) : now;
  let ws = curMet ? now : addDays(now, -7), n = 0;
  while (ws >= first) { if ((wc.get(ws) || 0) >= goal) n++; else if (!weekFrozen(ws, fr)) break; ws = addDays(ws, -7); }
  return { n, curMet, left:Math.max(0, goal - cur), daysLeft:Math.max(1, Math.round((addDays(now, 7) - Date.now()) / DAY)), frozen:weekFrozen(now, fr) };
}
function gameStats(c) { if (c) return gameStats0(c); const g = S.gsC; if (g) return g.v || (g.v = gameStats0(ctxLocal())); return gameStats0(ctxLocal()); }
function gameStats0(c) {
  const goal = c.profile.goal || 3, wc = weekCounts(c.workouts);
  let tonTotal = 0, early = 0, owl = 0, heavy = 0, sets = 0;
  c.workouts.forEach(w => { const st = wStats(w); tonTotal += st.vol; sets += st.sets; const h = new Date(w.start).getHours(); if (h < 9) early++; if (h >= 21) owl++; workSets(w, (e, s) => { if (e.kind === 'wr' && (num(s.w) || 0) >= 100) heavy++; }); });
  const weeks = [...wc.entries()].filter(([, n]) => n >= goal).map(([k]) => k).sort((a, b) => a - b), met = new Set(weeks), fr = c.profile.freeze; let bestStreak = 0, run = 0;
  if (weeks.length) for (let k = weeks[0]; k <= weeks[weeks.length - 1]; k = addDays(k, 7)) { if (met.has(k)) { run++; bestStreak = Math.max(bestStreak, run); } else if (!weekFrozen(k, fr)) run = 0; }
  const coll = collOf(c.profile, c.workouts), own = Object.keys(coll.cnt);
  const mw = id => (c.D.best[id] && c.D.best[id].maxW) || 0, ql = questLog(c);
  const pull = Math.max(0, ...((c.D.hist.pullup || []).map(h => h.maxR || 0)));
  return { n:c.workouts.length, prs:c.D.prEvents.length, tonTotal, early, owl, heavy, sets, bestStreak, goalWeeks:weeks.length, tpls:c.profile.templates.length, bodyN:c.profile.body.length, profiles:profiles().length + Object.keys(S.remote).length,
    bench:mw('bench'), squat:mw('squat'), dead:mw('deadlift'), hip:mw('hip-thrust'), pull, quests:ql.done, perfect:ql.perfect, questXP:ql.xp,
    chests:Math.max(0, coll.opened - coll.old), uniq:coll.uniq, legend:own.some(id => ITEM[id].r === 'l'), epic:own.some(id => ITEM[id].r === 'e'), slotsAll:SLOT_BASE.every(s => own.some(id => ITEM[id].s === s)), slotsAll8:SLOT_ORDER.every(s => own.some(id => ITEM[id].s === s)), gifts:+((c.profile.chest || {}).gift || {}).n || 0, stage:stageOf(c.workouts.length).k, supBest:c.local ? supBest(c.profile) : 0 };
}
const BADGES = [
  ['first','Старт','Первая тренировка в журнале','1', s => s.n >= 1],
  ['w10','Десятка','10 тренировок','10', s => s.n >= 10],
  ['w25','Система','25 тренировок','25', s => s.n >= 25],
  ['w50','Полсотни','50 тренировок','50', s => s.n >= 50],
  ['w100','Сотня','100 тренировок','100', s => s.n >= 100],
  ['w250','Ветеран','250 тренировок','250', s => s.n >= 250],
  ['goal','Цель недели','Выполнить недельную цель','@target', s => s.goalWeeks >= 1],
  ['st3','Серия 3','3 недели подряд с выполненной целью','@flame', s => s.bestStreak >= 3],
  ['st8','Серия 8','8 недель подряд с выполненной целью','8', s => s.bestStreak >= 8],
  ['st26','Полгода','26 недель подряд с выполненной целью','26', s => s.bestStreak >= 26],
  ['q1','Задание','Выполнить первое задание недели','@check', s => s.quests >= 1],
  ['q3','Идеальная неделя','Все три задания за одну неделю','3/3', s => s.perfect >= 1],
  ['q25','25 заданий','Выполнить 25 заданий недели','25', s => s.quests >= 25],
  ['pr1','Первый рекорд','Побить свой прошлый результат','@star', s => s.prs >= 1],
  ['pr10','10 рекордов','10 личных рекордов','PR', s => s.prs >= 10],
  ['pr50','50 рекордов','50 личных рекордов','@trophy', s => s.prs >= 50],
  ['bench60','Жим 60','Жим штанги лёжа 60 кг','60', s => s.bench >= 60],
  ['bench100','Жим 100','Жим штанги лёжа 100 кг','100', s => s.bench >= 100],
  ['squat100','Присед 100','Приседания со штангой 100 кг','100', s => s.squat >= 100],
  ['dead140','Тяга 140','Становая тяга 140 кг','140', s => s.dead >= 140],
  ['hip100','Мост 100','Ягодичный мост со штангой 100 кг','100', s => s.hip >= 100],
  ['pull10','10 подтягиваний','10 подтягиваний за подход','10×', s => s.pull >= 10],
  ['heavy','Сотня на грифе','Рабочий подход с весом от 100 кг','кг', s => s.heavy >= 1],
  ['t1','Тонна','1 тонна за всё время','1т', s => s.tonTotal >= 1000],
  ['t10','10 тонн','10 тонн за всё время','10т', s => s.tonTotal >= 10000],
  ['t100','100 тонн','100 тонн за всё время','100т', s => s.tonTotal >= 100000],
  ['t1000','1000 тонн','1000 тонн за всё время','1000т', s => s.tonTotal >= 1000000],
  ['early','Ранний старт','Тренировка до 9 утра','@sun', s => s.early >= 1],
  ['owl','Поздняя смена','Тренировка после 21:00','@moon', s => s.owl >= 1],
  ['tpl','Своя программа','Создать программу','П', s => s.tpls >= 1],
  ['body','Контроль','5 записей веса тела','5', s => s.bodyN >= 5],
  ['pair','Команда','Подключить партнёра или второй профиль','@users', s => s.profiles >= 2],
  ['chest1','Первый сундук','Открыть сундук после тренировки','@chest', s => s.chests >= 1],
  ['coll30','Коллекционер','Собрать 30 разных вещей','30', s => s.uniq >= 30],
  ['legend','Легенда найдена','Найти легендарную вещь','@spark', s => s.legend],
  ['athlete','Атлет','Напарник дорос до стадии «Атлет»','@up', s => s.stage >= 3],
  ['wardrobe','Полный гардероб','Вещь для каждого слота: голова, глаза, шея, рука и фон','@shirt', s => s.slotsAll],
  ['sup7','Режим','7 дней подряд все добавки по плану','@pill', s => s.supBest >= 7],
  ['sup30','Железная дисциплина','30 дней подряд все добавки по плану','30д', s => s.supBest >= 30],
  ['epic1','Эпично','Найти эпическую вещь','@spark', s => s.epic],
  ['coll75','Большой гардероб','Собрать 75 разных вещей','75', s => s.uniq >= 75],
  ['collAll','Полная коллекция','Собрать все вещи до одной','@trophy', s => s.uniq >= ITEMS.length],
  ['fashion','Модник','Вещь для каждого из 8 слотов: со спиной, спутником и аурой','@shirt', s => s.slotsAll8],
  ['mythic','Мифический напарник','Напарник дорос до стадии «Мифический»','@star', s => s.stage >= 5],
  ['gift7','Неделя подарков','Забрать 7 подарков дня','@gift', s => s.gifts >= 7],
];
function unlockedBadges(st = gameStats()) { return BADGES.filter(b => b[4](st)).map(b => b[0]); }
function totalXP(st = gameStats(), c = ctxLocal()) { return c.workouts.reduce((a, w) => a + workoutXP(w, c.D), 0) + st.goalWeeks * 60 + unlockedBadges(st).length * 30 + st.questXP + (c.local ? supXP(c.profile) + habXP(c.profile) : Math.max(0, Math.min(1e6, +c.profile.sx || 0))); }
function medalHTML(b, i, unlocked, isNew, row) {
  const g = b[3].startsWith('@') ? icon(b[3].slice(1)) : esc(b[3]);
  const circ = `<span class="medal-c">${unlocked ? g : (b[3].startsWith('@') ? icon(b[3].slice(1)) : esc(b[3]))}</span>`;
  if (row) return medalRow(b, unlocked, null, isNew);
  return `<button class="medal${unlocked ? '' : ' locked'}${isNew ? ' new' : ''}" style="--i:${i}" data-act="awards" aria-label="${esc(b[1])}${unlocked ? '' : ', ещё не получено'}">${circ}<span>${esc(b[1])}</span></button>`;
}
function moodNow() {
  const ws = weekStart(Date.now()), n = S.workouts.filter(w => w.start >= ws).length, goal = S.profile.goal || 3;
  let mood = mateMood(S.workouts, goal, false, S.profile.freeze);
  const sd = S.profile.supps.length ? supDay(S.profile, startOfDay(Date.now())) : null;
  if (mood === 'calm' && sd && sd.full && satietyOf(S.workouts, S.profile.freeze).v >= 60) mood = 'happy';
  return { mood, n, goal, sd };
}
function bubbleText(m) {
  const trainedToday = S.workouts.some(w => dayKey(w.start) === dayKey(Date.now()));
  const sd = m.sd, h = new Date(Date.now()).getHours();
  if (sd && sd.due.length && !sd.full && h >= 11 && Math.random() < .5) { const left = sd.due.filter(s => !sd.taken.has(s.id)).map(s => s.name); return `Не забудь: ${left.slice(0, 3).join(', ')}${left.length > 3 ? '…' : ''}.`; }
  if (frozenNow(S.profile.freeze)) return 'Заморозка: отдыхаем без потерь. Выздоравливай!';
  if (!S.workouts.length) return 'Первая тренировка — точка отсчёта. Начнём?';
  if (trainedToday) return pick(['Тренировка засчитана. Теперь восстановление.', 'Готово на сегодня. Сон и белок сделают остальное.', 'Сделано. Мышцы растут на отдыхе.']);
  const buddy = Object.values(S.remote).find(r => (r.workouts || []).some(w => dayKey(w.start) === dayKey(Date.now())) || (r.live && Date.now() - r.live.start < 4 * 3600e3));
  if (buddy) return `${buddy.name || 'Партнёр'} уже тренируется сегодня. Твой ход.`;
  if (m.mood === 'sleepy') { const d = Math.round((Date.now() - S.workouts[0].start) / DAY); return `Перерыв ${d} ${plural(d, ['день','дня','дней'])}. Лёгкая тренировка вернёт ритм.`; }
  if (sd && sd.full && Math.random() < .35) return 'Добавки по плану приняты. Режим держится.';
  if (m.n >= m.goal) return pick(['Цель недели выполнена.', 'Неделя закрыта. Серия продолжается.', 'План выполнен. Можно и сверх плана.']);
  const left = m.goal - m.n;
  return `До цели недели: ${left} ${plural(left, ['тренировка','тренировки','тренировок'])}.`;
}

