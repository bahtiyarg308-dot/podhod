/* ================= data safety: daily copies on the phone, restore, error log ================= */
const SCHEMA = 3, SNAP_DAILY = 7, SNAP_SPECIAL = 4;
const SNAP_WHY = { day:'ежедневная', upd:'перед обновлением', pre:'перед возвратом', hand:'вручную' };
const snapIndex = async () => { const a = await KV.get('snaps'); return Array.isArray(a) ? a : []; };
async function snapNow(why = 'day') {
  try {
    flush(); syncCur();
    const data = {}; let w = 0;
    profiles().forEach(p => { const d = S.store[p.id] || {}; data[p.id] = { profile:d.profile || null, workouts:d.workouts || [] }; w += (d.workouts || []).length; });
    if (!w && why !== 'hand') return false;                       // nothing to protect yet
    const day = dayKey(Date.now()), id = why === 'day' ? day : `${day}-${why}-${Date.now().toString(36)}`;
    await KV.set('snap:' + id, { at:Date.now(), v:APP_VERSION, w, meta:{ profiles:clean(profiles()) }, data:clean(data) });
    let idx = (await snapIndex()).filter(x => x.id !== id); idx.push({ id, at:Date.now(), w, why, v:APP_VERSION });
    idx.sort((a, b) => b.at - a.at);
    const daily = idx.filter(x => x.why === 'day'), special = idx.filter(x => x.why !== 'day');
    const keep = new Set([...daily.slice(0, SNAP_DAILY), ...special.slice(0, SNAP_SPECIAL)].map(x => x.id));
    for (const x of idx) if (!keep.has(x.id)) KV.del('snap:' + x.id);
    await KV.set('snaps', idx.filter(x => keep.has(x.id)));
    return true;
  } catch (e) { logErr('snapshot', e); return false; }
}
async function snapDaily() {
  const m = S.meta; if (!m) return;                              // a brand-new install has nothing to protect yet
  const upd = m.lastVer && m.lastVer !== APP_VERSION;
  if (upd) await snapNow('upd');
  const idx = await snapIndex();
  if (!idx.some(x => x.why === 'day' && x.id === dayKey(Date.now()))) await snapNow('day');
  if (m.lastVer !== APP_VERSION || m.schema !== SCHEMA) { m.lastVer = APP_VERSION; m.schema = SCHEMA; saveMeta(); }
}
async function snapRestore(id) {
  const s = await KV.get('snap:' + id); if (!s || !s.data) throw new Error('copy missing');
  await snapNow('pre');
  const m = ensureMeta(); (s.meta && s.meta.profiles || []).forEach(p => { if (p && p.id && !m.profiles.some(x => x.id === p.id)) m.profiles.push(p); });
  for (const [pid, d] of Object.entries(s.data)) { if (!m.profiles.some(p => p.id === pid)) continue; const cur = S.store[pid] || {}; S.store[pid] = { profile:d.profile || cur.profile || null, workouts:d.workouts || [], active:pid === S.pid ? null : cur.active || null }; await KV.set('p:' + pid, S.store[pid]); }
  saveMeta(); S.active = null; loadProfileData(); LDIRTY++; applyAccent(); schedulePush();
}
/* error log: never throws, throttled, kept on the phone only */
const ERRLOG = [];
function logErr(kind, e) {
  try {
    const m = String((e && (e.message || (e.reason && e.reason.message))) || e || '').slice(0, 260), st = String((e && e.stack) || '').split('\n').slice(0, 3).join(' | ').slice(0, 260), last = ERRLOG[ERRLOG.length - 1];
    if (last && last.m === m && Date.now() - last.t < 3000) return;
    ERRLOG.push({ t:Date.now(), v:APP_VERSION, k:kind, m, st, view:S.view }); if (ERRLOG.length > 30) ERRLOG.shift();
    KV.set('errlog', ERRLOG);
    if (!S.errToast && !/Network|fetch|Load failed|net/i.test(m)) { S.errToast = true; toast('Произошёл сбой. Данные в безопасности: подробности в Настройках → Копии и журнал'); }
  } catch (x) { /* the logger must never fail */ }
}
window.addEventListener('error', e => logErr('error', e.error || e.message));
window.addEventListener('unhandledrejection', e => logErr('promise', e.reason));
const errReport = () => `Подход ${APP_VERSION} · ${new Date().toISOString()}\n${navigator.userAgent}\nэкран ${innerWidth}×${innerHeight}, тема ${document.documentElement.dataset.theme}/${document.documentElement.dataset.look}\n\n` + (ERRLOG.length ? ERRLOG.slice().reverse().map(x => `${new Date(x.t).toLocaleString('ru-RU')} [${x.k}] ${x.m}${x.st ? '\n  ' + x.st : ''} (экран ${x.view})`).join('\n') : 'Ошибок нет');
const fmtSnap = x => `${new Date(x.at).toLocaleDateString('ru-RU', { day:'numeric', month:'long' })}, ${new Date(x.at).toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' })}`;
SHEETS.snaps = sh => {
  const list = S.snapList || [];
  return `${sheetHead('Копии на телефоне', 'Защита данных')}<div class="sheet-body">
    <p class="fine" style="margin-top:0">Каждый день приложение само сохраняет копию тренировок и профиля прямо на телефоне (последние ${SNAP_DAILY} дней), а также перед обновлением. Если что-то пошло не так, любую копию можно вернуть. Фото тела в копии не входят.</p>
    ${list.length ? `<ul class="blist snap-list">${list.map(x => `<li><span class="sn-w"><b>${esc(fmtSnap(x))}</b><small>${esc(SNAP_WHY[x.why] || x.why)} · ${x.w} ${plural(x.w, ['тренировка', 'тренировки', 'тренировок'])}</small></span><button class="btn btn-sm ${sh.c === x.id ? 'btn-danger' : ''}" data-act="snapGo" data-id="${esc(x.id)}">${sh.c === x.id ? 'Точно вернуть?' : 'Вернуть'}</button></li>`).join('')}</ul>` : '<p class="muted">Копий пока нет: первая появится после первой тренировки.</p>'}
    ${sh.err ? `<p class="acc-err" role="alert">${esc(sh.err)}</p>` : ''}
    <div class="row" style="margin-top:14px"><button class="btn btn-primary" data-act="snapHand">Сделать копию сейчас</button></div>
    <p class="fine">Перед возвратом приложение само сохранит текущее состояние, так что вернуть можно и обратно.${accOf() ? ' Если вы вошли в аккаунт, облако может снова добавить более новые тренировки.' : ''}</p></div>`;
};
SHEETS.errs = () => `${sheetHead('Журнал ошибок', 'Для поддержки')}<div class="sheet-body">
  <p class="fine" style="margin-top:0">Журнал хранится только на телефоне. Если приложение вело себя странно, нажмите «Скопировать» и отправьте текст разработчику.</p>
  <pre class="errpre">${esc(errReport())}</pre>
  <div class="row" style="margin-top:12px"><button class="btn btn-primary" data-act="errCopy">Скопировать</button><button class="btn" data-act="errClear">Очистить</button></div></div>`;
Object.assign(A, {
  snapsOpen: async () => { S.snapList = await snapIndex(); openSheet({ type:'snaps', c:null, err:'' }); },
  snapHand: async () => { const ok = await snapNow('hand'); S.snapList = await snapIndex(); toast(ok ? 'Копия сохранена на телефоне' : 'Не получилось сохранить копию'); render(); },
  snapGo: async el => { const sh = top(), id = el.dataset.id; if (sh.c !== id) { sh.c = id; render(); return; }
    try { await snapRestore(id); S.snapList = await snapIndex(); S.sheets = []; toast('Данные возвращены из копии'); sfx('goal'); render(); } catch (e) { sh.err = 'Не получилось вернуть копию'; sh.c = null; logErr('restore', e); render(); } },
  errsOpen: () => openSheet({ type:'errs' }),
  errCopy: async () => { const t = errReport(); try { await navigator.clipboard.writeText(t); toast('Скопировано'); } catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Скопировано'); } catch (e2) { toast('Не получилось скопировать'); } ta.remove(); } },
  errClear: () => { ERRLOG.length = 0; KV.set('errlog', ERRLOG); S.errToast = false; toast('Журнал очищен'); render(); },
});

