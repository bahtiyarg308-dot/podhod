/* ================= inputs ================= */
const IN = {
  set: el => {
    const c = ctx(el); if (!c) return; const { w, x, s, ex } = c, f = el.dataset.f;
    let v = parseNum(el.value); if (v != null && f === 't' && ex.kind === 'cardio') v = Math.round(v * 60); if (v != null && f === 'r') v = Math.round(v);
    if (v == null) delete s[f]; else s[f] = v;
    changed(); liveStats(w);
    if (f === 'w' && ex.equip === 'barbell') { const pl = document.getElementById('pl-' + x.k); if (pl) pl.innerHTML = platesHTML(v ?? topWeight(w, x, ex.kind), S.profile.bar); }
  },
  title: el => { const w = curW(); if (w) { w.title = el.value; changed(); } },
  exNote: el => { const w = curW(), x = w && w.exercises[+el.dataset.x]; if (x) { x.note = el.value; changed(); } },
  pickQ: el => { const sh = top(); sh.q = el.value; sh.creating = false; const l = $('#pick-list'); if (l) { const tmp = document.createElement('div'); tmp.innerHTML = pickList(sh); morphChildren(l, tmp); l.scrollTop = 0; } },
  finNote: el => { top().note = el.value; },
  tplName: el => { top().draft.name = el.value; },
  tplReps: el => { const v = parseNum(el.value); top().draft.items[+el.dataset.i].reps = v == null ? null : Math.round(v); },
  npName: el => { top().newName = el.value; },
  syncToken: el => { top().token = el.value; },
  syncCode: el => { top().code = el.value; },
  chatText: el => { S.chatDraft = el.value; el.style.height = 'auto'; el.style.height = Math.min(120, el.scrollHeight) + 'px'; },
  wlName: el => { top().name = el.value; },
  edStart: el => { const w = S.editing; if (!w) return; const ms = new Date(el.value).getTime(); if (Number.isFinite(ms)) { const dur = w.end - w.start; w.start = ms; w.end = ms + dur; } },
  edDur: el => { const w = S.editing; if (!w) return; const m = parseNum(el.value); if (m > 0) w.end = w.start + Math.round(m) * 60000; },
};
const CHG = {
  progEx: el => { S.prog.ex = el.value; S.prog.metric = null; render(); },
  phAdd: async el => {
    const file = el.files && el.files[0]; el.value = ''; if (!file) return;
    if (!KV.db) { toast('В этом браузере фото сохранить не получится'); return; }
    try {
      toast('Сохраняю фото…');
      const blob = await shrinkImage(file, 1440, .82), id = uid(), dv = ($('#ph-date') || {}).value;
      const d = dv ? new Date(dv + 'T12:00').getTime() : Date.now();
      await KV.set('pb:' + id, blob);
      const pid = S.pid, list = (S.photos && S.photos.pid === pid) ? S.photos.list : ((await KV.get('ph:' + pid)) || []);
      list.push({ id, d }); list.sort((a, b) => a.d - b.d); await KV.set('ph:' + pid, list);
      PHURL.set(id, URL.createObjectURL(blob));
      S.photos = { pid, list, cmp:(S.photos && S.photos.pid === pid && S.photos.cmp) || [] }; buzz(10); toast('Фото добавлено'); render();
    } catch (e) { toast('Не получилось добавить фото. Попробуйте другое изображение'); }
  },
  cpName: el => { const p = ensureMeta().profiles.find(x => x.id === S.pid); if (!p) return; p.name = el.value.trim().slice(0, 24); saveMeta(); S.bubble = null; render(); schedulePush(); },
  imp: el => {
    const file = el.files && el.files[0]; el.value = ''; if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      let d; try { d = JSON.parse(rd.result); } catch (e) { toast('Не получилось прочитать файл: это не резервная копия'); return; }
      if (!d || d.app !== 'podhod') { toast('Это не файл резервной копии «Подхода»'); return; }
      flush(); syncCur(); let n = 0, np = 0;
      if (d.version === 2 && d.data && d.meta && Array.isArray(d.meta.profiles)) {
        const meta = ensureMeta();
        d.meta.profiles.forEach(p => {
          if (!p || !p.id || !d.data[p.id]) return;
          if (!meta.profiles.some(x => x.id === p.id)) { meta.profiles.push({ id:p.id, name:p.name || '', color:COLORS[p.color] ? p.color : nextColor() }); np++; }
          n += mergeInto(p.id, d.data[p.id]);
        });
        saveMeta();
      } else if (Array.isArray(d.workouts)) {
        n += mergeInto(S.pid, d);
      } else { toast('В файле нет тренировок'); return; }
      loadProfileData(); S.sheets = []; S.bubble = null;
      toast(`Восстановлено: ${n} ${plural(n, ['тренировка','тренировки','тренировок'])}${np ? `, профилей: ${np}` : ''}`); render();
    };
    rd.readAsText(file);
  },
};

