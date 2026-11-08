/* ================= storage ================= */
let dirty = false, dirtyT = null;
function syncCur() { S.store[S.pid] = { profile:S.profile, workouts:S.workouts, active:S.active }; }
let LDIRTY = 0;
function markDirty() { dirty = true; LDIRTY++; clearTimeout(dirtyT); dirtyT = setTimeout(flush, 250); }
function flush() { clearTimeout(dirtyT); dirtyT = null; if (!dirty) return; dirty = false; syncCur(); KV.set('p:' + S.pid, { profile:S.profile, workouts:S.workouts, active:S.active }); }
function saveMeta() { if (S.meta) KV.set('meta', clean(S.meta)); }
function ensureMeta() { if (!S.meta) S.meta = { profiles:[{ id:'main', name:'', color:'red' }], cur:'main', theme:'auto' }; return S.meta; }
function saveProfile() { derive(); markDirty(); schedulePush(); }
function saveActive(now) { markDirty(); if (now) flush(); }
function saveWorkout(w) {
  const c = clean(w); delete c.isNew; c.u = Date.now();
  const i = S.workouts.findIndex(x => x.id === c.id);
  if (i >= 0) S.workouts[i] = normW(c, c.id); else S.workouts.push(normW(c, c.id));
  S.workouts.sort((a, b) => b.start - a.start); derive(); markDirty(); flush(); schedulePush();
}
function deleteWorkout(id) {
  S.workouts = S.workouts.filter(w => w.id !== id);
  if (!S.profile.deleted.includes(id)) S.profile.deleted.push(id);
  if (S.profile.chest && S.profile.chest.op) delete S.profile.chest.op[id];
  S.profile.gear = gearOf(S.profile, collOf(S.profile, S.workouts));
  derive(); markDirty(); schedulePush();
}
function changed() { const w = curW(); if (w && isLive(w)) markDirty(); }
function loadProfileData() {
  const d = S.store[S.pid] || {};
  S.profile = normP(d.profile);
  S.workouts = (d.workouts || []).map(w => normW(w, w.id)).sort((a, b) => b.start - a.start);
  S.active = d.active ? normW(d.active, d.active.id) : null;
  S.loaded = { profile:true, workouts:true, active:true };
  syncCur(); derive(); ensureChest();
}
function switchProfile(pid) {
  flush(); syncCur();
  S.pid = pid; ensureMeta().cur = pid; saveMeta();
  S.editing = null; S.rest = { end:0, total:0, alerted:false }; S.prog.ex = null; S.prog.metric = null; S.bubble = null; S.photos = null; S.rirAsk = null;
  if (S.view === 'editor') S.view = 'today';
  loadProfileData(); applyAccent(); buzz(12);
  render(); window.scrollTo(0, 0);
}
async function requestPersist() {
  try { if (navigator.storage && navigator.storage.persist) { S.persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist()); } } catch (e) { S.persisted = null; }
}
