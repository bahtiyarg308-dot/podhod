/* ================= 2.2: companion growth, satiety, chests, wardrobe ================= */
/* Debug mode (?debug=1): shift «today» by whole days, add test workouts, open all chests. Invisible otherwise. */
const DBG = (() => { try { return /[?&]debug=1(&|$)/.test(location.search); } catch (e) { return false; } })();
const dbgShift = () => { try { return +(localStorage.getItem('podhod-dbg-shift') || 0) || 0; } catch (e) { return 0; } };
if (DBG) { const realNow = Date.now.bind(Date); Date.now = () => realNow() + dbgShift() * DAY; }

const mulberry32 = a => () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const seed32 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);
const keyDay = k => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1).getTime(); };

/* ---- freeze: once a month, for illness or a holiday — satiety and the week streak stop ---- */
const freezeOf = p => (p && Array.isArray(p.freeze) ? p.freeze : []).filter(f => f && Number.isFinite(f.from) && Number.isFinite(f.to));
function frozenNow(fr, now = Date.now()) { const d = startOfDay(now); return freezeOf({ freeze:fr }).find(f => d >= startOfDay(f.from) && d <= startOfDay(f.to)) || null; }
function canFreeze(fr, now = Date.now()) { const d = new Date(now), m0 = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); return !frozenNow(fr, now) && !freezeOf({ freeze:fr }).some(f => f.from >= m0); }
function frozenDays(a, b, fr) { let n = 0; freezeOf({ freeze:fr }).forEach(f => { const x = Math.max(a, startOfDay(f.from)), y = Math.min(b, startOfDay(f.to)); if (y >= x) n += daysBetween(x, y) + 1; }); return n; }
function weekFrozen(ws, fr) {
  return freezeOf({ freeze:fr }).some(f => { const len = daysBetween(f.from, f.to) + 1; if (len < 1) return false; const a = Math.max(ws, startOfDay(f.from)), b = Math.min(addDays(ws, 6), startOfDay(f.to)); return b >= a && daysBetween(a, b) + 1 >= Math.min(3, len); });
}

/* ---- satiety: derived from workout dates only. 100 after a workout, two free days, then −20 a day ---- */
function satietyOf(list, fr, now = Date.now()) {
  const last = list && list[0]; if (!last) return { v:100, days:null, state:'new' };
  let days = daysBetween(last.start, now);
  if (days > 0) days -= frozenDays(addDays(startOfDay(last.start), 1), startOfDay(now), fr);
  days = Math.max(0, days);
  const v = days <= 2 ? 100 : Math.max(0, 100 - 20 * (days - 2));
  return { v, days, state: days >= 7 ? 'sleep' : v < 30 ? 'sad' : v < 60 ? 'hungry' : 'fed' };
}
function mateMood(list, goal, live, fr) {
  if (live) return 'fire';
  const s = satietyOf(list, fr);
  if (s.state === 'sleep') return 'sleepy';
  if (s.state === 'hungry' || s.state === 'sad') return 'calm';
  const m = moodOf(list, goal, false); return m === 'sleepy' ? 'calm' : m;
}

/* ---- chests: one per real workout (6+ working sets), one per calendar day; the contents follow from the workout id ---- */
const CH_MIN_SETS = 6;
const SHOP_COST = { c:100, r:300, e:700 };
const CCACHE = new WeakMap();
function workoutChests(c) {
  const goal = c.profile.goal || 3, hit = CCACHE.get(c.D);
  if (hit && hit.n === c.workouts.length && hit.goal === goal) return hit.list;
  const asc = [...c.workouts].sort((a, b) => a.start - b.start), days = new Set(), list = [];
  asc.forEach(w => {
    if (wStats(w).sets < CH_MIN_SETS) return;
    if (w.ad && daysBetween(w.start, w.ad) > 2) return; // added via «Прошедшая» more than two days later
    const dk = dayKey(w.start); if (days.has(dk)) return; days.add(dk);
    list.push({ id:w.id, start:w.start, title:w.title || '', prs:c.D.prCount[w.id] || 0, gold:false });
  });
  // golden chest: the first chest after the moment all weekly quests were done
  const byWeek = new Map(); list.forEach(ch => { const ws = weekStart(ch.start); if (!byWeek.has(ws)) byWeek.set(ws, []); byWeek.get(ws).push(ch); });
  byWeek.forEach((chs, ws) => {
    if (!questsFor(c, ws).every(q => q.done)) return;
    const wk = inWeek(c.workouts, ws).sort((a, b) => a.start - b.start), done = wk.find(w => questsFor(c, ws, w.start).every(q => q.done));
    const g = done && chs.find(ch => ch.start >= done.start); if (g) g.gold = true;
  });
  CCACHE.set(c.D, { n:c.workouts.length, goal, list });
  return list;
}
function chestState(c = ctxLocal()) {
  const ch = c.profile.chest || {}, op = ch.op || {};
  const st = (Array.isArray(ch.st) ? ch.st : []).map(id => { const m = /^rk-(\d+)-/.exec(id); return { id, start:ch.at || 0, title:'', prs:0, gold:!!m, starter:true, rank:m ? +m[1] : null, gift:id.startsWith('gf-') }; });
  const all = [...st, ...workoutChests(c)];
  return { all, closed:all.filter(x => !op[x.id]), op };
}
function rollChest(ch) {
  const r = mulberry32(seed32(ch.id + 'chest')), x = r(), at = ch.start || Date.now();
  let L = .03, E = .07, R = .22;
  if (ch.prs >= 1) { L = .05; E = .1; R = .27; }
  if (ch.prs >= 3) { L = .07; E = .12; R = .3; }
  if (ch.gold) { L = Math.max(L, .1); E = Math.max(E, .2); R = 1 - L - E; }
  const rar = x < L ? 'l' : x < L + E ? 'e' : x < L + E + R ? 'r' : 'c', pool = POOL[rar].filter(i => inSeason(i, at));
  return pool[Math.floor(r() * pool.length)].id;
}
/* collection: items from opened chests + bought; duplicates turn into sparks (10 each) */
function collOf(prof, workouts) {
  const ch = (prof && prof.chest) || {}, op = ch.op || {}, ids = new Set((workouts || []).map(w => w.id)), cnt = {};
  let total = 0, opened = 0;
  Object.entries(op).forEach(([cid, it]) => { if (!ITEM[it] || (!/^(st|rk|gf)-/.test(cid) && !ids.has(cid))) return; cnt[it] = (cnt[it] || 0) + 1; total++; opened++; });
  const buy = (Array.isArray(ch.buy) ? ch.buy : []).filter(b => b && ITEM[b.id]);
  buy.forEach(b => { cnt[b.id] = (cnt[b.id] || 0) + 1; total++; });
  const uniq = Object.keys(cnt).length, spent = buy.reduce((a, b) => a + (+b.c || 0), 0);
  const gift = ch.gift && +ch.gift.s > 0 ? +ch.gift.s : 0;
  return { cnt, uniq, total, opened, old:+ch.old || 0, sparks:Math.max(0, (total - uniq) * 10 + gift - spent), has:id => !!cnt[id] };
}
function gearOf(prof, coll) {
  const g = {}, src = (prof && prof.gear && typeof prof.gear === 'object') ? prof.gear : {};
  SLOT_ORDER.forEach(s => { const id = src[s]; if (typeof id === 'string' && ITEM[id] && ITEM[id].s === s && (!coll || coll.has(id))) g[s] = id; });
  return g;
}
const mateOf = (prof, workouts) => { const coll = collOf(prof, workouts); return { coll, stage:stageOf((workouts || []).length), gear:gearOf(prof, coll) }; };
/* first run of 2.2 for a profile: past workouts count as already opened chests, plus three starter chests */
function ensureChest() {
  const p = S.profile; let ch = false;
  if (!p.chest || !p.chest.v || typeof p.chest.op !== 'object') {
    const op = {}; workoutChests(ctxLocal()).forEach(c => { op[c.id] = rollChest(c); });
    p.chest = { v:1, at:Date.now(), st:[1, 2, 3].map(() => 'st-' + uid()), op, buy:[], old:Object.keys(op).length };
    ch = true;
  } else if (Array.isArray(p.chest.imp) && p.chest.imp.length) { // workouts restored from an old backup or an older phone — no chest avalanche
    const imp = new Set(p.chest.imp); workoutChests(ctxLocal()).forEach(c => { if (imp.has(c.id) && !p.chest.op[c.id]) { p.chest.op[c.id] = rollChest(c); p.chest.old = (+p.chest.old || 0) + 1; } });
    delete p.chest.imp; ch = true;
  }
  if (ch) markDirty();
  return ch;
}
const mateName = k => CHARS[k] ? CHARS[k].name : 'Напарник';
const GROW_TXT = ['', 'Подрос и окреп — больше не малыш.', 'Плечи шире, шаг увереннее.', 'Повязка чемпиона и пресс кубиками.', 'Сияние и искры — так выглядит легенда.', 'Второй круг сияния и звёздная пыль.', 'Золотое сияние — навсегда.'];
const bubbleKey = m => m.mood + '|' + (m.sd ? m.sd.done + '/' + m.sd.due.length : '');
const cntW = n => `${n} ${plural(n, ['тренировка','тренировки','тренировок'])}`;

