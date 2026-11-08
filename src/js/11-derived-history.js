/* ================= derived history ================= */
function derive() { D = deriveFrom(S.workouts); }
function deriveFrom(list) {
  const asc = [...(list || [])].sort((a, b) => a.start - b.start);
  const hist = {}, best = {}, prSets = {}, prCount = {}, prEvents = [], usage = {};
  for (const w of asc) {
    const marks = new Set(); let n = 0;
    (w.exercises || []).forEach((x, xi) => {
      const kind = exById(x.ex).kind;
      const all = (x.sets || []).filter(s => valid(s, kind));
      const ws = (x.sets || []).filter(s => !s.warm && valid(s, kind));
      if (!all.length) return;
      usage[x.ex] = (usage[x.ex] || 0) + 1;
      const b = best[x.ex] || (best[x.ex] = { v:{}, at:{}, maxW:0, vol:0, sets:0 });
      const had = !!(hist[x.ex] && hist[x.ex].length);
      const topK = {}; let topE = 0, maxW = 0, vol = 0, maxR = 0, totR = 0, maxT = 0, maxD = 0, pace = 0, maxWset = null;
      (x.sets || []).forEach((s, si) => {
        if (s.warm || !valid(s, kind)) return;
        const [k, v] = score(s, kind);
        if (v > 0 && (!topK[k] || v > topK[k].v)) topK[k] = { v, si };
        const W = num(s.w) || 0, R = num(s.r) || 0, T = num(s.t) || 0, Dd = num(s.d) || 0;
        if (W > maxW) { maxW = W; maxWset = s; }
        vol += tonnage(s, kind); maxR = Math.max(maxR, R); totR += R; maxT = Math.max(maxT, T); maxD = Math.max(maxD, Dd);
        if (kind === 'cardio' && Dd > 0 && T > 0) { const p = T / 60 / Dd; pace = pace ? Math.min(pace, p) : p; }
        topE = Math.max(topE, e1rm(W, R));
      });
      for (const k in topK) {
        if (had && topK[k].v > (b.v[k] || 0) + 1e-9) {
          marks.add(xi + ':' + topK[k].si); n++;
          prEvents.push({ wid:w.id, start:w.start, ex:x.ex, set:x.sets[topK[k].si], k, v:topK[k].v });
        }
        if (topK[k].v > (b.v[k] || 0)) { b.v[k] = topK[k].v; b.at[k] = { start:w.start, set:x.sets[topK[k].si] }; }
      }
      if (maxW > b.maxW) { b.maxW = maxW; b.maxWat = { start:w.start, set:maxWset }; }
      if (vol > b.vol) { b.vol = vol; b.volAt = w.start; }
      b.sets += ws.length;
      (hist[x.ex] || (hist[x.ex] = [])).push({ wid:w.id, start:w.start, all, topE, maxW, vol, maxR, totR, maxT, maxD, pace });
    });
    prSets[w.id] = marks; prCount[w.id] = n;
  }
  return { hist, best, prSets, prCount, prEvents: prEvents.reverse(), usage };
}
function lastEntry(exId, wid, before) {
  const h = D.hist[exId]; if (!h) return null;
  for (let i = h.length - 1; i >= 0; i--) { if (h[i].wid !== wid && h[i].start < (before ?? Infinity)) return h[i]; }
  return null;
}
function livePRs(w) {
  const marks = new Set();
  if (!w || S.editing === w) return marks;
  w.exercises.forEach((x, xi) => {
    const kind = exById(x.ex).kind, h = D.hist[x.ex];
    if (!h || !h.length) return;
    const bv = (D.best[x.ex] || { v:{} }).v, topK = {};
    x.sets.forEach((s, si) => { if (!working(s, kind)) return; const [k, v] = score(s, kind); if (v > 0 && (!topK[k] || v > topK[k].v)) topK[k] = { v, si }; });
    for (const k in topK) if (topK[k].v > (bv[k] || 0) + 1e-9) marks.add(xi + ':' + topK[k].si);
  });
  return marks;
}
function prevSet(last, x, si) { // the same set of the last session: n-th warm-up ↔ n-th warm-up, n-th working ↔ n-th working
  if (!last) return null;
  const s = x.sets[si], warm = !!(s && s.warm), k = x.sets.slice(0, si).filter(q => !!q.warm === warm).length;
  return last.all.filter(p => !!p.warm === warm)[k] || null;
}
function ghost(w, x, si, kind) {
  const p = prevSet(lastEntry(x.ex, w.id, w.start), x, si);
  if (p) return { w:num(p.w), r:num(p.r), t:num(p.t), d:num(p.d) };
  const o = {}; const prev = x.sets[si - 1];
  if (prev && !prev.warm) Object.assign(o, { w:num(prev.w), r:num(prev.r), t:num(prev.t), d:num(prev.d) });
  if (x.target != null) { if (kind === 'time') o.t = o.t ?? num(x.target); else if (kind !== 'cardio') o.r = o.r ?? num(x.target); }
  return o;
}
function weekStreak(list = S.workouts) {
  const weeks = new Set(list.map(w => weekStart(w.start)));
  let ws = weekStart(Date.now()); if (!weeks.has(ws)) ws = addDays(ws, -7);
  let n = 0; while (weeks.has(ws)) { n++; ws = addDays(ws, -7); }
  return n;
}

