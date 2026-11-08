/* ================= 2.2 actions ================= */
function supDraft(s) {
  const cf = s && s.cf ? s.cf : null;
  return { name:s ? s.name : '', dose:s && s.dose != null ? String(s.dose) : '', unit:s ? (s.unit || '') : 'г', when:s ? (s.when || 'any') : 'am', days:s && Array.isArray(s.days) ? [...s.days] : [],
    course:!!(s && s.cf && s.cd), cf: cf ? dayKey(cf) : dayKey(Date.now()), cw: s && s.cd ? Math.max(1, Math.round(s.cd / 7)) : 8, stock:s && s.stock != null ? fmtIn(s.stock) : '', note:s ? (s.note || '') : '', off:!!(s && s.off) };
}
function wardPoke() { const svg = $('#sheet-root .mate-l .ch'); if (svg && !RM) { svg.classList.remove('poke'); void svg.getBoundingClientRect(); svg.classList.add('poke'); } }
function chestOpenId(cid) {
  const cs = chestState(), ch = cs.all.find(x => x.id === cid); if (!ch) return;
  S.sheets = S.sheets.filter(x => x.type !== 'chest');
  openSheet({ type:'chest', cid, phase: cs.op[cid] ? 'open' : 'closed', dup:false });
}
Object.assign(A, {
  mate: el => { A.poke(el); setTimeout(() => { if (!S.sheets.length) openSheet({ type:'ward', slot:'all' }); }, RM ? 0 : 420); },
  ward: () => { if (top() && top().type === 'prof') S.sheets = []; openSheet({ type:'ward', slot:'all' }); },
  wardSlot: el => { top().slot = el.dataset.s; render(); },
  wear: el => {
    const id = el.dataset.id, it = ITEM[id]; if (!it) return;
    const coll = collOf(S.profile, S.workouts);
    if (!coll.has(id)) { toast(`Пока не найдено · ${RAR[it.r].n.toLowerCase()} вещь`); buzz(6); sfx('locked'); return; }
    const g = S.profile.gear = gearOf(S.profile, coll);
    if (g[it.s] === id) delete g[it.s]; else g[it.s] = id;
    buzz(10); sfx('equip'); saveProfile(); render(); wardPoke();
  },
  shop: () => openSheet({ type:'shop', sel:null }),
  shopSel: el => { const sh = top(); sh.sel = sh.sel === el.dataset.id ? null : el.dataset.id; buzz(6); render(); },
  shopBuy: () => {
    const sh = top(), it = ITEM[sh.sel]; if (!it || it.r === 'l') return;
    const coll = collOf(S.profile, S.workouts), cost = SHOP_COST[it.r];
    if (coll.has(it.id) || coll.sparks < cost) return;
    S.profile.chest.buy.push({ id:it.id, at:Date.now(), c:cost });
    S.profile.gear = Object.assign(gearOf(S.profile, collOf(S.profile, S.workouts)), { [it.s]:it.id });
    saveProfile(); S.sheets.pop(); buzz([10, 40, 10]); sfx('buy'); toast(`«${it.n}» в гардеробе — уже на напарнике`); render(); wardPoke();
  },
  chestOpenNext: () => { const cs = chestState(); if (cs.closed.length) chestOpenId(cs.closed[0].id); },
  chestOpenFor: el => chestOpenId(el.dataset.id),
  chestOpen: () => {
    const sh = top(); if (!sh || sh.type !== 'chest' || sh.phase !== 'closed') return;
    const cs = chestState(), ch = cs.all.find(x => x.id === sh.cid); if (!ch) return;
    if (!cs.op[ch.id]) {
      const id = rollChest(ch), had = collOf(S.profile, S.workouts).has(id);
      S.profile.chest.op[ch.id] = id; sh.dup = had; saveProfile();
    }
    const it = ITEM[S.profile.chest.op[ch.id]], reveal = () => {
      if (top() !== sh) return;
      sh.phase = 'open'; render(); chestFlash(it.r);
      buzz(it.r === 'l' ? [40, 60, 40, 60, 120] : it.r === 'r' ? [30, 50, 30, 50, 60] : [20, 40, 20]); sfx('open' + it.r);
      if (it.r !== 'c') { const r = $('#sheet-root .reveal .chest'); const b = r ? r.getBoundingClientRect() : { left:innerWidth / 2, top:innerHeight / 3, width:0, height:0 }; confetti(b.left + b.width / 2, b.top + b.height / 2, it.r === 'l' ? 110 : 60); }
    };
    if (RM) { reveal(); return; }
    sh.phase = 'shake'; buzz(12); sfx('shake'); render(); setTimeout(reveal, 1350);
  },
  chestWear: el => {
    const id = el.dataset.id, it = ITEM[id]; if (!it) return;
    S.profile.gear = Object.assign(gearOf(S.profile, collOf(S.profile, S.workouts)), { [it.s]:id });
    saveProfile(); buzz(10); sfx('equip'); toast(`${mateName(charOf(curProf()))} в обновке: «${it.n}»`); render();
  },
  freezeOn: el => {
    const n = +el.dataset.d; if (!(n >= 1 && n <= 14) || !canFreeze(S.profile.freeze)) return;
    const a = startOfDay(Date.now()); S.profile.freeze.push({ from:a, to:addDays(a, n - 1) });
    saveProfile(); buzz([10, 40, 10]); toast(`Заморозка до ${dayMonth(addDays(a, n - 1))}`); render();
  },
  freezeOff: () => { const f = frozenNow(S.profile.freeze); if (!f) return; f.to = addDays(startOfDay(Date.now()), -1); saveProfile(); toast('Заморозка снята. С возвращением!'); render(); },
  /* supplements */
  supTake: el => {
    const r = supToggle(el.dataset.id, +el.dataset.day || startOfDay(Date.now())); if (!r) return;
    if (r.on) buzz(r.full ? [10, 40, 10] : 10); sfx(r.full ? 'supFull' : r.on ? 'sup' : 'unset'); if (r.full) toast('Все добавки по плану · +10 XP');
    S.bubble = null; render();
  },
  supDayShift: el => { const today = startOfDay(Date.now()), cur = Math.min(today, S.supDay || today); S.supDay = Math.max(addDays(today, -6), Math.min(today, addDays(cur, +el.dataset.d))); render(); },
  supNew: () => openSheet({ type:'sup', isNew:true, id:uid(), d:supDraft(null), confirm:false }),
  supQuick: el => { const q = SUP_QUICK[+el.dataset.i]; if (!q) return; const d = supDraft(null); d.name = q[0]; d.dose = q[1]; d.unit = q[2]; d.when = q[3]; openSheet({ type:'sup', isNew:true, id:uid(), d, confirm:false }); },
  supEdit: el => { const s = S.profile.supps.find(x => x.id === el.dataset.id); if (s) openSheet({ type:'sup', isNew:false, id:s.id, d:supDraft(s), confirm:false }); },
  supSet: el => { const sh = top(); sh.d[el.dataset.f] = el.dataset.v; render(); },
  supAllDays: () => { top().d.days = []; render(); },
  supDayT: el => { const d = top().d, v = +el.dataset.v, i = d.days.indexOf(v); if (i >= 0) d.days.splice(i, 1); else d.days.push(v); if (d.days.length === 7) d.days = []; render(); },
  supCourseT: () => { const d = top().d; d.course = !d.course; render(); },
  supOffT: () => { const d = top().d; d.off = !d.off; render(); },
  supSave: () => {
    const sh = top(), d = sh.d, name = (d.name || '').trim();
    if (!name) { toast('Введите название'); const n = $('#sup-name'); if (n) n.focus(); return; }
    const dose = parseNum(d.dose), stock = String(d.stock).trim() === '' ? null : parseNum(d.stock);
    const cf = d.course ? keyDay(d.cf || dayKey(Date.now())) : null;
    const s = { id:sh.id, name:name.slice(0, 40), dose: dose != null ? dose : (String(d.dose).trim() || ''), unit:String(d.unit || '').slice(0, 12), when:d.when || 'any', days:[...d.days].sort(), note:(d.note || '').trim().slice(0, 60) };
    if (d.course && Number.isFinite(cf)) { s.cf = cf; s.cd = Math.max(1, +d.cw || 8) * 7; }
    if (stock != null) s.stock = stock;
    if (d.off) s.off = true;
    const list = S.profile.supps, i = list.findIndex(x => x.id === sh.id);
    if (i >= 0) list[i] = s; else list.push(s);
    // the plan for today may have changed: refresh «full day» for today only, past days stay as they were
    const today = startOfDay(Date.now()), st = supDay(S.profile, today), f = new Set(S.profile.sfull); if (st.full) f.add(dayKey(today)); else f.delete(dayKey(today)); S.profile.sfull = [...f].sort();
    saveProfile(); S.sheets.pop(); buzz(10); toast(i >= 0 ? 'Сохранено' : `«${s.name}» в плане`); render();
  },
  supDel: () => {
    const sh = top(); if (!sh.confirm) { sh.confirm = true; render(); return; }
    S.profile.supps = S.profile.supps.filter(x => x.id !== sh.id);
    Object.keys(S.profile.slog).forEach(k => { const l = S.profile.slog[k].filter(id => id !== sh.id); if (l.length) S.profile.slog[k] = l; else delete S.profile.slog[k]; });
    saveProfile(); S.sheets.pop(); toast('Добавка удалена'); render();
  },
  supOrder: () => { S.supOrder = !S.supOrder; render(); },
  supMove: el => { const l = S.profile.supps, i = +el.dataset.i, j = i + +el.dataset.d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; buzz(6); saveProfile(); render(); },
  /* debug */
  dbgDay: el => { const d = +el.dataset.d; try { localStorage.setItem('podhod-dbg-shift', String(d ? dbgShift() + d : 0)); } catch (e) { /* storage off */ } S.bubble = null; render(); toast(`Сегодня: ${dayMonth(Date.now())}`); },
  dbgWorkout: () => {
    const now = Date.now(), w = { id:uid(), title:'Тест', tpl:null, start:now - 3600000, end:now, exercises:[{ k:uid(), ex:'bench', sets:Array.from({ length:4 }, () => ({ w:60, r:8, done:true })) }, { k:uid(), ex:'squat', sets:Array.from({ length:4 }, () => ({ w:80, r:6, done:true })) }] };
    commitWorkout(w);
  },
  dbgChests: () => { S.profile.chest.st.push(...[1, 2, 3].map(() => 'st-' + uid())); saveProfile(); toast('+3 сундука'); render(); },
  dbgOpenAll: () => { const cs = chestState(); cs.closed.forEach(ch => { S.profile.chest.op[ch.id] = rollChest(ch); }); saveProfile(); toast(`Открыто: ${cs.closed.length}`); render(); },
});
Object.assign(IN, {
  supF: el => { const sh = top(); if (sh && sh.d) sh.d[el.dataset.f] = el.value; },
});

SHEETS.news23 = () => `${sheetHead('Что нового', 'Версия ' + APP_VERSION)}<div class="sheet-body">
  <ul class="pr-list news">
    <li>${icon('sound')}<span><b>Звуки</b> — щелчок подхода, отсчёт 3-2-1 в конце отдыха, фанфары за рекорд, сундуки и голос напарника. Громкость и выключатель — в настройках</span></li>
    <li>${icon('user')}<span><b>Один или с партнёром</b> — без партнёра нет чата и лишних предложений. Поменять можно в любой момент в настройках</span></li>
  </ul>
  <div class="lbl" style="margin-top:16px">Как тренируетесь${modeSeg('setMode')}</div>
</div><footer class="sheet-foot"><button class="btn" data-act="sndDemo">${icon('sound')} Послушать</button><button class="btn btn-primary" data-act="closeSheet">Готово</button></footer>`;
Object.assign(A, {
  setMode: el => {
    const v = el.dataset.v; if (v === 'solo' && (syncCfg() || cloudPartnersN())) { toast('Сначала отключите партнёра в настройках'); return; }
    ensureMeta().mode = v; saveMeta(); if (v === 'solo' && S.view === 'chat') S.view = 'today';
    buzz(8); render(); toast(v === 'pair' ? 'Режим «С партнёром»: подключить можно в настройках' : 'Режим «Один»');
  },
  wlMode: el => { top().mode = el.dataset.v; buzz(6); render(); },
  sndToggle: () => { const m = ensureMeta(), c = sndCfg(); m.snd = Object.assign(c, { on:!c.on }); saveMeta(); render(); if (m.snd.on) sfx('toggle'); },
  sndVol: el => { const m = ensureMeta(); m.snd = Object.assign(sndCfg(), { vol:+el.dataset.v }); saveMeta(); render(); sfx('set'); },
  sndCat: el => { const m = ensureMeta(), c = sndCfg(), k = el.dataset.k; c[k] = !c[k]; m.snd = c; saveMeta(); render(); sfx(k === 'train' ? 'set' : k === 'game' ? 'mate' : 'tap'); },
  sndDemo: () => { const m = ensureMeta(); if (!sndCfg().on) { m.snd = Object.assign(sndCfg(), { on:true }); saveMeta(); render(); } sfx('pr'); setTimeout(() => sfx('openr'), 900); setTimeout(() => sfx('mate'), 2000); },
});
