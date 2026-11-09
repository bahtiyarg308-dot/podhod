/* ================= supplements: a private daily plan ================= */
const SUP_WHEN = [['am','Утро'],['day','День'],['pm','Вечер'],['pre','До тренировки'],['post','После тренировки'],['any','В любое время']];
const SUP_UNITS = ['г','мг','мкг','МЕ','капс.','таб.','мл','ложка','порция'];
const SUP_QUICK = [['Креатин','5','г','am'],['Протеин','30','г','post'],['Витамин D','2000','МЕ','am'],['Омега-3','2','капс.','day'],['Магний','400','мг','pm'],['Цинк','25','мг','pm'],['Мультивитамины','1','таб.','am'],['Коллаген','10','г','am']];
const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];
const supDose = s => { const v = parseNum(s && s.dose); return v > 0 ? v : null; };
const doseTxt = s => s.dose ? `${String(s.dose).replace('.', ',')} ${s.unit || ''}`.trim() : '';
function supDue(s, day) {
  if (!s || s.off || swHid(s.id)) return false;
  if (Array.isArray(s.days) && s.days.length && !s.days.includes(new Date(day).getDay())) return false;
  if (s.cf) { const a = startOfDay(s.cf); if (day < a || (s.cd > 0 && day >= addDays(a, s.cd))) return false; }
  return true;
}
function supCourse(s, day) { if (!s.cf || !(s.cd > 0)) return null; const a = startOfDay(s.cf), b = addDays(a, s.cd); return day < a ? { st:'soon', a, b } : day >= b ? { st:'over', a, b } : { st:'on', a, b, n:daysBetween(a, day) + 1 }; }
function supDay(p, day) {
  const due = (p.supps || []).filter(s => supDue(s, day)), taken = new Set((p.slog || {})[dayKey(day)] || []);
  const done = due.filter(s => taken.has(s.id)).length;
  return { due, taken, done, full:due.length > 0 && done === due.length };
}
function supLeft(s) { if (s.stock == null) return null; const d = supDose(s); if (!d) return null; const perDay = d * ((Array.isArray(s.days) && s.days.length ? s.days.length : 7) / 7); return Math.floor(s.stock / perDay + 1e-9); }
const SBC = { k:'', v:0 };
function supBest(p) {
  const full = [...new Set(p.sfull || [])].sort(), k = full.length + '|' + full[0] + '|' + full[full.length - 1] + '|' + JSON.stringify((p.supps || []).map(s => [s.days, s.cf, s.cd, s.off]));
  if (SBC.k === k) return SBC.v;
  let best = 0, run = 0, prev = null;
  full.forEach(dk => {
    const d = keyDay(dk);
    if (prev != null) { let gap = false; for (let x = addDays(prev, 1); x < d; x = addDays(x, 1)) if ((p.supps || []).some(s => supDue(s, x))) { gap = true; break; } run = gap ? 1 : run + 1; } else run = 1;
    best = Math.max(best, run); prev = d;
  });
  SBC.k = k; SBC.v = best; return best;
}
function supStreak(p, now = Date.now()) {
  const full = new Set(p.sfull || []); if (!full.size) return 0;
  const first = keyDay([...full].sort()[0]);
  let day = startOfDay(now), n = 0;
  if (!full.has(dayKey(day))) day = addDays(day, -1); // today is still in progress
  while (day >= first) { const k = dayKey(day); if (full.has(k)) n++; else if ((p.supps || []).some(s => supDue(s, day))) break; day = addDays(day, -1); }
  return n;
}
const supXP = p => (Array.isArray(p.sfull) ? p.sfull.length : 0) * 10;
const supShared = p => supXP(p) + [7, 30].filter(n => supBest(p) >= n).length * 30; // the partner only gets this number
function supToggle(id, day) {
  const p = S.profile, k = dayKey(day), s = p.supps.find(x => x.id === id); if (!s) return null;
  const list = p.slog[k] || (p.slog[k] = []), i = list.indexOf(id), d = supDose(s), on = i < 0;
  if (!on) { list.splice(i, 1); if (s.stock != null && d) s.stock = Math.round((s.stock + d) * 1000) / 1000; }
  else { list.push(id); if (s.stock != null && d) s.stock = Math.max(0, Math.round((s.stock - d) * 1000) / 1000); }
  if (!list.length) delete p.slog[k];
  const st = supDay(p, day), f = new Set(p.sfull); if (st.full) f.add(k); else f.delete(k); p.sfull = [...f].sort();
  saveProfile();
  return { on, full:st.full };
}
function supSub(s, day) {
  const parts = [], dose = doseTxt(s); if (dose) parts.push(dose);
  if (s.note) parts.push(s.note);
  if (Array.isArray(s.days) && s.days.length && s.days.length < 7) parts.push(WD_ORDER.filter(d => s.days.includes(d)).map(d => WD[d]).join(', '));
  const c = supCourse(s, day);
  if (c) parts.push(c.st === 'on' ? `курс: день ${c.n} из ${s.cd}` : c.st === 'soon' ? `курс с ${dShort(c.a)}` : 'курс завершён');
  const left = supLeft(s);
  if (s.stock != null) parts.push(s.stock <= 0 ? 'запас закончился' : `осталось ${nf(s.stock, 2)} ${s.unit || ''}${left != null ? ` ≈ ${left} ${plural(left, ['день','дня','дней'])}` : ''}`.trim());
  if (s.off) parts.push('на паузе');
  return parts.join(' · ');
}
const supLow = p => (p.supps || []).filter(s => !s.off && s.stock != null && (s.stock <= 0 || (supLeft(s) != null && supLeft(s) <= 7)));

