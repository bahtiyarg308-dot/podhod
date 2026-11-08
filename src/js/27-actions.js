/* ================= actions ================= */
const A = {
  nav: el => go(el.dataset.v),
  settings: () => openSheet({ type:'set' }),
  help: () => { S.sheets = []; openSheet({ type:'help' }); },
  awards: () => openSheet({ type:'awards' }),
  closeSheet: () => closeSheet(),
  syncSetup: () => { S.sheets = []; openSheet({ type:'sync', step:'' }); },
  syncStep: el => { const sh = top(); sh.step = el.dataset.step; sh.err = ''; sh.busy = false; render(); },
  syncCreate: async () => {
    const sh = top(), token = (sh.token || '').trim();
    if (!/^(ghp_|github_pat_|gho_)/.test(token) || token.length < 20) { sh.err = 'Это не похоже на ключ GitHub. Он начинается с ghp_ — скопируйте его целиком.'; render(); return; }
    sh.busy = true; sh.err = ''; render();
    try {
      ensureSids(); flush(); syncCur();
      const files = { 'README.md': { content:'Данные синхронизации приложения «Подход». Не удаляйте этот gist — в нём общие тренировки.' } }, hs = {};
      profiles().forEach(p => { const pl = payload(p.id); hs[p.id] = hash(JSON.stringify(pl)); pl.updated = Date.now(); files[`m-${p.sid}.json`] = { content:JSON.stringify(pl) }; });
      const r = await fetch(`${GH}/gists`, { method:'POST', headers:ghHeaders(token, true), body:JSON.stringify({ description:'Подход — общие тренировки', public:false, files }) });
      if (r.status === 401) throw 'Ключ не подошёл. Проверьте, что скопировали его полностью.';
      if (r.status === 403 || r.status === 404) throw 'У ключа нет доступа к gist. Создайте ключ заново и оставьте галочку «gist».';
      if (!r.ok) throw `GitHub ответил ошибкой ${r.status}. Попробуйте ещё раз.`;
      const j = await r.json();
      const meta = ensureMeta(); meta.sync = { gist:j.id, token, on:true, shareBody:false }; meta.syncHash = hs; saveMeta();
      S.sync.etag = null; S.sync.files = new Set(profiles().map(p => p.sid)); setSync('ok'); S.sync.last = Date.now();
      S.sheets = []; openSheet({ type:'invite' }); toast('Синхронизация включена'); buzz([10, 40, 10]);
    } catch (e) { sh.busy = false; sh.err = typeof e === 'string' ? e : 'Нет связи с GitHub. Проверьте интернет и попробуйте ещё раз.'; render(); }
  },
  syncJoin: async () => {
    const sh = top(), j = parseCode(sh.code || '');
    if (!j && /ghp_|github_pat_|gho_/.test(sh.code || '')) { sh.err = 'Это ключ GitHub, а не код. Попросите партнёра открыть Настройки → Синхронизация → «Код для партнёра» и прислать код, который начинается с PDH1-.'; render(); return; }
    if (!j) { sh.err = 'Код не распознан. Скопируйте его целиком — он начинается с PDH1-.'; render(); return; }
    sh.busy = true; sh.err = ''; render();
    try {
      const r = await fetch(`${GH}/gists/${j.g}`, { headers:ghHeaders(j.t), cache:'no-store' });
      if (r.status === 401) throw 'Ключ в коде больше не работает. Попросите партнёра прислать новый код.';
      if (r.status === 404) throw 'Общее пространство не найдено. Попросите партнёра прислать код заново.';
      if (!r.ok) throw `GitHub ответил ошибкой ${r.status}.`;
      const files = await readMembers((await r.json()).files);
      const meta = ensureMeta(); meta.sync = { gist:j.g, token:j.t, on:true, shareBody:false }; meta.syncHash = {}; saveMeta();
      S.sync.etag = null; S.sync.files = null;
      const mine = new Set(profiles().map(p => p.sid).filter(Boolean));
      const members = Object.values(files).filter(m => !mine.has(m.id));
      S.sheets = [];
      if (members.length) openSheet({ type:'sync', step:'pick', members });
      else { ensureSids(); toast('Подключено!'); syncNow(true); }
    } catch (e) { sh.busy = false; sh.err = typeof e === 'string' ? e : 'Нет связи с GitHub. Проверьте интернет и попробуйте ещё раз.'; render(); }
  },
  syncPickAsk: el => { const sh = top(); sh.sid = el.dataset.sid; sh.step = 'confirm'; render(); },
  syncPickMe: el => {
    const sh = top(), m = (sh.members || []).find(x => x.id === el.dataset.sid); if (!m) return;
    const p = ensureMeta().profiles.find(x => x.id === S.pid); if (!p) return;
    p.sid = m.id; if (!p.name) p.name = m.name; if (COLORS[m.color]) p.color = m.color;
    // the old phone of the same person is expected to write here too — don't warn about it
    const c = S.meta.sync; if (c) c.trust = [...new Set([...(c.trust || []), 'n:' + lc(m.name), ...(m.dev ? ['d:' + m.dev] : [])])].slice(-20);
    saveMeta();
    flush(); syncCur(); mergeMember(S.pid, m); KV.set('p:' + S.pid, S.store[S.pid]); loadProfileData(); applyAccent();
    S.sheets = []; S.bubble = null; toast('Готово! Ваши тренировки перенесены на этот телефон'); render(); syncNow(true);
  },
  syncPickNew: () => { S.sheets = []; ensureSids(); toast('Подключено! Теперь вы видите тренировки друг друга'); buzz([10, 40, 10]); render(); syncNow(true); },
  syncSplit: el => {
    const c = syncCfg(), p = c && ensureMeta().profiles.find(x => x.id === el.dataset.id); if (!p || !p.sid) return;
    // this phone gets its own member file; the old shared file stays with the other phone (we delete it only if we wrote it last)
    const oldSid = p.sid; c.left = [...new Set([...(c.left || []), p.sid])]; p.sid = uid() + uid().slice(-4);
    const mv = myChat(oldSid).filter(x => !x.d || x.d === devId()); if (mv.length) { S.chatMine[p.sid] = mv.map(x => ({ ...x, ok:false })); S.chatMine[oldSid] = myChat(oldSid).filter(x => !mv.includes(x)); KV.set('chat-mine', S.chatMine); }
    if (c.clash) { delete c.clash[p.id]; if (!Object.keys(c.clash).length) c.clash = undefined; }
    if (S.meta.syncHash) delete S.meta.syncHash[p.id];
    saveMeta(); S.sync.etag = null; S.sync.files = null;
    toast('Готово! Теперь у вас отдельный профиль — партнёр появится через минуту'); buzz([10, 40, 10]); render(); syncNow(true);
  },
  syncTrust: el => {
    const c = syncCfg(), x = c && c.clash && c.clash[el.dataset.id]; if (!x) return;
    c.trust = [...new Set([...(c.trust || []), x.key])].slice(-20);
    delete c.clash[el.dataset.id]; if (!Object.keys(c.clash).length) c.clash = undefined;
    saveMeta(); S.sync.etag = null; render(); syncNow(true);
  },
  chatSend: () => {
    const t = (S.chatDraft || '').trim(), p = curProf(); if (!t) return;
    if (!syncCfg() && !cloudPartnersN()) { toast('Сначала подключите партнёра'); return; }
    ensureSids(); myChat(p.sid).push({ id:uid(), t:Date.now(), x:t.slice(0, 1000), d:devId() }); KV.set('chat-mine', S.chatMine);
    S.chatDraft = ''; const el = $('#chat-in'); if (el) { el.value = ''; el.style.height = ''; }
    S.chatScroll = true; buzz(8); sfx('send'); render(); clearTimeout(SY.pushT); SY.pushT = setTimeout(() => syncNow(), 300); cloudSoon(300);
  },
  openChat: () => { S.sheets = []; go('chat'); },
  applyHint: el => {
    const w = curW(), xi = +el.dataset.x, x = w && w.exercises[xi]; if (!x) return;
    const ex = exById(x.ex), h = hintFor(x, ex, lastEntry(x.ex, w.id, w.start)); if (!h) return;
    let n = 0;
    x.sets.forEach(s => { if (s.warm || s.done) return; ['w', 'r', 't'].forEach(f => { if (h[f] != null && (s[f] == null || s[f] === '')) { s[f] = h[f]; n++; } }); });
    if (!n) { toast('Свободных подходов нет — добавьте подход'); return; }
    buzz(8); changed(); render(); toast('Подставлено: ' + h.label);
  },
  wlChar: el => { top().char = el.dataset.c; buzz(6); render(); },
  cpChar: el => { const p = ensureMeta().profiles.find(x => x.id === S.pid); if (!p) return; p.char = el.dataset.c; saveMeta(); buzz(8); render(); schedulePush(); },
  syncInvite: () => { S.sheets = []; openSheet({ type:'invite' }); },
  copyCode: () => {
    const code = inviteCode(), sel = () => { const t = $('#inv-code'); if (t) { t.focus(); t.select(); } };
    try { navigator.clipboard.writeText(code).then(() => toast('Код скопирован'), () => { sel(); toast('Выделите код и скопируйте вручную'); }); } catch (e) { sel(); toast('Выделите код и скопируйте вручную'); }
  },
  shareCode: async () => { try { await navigator.share({ title:'Подход', text:`Код для общих тренировок в «Подходе»:\n${inviteCode()}\n\nОткрой «Подход» → Настройки → Синхронизация → Настроить → «У меня есть код».` }); } catch (e) { /* cancelled */ } },
  syncRefresh: () => { S.sync.etag = null; syncNow(true); },
  syncOff: () => {
    if (!S.syncOffConfirm) { S.syncOffConfirm = true; render(); setTimeout(() => { if (S.syncOffConfirm) { S.syncOffConfirm = false; render(); } }, 4000); return; }
    S.syncOffConfirm = false; S.meta.sync = null; S.remote = Object.assign({}, S.cremote || {}); S.rd = {}; rebuildCustom(); KV.del('remote'); S.chatAll = []; KV.del('chat-all'); saveMeta(); setSync('off'); toast('Синхронизация отключена'); render();
  },
  toggleShareBody: () => { const m = ensureMeta(), v = !shareBodyOn(); m.shareBody = v; if (m.sync) m.sync.shareBody = v; saveMeta(); buzz(8); render(); schedulePush(); },
  friend: el => openSheet({ type:'friend', sid:el.dataset.sid }),
  rwd: el => openSheet({ type:'wd', id:el.dataset.id, sid:el.dataset.sid }),
  kudo: el => {
    const key = el.dataset.sid + '/' + el.dataset.id, k = el.dataset.k;
    if (S.profile.kudos[key] === k) delete S.profile.kudos[key];
    else { S.profile.kudos[key] = k; buzz([8, 30, 8]); sfx('like'); }
    saveProfile(); render();
  },
  hidePair: () => { ensureMeta().pairHide = Date.now() + 30 * DAY; saveMeta(); render(); },
  poke: el => {
    S.poke = (S.poke + 1) % 2 || 2; buzz([10, 30, 10]); sfx('mate');
    const m = moodNow(), lines = ['Готов работать.', 'Разминка 5 минут — и в бой.', 'Вода, сон, белок.', 'Техника важнее веса.', 'Сегодня хороший день для рекорда.', 'Без спешки: подход за подходом.'];
    S.bubble = { mood:bubbleKey(m), pid:S.pid, n:m.n, text:pick(lines) }; render();
    const svg = el.querySelector('.ch'); if (svg) { svg.classList.remove('poke'); void svg.getBoundingClientRect(); svg.classList.add('poke'); }
  },
  profiles: () => { S.sheets = []; openSheet({ type:'prof', adding:false, newName:'', newColor:nextColor(), confirm:false }); },
  switchProf: el => {
    const id = el.dataset.id; if (id === S.pid) { if (top() && top().type === 'prof') closeSheet(); return; }
    const p = profiles().find(x => x.id === id); S.sheets = []; switchProfile(id); toast(`Профиль: ${pname(p)}`);
  },
  profAddStart: () => { const sh = top(); sh.adding = true; render(); const n = $('#np-name'); if (n) n.focus(); },
  profAddCancel: () => { top().adding = false; render(); },
  npColor: el => { top().newColor = el.dataset.c; render(); },
  profCreate: () => {
    const sh = top(), name = (sh.newName || '').trim();
    if (!name) { toast('Введите имя для профиля'); const n = $('#np-name'); if (n) n.focus(); return; }
    const id = uid(); ensureMeta().profiles.push({ id, name, color:sh.newColor || nextColor() }); S.store[id] = {}; saveMeta();
    S.sheets = []; switchProfile(id); toast(`Профиль «${name}» создан`);
  },
  cpColor: el => { const p = ensureMeta().profiles.find(x => x.id === S.pid); if (!p) return; p.color = el.dataset.c; saveMeta(); applyAccent(); buzz(8); render(); schedulePush(); },
  profDel: () => {
    const sh = top(); if (!sh.confirm) { sh.confirm = true; render(); return; }
    const pid = S.pid; if (pid === 'main') return;
    const p = curProf(); dirty = false; KV.del('p:' + pid); delete S.store[pid];
    const c = syncCfg(); if (c && p.sid) fetch(`${GH}/gists/${c.gist}`, { method:'PATCH', headers:ghHeaders(c.token, true), body:JSON.stringify({ files:{ [`m-${p.sid}.json`]: null } }) }).catch(() => {});
    S.meta.profiles = S.meta.profiles.filter(x => x.id !== pid); saveMeta();
    S.sheets = []; S.pid = 'main'; S.meta.cur = 'main'; saveMeta(); loadProfileData(); applyAccent(); render(); toast(`Профиль «${pname(p)}» удалён`);
  },
  wlColor: el => { top().color = el.dataset.c; applyAccent(el.dataset.c); render(); },
  welcomeSave: () => {
    const sh = top(), name = (sh.name || '').trim(), keepAcc = S.meta && S.meta.accs, keepDev = S.meta && S.meta.dev;
    S.meta = { profiles:[{ id:'main', name, color:sh.color || 'lime', char:sh.char || 'cat' }], cur:'main', theme:'auto', mode:sh.mode === 'pair' ? 'pair' : 'solo', v2seen:true, v22seen:true, v23seen:true, v24seen:true, v25seen:true, v26seen:true, v27seen:true, v271seen:true, v28seen:true, chatSeen:Date.now() }; if (keepAcc) { S.meta.accs = keepAcc; S.meta.dev = keepDev; saveMeta(); cloudSoon(300); } saveMeta(); applyAccent();
    S.sheets = []; S.bubble = null; render(); buzz([10, 40, 10]); toast(name ? `Привет, ${name}! Поехали` : 'Поехали!');
  },
  startEmpty: () => startWorkout(null),
  startTpl: el => { const t = S.profile.templates.find(t => t.id === el.dataset.id); if (t) startWorkout(t); },
  addEx: () => openSheet({ type:'pick', mode:'add', q:'', m:'all', sel:[] }),
  pickM: el => { top().m = el.dataset.m; render(); },
  pickToggle: el => {
    const sh = top(), id = el.dataset.id;
    if (sh.mode === 'replace') { replaceEx(sh.x, id); S.sheets.pop(); render(); return; }
    const i = sh.sel.indexOf(id); if (i >= 0) sh.sel.splice(i, 1); else { sh.sel.push(id); buzz(6); } render();
  },
  pickConfirm: () => {
    const sh = top(); if (!sh.sel.length) return;
    if (sh.mode === 'tpl') { const t = S.sheets[S.sheets.length - 2]; sh.sel.forEach(id => { const k = exById(id).kind; t.draft.items.push({ ex:id, sets:3, reps: k === 'time' ? 60 : k === 'cardio' ? 30 : 10 }); }); S.sheets.pop(); render(); return; }
    const w = curW(); const n = w.exercises.length; sh.sel.forEach(id => w.exercises.push(newEx(id, w))); S.sheets.pop(); changed(); render();
    const cards = $$('.xcard'); if (cards[n]) setTimeout(() => cards[n].scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block:'start' }), 260);
  },
  pickCreateStart: () => { top().creating = true; render(); const n = $('#cr-name'); if (n) n.focus(); },
  pickCreate: () => {
    const sh = top(), name = ($('#cr-name').value || '').trim();
    if (!name) { toast('Введите название упражнения'); return; }
    const ex = { id:'c-' + uid(), name, muscle:$('#cr-m').value, equip:$('#cr-e').value, kind:$('#cr-k').value };
    S.profile.custom.push(ex); saveProfile(); sh.creating = false; sh.q = '';
    if (sh.mode === 'replace') { replaceEx(sh.x, ex.id); S.sheets.pop(); render(); return; }
    sh.sel.push(ex.id); render(); toast('Упражнение «' + name + '» создано');
  },
  setDone: el => {
    unlockAudio();
    const c = ctx(el); if (!c) return; const { w, x, s, xi, si, ex } = c;
    if (s.done) { s.done = false; if (S.rirAsk === x.k + ':' + si) S.rirAsk = null; sfx('unset'); changed(); render(); return; }
    const gh = ghost(w, x, si, ex.kind);
    KINDS[ex.kind].f.forEach(([f]) => { if (s[f] == null && gh[f] != null) s[f] = gh[f]; });
    if (!valid(s, ex.kind)) { toast(ex.kind === 'cardio' ? 'Введите дистанцию или время' : ex.kind === 'time' ? 'Введите время в секундах' : 'Введите количество повторов'); const f = KINDS[ex.kind].f[1][0]; const inp = document.getElementById(`s-${x.k}-${si}-${f}`); if (inp) inp.focus(); return; }
    const before = livePRs(w); s.done = true; const after = livePRs(w), key = xi + ':' + si;
    S.justKey = x.k + ':' + si;
    S.rirAsk = !s.warm && (ex.kind === 'wr' || ex.kind === 'bw') && S.profile.rirAsk !== false ? x.k + ':' + si : null;
    const isNewPr = after.has(key) && !before.has(key);
    if (isNewPr) {
      toast(`Новый рекорд · ${ex.name} · ${setLong(s, ex.kind)}`, 'pr'); S.bumpPr = true; buzz([20, 50, 30]); sfx('pr');
      const r = el.getBoundingClientRect(); setTimeout(() => confetti(r.left + r.width / 2, r.top + r.height / 2, 60), 120);
    } else { buzz(12); sfx('set'); }
    if (isLive(w)) { const nx = !s.warm && w.exercises[xi + 1] && x.ss && w.exercises[xi + 1].ss === x.ss ? xi + 1 : null; if (nx != null) ssGo(w, nx); else { const r = restFor(x.ex); startRest(s.warm ? Math.min(60, r) : r); } }
    changed(); render(); S.bumpPr = false;
  },
  setWarm: el => { const c = ctx(el); if (!c) return; c.s.warm = !c.s.warm; buzz(6); sfx('tick'); changed(); render(); },
  setDel: el => {
    const c = ctx(el); if (!c) return; const row = el.closest('.set-row');
    if (row) { if (row.classList.contains('leaving')) return; row.classList.add('leaving'); }
    setTimeout(() => { const i = c.x.sets.indexOf(c.s); if (i >= 0) c.x.sets.splice(i, 1); changed(); render(); }, RM ? 0 : 180);
  },
  setAdd: el => {
    const w = curW(), x = w && w.exercises[+el.dataset.x]; if (!x) return;
    const src = [...x.sets].reverse().find(s => !s.warm && (s.w != null || s.r != null || s.t != null || s.d != null));
    const n = {}; if (src) ['w', 'r', 't', 'd'].forEach(f => { if (src[f] != null) n[f] = src[f]; });
    x.sets.push(n); buzz(6); changed(); render();
  },
  copyPrev: el => {
    const c = ctx(el); if (!c) return; const p = prevSet(lastEntry(c.x.ex, c.w.id, c.w.start), c.x, c.si); if (!p) return;
    ['w', 'r', 't', 'd'].forEach(f => { if (p[f] != null) c.s[f] = p[f]; else delete c.s[f]; }); buzz(6); changed(); render();
  },
  exMenu: el => openSheet({ type:'xm', x:+el.dataset.x }),
  exNoteOpen: () => { const sh = top(), x = curW().exercises[sh.x]; if (x.note == null) x.note = ''; S.sheets.pop(); changed(); render(); const t = document.getElementById('xn-' + x.k); if (t) { t.focus(); t.scrollIntoView({ block:'center' }); } },
  exReplace: () => { const sh = top(); S.sheets.pop(); openSheet({ type:'pick', mode:'replace', x:sh.x, q:'', m:'all', sel:[] }); },
  exMove: el => { const sh = top(), w = curW(), i = sh.x, j = i + +el.dataset.d; if (j < 0 || j >= w.exercises.length) return; [w.exercises[i], w.exercises[j]] = [w.exercises[j], w.exercises[i]]; ssClean(w); S.sheets.pop(); changed(); render(); },
  exRemove: () => { const sh = top(); if (!sh.confirm) { sh.confirm = true; render(); return; } curW().exercises.splice(sh.x, 1); ssClean(curW()); S.sheets.pop(); changed(); render(); },
  finishOpen: () => openSheet({ type:'fin', feel:null, note:'' }),
  finFeel: el => { const sh = top(), v = +el.dataset.v; sh.feel = sh.feel === v ? null : v; render(); },
  finishSave: () => {
    const sh = top(); const w = finalize(clone(S.active)); w.end = Date.now();
    const note = (sh.note || '').trim(); if (note) w.note = note; if (sh.feel) w.feel = sh.feel;
    if (!w.exercises.length) { toast('Нет ни одного заполненного подхода'); return; }
    S.active = null; S.rest = { end:0, total:0, alerted:false }; keepAwake(false);
    commitWorkout(w);
  },
  doneDetail: () => { const id = top().id; S.sheets = []; openSheet({ type:'wd', id }); },
  discardOpen: () => openSheet({ type:'disc' }),
  discardConfirm: () => { S.active = null; S.rest = { end:0, total:0, alerted:false }; saveActive(true); keepAwake(false); S.sheets = []; toast('Тренировка отменена'); render(); schedulePush(); },
  restAdj: el => { const d = +el.dataset.d * 1000; S.rest.end = Math.max(Date.now() + 1000, S.rest.end + d); S.rest.total = Math.max(S.rest.total + d, S.rest.end - Date.now()); buzz(6); renderRest(); },
  restSkip: () => { S.rest = { end:0, total:0, alerted:false }; renderRest(); },
  openWorkout: el => openSheet({ type:'wd', id:el.dataset.id }),
  wRepeat: () => { const w = S.workouts.find(x => x.id === top().id); if (w) startWorkout(null, w); },
  wAsTpl: () => {
    const w = S.workouts.find(x => x.id === top().id); if (!w) return;
    const items = w.exercises.map(x => { const k = exById(x.ex).kind, ws = x.sets.filter(s => !s.warm && valid(s, k)); const vals = ws.map(s => k === 'time' ? num(s.t) : k === 'cardio' ? Math.round((num(s.t) || 0) / 60) : num(s.r)); const mode = [...vals].sort((a, b) => vals.filter(v => v === b).length - vals.filter(v => v === a).length)[0]; return { ex:x.ex, sets:Math.max(1, ws.length), reps:mode ?? null, ...(x.ss ? { ss:x.ss } : {}) }; });
    const name = w.title || 'Программа ' + (S.profile.templates.length + 1);
    S.profile.templates.push({ id:uid(), name, items }); saveProfile(); toast(`Программа «${name}» сохранена`); render();
  },
  wEdit: () => { const w = S.workouts.find(x => x.id === top().id); if (!w) return; S.editing = clone(w); S.sheets = []; S.view = 'editor'; render(); window.scrollTo(0, 0); },
  wDel: () => { const sh = top(); if (!sh.confirm) { sh.confirm = true; render(); return; } deleteWorkout(sh.id); S.sheets = []; toast('Тренировка удалена'); render(); },
  addPast: () => { const end = Math.floor(Date.now() / 60000) * 60000; S.editing = { id:uid(), title:'', tpl:null, start:end - 3600000, end, exercises:[], isNew:true }; S.view = 'editor'; render(); window.scrollTo(0, 0); },
  editSave: () => {
    const w = finalize(clone(S.editing)); if (!w.exercises.length) { toast('Добавьте хотя бы один заполненный подход'); return; }
    if (!(w.end > w.start)) w.end = w.start + 3600000;
    const isNew = S.editing.isNew; if (isNew) w.ad = Date.now(); saveWorkout(w); S.editing = null; S.view = 'log';
    try { history.replaceState(null, '', '#log'); } catch (e) { /* hash blocked */ }
    toast(isNew ? 'Тренировка добавлена в журнал' : 'Изменения сохранены'); render(); window.scrollTo(0, 0);
  },
  editCancel: () => { S.editing = null; go('log'); },
  tplNew: () => openSheet({ type:'tpl', draft:{ id:uid(), name:'', items:[] }, isNew:true }),
  tplEdit: el => { const t = S.profile.templates.find(t => t.id === el.dataset.id); if (t) openSheet({ type:'tpl', draft:clone(t), isNew:false }); },
  tplSets: el => { const it = top().draft.items[+el.dataset.i]; it.sets = Math.max(1, Math.min(12, (it.sets || 3) + +el.dataset.d)); buzz(5); render(); },
  tplItemDel: el => { top().draft.items.splice(+el.dataset.i, 1); render(); },
  tplAddEx: () => openSheet({ type:'pick', mode:'tpl', q:'', m:'all', sel:[] }),
  tplSave: () => {
    const sh = top(), d = clone(sh.draft); d.name = (d.name || '').trim() || 'Программа';
    if (!d.items.length) { toast('Добавьте хотя бы одно упражнение'); return; }
    const i = S.profile.templates.findIndex(t => t.id === d.id); if (i >= 0) S.profile.templates[i] = d; else S.profile.templates.push(d);
    saveProfile(); S.sheets.pop(); toast('Программа сохранена'); render();
  },
  tplDel: () => { const sh = top(); if (!sh.confirm) { sh.confirm = true; render(); return; } S.profile.templates = S.profile.templates.filter(t => t.id !== sh.draft.id); saveProfile(); S.sheets.pop(); toast('Программа удалена'); render(); },
  setGoal: el => { S.profile.goal = +el.dataset.v; S.bubble = null; saveProfile(); buzz(6); render(); },
  setRest: el => { S.profile.rest = +el.dataset.v; saveProfile(); render(); },
  toggleSound: () => { S.profile.sound = !S.profile.sound; saveProfile(); unlockAudio(); buzz(8); render(); },
  setBar: el => { S.profile.bar = +el.dataset.v; saveProfile(); render(); },
  setTheme: el => { ensureMeta().theme = el.dataset.v; saveMeta(); applyTheme(); render(); },
  setNoirAcc: el => { ensureMeta().noirAcc = NOIR_ACC[el.dataset.c] ? el.dataset.c : 'bone'; saveMeta(); applyAccent(); render(); },
  setLook: el => { ensureMeta().look = el.dataset.v === 'color' ? 'color' : 'noir'; saveMeta(); applyTheme(); applyAccent(); render(); },
  customDel: el => { const id = el.dataset.id; if (D.usage[id]) { toast('Это упражнение уже есть в журнале, поэтому его нельзя удалить'); return; } S.profile.custom = S.profile.custom.filter(e => e.id !== id); saveProfile(); render(); },
  backupShare: () => doBackup(true),
  backupFile: () => doBackup(false),
  snoozeBackup: () => { ensureMeta().backupSnooze = Date.now() + 3 * DAY; saveMeta(); render(); },
  hideInstall: () => { ensureMeta().installHide = Date.now() + 14 * DAY; saveMeta(); render(); },
  install: async () => { const e = S.installEvt; if (!e) { A.help(); return; } try { e.prompt(); const r = await e.userChoice; if (r && r.outcome === 'accepted') S.installEvt = null; } catch (err) { /* prompt unavailable */ } render(); },
  persist: async () => { await requestPersist(); toast(S.persisted ? 'Готово: браузер не будет очищать данные' : 'Браузер не разрешил. Установите приложение на главный экран — после этого попробуйте ещё раз.'); render(); },
  applyUpdate: () => { flush(); const w = S.updateReady; if (w) w.postMessage('skip'); else location.reload(); },
  exportCsv: () => {
    const c = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const dn = v => v == null ? '' : String(v).replace('.', ',');
    const rows = [['Дата', 'Время', 'Тренировка', 'Упражнение', 'Группа', 'Подход', 'Разминка', 'Вес, кг', 'Повторы', 'Время, сек', 'Дистанция, км']];
    [...S.workouts].reverse().forEach(w => w.exercises.forEach(x => { const ex = exById(x.ex); x.sets.forEach((s, i) => rows.push([dayKey(w.start), hm(w.start), w.title || 'Тренировка', ex.name, MUSCLES[ex.muscle] || '', i + 1, s.warm ? 'да' : '', dn(s.w), dn(s.r), dn(s.t), dn(s.d)])); }));
    saveFile(`podhod-${pname(curProf())}-${dayKey(Date.now())}.csv`, '﻿' + rows.map(r => r.map(c).join(';')).join('\n'), 'text/csv', !!navigator.canShare);
  },
  bodyAdd: () => {
    const v = parseNum($('#b-w').value), dv = $('#b-date').value;
    if (!(v >= 20 && v <= 400)) { toast('Введите вес в килограммах, например 58,5'); $('#b-w').focus(); return; }
    const d = dv ? new Date(dv + 'T08:00').getTime() : Date.now(); if (!Number.isFinite(d)) { toast('Проверьте дату'); return; }
    const k = dayKey(d); S.profile.body = S.profile.body.filter(e => dayKey(e.d) !== k); S.profile.body.push({ id:uid(), d, w:Math.round(v * 10) / 10 });
    $('#b-w').value = ''; saveProfile(); buzz(10); toast(`Записано: ${nf(v, 1)} кг`); render();
  },
  bodyDel: el => { S.profile.body = S.profile.body.filter(e => e.id !== el.dataset.id); saveProfile(); render(); },
  bodyTab: el => { S.bodyTab = el.dataset.t; buzz(6); render(); },
  measKey: el => { S.measKey = el.dataset.k; render(); },
  measAdd: () => {
    const dv = ($('#m-date') || {}).value, d = dv ? new Date(dv + 'T08:00').getTime() : Date.now();
    if (!Number.isFinite(d)) { toast('Проверьте дату'); return; }
    const e = { id:uid(), d }; let n = 0, bad = '';
    MEAS.forEach(([k, l]) => { const el = $('#m-' + k), v = el ? parseNum(el.value) : null; if (v == null) return; if (v < 10 || v > 300) { bad = bad || l; return; } e[k] = Math.round(v * 10) / 10; n++; });
    if (bad) { toast(`Проверьте поле «${bad}»: нужны сантиметры, например 72,5`); return; }
    if (!n) { toast('Заполните хотя бы один замер'); const f = $('#m-waist'); if (f) f.focus(); return; }
    const k = dayKey(d), old = S.profile.meas.find(x => dayKey(x.d) === k);
    if (old) Object.assign(old, e, { id:old.id }); else S.profile.meas.push(e);
    MEAS.forEach(([k2]) => { const el = $('#m-' + k2); if (el) el.value = ''; });
    saveProfile(); buzz(10); toast('Замеры записаны'); render();
  },
  measDel: el => { S.profile.meas = S.profile.meas.filter(e => e.id !== el.dataset.id); saveProfile(); render(); },
  phOpen: el => openSheet({ type:'ph', id:el.dataset.id, confirm:false }),
  phCmp: el => { if (!S.photos) return; S.photos.cmp[+el.dataset.i] = el.dataset.id; S.sheets = []; buzz(8); render(); },
  phDel: async el => {
    const sh = top(); if (!sh.confirm) { sh.confirm = true; render(); return; }
    const id = el.dataset.id, P = S.photos; if (!P) return;
    P.list = P.list.filter(p => p.id !== id); P.cmp = P.cmp.map(x => x === id ? null : x);
    await KV.set('ph:' + P.pid, P.list); KV.del('pb:' + id);
    const u = PHURL.get(id); if (u) { URL.revokeObjectURL(u); PHURL.delete(id); }
    S.sheets = []; toast('Фото удалено'); render();
  },
  warmup: el => {
    const w = curW(), xi = +el.dataset.x, x = w && w.exercises[xi]; if (!x) return;
    const ex = exById(x.ex), W = topWeight(w, x, ex.kind);
    if (!(W > 0)) { toast('Сначала введите рабочий вес'); return; }
    const ws = warmupSets(W, ex, S.profile.bar || 20);
    if (!ws.length) { toast('Вес небольшой — отдельная разминка не нужна'); return; }
    x.sets = [...ws.map(q => ({ warm:true, w:q.w, r:q.r })), ...x.sets.filter(q => !q.warm)];
    buzz(8); changed(); render(); toast(`Разминка к ${nf(W, 2)} кг: ${ws.map(q => `${nf(q.w, 2)}×${q.r}`).join(', ')}`);
  },
  setRir: el => { const c = ctx(el); if (!c) return; c.s.rir = +el.dataset.v; S.rirAsk = null; buzz(6); changed(); render(); },
  rirSkip: () => { S.rirAsk = null; render(); },
  toggleRir: () => { S.profile.rirAsk = S.profile.rirAsk === false; saveProfile(); buzz(8); render(); },
  period: el => { S.prog.period = el.dataset.p; S.countUp = true; render(); },
  metric: el => { S.prog.metric = el.dataset.m; render(); },
};

