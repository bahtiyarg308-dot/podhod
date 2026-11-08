/* ================= workout ops ================= */
function newEx(id, w, it) {
  const last = lastEntry(id, w.id, w.start);
  let sets;
  if (it) { sets = (last ? last.all.filter(s => s.warm).map(() => ({ warm:true })) : []); for (let i = 0; i < (it.sets || 3); i++) sets.push({}); }
  else if (last) sets = last.all.slice(0, 10).map(s => (s.warm ? { warm:true } : {}));
  else sets = [{}, {}, {}];
  return { k:uid(), ex:id, sets, target: it && it.reps != null && it.reps !== '' ? it.reps : null };
}
function startWorkout(tpl, fromW) {
  if (S.active) { toast('Сначала завершите текущую тренировку'); go('today'); return; }
  const w = { id:uid(), title: tpl ? tpl.name : fromW ? (fromW.title || '') : '', tpl: tpl ? tpl.id : fromW ? (fromW.tpl || null) : null, start:Date.now(), exercises:[] };
  if (tpl) tpl.items.forEach(it => { const nx = newEx(it.ex, w, it); if (it.ss) nx.ss = it.ss; w.exercises.push(nx); });
  if (fromW) fromW.exercises.forEach(x => w.exercises.push({ k:uid(), ex:x.ex, sets:x.sets.filter(s => valid(s, exById(x.ex).kind)).map(s => (s.warm ? { warm:true } : {})), target:null, ...(x.ss ? { ss:x.ss } : {}) }));
  S.active = w; S.sheets = []; saveActive(true); keepAwake(true); unlockAudio(); buzz(15); sfx('start');
  go('today'); schedulePush();
}
function finalize(w) {
  w.exercises = (w.exercises || []).map(x => { const kind = exById(x.ex).kind; return { ...x, sets: x.sets.filter(s => valid(s, kind)).map(s => ({ ...s, done:true })) }; }).filter(x => x.sets.length);
  return w;
}
function ctx(el) {
  const w = curW(); if (!w) return null;
  const xi = +el.dataset.x, si = +el.dataset.i, x = w.exercises[xi]; if (!x) return null;
  return { w, xi, si, x, s: x.sets[si], ex: exById(x.ex) };
}
function go(v) {
  if (!VIEWS.includes(v)) v = 'today';
  if (S.view === 'editor') S.editing = null;
  const changedView = S.view !== v;
  S.view = v; if (v === 'chat') S.chatScroll = true;
  if (location.hash.slice(1) !== v) { try { history.replaceState(null, '', '#' + v); } catch (e) { /* hash blocked */ } }
  render(); if (changedView) window.scrollTo(0, 0);
}
function replaceEx(xi, id) { const w = curW(), x = w && w.exercises[xi]; if (!x) return; x.ex = id; x.target = null; x.sets = x.sets.map(s => (s.warm ? { warm:true } : {})); changed(); }
function fullBackup() {
  flush(); syncCur();
  const data = {}; profiles().forEach(p => { const d = S.store[p.id] || {}; data[p.id] = { profile:d.profile || null, workouts:d.workouts || [] }; });
  return { app:'podhod', version:2, exported:new Date().toISOString(), meta:{ profiles:profiles() }, data };
}
async function saveFile(name, text, mime, viaShare) {
  const blob = new Blob([text], { type:mime });
  if (viaShare && navigator.canShare && window.File) {
    try { const file = new File([blob], name, { type:mime }); if (navigator.canShare({ files:[file] })) { await navigator.share({ files:[file], title:name }); return true; } }
    catch (e) { if (e && e.name === 'AbortError') return false; }
  }
  try { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); return true; }
  catch (e) { toast('Не получилось сохранить файл'); return false; }
}
async function doBackup(viaShare) {
  const ok = await saveFile(`podhod-backup-${dayKey(Date.now())}.json`, JSON.stringify(fullBackup()), 'application/json', viaShare);
  if (ok) { ensureMeta().lastBackup = Date.now(); saveMeta(); toast('Резервная копия сохранена'); render(); }
}
function mergeInto(pid, src) {
  const d = S.store[pid] || (S.store[pid] = {});
  const prof = normP(d.profile), inc = normP(src.profile);
  ['templates', 'custom', 'body', 'meas'].forEach(k => { const have = new Set(prof[k].map(o => o.id)); inc[k].forEach(o => { if (o && o.id && !have.has(o.id)) prof[k].push(o); }); });
  if (!d.profile && src.profile) ['rest', 'sound', 'bar', 'goal'].forEach(k => { if (src.profile[k] != null) prof[k] = src.profile[k]; });
  { const have = new Set(prof.supps.map(o => o.id)); inc.supps.forEach(o => { if (!have.has(o.id)) prof.supps.push(o); }); }
  Object.entries(inc.slog).forEach(([k, l]) => { if (Array.isArray(l)) prof.slog[k] = [...new Set([...(prof.slog[k] || []), ...l])]; });
  prof.sfull = [...new Set([...prof.sfull, ...inc.sfull])].sort();
  inc.freeze.forEach(f => { if (f && Number.isFinite(f.from) && !prof.freeze.some(x => x.from === f.from)) prof.freeze.push(f); });
  if (!Object.keys(prof.gear).length) prof.gear = inc.gear;
  const before = new Set((d.workouts || []).map(w => w.id));
  const ws = new Map((d.workouts || []).map(w => [w.id, w])); let n = 0;
  (src.workouts || []).forEach(w => { if (w && w.id && Number.isFinite(w.start) && Array.isArray(w.exercises)) { const c = normW(w, String(w.id)); delete c.demo; ws.set(c.id, c); n++; } });
  if (inc.chest && prof.chest) { Object.entries(inc.chest.op).forEach(([k, v]) => { if (!prof.chest.op[k] && ITEM[v]) prof.chest.op[k] = v; }); inc.chest.buy.forEach(b => { if (b && ITEM[b.id] && !prof.chest.buy.some(x => x.at === b.at && x.id === b.id)) prof.chest.buy.push(b); }); }
  else if (inc.chest && !prof.chest) prof.chest = inc.chest;
  else if (prof.chest) prof.chest.imp = [...new Set([...(prof.chest.imp || []), ...[...ws.keys()].filter(id => !before.has(id))])]; // a backup from before 2.2
  d.profile = prof; d.workouts = [...ws.values()].sort((a, b) => b.start - a.start); d.active = d.active || null;
  KV.set('p:' + pid, d);
  return n;
}

function commitWorkout(w) {
  const hungry0 = satietyOf(S.workouts, S.profile.freeze).v < 60, goal0 = goalStreak().curMet;
  const st0 = gameStats(), xp0 = totalXP(st0), b0 = new Set(unlockedBadges(st0)), l0 = levelOf(xp0).k, q0 = new Set(questsFor(ctxLocal(), weekStart(w.start)).filter(x => x.done).map(x => x.id)), g0 = stageOf(S.workouts.length).k;
  saveWorkout(w);
  const st1 = gameStats(), xp1 = totalXP(st1), newBadges = unlockedBadges(st1).filter(id => !b0.has(id)), l1 = levelOf(xp1).k, g1 = stageOf(S.workouts.length).k;
  S.sheets = []; S.bubble = null; S.ateAt = Date.now(); buzz([30, 60, 30]); sfx(l1 > l0 ? 'level' : 'finish');
  const newQuests = questsFor(ctxLocal(), weekStart(w.start)).filter(x => x.done && !q0.has(x.id)).map(x => x.t);
  S.wasHungry = hungry0;
  if (g1 <= g0) { const extra = newBadges.length ? 'badge' : !goal0 && goalStreak().curMet ? 'goal' : newQuests.length ? 'quest' : null; if (extra) setTimeout(() => sfx(extra), l1 > l0 ? 1700 : 1150); }
  go('log'); openSheet({ type:'done', id:w.id, prs:D.prCount[w.id] || 0, xpGain:xp1 - xp0, xpAfter:xp1, lvlUp:l1 > l0, newBadges, newQuests });
  const nr = rankSync(); if (nr != null) setTimeout(() => { openSheet({ type:'rankup', r:nr }); sfx('rank'); confetti(innerWidth / 2, innerHeight * .35, 110); }, g1 > g0 ? 2200 : 1200);
  if (g1 > g0) { openSheet({ type:'grow', k:g1 }); setTimeout(() => confetti(innerWidth / 2, innerHeight * .35, 110), RM ? 0 : 350); setTimeout(() => sfx('grow'), 900); }
  if (isStandalone() && !S.persisted) requestPersist();
}

