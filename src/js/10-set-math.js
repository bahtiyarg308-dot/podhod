/* ================= set math ================= */
function valid(s, kind) {
  if (kind === 'wr' || kind === 'bw') return num(s.r) > 0;
  if (kind === 'time') return num(s.t) > 0;
  if (kind === 'cardio') return num(s.t) > 0 || num(s.d) > 0;
  return false;
}
const e1rm = (w, r) => (!(w > 0) || !(r > 0)) ? 0 : (r === 1 ? w : w * (1 + r / 30));
function score(s, kind) {
  const w = num(s.w) || 0, r = num(s.r) || 0, t = num(s.t) || 0, d = num(s.d) || 0;
  if (kind === 'wr') return ['e', e1rm(w, r)];
  if (kind === 'bw') return w > 0 ? ['e', e1rm(w, r)] : ['r', r];
  if (kind === 'time') return ['t', t];
  return d > 0 ? ['d', d] : ['t', t];
}
const tonnage = (s, kind) => (kind === 'wr' || kind === 'bw') ? (num(s.w) || 0) * (num(s.r) || 0) : 0;
const working = (s, kind) => !s.warm && s.done && valid(s, kind);

function setShort(s, kind) {
  const w = num(s.w), r = num(s.r), t = num(s.t), d = num(s.d);
  if (kind === 'wr') return `${nf(w || 0, 2)}×${r ?? '–'}`;
  if (kind === 'bw') return w ? `+${nf(w, 2)}×${r ?? '–'}` : `${r ?? '–'}`;
  if (kind === 'time') return `${t ?? '–'}с`;
  return d ? `${nf(d, 2)}км` : `${Math.round((t || 0) / 60)}м`;
}
function setLong(s, kind) {
  const w = num(s.w), r = num(s.r), t = num(s.t), d = num(s.d);
  if (kind === 'wr') return `${nf(w || 0, 2)} кг × ${r}`;
  if (kind === 'bw') return w ? `+${nf(w, 2)} кг × ${r}` : `${r} ${plural(r, ['повтор','повтора','повторов'])}`;
  if (kind === 'time') return `${fmtClock(t || 0)}${w ? ` · +${nf(w, 2)} кг` : ''}`;
  const parts = []; if (d) parts.push(`${nf(d, 2)} км`); if (t) parts.push(fmtClock(t)); if (d && t) parts.push(`${fmtClock(t / d)}/км`);
  return parts.join(' · ');
}
function wStats(w, liveOnly) {
  let vol = 0, sets = 0;
  for (const x of w.exercises || []) {
    const k = exById(x.ex).kind;
    for (const s of x.sets || []) {
      if (s.warm || !valid(s, k)) continue;
      if (liveOnly && !s.done) continue;
      sets++; vol += tonnage(s, k);
    }
  }
  return { vol, sets, dur: (w.end || Date.now()) - w.start };
}
function agg(list) { const a = { n:list.length, vol:0, sets:0, dur:0 }; list.forEach(w => { const s = wStats(w); a.vol += s.vol; a.sets += s.sets; a.dur += s.dur; }); return a; }
function weekSummary(list) { const ws = weekStart(Date.now()), days = new Set(); let n = 0, vol = 0; (list || []).forEach(w => { if (w.start >= ws) { n++; days.add(dayKey(w.start)); vol += wStats(w).vol; } }); return { n, days, vol }; }

