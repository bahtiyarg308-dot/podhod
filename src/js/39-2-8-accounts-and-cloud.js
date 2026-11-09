/* ================= 2.8: accounts and cloud — Firebase over plain HTTPS, no SDK, no CDN =================
   Auth: Identity Toolkit REST (email + password, Google via createAuthUri → redirect → signInWithIdp).
   Data: Firestore REST, database «default». Layout per account:
     users/{uid}/pv/profile   private: the whole profile (programs, supplements, weight, settings, chests)
     users/{uid}/pb/main      for me and connected partners: card + month index + chat hash
     users/{uid}/pb/chat      my chat messages
     users/{uid}/w/{YYYYMM}   workouts of one month
     invites/{code}, links/{owner}_{reader} — partner connection
   Body photos never leave the phone. Without an account everything works as before. */
const FB = { key:'AIzaSyCsPQssm8V6RvmOOtPSySJKczQ5LqaBWws', idt:'https://identitytoolkit.googleapis.com/v1/accounts:', stk:'https://securetoken.googleapis.com/v1/token', fs:'https://firestore.googleapis.com/v1/', db:'projects/podhod-5d27f/databases/default/documents' };
const CL = { busy:false, again:false, t:null, status:'', msg:'', last:0, st:{}, parts:{} };
const accs = () => (S.meta && S.meta.accs) || {};
const accOf = (pid = S.pid) => accs()[pid] || null;
const cloudOn = () => Object.keys(accs()).length > 0;
const cmembers = () => S.cremote || (S.cremote = {});
const cloudPartnersN = () => Object.keys(cmembers()).length;
const appUrl = () => location.origin + location.pathname;
const sjson = (s, d) => { try { const v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } };
const hash2 = s => hash(s) + s.length.toString(36);
const shareBodyOn = () => !!((S.meta && S.meta.shareBody) || (S.meta && S.meta.sync && S.meta.sync.shareBody));

/* ---------- auth ---------- */
const AUTH_ERR = { EMAIL_EXISTS:'Такая почта уже зарегистрирована. Войдите или восстановите пароль', EMAIL_NOT_FOUND:'Аккаунта с такой почтой нет', INVALID_PASSWORD:'Неверный пароль',
  INVALID_LOGIN_CREDENTIALS:'Неверная почта или пароль', INVALID_EMAIL:'Проверьте адрес почты', MISSING_EMAIL:'Введите почту', MISSING_PASSWORD:'Введите пароль',
  WEAK_PASSWORD:'Слишком короткий пароль — нужно хотя бы 6 символов', TOO_MANY_ATTEMPTS_TRY_LATER:'Слишком много попыток. Подождите пару минут', USER_DISABLED:'Аккаунт отключён',
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN:'Для этого действия войдите в аккаунт заново', OPERATION_NOT_ALLOWED:'Этот способ входа выключен', net:'Нет связи с интернетом. Попробуйте ещё раз',
  relogin:'Вход устарел — войдите в аккаунт заново', denied:'Для партнёров в Firebase опубликованы не все правила доступа. Свои данные сохраняются как обычно', badcode:'Код не найден или устарел. Попросите новый', own:'Это ваш собственный код',
  nomatch:'Пароли не совпадают', short:'Пароль — хотя бы 6 символов', cancel:'Вход отменён', google:'Google не вернул вход. Попробуйте ещё раз или войдите по почте', unver:'Почта ещё не подтверждена. Откройте ссылку из письма и нажмите «Я подтвердил»', INVALID_OOB_CODE:'Ссылка уже использована или устарела. Запросите новое письмо', EXPIRED_OOB_CODE:'Ссылка устарела. Запросите новое письмо' };
const authErr = e => AUTH_ERR[(e && e.code) || ''] || 'Не получилось' + (e && e.code ? ` (${e.code})` : '');
async function idt(method, body, ru) {
  const go = h => fetch(FB.idt + method + '?key=' + FB.key, { method:'POST', headers:Object.assign({ 'Content-Type':'application/json' }, h), body:JSON.stringify(body) });
  let r; try { r = await go(ru ? { 'X-Firebase-Locale':'ru' } : {}); } catch (e) { if (!ru) throw { code:'net' }; try { r = await go({}); } catch (e2) { throw { code:'net' }; } }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw { code:String((j.error && j.error.message) || 'HTTP_' + r.status).split(/[ :]/)[0] };
  return j;
}
async function accToken(acc, force) {
  if (!force && acc.it && acc.exp > Date.now() + 60000) return acc.it;
  let r; try { r = await fetch(FB.stk + '?key=' + FB.key, { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body:'grant_type=refresh_token&refresh_token=' + encodeURIComponent(acc.rt || '') }); } catch (e) { throw { code:'net' }; }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const m = String((j.error && j.error.message) || ''); throw { code:/TOKEN_EXPIRED|USER_DISABLED|USER_NOT_FOUND|INVALID_REFRESH_TOKEN|INVALID_GRANT|MISSING_REFRESH_TOKEN|PROJECT_NUMBER_MISMATCH/.test(m) ? 'relogin' : r.status >= 500 ? 'net' : 'relogin' }; }
  acc.it = j.id_token; acc.rt = j.refresh_token || acc.rt; acc.exp = Date.now() + (+j.expires_in || 3600) * 1000; saveMeta();
  return acc.it;
}

/* ---------- firestore ---------- */
const fsName = p => FB.db + '/' + p;
const fsv = v => typeof v === 'number' ? { integerValue:String(Math.round(v)) } : { stringValue:String(v) };
const fsDoc = (p, o) => ({ name:fsName(p), fields:Object.fromEntries(Object.entries(o).filter(([, v]) => v != null).map(([k, v]) => [k, fsv(v)])) });
const fsDec = d => { if (!d || !d.fields) return null; const o = { _n:d.name }; for (const [k, v] of Object.entries(d.fields)) o[k] = 'integerValue' in v ? +v.integerValue : 'stringValue' in v ? v.stringValue : 'booleanValue' in v ? v.booleanValue : null; return o; };
async function fsReq(acc, method, path, body) {
  const go = async force => { const tok = await accToken(acc, force); try { return await fetch(FB.fs + path, { method, cache:'no-store', headers:Object.assign({ 'Authorization':'Bearer ' + tok }, body ? { 'Content-Type':'application/json' } : {}), body:body ? JSON.stringify(body) : undefined }); } catch (e) { throw { code:'net' }; } };
  let r = await go(false); if (r.status === 401) r = await go(true);
  if (r.status === 404 && method === 'GET') return null;
  const j = await r.json().catch(() => null);
  if (r.status === 401) throw { code:'relogin' };
  if (r.status === 403) throw { code:'denied', msg:j && j.error && j.error.message };
  if (!r.ok) throw { code:'http', status:r.status, msg:j && j.error && j.error.message };
  return j;
}
const fsGet = async (acc, p) => fsDec(await fsReq(acc, 'GET', fsName(p)));
async function fsBatchGet(acc, paths) {
  const out = {};
  for (let i = 0; i < paths.length; i += 100) {
    const j = await fsReq(acc, 'POST', FB.db + ':batchGet', { documents:paths.slice(i, i + 100).map(fsName) });
    (j || []).forEach(x => { if (x.found) out[x.found.name.slice(FB.db.length + 1)] = fsDec(x.found); });
  }
  return out;
}
async function fsCommit(acc, writes) { for (let i = 0; i < writes.length; i += 400) await fsReq(acc, 'POST', FB.db + ':commit', { writes:writes.slice(i, i + 400) }); }
async function fsQuery(acc, coll, field, val) {
  const j = await fsReq(acc, 'POST', FB.db + ':runQuery', { structuredQuery:{ from:[{ collectionId:coll }], where:{ fieldFilter:{ field:{ fieldPath:field }, op:'EQUAL', value:{ stringValue:val } } }, limit:50 } });
  return (j || []).filter(x => x && x.document).map(x => fsDec(x.document));
}

/* ---------- what is stored ---------- */
const monthKey = t => { const d = new Date(t); return String(d.getFullYear() * 100 + d.getMonth() + 1); };
function monthsOf(ws) { const m = {}; (ws || []).forEach(w => { const k = monthKey(w.start); (m[k] || (m[k] = [])).push(w); }); return m; }
const monthJSON = list => JSON.stringify(list.slice().sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(w => { const c = clean(w); delete c.isNew; return c; }));
const cardOf = p => ({ name:(p && p.name) || '', color:(p && p.color) || 'lime', char:charOf(p), sid:(p && p.sid) || '' });
const profJSON = prof => { const c = clean(prof); delete c.bodyLost; return JSON.stringify(c); };
const profHash = (prof, p) => hash2(profJSON(prof) + JSON.stringify(cardOf(p)));
function chestUnion(lc, rc) { // the same person on two phones: opened chests and purchases add up, the closed list comes from the older history
  let ch = false; if (!lc || !rc) return false;
  Object.entries(rc.op || {}).forEach(([k, v]) => { if (!lc.op[k] && ITEM[v]) { lc.op[k] = v; ch = true; } });
  (rc.buy || []).forEach(b => { if (b && ITEM[b.id] && !lc.buy.some(x => x.at === b.at && x.id === b.id)) { lc.buy.push({ id:b.id, at:b.at, c:+b.c || 0 }); ch = true; } });
  if (Number.isFinite(rc.rk) && !(lc.rk >= rc.rk)) { lc.rk = rc.rk; ch = true; }
  if (rc.gift && +rc.gift.n > (+(lc.gift || {}).n || 0)) { lc.gift = { d:String(rc.gift.d || ''), n:+rc.gift.n, s:+rc.gift.s || 0 }; ch = true; }
  if (rc.at && Array.isArray(rc.st) && (!lc.at || rc.at < lc.at)) { lc.st = rc.st.slice(0, 12); lc.at = rc.at; lc.old = Math.max(+lc.old || 0, +rc.old || 0); ch = true; }
  return ch;
}
function mergeCloudProfile(local, remote, dirty) {
  const r = normP(remote);
  if (!dirty) { if (local.chest && r.chest) chestUnion(r.chest, local.chest); else if (local.chest && !r.chest) r.chest = local.chest; return r; }
  const l = normP(local); // both phones changed something: keep this phone's settings, add everything the other phone has
  ['templates', 'custom', 'body', 'meas', 'supps'].forEach(k => { const have = new Set(l[k].map(o => o && o.id)); r[k].forEach(o => { if (o && o.id && !have.has(o.id)) l[k].push(o); }); });
  Object.entries(r.slog || {}).forEach(([k, v]) => { if (Array.isArray(v)) l.slog[k] = [...new Set([...(l.slog[k] || []), ...v])]; });
  l.sfull = [...new Set([...l.sfull, ...r.sfull])].sort();
  habMerge(l, r);
  r.freeze.forEach(f => { if (f && Number.isFinite(f.from) && !l.freeze.some(x => x.from === f.from)) l.freeze.push(f); });
  l.deleted = [...new Set([...l.deleted, ...r.deleted])];
  l.kudos = Object.assign({}, r.kudos, l.kudos);
  if (l.chest && r.chest) chestUnion(l.chest, r.chest); else if (!l.chest && r.chest) l.chest = r.chest;
  return l;
}
function mergeCloudWorkouts(d, list, del) {
  const map = new Map((d.workouts || []).map(w => [w.id, w])); let ch = false;
  (Array.isArray(list) ? list : []).forEach(w => {
    if (!w || !w.id || !Number.isFinite(w.start) || !Array.isArray(w.exercises) || del.has(w.id)) return;
    const l = map.get(w.id); if (!l || (w.u || 0) > (l.u || 0)) { map.set(w.id, normW(w, String(w.id))); ch = true; }
  });
  if (ch) d.workouts = [...map.values()].sort((a, b) => b.start - a.start);
  return ch;
}
const localSig = p => LDIRTY + '|' + (p.sid ? myChat(p.sid).length : 0) + '|' + (shareBodyOn() ? 1 : 0) + '|' + JSON.stringify(cardOf(p));
const chatOut = sid => myChat(sid).slice(-300).map(x => ({ id:x.id, t:x.t, x:x.x, d:x.d }));
async function cloudSt(u) { if (!CL.st[u]) CL.st[u] = (await KV.get('cs:' + u)) || { wm:{} }; return CL.st[u]; }
const saveSt = u => { if (CL.st[u]) KV.set('cs:' + u, CL.st[u]); };

/* ---------- one account: pull what changed, push what changed ---------- */
async function cloudSyncAcc(pid, acc, o) {
  ensureSids();
  const u = acc.uid, st = await cloudSt(u), p = profiles().find(x => x.id === pid); if (!p) return;
  if (pid === S.pid) { flush(); syncCur(); }
  const d = S.store[pid] || (S.store[pid] = { profile:{}, workouts:[], active:null });
  d.profile = normP(d.profile); d.workouts = d.workouts || [];
  const head = await fsGet(acc, `users/${u}/pb/main`);
  if (head && st.done && st.hh === head.h && st.sg === localSig(p)) return false; // nothing changed here or in the cloud
  const rwm = head ? sjson(head.wm, {}) : {};
  const first = !st.done;
  let changed = false, pushProf = !head || profHash(d.profile, p) !== st.ph;
  if (head && (head.pt || 0) > (st.pt || 0)) {
    const pv = await fsGet(acc, `users/${u}/pv/profile`);
    const rp = pv && sjson(pv.j, null), card = pv && sjson(pv.c, null);
    if (rp) {
      const localEmpty = first && !d.workouts.length && !d.profile.templates.length;
      d.profile = mergeCloudProfile(d.profile, rp, pushProf && !localEmpty); changed = true;
      if (card) applyCard(p, card, first, localEmpty);
      if (!pushProf || localEmpty) pushProf = false;
    }
    st.pt = head.pt;
  }
  const del = new Set(d.profile.deleted);
  const need = Object.keys(rwm).filter(m => rwm[m] !== (st.wm || {})[m]);
  if (need.length) {
    const got = await fsBatchGet(acc, need.map(m => `users/${u}/w/${m}`));
    need.forEach(m => { const doc = got[`users/${u}/w/${m}`]; if (doc && mergeCloudWorkouts(d, sjson(doc.j, []), del)) changed = true; });
  }
  if (d.workouts.some(w => del.has(w.id))) { d.workouts = d.workouts.filter(w => !del.has(w.id)); changed = true; }
  if (changed) { LDIRTY++; KV.set('p:' + pid, d); if (pid === S.pid) loadProfileData(); }
  const dd = pid === S.pid ? (syncCur(), S.store[pid]) : d;
  // chat from my other phones
  if (p.sid && head && head.ch && head.ch !== st.ch) { const c = await fsGet(acc, `users/${u}/pb/chat`); const msgs = c ? (sjson(c.j, {}).msgs || []) : []; if (msgs.length) mergeChats({ [p.sid]:msgs }); }
  // push
  const lm = monthsOf(dd.workouts), lwm = {}; Object.entries(lm).forEach(([m, l]) => { lwm[m] = hash2(monthJSON(l)); });
  const writes = [];
  new Set([...Object.keys(lwm), ...Object.keys(rwm)]).forEach(m => {
    if (lwm[m] === rwm[m]) return;
    writes.push(lwm[m] ? { update:fsDoc(`users/${u}/w/${m}`, { j:monthJSON(lm[m]), h:lwm[m] }) } : { delete:fsName(`users/${u}/w/${m}`) });
  });
  const ph = profHash(dd.profile, p);
  let pt = head ? (head.pt || 0) : 0;
  if (pushProf) { pt = Math.max(Date.now(), pt + 1); writes.push({ update:fsDoc(`users/${u}/pv/profile`, { j:profJSON(dd.profile), c:JSON.stringify(cardOf(p)), t:pt }) }); }
  const chatJ = p.sid ? JSON.stringify({ v:1, id:p.sid, msgs:chatOut(p.sid) }) : '', ch = chatJ ? hash2(chatJ) : '';
  if (ch && (!head || head.ch !== ch) && chatOut(p.sid).length) writes.push({ update:fsDoc(`users/${u}/pb/chat`, { j:chatJ }) });
  const pub = payload(pid); delete pub.workouts; delete pub.dev; pub.uid = u;
  const pubJ = JSON.stringify(pub), wmJ = JSON.stringify(lwm), h = hash2(pubJ + wmJ + pt + ch);
  let finalH = head ? head.h : '';
  if (!head || head.h !== h) { writes.push({ update:fsDoc(`users/${u}/pb/main`, { j:pubJ, wm:wmJ, pt, ch, h, t:Date.now() }) }); finalH = h; }
  if (writes.length) await fsCommit(acc, writes);
  if (p.sid && myChat(p.sid).some(x => !x.ok)) { myChat(p.sid).forEach(x => { x.ok = true; }); KV.set('chat-mine', S.chatMine); }
  st.wm = lwm; st.ph = ph; st.pt = pt; st.ch = ch; st.done = 1; st.hh = finalH; st.sg = localSig(p); saveSt(u);
  return changed;
}
function applyCard(p, card, first, localEmpty) {
  if (!p || !card) return;
  if (first && !localEmpty && p.name) { if (card.sid && !p.sid) p.sid = card.sid; saveMeta(); return; } // this phone already had its own data: keep its name, join the history
  if (card.name) p.name = String(card.name).slice(0, 24);
  if (COLORS[card.color]) p.color = card.color;
  if (CHARS[card.char]) p.char = card.char;
  if (card.sid && (!p.sid || (!syncCfg() && first))) p.sid = card.sid;
  saveMeta(); if (p.id === S.pid) applyAccent();
}

/* ---------- partners ---------- */
async function cloudPartner(acc, owner) {
  const pc = CL.parts[owner] || (CL.parts[owner] = (await KV.get('cp:' + owner)) || { wm:{}, mo:{}, ch:'', chat:[] });
  const head = await fsGet(acc, `users/${owner}/pb/main`); if (!head) return null;
  const rwm = sjson(head.wm, {}), need = Object.keys(rwm).filter(m => rwm[m] !== pc.wm[m]); let ch = need.length > 0;
  if (need.length) { const got = await fsBatchGet(acc, need.map(m => `users/${owner}/w/${m}`)); need.forEach(m => { const doc = got[`users/${owner}/w/${m}`]; pc.mo[m] = doc ? sjson(doc.j, []) : []; }); }
  Object.keys(pc.mo).forEach(m => { if (!(m in rwm)) { delete pc.mo[m]; ch = true; } });
  pc.wm = rwm;
  if (head.ch !== pc.ch) { const c = head.ch ? await fsGet(acc, `users/${owner}/pb/chat`) : null; pc.chat = c ? (sjson(c.j, {}).msgs || []) : []; pc.ch = head.ch || ''; ch = true; }
  if (pc.h !== head.h) { pc.pub = sjson(head.j, {}); pc.h = head.h; ch = true; }
  pc.t = head.t;
  if (ch) KV.set('cp:' + owner, pc);
  const m = validMember(Object.assign({}, pc.pub, { workouts:[].concat(...Object.values(pc.mo)), uid:owner, cloud:1, updated:head.t }));
  return m && { m, chat:pc.chat, changed:ch };
}
async function cloudPartners(o = {}) {
  const mine = new Set(Object.values(accs()).map(a => a.uid)), next = {}, chats = {}; let any = false;
  for (const acc of Object.values(accs())) {
    if (acc.bad || acc.ver === 0) continue;
    const st = await cloudSt(acc.uid);
    if (o.links || !st.lk || Date.now() - (st.lkAt || 0) > 60000) { try { st.lk = [...new Set((await fsQuery(acc, 'links', 'reader', acc.uid)).map(l => l.owner).filter(x => x && !mine.has(x)))]; CL.noLinks = 0; } catch (e) { if (e && e.code === 'denied') { st.lk = st.lk || []; CL.noLinks = 1; } else throw e; } st.lkAt = Date.now(); saveSt(acc.uid); }
    for (const owner of st.lk) {
      if (next[owner]) continue;
      let r = null; try { r = await cloudPartner(acc, owner); } catch (e) { if (e && e.code === 'denied') { st.lk = st.lk.filter(x => x !== owner); st.lkAt = 0; saveSt(acc.uid); KV.del('cp:' + owner); delete CL.parts[owner]; continue; } throw e; }
      if (!r) continue;
      next[owner] = r.m; if (r.changed) any = true; if (r.chat.length) chats[r.m.id] = r.chat;
    }
  }
  const prev = cmembers(), bySid = {}; Object.values(next).forEach(m => { bySid[m.id] = m; });
  Object.keys(prev).forEach(sid => { if (!bySid[sid]) { delete S.remote[sid]; any = true; } });
  if (Object.keys(prev).length !== Object.keys(bySid).length) any = true;
  S.cremote = bySid;
  if (any) { Object.assign(S.remote, bySid); S.rd = {}; rebuildCustom(); KV.set('remote', S.remote); notifyRemote(); }
  if (Object.keys(chats).length) notifyChat(mergeChats(chats));
  return any;
}
/* gist → account: link to every gist partner who already has an account; once all of them are reachable through the cloud, GitHub is no longer needed */
async function cloudGistMigrate() {
  const c = syncCfg(); if (!c || !S.sync.files) return;
  const mySids = new Set(profiles().map(p => p.sid).filter(Boolean));
  for (const [pid, acc] of Object.entries(accs())) {
    const st = await cloudSt(acc.uid), done = new Set(st.gl || []);
    for (const m of Object.values(S.remote)) {
      if (!m.acc || m.acc === acc.uid || done.has(m.acc) || mySids.has(m.id)) continue;
      const id = `links/${acc.uid}_${m.acc}`;
      if (!(await fsGet(acc, id))) await fsCommit(acc, [{ update:fsDoc(id, { owner:acc.uid, reader:m.acc, t:Date.now() }) }]);
      done.add(m.acc); st.lkAt = 0;
    }
    st.gl = [...done]; saveSt(acc.uid);
  }
  const others = [...S.sync.files].filter(sid => !mySids.has(sid));
  const localOk = profiles().every(p => !p.sid || !S.sync.files.has(p.sid) || accOf(p.id));
  if (others.length && localOk && others.every(sid => cmembers()[sid])) {
    S.meta.syncOld = { gist:c.gist, at:Date.now() }; S.meta.sync = null; saveMeta();
    toast('Партнёр теперь подключён через аккаунт — GitHub больше не нужен');
  }
}

/* ---------- the sync loop ---------- */
function cloudSoon(ms = 2500) { if (!cloudOn()) return; clearTimeout(CL.t); CL.t = setTimeout(() => cloudSync(), ms); }
async function cloudSync(o = {}) {
  if (!cloudOn() || !S.metaLoaded) return;
  if (CL.busy) { CL.again = true; return; }
  if (navigator.onLine === false) { CL.status = 'off'; return; }
  CL.busy = true; const was = CL.status; CL.status = 'sync'; if (was !== 'sync' && o.show) render();
  let changed = false;
  try {
    for (const [pid, acc] of Object.entries(accs())) {
      if (!profiles().some(p => p.id === pid)) { delete S.meta.accs[pid]; saveMeta(); continue; }
      if (acc.bad || acc.ver === 0) continue;
      try { if (await cloudSyncAcc(pid, acc, o)) changed = true; }
      catch (e) { if (e && e.code === 'relogin') { acc.bad = 1; saveMeta(); } else throw e; }
    }
    if (await cloudPartners(o)) changed = true;
    try { await cloudGistMigrate(); } catch (e) { if (!(e && e.code === 'denied')) throw e; }
    CL.status = Object.values(accs()).some(a => a.bad) ? 'relogin' : 'ok'; CL.msg = ''; CL.last = Date.now();
  } catch (e) {
    CL.status = e && e.code === 'net' ? 'off' : 'err';
    CL.msg = e && e.code === 'denied' ? AUTH_ERR.denied : e && e.code === 'http' ? `Облако ответило ошибкой ${e.status}. Попробуем позже` : e && e.code === 'net' ? '' : authErr(e);
  } finally {
    CL.busy = false;
    if (changed || was !== CL.status || S.sheets.some(s => s.type === 'acc' || s.type === 'cpair' || s.type === 'set')) render();
    if (CL.again) { CL.again = false; cloudSoon(500); }
  }
}
const cloudText = () => {
  const a = accOf(); if (!a) return '';
  if (a.bad || CL.status === 'relogin') return 'Вход устарел — войдите заново';
  if (CL.status === 'sync') return 'Синхронизация…';
  if (CL.status === 'off') return 'Нет интернета — сохраним в облако, когда появится связь';
  if (CL.status === 'err') return CL.msg || 'Ошибка синхронизации';
  return CL.last ? 'В облаке · ' + relTime(CL.last) : 'Подключено';
};
const relTime = t => { const s = Math.round((Date.now() - t) / 1000); return s < 50 ? 'только что' : s < 3600 ? `${Math.round(s / 60)} мин назад` : new Date(t).toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' }); };

/* ---------- signing in ---------- */
async function googleStart() {
  const j = await idt('createAuthUri', { providerId:'google.com', continueUri:appUrl(), customParameter:{ prompt:'select_account' } });
  try { localStorage.setItem('podhod-g', JSON.stringify({ s:j.sessionId, at:Date.now(), pid:S.pid, w:!S.meta || S.sheets.some(x => x.type === 'welcome') })); } catch (e) { /* private mode */ }
  flush(); location.href = j.authUri;
}
async function googleFinish() {
  const h = location.hash || '', q = location.search || '';
  if (!/id_token=|access_token=|[?&]code=|error=/.test(h + q)) return;
  let g = null; try { g = JSON.parse(localStorage.getItem('podhod-g') || 'null'); localStorage.removeItem('podhod-g'); } catch (e) { g = null; }
  const url = location.href; history.replaceState(null, '', appUrl());
  if (!g || Date.now() - g.at > 30 * 60000) return;
  if (/error=/.test(h + q)) { toast(AUTH_ERR.cancel); return; }
  if (g.pid && profiles().some(p => p.id === g.pid) && g.pid !== S.pid) switchProfile(g.pid);
  try {
    let res;
    try { res = await idt('signInWithIdp', { requestUri:url, sessionId:g.s, returnSecureToken:true, returnIdpCredential:true }); }
    catch (e) { // second way: hand Firebase the Google id_token itself
      const t = (url.match(/[#&?]id_token=([^&]+)/) || [])[1]; if (!t || e.code === 'net') throw e;
      res = await idt('signInWithIdp', { requestUri:appUrl(), postBody:'id_token=' + t + '&providerId=google.com', returnSecureToken:true, returnIdpCredential:true });
    }
    if (!res.idToken) throw { code:'google' };
    await afterSignIn(res, 'google', null);
  } catch (e) { toast(authErr(e)); }
}
function signOut(pid = S.pid) {
  const a = accOf(pid); if (!a) return;
  delete S.meta.accs[pid]; saveMeta(); delete CL.st[a.uid]; KV.del('cs:' + a.uid);
  if (!cloudOn()) { Object.keys(cmembers()).forEach(sid => { delete S.remote[sid]; }); S.cremote = {}; Object.keys(CL.parts).forEach(u => KV.del('cp:' + u)); CL.parts = {}; KV.set('remote', S.remote); S.rd = {}; rebuildCustom(); }
  CL.status = '';
}
async function deleteAccount(sh) {
  const a = accOf(); if (!a) return;
  const u = a.uid, st = await cloudSt(u);
  const head = await fsGet(a, `users/${u}/pb/main`), months = Object.keys(Object.assign({}, st.wm || {}, head ? sjson(head.wm, {}) : {}));
  const writes = months.map(m => ({ delete:fsName(`users/${u}/w/${m}`) })).concat(['pv/profile', 'pb/main', 'pb/chat'].map(x => ({ delete:fsName(`users/${u}/${x}`) })));
  await fsCommit(a, writes);
  for (const f of ['reader', 'owner']) for (const l of await fsQuery(a, 'links', f, u)) { try { await fsCommit(a, [{ delete:l._n }]); } catch (e) { /* already gone */ } }
  for (const c of st.inv || []) { try { await fsCommit(a, [{ delete:fsName('invites/' + c) }]); } catch (e) { /* expired or gone */ } }
  await idt('delete', { idToken:await accToken(a) });
  signOut(); S.sheets = []; toast('Аккаунт и данные в облаке удалены. На телефоне всё осталось');
}

/* ---------- partner invites ---------- */
const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), b => CODE_ABC[b % 32]).join('');
const fmtCode = c => c.slice(0, 4) + '-' + c.slice(4, 8) + '-' + c.slice(8);
async function cloudInvite() {
  const a = accOf(), st = await cloudSt(a.uid); ensureSids();
  const code = newCode();
  await fsCommit(a, [{ update:fsDoc('invites/' + code, { uid:a.uid, sid:curProf().sid, name:pname(curProf()), exp:Date.now() + 7 * DAY }), currentDocument:{ exists:false } }]);
  st.inv = [...(st.inv || []).slice(-9), code]; saveSt(a.uid);
  return code;
}
async function cloudJoin(raw) {
  const a = accOf(), code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 10) throw { code:'badcode' };
  const inv = await fsGet(a, 'invites/' + code);
  if (!inv || !(inv.exp > Date.now())) throw { code:'badcode' };
  if (inv.uid === a.uid) throw { code:'own' };
  const w = [];
  if (!(await fsGet(a, `links/${inv.uid}_${a.uid}`))) w.push({ update:fsDoc(`links/${inv.uid}_${a.uid}`, { owner:inv.uid, reader:a.uid, code, t:Date.now() }) });
  if (!(await fsGet(a, `links/${a.uid}_${inv.uid}`))) w.push({ update:fsDoc(`links/${a.uid}_${inv.uid}`, { owner:a.uid, reader:inv.uid, t:Date.now() }) });
  if (w.length) await fsCommit(a, w);
  const m = ensureMeta(); if (m.mode !== 'pair') { m.mode = 'pair'; saveMeta(); }
  await cloudSync({ links:true, show:true });
  return inv.name || 'Партнёр';
}
async function cloudUnlink(sid) {
  const mm = cmembers()[sid]; if (!mm) return;
  for (const a of Object.values(accs())) {
    for (const id of [`links/${mm.uid}_${a.uid}`, `links/${a.uid}_${mm.uid}`]) { try { if (await fsGet(a, id)) await fsCommit(a, [{ delete:fsName(id) }]); } catch (e) { /* not ours */ } }
    const st = await cloudSt(a.uid); st.lk = (st.lk || []).filter(x => x !== mm.uid); saveSt(a.uid);
  }
  delete S.cremote[sid]; delete S.remote[sid]; KV.del('cp:' + mm.uid); delete CL.parts[mm.uid]; KV.set('remote', S.remote); S.rd = {}; rebuildCustom();
}

/* a partner's link: …/#join=CODE */
function joinFromHash() {
  let code = ''; const m = (location.hash || '').match(/join=([A-Za-z0-9-]{10,14})/); if (m) { code = m[1].toUpperCase().replace(/[^A-Z0-9]/g, ''); history.replaceState(null, '', appUrl()); }
  if (!code) { try { const c = localStorage.getItem('podhod-join') || ''; if (c && accOf()) { localStorage.removeItem('podhod-join'); code = c; } else if (c) S.pendingJoin = c; } catch (e) { /* private mode */ } }
  if (!code) return;
  if (accOf()) { setTimeout(() => openSheet({ type:'cpair', mode:'join', code, busy:false, err:'' }), 400); return; }
  S.pendingJoin = code; try { localStorage.setItem('podhod-join', code); } catch (e) { /* private mode */ }
    setTimeout(() => { const g = gateSheet(); if (g) { g.why = 'Войдите, чтобы подключиться к партнёру'; render(); } }, 400);
}
window.addEventListener('hashchange', () => { if (/join=/.test(location.hash)) joinFromHash(); });

/* ---------- account and partner screens ---------- */
const GLOGO = '<svg class="glogo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
ICONS.cloud = ICONS.cloud || '<path d="M7 18h10.5a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.34 9.5 4.25 4.25 0 0 0 7 18z"/>';
ICONS.key = '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/>';
ICONS.logout = '<path d="M14 5h4a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 18 19h-4"/><path d="M10 16l-4-4 4-4M6 12h9"/>';
const jwtAuthAt = t => { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).auth_time * 1000; } catch (e) { return 0; } };
const accField = (id, label, key, sh, o = {}) => `<label class="lbl">${label}<span class="pw-wrap"><input class="field" id="${id}" data-in="accF" data-k="${key}" type="${o.type || 'text'}" value="${esc(sh[key] || '')}" autocomplete="${o.ac || 'off'}"${o.im ? ` inputmode="${o.im}"` : ''} autocapitalize="off" spellcheck="false" enterkeyhint="${o.ek || 'next'}"${o.ph ? ` placeholder="${o.ph}"` : ''}>${o.eye ? `<button class="pw-eye icon-btn" type="button" data-act="accEye" aria-label="${sh.eye ? 'Скрыть пароль' : 'Показать пароль'}" aria-pressed="${!!sh.eye}">${icon(sh.eye ? 'eyeOff' : 'eye')}</button>` : ''}</span></label>`;
ICONS.eye = ICONS.eye || '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>';
ICONS.eyeOff = ICONS.eyeOff || '<path d="M4 4l16 16"/><path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a17 17 0 0 1-3 3.8M6.6 7.4C3.9 9.2 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>';
SHEETS.cpair = sh => {
  const a = accOf(), ps = Object.values(cmembers()), err = sh.err ? `<p class="acc-err" role="alert">${esc(sh.err)}</p>` : '', busy = sh.busy ? ' disabled aria-busy="true"' : '';
  if (!a) return `${sheetHead('Партнёр', 'Подключение')}<div class="sheet-body"><p>Чтобы видеть тренировки, рекорды и чат друг друга, войдите в аккаунт — у партнёра тоже нужен аккаунт.</p><button class="btn btn-primary btn-block" data-act="accOpen" data-why="Чтобы подключить партнёра">${icon('user')} Войти</button></div>`;
  if (sh.mode === 'invite') {
    const link = sh.code ? appUrl() + '#join=' + sh.code : '';
    return `${sheetHead('Пригласить партнёра', 'Код действует 7 дней')}<div class="sheet-body">
      ${sh.code ? `<div class="code-big" aria-label="Код ${esc(fmtCode(sh.code))}">${esc(fmtCode(sh.code))}</div>
        <p class="fine" style="text-align:center">Партнёр открывает ссылку или вводит код: Настройки → Синхронизация с партнёром → «Ввести код». Ему тоже нужен аккаунт.</p>
        <div class="row" style="justify-content:center">${navigator.share ? `<button class="btn btn-primary" data-act="cpairShare">${icon('share')} Отправить ссылку</button>` : ''}<button class="btn" data-act="cpairCopy" data-v="${esc(link)}">${icon('link')} Скопировать ссылку</button></div>`
        : err || `<p class="muted" aria-busy="true">Создаём код…</p>`}
      ${sh.code && err ? err : ''}</div>`;
  }
  if (sh.mode === 'join') return `${sheetHead('Ввести код партнёра', 'Подключение')}<div class="sheet-body"><form class="acc-form" onsubmit="return false">
      <label class="lbl">Код из приглашения<input class="field code-in" id="cp-code" data-in="accF" data-k="code" value="${esc(sh.code || '')}" placeholder="ABCD-EFGH-JK" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="14" enterkeyhint="go"></label>
      ${err}<button class="btn btn-primary btn-block" data-act="cpairJoin"${busy}>${sh.busy ? 'Подключаем…' : 'Подключиться'}</button></form></div>`;
  return `${sheetHead('Партнёры', `${ps.length} ${plural(ps.length, ['партнёр', 'партнёра', 'партнёров'])}`)}<div class="sheet-body">
    ${ps.length ? `<ul class="blist cp-list">${ps.map(m => `<li><span class="cp-who"><b>${esc(m.name || 'Партнёр')}</b><small>${m.workouts.length} ${plural(m.workouts.length, ['тренировка', 'тренировки', 'тренировок'])}</small></span><button class="btn btn-sm ${sh.un === m.id ? 'btn-danger' : 'btn-danger-soft'}" data-act="cpairUnlink" data-id="${esc(m.id)}">${sh.un === m.id ? 'Точно отключить?' : 'Отключить'}</button></li>`).join('')}</ul>` : '<p class="muted">Пока никого. Пригласите партнёра кодом.</p>'}
    ${err}<div class="row" style="margin-top:12px"><button class="btn btn-primary" data-act="cpairOpen" data-m="invite">${icon('link')} Пригласить</button><button class="btn" data-act="cpairOpen" data-m="join">Ввести код</button></div></div>`;
};
function accountRowHTML() {
  const a = accOf();
  return `<div class="srow acc-row"><div class="srow-t"><b>${icon('cloud')} Аккаунт</b><span>${a ? esc(a.email || 'Подключён') + ' · ' + esc(cloudText()) : 'Не выполнен вход — данные только на этом телефоне'}</span></div><button class="btn btn-sm${a ? '' : ' btn-primary'}" data-act="accOpen">${a ? 'Открыть' : 'Войти'}</button></div>`;
}
function cloudPairHTML() {
  const a = accOf(), ps = Object.values(cmembers());
  if (!a) return `<p class="fine" style="margin:0 0 10px">Видите тренировки, рекорды и чат друг друга — даже в разных залах. Нужен аккаунт у обоих: вход через Google или по почте.</p><div class="row"><button class="btn btn-sm btn-primary" data-act="accOpen" data-why="Чтобы подключить партнёра">${icon('user')} Войти и подключить</button><button class="btn btn-sm btn-ghost" data-act="syncSetup">Через GitHub</button></div>`;
  return `<p class="fine" style="margin:0 0 10px">${ps.length ? 'С вами: ' + ps.map(m => esc(m.name || 'партнёр')).join(', ') + ' · ' + esc(cloudText()) : 'Отправьте партнёру код или ссылку — у него тоже должен быть аккаунт.'}</p>
    <div class="row"><button class="btn btn-sm btn-primary" data-act="cpairOpen" data-m="invite">${icon('link')} Пригласить</button><button class="btn btn-sm" data-act="cpairOpen" data-m="join">Ввести код</button>${ps.length ? `<button class="btn btn-sm" data-act="cpairOpen" data-m="menu">${icon('users')} Партнёры</button>` : ''}</div>
    <div class="srow" style="border:0;padding-bottom:0"><div class="srow-t"><b>Показывать вес и замеры</b><span>Партнёр увидит ваш вес тела и замеры. Фото не передаются никогда</span></div><button class="switch" role="switch" aria-checked="${shareBodyOn()}" aria-label="Показывать вес тела партнёру" data-act="toggleShareBody"></button></div>`;
}
async function accRun(sh, fn) {
  if (sh.busy) return; sh.busy = true; sh.err = ''; render();
  try { await fn(); } catch (e) { sh.err = authErr(e); sfx('locked'); buzz([20, 40, 20]); }
  finally { sh.busy = false; render(); }
}
// Enter in a field presses the main button of that form
document.addEventListener('keydown', e => { if (e.key !== 'Enter' || !e.target || e.target.tagName !== 'INPUT') return; const f = e.target.closest('.acc-form'); if (!f) return; e.preventDefault(); const b = f.querySelector('.btn-primary,.btn-danger'); if (b && !b.disabled) b.click(); });
Object.assign(IN, { accF: el => { const sh = top(); if (sh) { sh[el.dataset.k] = el.value; if (sh.err) { sh.err = ''; const e = $('#sheet-root .acc-err'); if (e) e.remove(); } } } });
Object.assign(A, {
  accOpen: el => openSheet({ type:'acc', mode:accOf() ? 'me' : 'login', email:'', pass:'', busy:false, err:'', why:el && el.dataset && el.dataset.why || '' }),
  accMode: el => { const sh = top(); sh.mode = el.dataset.m; sh.err = ''; sh.sent = ''; sh.delc = false; sh.done = false; sh.cur = ''; sh.pass = ''; render(); },
  accEye: () => { const sh = top(); sh.eye = !sh.eye; render(); },
  accGoogle: () => { const sh = top(); accRun(sh, () => googleStart()); },
  accRelogin: () => { const sh = top(); const a = accOf(); sh.email = (a && a.email) || ''; if (a && a.prov === 'google') { accRun(sh, () => googleStart()); return; } signOut(); sh.mode = 'login'; render(); },
  accLogin: () => { const sh = top(), email = (sh.email || '').trim(), pass = sh.pass || '';
    if (!email) { sh.err = authErr({ code:'MISSING_EMAIL' }); render(); return; } if (!pass) { sh.err = authErr({ code:'MISSING_PASSWORD' }); render(); return; }
    accRun(sh, async () => { const res = await idt('signInWithPassword', { email, password:pass, returnSecureToken:true }); await afterSignIn(res, 'password', sh); }); },
  accSignup: () => { const sh = top(), email = (sh.email || '').trim(), pass = sh.pass || '';
    if (!email) { sh.err = authErr({ code:'MISSING_EMAIL' }); render(); return; } if (pass.length < 6) { sh.err = authErr({ code:'short' }); render(); return; }
    accRun(sh, async () => { const res = await idt('signUp', { email, password:pass, returnSecureToken:true }); await afterSignIn(res, 'password', sh, true); }); },
  accReset: () => { const sh = top(), email = (sh.email || '').trim(); if (!email) { sh.err = authErr({ code:'MISSING_EMAIL' }); render(); return; }
    accRun(sh, async () => { await idt('sendOobCode', { requestType:'PASSWORD_RESET', email, continueUrl:appUrl() }, true); sh.sent = email; }); },
  accSync: () => { cloudSync({ links:true, show:true }); render(); },
  accOut: () => { const sh = top(); if (!sh.outc) { sh.outc = true; render(); return; } signOut(); sh.outc = false; sh.mode = 'login'; toast('Вы вышли. Данные остались на телефоне'); render(); },
  accDel: () => { const sh = top(), a = accOf(); if (!a) return; if (!sh.delc) { sh.delc = true; render(); return; }
    accRun(sh, async () => {
      if (a.prov !== 'google') { const r = await idt('signInWithPassword', { email:a.email, password:sh.cur || '', returnSecureToken:true }); a.it = r.idToken; a.rt = r.refreshToken; a.exp = Date.now() + 3600e3; }
      else if (Date.now() - jwtAuthAt(a.it || '') > 4 * 60000) throw { code:'CREDENTIAL_TOO_OLD_LOGIN_AGAIN' };
      await deleteAccount(sh);
    }); },
  cpairOpen: el => {
    const m = el.dataset.m || 'menu', cur = top();
    if (!accOf()) { openSheet({ type:'acc', mode:'login', why:'Чтобы подключить партнёра', busy:false, err:'' }); return; }
    const sh = cur && cur.type === 'cpair' ? Object.assign(cur, { mode:m, err:'', busy:false, code:m === 'join' ? '' : cur.code }) : (openSheet({ type:'cpair', mode:m, code:'', err:'', busy:false }), top());
    if (m === 'invite' && !sh.code) { (async () => { try { sh.code = await cloudInvite(); } catch (e) { sh.err = authErr(e); } render(); })(); }
    render();
  },
  pairConnect: () => A.cpairOpen({ dataset:{ m:'invite' } }),
  cpairShare: async () => { const sh = top(); if (!sh || !sh.code) return; try { await navigator.share({ title:'Подход', text:`Давай тренироваться вместе в «Подходе». Код: ${fmtCode(sh.code)}`, url:appUrl() + '#join=' + sh.code }); } catch (e) { /* closed */ } },
  cpairCopy: async el => { try { await navigator.clipboard.writeText(el.dataset.v); toast('Ссылка скопирована'); } catch (e) { toast('Не получилось скопировать — перепишите код'); } },
  cpairJoin: () => { const sh = top(); accRun(sh, async () => { const name = await cloudJoin(sh.code); S.sheets = S.sheets.filter(s => s !== sh); toast(`Готово! Вы с ${name} теперь видите тренировки друг друга`); sfx('goal'); confetti(innerWidth / 2, innerHeight * .4, 80); }); },
  cpairUnlink: el => { const sh = top(), id = el.dataset.id; if (sh.un !== id) { sh.un = id; render(); return; } accRun(sh, async () => { await cloudUnlink(id); sh.un = null; toast('Партнёр отключён'); }); },
  welcomeLogin: () => openSheet({ type:'acc', mode:'login', email:'', pass:'', busy:false, err:'', why:'С возвращением' }),
});
SHEETS.news28 = () => `${sheetHead('Что нового', 'Версия ' + APP_VERSION)}<div class="sheet-body">
  <ul class="pr-list news">
    <li>${icon('cloud')}<span><b>Аккаунт</b> — вход через Google или по почте. Тренировки, программы, добавки и настройки хранятся в облаке: новый телефон — и всё на месте. Фото тела остаются только на телефоне</span></li>
    <li>${icon('users')}<span><b>Партнёр по коду</b> — без GitHub: отправьте ссылку или код, и вы видите тренировки, рекорды и чат друг друга</span></li>
    <li>${icon('key')}<span><b>Пароль</b> — можно сменить или восстановить по почте</span></li>
    <li>${icon('check')}<span>Аккаунт не обязателен: без него всё работает как раньше, без интернета</span></li>
  </ul>
</div><footer class="sheet-foot"><button class="btn" data-act="closeSheet">Позже</button><button class="btn btn-primary" data-act="accOpen">${icon('user')} Войти</button></footer>`;

