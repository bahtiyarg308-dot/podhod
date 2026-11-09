/* ================= partner sync (secret GitHub gist, one file per person) ================= */
const GH = 'https://api.github.com';
const KUDOS = [['flame','Огонь'],['heart','Сердце'],['star','Звезда']];
const syncCfg = () => (S.meta && S.meta.sync && S.meta.sync.on && S.meta.sync.gist && S.meta.sync.token) ? S.meta.sync : null;
const ghHeaders = (token, json) => Object.assign({ 'Authorization':'Bearer ' + token, 'Accept':'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28' }, json ? { 'Content-Type':'application/json' } : {});
const SY = { busy:false, again:false, pushT:null };
function rebuildCustom() { RCUSTOM = {}; Object.values(S.remote).forEach(m => ((m.profile && m.profile.custom) || []).forEach(e => { if (e && e.id) RCUSTOM[e.id] = e; })); }
function ensureSids() { let ch = false; ensureMeta().profiles.forEach(p => { if (!p.sid) { p.sid = uid() + uid().slice(-4); ch = true; } }); if (ch) saveMeta(); }
function schedulePush() { cloudSoon(); if (!syncCfg()) return; clearTimeout(SY.pushT); SY.pushT = setTimeout(() => syncNow(), 2500); }
/* Each install has its own device id. It lets a phone notice that another phone writes into the same member file —
   that happens when a partner picked «это я» instead of «я новый участник», and then neither sees the other. */
const devId = () => { const m = ensureMeta(); if (!m.dev) { m.dev = uid() + uid().slice(-4); saveMeta(); } return m.dev; };
const lc = s => String(s || '').trim().toLowerCase();
const writerKey = m => m.dev ? 'd:' + m.dev : 'n:' + lc(m.name);
function writtenByOther(p, m) {
  const trust = (S.meta.sync && S.meta.sync.trust) || [];
  if (m.dev) return m.dev !== devId() && !trust.includes('d:' + m.dev);
  const a = lc(m.name), b = lc(p.name); // files from older app versions have no device id — compare names
  return !!a && !!b && a !== b && !trust.includes('n:' + a);
}
function writtenByMe(p, m) { return m.dev ? m.dev === devId() : lc(m.name) === lc(p && p.name); }
function payload(pid) {
  const p = profiles().find(x => x.id === pid) || {};
  const d = pid === S.pid ? { profile:S.profile, workouts:S.workouts, active:S.active } : (S.store[pid] || {});
  const prof = normP(d.profile), share = shareBodyOn();
  return { v:1, id:p.sid, acc:(accOf(pid) || {}).uid, dev:devId(), name:p.name || '', color:p.color || 'red', char:charOf(p),
    profile:{ goal:prof.goal, custom:prof.custom, body: share ? prof.body : [], meas: share ? prof.meas : [], gear:prof.gear, freeze:prof.freeze.slice(-24),
      chest: prof.chest ? { v:1, at:prof.chest.at, st:prof.chest.st, op:prof.chest.op, buy:prof.chest.buy, old:prof.chest.old || 0, rk:prof.chest.rk, gift:prof.chest.gift } : undefined, sx:supShared(prof) + habShared(prof) },
    workouts:(d.workouts || []).map(w => clean(w)), deleted:prof.deleted.slice(-800), kudos:prof.kudos,
    live: d.active ? { start:d.active.start, title:d.active.title || '' } : null };
}
function validMember(m) {
  if (!m || typeof m !== 'object' || !m.id) return null;
  m.workouts = Array.isArray(m.workouts) ? m.workouts.filter(w => w && w.id && Number.isFinite(w.start) && Array.isArray(w.exercises)).map(w => normW(w, String(w.id))).sort((a, b) => b.start - a.start) : [];
  m.profile = m.profile && typeof m.profile === 'object' && !Array.isArray(m.profile) ? m.profile : {};
  { const pf = m.profile;
    if (!pf.gear || typeof pf.gear !== 'object' || Array.isArray(pf.gear)) pf.gear = {};
    if (!Array.isArray(pf.body)) pf.body = []; if (!Array.isArray(pf.meas)) pf.meas = [];
    pf.freeze = Array.isArray(pf.freeze) ? pf.freeze.filter(f => f && Number.isFinite(f.from) && Number.isFinite(f.to)).slice(-24) : [];
    if (!pf.chest || typeof pf.chest !== 'object' || !pf.chest.op || typeof pf.chest.op !== 'object' || Array.isArray(pf.chest.op)) delete pf.chest;
    else { if (!Array.isArray(pf.chest.st)) pf.chest.st = []; pf.chest.st = pf.chest.st.filter(x => typeof x === 'string'); pf.chest.buy = Array.isArray(pf.chest.buy) ? pf.chest.buy.filter(b => b && typeof b.id === 'string' && Number.isFinite(b.at)) : []; }
    pf.sx = Number.isFinite(pf.sx) ? Math.max(0, pf.sx) : 0; delete pf.supps; delete pf.slog; delete pf.sfull; delete pf.habits; delete pf.hlog; delete pf.hfull; }
  m.kudos = m.kudos && typeof m.kudos === 'object' ? m.kudos : {};
  m.deleted = Array.isArray(m.deleted) ? m.deleted : [];
  if (!COLORS[m.color]) m.color = 'blue';
  if (!CHARS[m.char]) m.char = 'cat';
  return m;
}
async function readMembers(files) {
  const out = {};
  for (const [name, f] of Object.entries(files || {})) {
    if (!/^m-.+\.json$/.test(name)) continue;
    try {
      let txt = f.content;
      if (f.truncated || txt == null) txt = await (await fetch(f.raw_url, { cache:'no-store' })).text();
      const m = validMember(JSON.parse(txt)); if (m) out[m.id] = m;
    } catch (e) { /* skip broken file */ }
  }
  return out;
}
/* ---- chat: each person appends only to their own file c-<sid>.json, so two phones never overwrite each other ---- */
async function readChats(files) {
  const out = {};
  for (const [name, f] of Object.entries(files || {})) {
    const mm = name.match(/^c-(.+)\.json$/); if (!mm) continue;
    try {
      let txt = f.content;
      if (f.truncated || txt == null) txt = await (await fetch(f.raw_url, { cache:'no-store' })).text();
      const j = JSON.parse(txt), sid = mm[1];
      out[sid] = (Array.isArray(j.msgs) ? j.msgs : []).filter(x => x && x.id && Number.isFinite(x.t) && typeof x.x === 'string').map(x => ({ id:String(x.id), t:x.t, x:x.x.slice(0, 2000), a:sid, d:x.d }));
    } catch (e) { /* skip broken file */ }
  }
  return out;
}
const myChat = sid => S.chatMine[sid] || (S.chatMine[sid] = []);
function mergeChats(chats) {
  const mySids = new Set(profiles().map(p => p.sid).filter(Boolean)), all = [];
  let mineChanged = false;
  for (const [sid, list] of Object.entries(chats)) {
    if (mySids.has(sid)) {
      const mine = myChat(sid), byId = new Map(mine.map(x => [x.id, x]));
      list.forEach(x => { const l = byId.get(x.id); if (!l) { mine.push({ id:x.id, t:x.t, x:x.x, d:x.d, ok:true }); mineChanged = true; } else if (!l.ok) { l.ok = true; mineChanged = true; } });
      mine.sort((a, b) => a.t - b.t);
    } else all.push(...list);
  }
  const known = new Set(S.chatAll.map(x => x.id)), seen = ensureMeta().chatSeen || 0;
  const fresh = all.filter(x => !known.has(x.id) && x.t > seen).sort((a, b) => a.t - b.t);
  S.chatAll = all.sort((a, b) => a.t - b.t).slice(-600); KV.set('chat-all', S.chatAll);
  if (mineChanged) KV.set('chat-mine', S.chatMine);
  return fresh;
}
function chatList() {
  const seen = new Set(), out = [];
  const add = x => { if (!seen.has(x.id)) { seen.add(x.id); out.push(x); } };
  profiles().forEach(p => { if (p.sid) myChat(p.sid).forEach(x => add({ ...x, a:p.sid, me:p.id === S.pid, pending:!x.ok })); });
  S.chatAll.forEach(add);
  return out.sort((a, b) => a.t - b.t);
}
const chatUnread = () => { const s = (S.meta && S.meta.chatSeen) || 0; return S.chatAll.filter(x => x.t > s).length; };
function markChatSeen() {
  const last = S.chatAll.length ? S.chatAll[S.chatAll.length - 1].t : 0, m = ensureMeta();
  if (last > (m.chatSeen || 0)) { m.chatSeen = last; saveMeta(); }
}
function notifyChat(fresh) {
  if (!fresh.length) return;
  if (S.view === 'chat' && document.visibilityState === 'visible') {
    const nearBottom = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 160;
    if (nearBottom) S.chatScroll = true; buzz(8); return;
  }
  const x = fresh[fresh.length - 1];
  toast(`${chatName(x.a)}: ${x.x.length > 70 ? x.x.slice(0, 70) + '…' : x.x}`, '', { label:'Открыть', act:'openChat' }); buzz([10, 40, 10]);
}
function chatName(sid) { const lp = profiles().find(p => p.sid === sid); if (lp) return pname(lp); const m = S.remote[sid]; return (m && m.name) || 'Партнёр'; }
function chatWho(sid) { const lp = profiles().find(p => p.sid === sid); if (lp) return { char:charOf(lp), color:pcolor(lp) }; const m = S.remote[sid]; return { char:charOf(m), color:m ? pcolor(m) : null }; }
function viewChat() {
  const names = Object.values(S.remote).map(m => m.name || 'Партнёр');
  const head = headHTML('Чат', names.length ? 'С вами: ' + esc(names.join(', ')) : 'Переписка с партнёром');
  if (!ready()) return head + loadingHTML();
  if (!syncCfg() && !cloudPartnersN()) return `${head}<div class="empty"><h3>Чат появится после подключения партнёра</h3><p>Подключите партнёра — и переписывайтесь прямо в «Подходе», рядом с тренировками.</p><button class="btn btn-primary" data-act="pairConnect">${icon('users')} Подключить</button></div>`;
  const list = chatList(); if (document.visibilityState === 'visible') markChatSeen();
  let day = '', html = '';
  list.forEach(x => {
    const dk = dayKey(x.t);
    if (dk !== day) { day = dk; const rd = relDays(x.t); html += `<p class="c-day" data-key="cd-${dk}">${rd === 'сегодня' ? 'Сегодня' : rd === 'вчера' ? 'Вчера' : dayMonth(x.t)}</p>`; }
    const who = chatWho(x.a);
    html += `<div class="msg${x.me ? ' me' : ''}${x.pending ? ' pending' : ''}" data-key="msg-${esc(x.id)}">${x.me ? '' : charSVG(who.char, 'calm', { color:who.color, still:true })}<div class="msg-b">${x.me ? '' : `<span class="msg-n">${esc(chatName(x.a))}</span>`}${esc(x.x)}<span class="msg-t">${hm(x.t)}${x.pending ? ' · отправляется' : ''}</span></div></div>`;
  });
  return `${head}<div class="chat" id="chat-list">${html || `<div class="empty"><h3>Пока тихо</h3><p>Напишите первое сообщение — партнёр увидит его в течение минуты.</p></div>`}</div>
    <div class="composer"><textarea id="chat-in" data-in="chatText" rows="1" placeholder="Сообщение" aria-label="Сообщение" enterkeyhint="send" maxlength="1000">${esc(S.chatDraft)}</textarea><button class="btn btn-primary" data-act="chatSend" aria-label="Отправить">${icon('send')}</button></div>`;
}
function mergeMember(pid, rem) {
  const d = S.store[pid] || (S.store[pid] = {});
  const prof = normP(d.profile);
  const del = new Set([...prof.deleted, ...rem.deleted]);
  const map = new Map((d.workouts || []).map(w => [w.id, w]));
  let changed = false;
  const rc = rem.profile && rem.profile.chest, fresh = [];
  (rem.workouts || []).forEach(w => { if (del.has(w.id)) return; const l = map.get(w.id); if (!l || (w.u || 0) > (l.u || 0)) { if (!l) fresh.push(w.id); map.set(w.id, normW(w, w.id)); changed = true; } });
  if (prof.chest) { // the same person on another phone: unite opened chests and purchases
    const lc = prof.chest;
    if (rc) {
      Object.entries(rc.op || {}).forEach(([k, v]) => { if (!lc.op[k] && ITEM[v]) { lc.op[k] = v; changed = true; } });
      (rc.buy || []).forEach(b => { if (ITEM[b.id] && !lc.buy.some(x => x.at === b.at && x.id === b.id)) { lc.buy.push({ id:b.id, at:b.at, c:+b.c || 0 }); changed = true; } });
      if (Number.isFinite(rc.rk) && !(lc.rk >= rc.rk)) { lc.rk = rc.rk; changed = true; }
      if (rc.gift && +rc.gift.n > (+(lc.gift || {}).n || 0)) { lc.gift = { d:String(rc.gift.d || ''), n:+rc.gift.n, s:+rc.gift.s || 0 }; changed = true; }
      if (rc.at && Array.isArray(rc.st) && (!lc.at || rc.at < lc.at)) { lc.st = rc.st.slice(0, 12); lc.at = rc.at; lc.old = Math.max(+lc.old || 0, +rc.old || 0); changed = true; }
    } else if (fresh.length) { lc.imp = [...new Set([...(lc.imp || []), ...fresh])]; changed = true; } // an older app version: no chest avalanche
  }
  ((rem.profile && rem.profile.freeze) || []).forEach(f => { if (!prof.freeze.some(x => x.from === f.from)) { prof.freeze.push({ from:f.from, to:f.to }); changed = true; } });
  del.forEach(id => { if (map.has(id)) { map.delete(id); changed = true; } });
  const before = JSON.stringify(prof.kudos);
  prof.kudos = Object.assign({}, rem.kudos || {}, prof.kudos);
  if (JSON.stringify(prof.kudos) !== before) changed = true;
  if (prof.deleted.length !== del.size) { prof.deleted = [...del]; changed = true; }
  ((rem.profile && rem.profile.custom) || []).forEach(e => { if (e && e.id && !prof.custom.some(c => c.id === e.id)) { prof.custom.push(e); changed = true; } });
  d.profile = prof; d.workouts = [...map.values()].sort((a, b) => b.start - a.start);
  return changed;
}
function setSync(status, msg = '') { S.sync.status = status; S.sync.msg = msg; }
async function syncNow(force) {
  const c = syncCfg(); if (!c) return;
  if (SY.busy) { SY.again = true; return; }
  if (navigator.onLine === false) { setSync('offline'); render(); return; }
  SY.busy = true; setSync('syncing');
  const hashes = ensureMeta().syncHash || (S.meta.syncHash = {}), prevHashes = { ...hashes };
  try {
    flush(); syncCur(); ensureSids();
    const h = ghHeaders(c.token); if (S.sync.etag && !force) h['If-None-Match'] = S.sync.etag;
    const r = await fetch(`${GH}/gists/${c.gist}`, { headers:h, cache:'no-store' });
    if (r.status === 401) throw { code:'auth' };
    if (r.status === 404) throw { code:'gone' };
    let files = null, chats = null;
    if (r.status === 200) { S.sync.etag = r.headers.get('ETag'); const j = await r.json(); files = await readMembers(j.files); chats = await readChats(j.files); }
    else if (r.status !== 304) throw { code:'http', status:r.status };
    const out = {};
    if (files) {
      const mine = new Map(profiles().filter(p => p.sid).map(p => [p.sid, p]));
      const left = c.left || [], keepLeft = [];
      const rem = {}, found = {}; let localChanged = false;
      for (const [sid, m] of Object.entries(files)) {
        const p = mine.get(sid);
        if (p) {
          // another phone writes into this member: don't mix its workouts into ours, show a warning instead
          if (writtenByOther(p, m)) { found[p.id] = { name:m.name || '', key:writerKey(m), at:m.updated || Date.now() }; continue; }
          if (mergeMember(p.id, m)) { localChanged = true; KV.set('p:' + p.id, S.store[p.id]); }
        } else if (left.includes(sid) && profiles().some(q => writtenByMe(q, m))) {
          out[`m-${sid}.json`] = null; keepLeft.push(sid); // our own stale file from before «Разделить» — remove it
        } else rem[sid] = m;
      }
      c.left = keepLeft.length ? keepLeft : undefined;
      const prev = c.clash || {}, next = {};
      for (const p of profiles()) {
        if (!p.sid) continue;
        const x = found[p.id] || prev[p.id];
        if (!x || !files[p.sid]) continue; // the other phone deleted the shared file — conflict is over
        const moved = Object.values(rem).some(m => writerKey(m) === x.key || (x.name && lc(m.name) === lc(x.name)));
        if (found[p.id] || (!moved && Date.now() - x.at < 7 * DAY)) next[p.id] = x;
      }
      c.clash = Object.keys(next).length ? next : undefined;
      S.remote = Object.assign(rem, S.cremote || {}); S.rd = {}; rebuildCustom(); KV.set('remote', S.remote);
      S.sync.files = new Set(Object.keys(files));
      if (localChanged) loadProfileData();
    }
    if (chats) { S.sync.cfiles = new Set(Object.keys(chats)); notifyChat(mergeChats(chats)); }
    for (const p of profiles()) {
      if (!p.sid) continue;
      const list = myChat(p.sid); if (!list.length) continue;
      const body = JSON.stringify({ v:1, id:p.sid, msgs:list.slice(-300).map(x => ({ id:x.id, t:x.t, x:x.x, d:x.d })) }), hh = hash(body);
      const missing = S.sync.cfiles && !S.sync.cfiles.has(p.sid);
      if (hh !== hashes['c:' + p.id] || missing) { out[`c-${p.sid}.json`] = { content:body }; hashes['c:' + p.id] = hh; }
    }
    for (const p of profiles()) {
      if (!p.sid) continue;
      const pl = payload(p.id), hh = hash(JSON.stringify(pl));
      const missing = S.sync.files && !S.sync.files.has(p.sid);
      if (hh !== hashes[p.id] || missing) { pl.updated = Date.now(); out[`m-${p.sid}.json`] = { content:JSON.stringify(pl) }; hashes[p.id] = hh; }
    }
    if (Object.keys(out).length) {
      const pr = await fetch(`${GH}/gists/${c.gist}`, { method:'PATCH', headers:ghHeaders(c.token, true), body:JSON.stringify({ files:out }) });
      if (pr.status === 401) throw { code:'auth' };
      if (!pr.ok) throw { code:'http', status:pr.status };
      S.sync.etag = null; if (!S.sync.files) S.sync.files = new Set();
      profiles().forEach(p => p.sid && S.sync.files.add(p.sid));
      if (!S.sync.cfiles) S.sync.cfiles = new Set();
      Object.keys(out).forEach(k => { const mm = k.match(/^c-(.+)\.json$/); if (mm && out[k]) S.sync.cfiles.add(mm[1]); });
      let ch = false; profiles().forEach(p => p.sid && myChat(p.sid).forEach(x => { if (!x.ok) { x.ok = true; ch = true; } })); if (ch) KV.set('chat-mine', S.chatMine);
    }
    saveMeta(); setSync('ok'); S.sync.last = Date.now();
    notifyRemote();
  } catch (e) {
    S.meta.syncHash = prevHashes; S.sync.etag = null;
    if (e && e.code === 'auth') setSync('error', 'Ключ доступа не работает: его удалили или у него истёк срок. Создайте новый и подключитесь заново.');
    else if (e && e.code === 'gone') setSync('error', 'Общее пространство не найдено — возможно, его удалили на GitHub.');
    else if (e && e.code === 'http') setSync('error', `GitHub ответил ошибкой ${e.status}. Попробуем ещё раз позже.`);
    else setSync('offline');
  } finally {
    SY.busy = false; render();
    if (SY.again) { SY.again = false; setTimeout(() => syncNow(), 600); }
  }
}
function notifyRemote() {
  const meta = ensureMeta(), seen = meta.seenRemote || (meta.seenRemote = {});
  const firstK = !meta.seenKudos; const seenK = new Set(meta.seenKudos || []); const mySid = curProf().sid; let ch = firstK;
  Object.values(S.remote).forEach(m => {
    const newest = m.workouts.length ? m.workouts[0].start : 0;
    if (seen[m.id] == null) { seen[m.id] = newest; ch = true; }
    else if (newest > seen[m.id]) { const w = m.workouts[0], pr = rdFor(m.id).prCount[w.id] || 0; toast(`${m.name || 'Партнёр'}: новая тренировка «${w.title || 'Тренировка'}»${pr ? ` · ${pr} PR` : ''}`, pr ? 'pr' : ''); seen[m.id] = newest; ch = true; }
    if (mySid) Object.entries(m.kudos || {}).forEach(([key, type]) => {
      if (!key.startsWith(mySid + '/')) return; const id = m.id + '|' + key + '|' + type; if (seenK.has(id)) return;
      seenK.add(id); ch = true; const w = S.workouts.find(x => x.id === key.split('/')[1]); const kn = (KUDOS.find(k => k[0] === type) || ['', 'Реакция'])[1];
      if (w && !firstK) setTimeout(() => toast(`${m.name || 'Партнёр'}: «${kn}» за тренировку «${w.title || 'Тренировка'}»`), 900);
    });
  });
  if (ch) { meta.seenKudos = [...seenK].slice(-600); saveMeta(); }
}
const inviteCode = () => { const c = syncCfg(); if (!c) return ''; return 'PDH1-' + btoa(JSON.stringify({ g:c.gist, t:c.token })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
function parseCode(s) {
  // the code may arrive inside a forwarded message («Код для общих тренировок…: PDH1-…») — find it anywhere in the text
  try { const mt = String(s).replace(/\s+/g, '').match(/PDH1-([A-Za-z0-9_-]+)/i); if (!mt) return null; const b = mt[1].replace(/-/g, '+').replace(/_/g, '/'); const j = JSON.parse(atob(b + '==='.slice((b.length + 3) % 4))); return j && j.g && j.t ? j : null; } catch (e) { return null; }
}
function clashHTML(where) {
  const cl = syncCfg() && S.meta.sync.clash; if (!cl) return '';
  return Object.entries(cl).map(([pid, x]) => {
    const p = profiles().find(q => q.id === pid); if (!p) return '';
    const other = x.name && lc(x.name) !== lc(p.name) ? ` — там имя «${esc(x.name)}»` : '';
    return `<div class="banner warn"${where ? ` style="margin-top:0;margin-bottom:12px"` : ''}><div class="banner-t">${icon('users')}<span><b>Два телефона в одном профиле.</b> Ещё один телефон${other} записывает тренировки в профиль «${esc(pname(p))}», поэтому вы не видите друг друга. Если это ваш партнёр, нажмите «Разделить» на любом из двух телефонов.</span></div><div class="banner-a"><button class="btn btn-sm btn-primary" data-act="syncSplit" data-id="${esc(pid)}">Разделить</button><button class="btn btn-sm btn-ghost" data-act="syncTrust" data-id="${esc(pid)}">Это тоже я</button></div></div>`;
  }).join('');
}
function kudosFor(wid) { const sid = curProf().sid; if (!sid) return []; const out = []; Object.values(S.remote).forEach(m => { const t = m.kudos && m.kudos[sid + '/' + wid]; if (t) out.push({ m, t }); }); return out; }
const agoText = ms => { const s = (Date.now() - ms) / 1000; if (s < 60) return 'только что'; if (s < 3600) return `${Math.floor(s / 60)} мин назад`; if (s < 86400) return `в ${hm(ms)}`; return relDays(ms); };
function syncStatusText() {
  const st = S.sync.status;
  if (st === 'syncing') return 'Синхронизация…';
  if (st === 'offline') return 'Нет связи — обновится, когда появится интернет.';
  if (st === 'error') return S.sync.msg;
  return S.sync.last ? `Подключено · обновлено ${agoText(S.sync.last)}` : 'Подключено';
}

async function boot() {
  buildNav(); applyTheme(); render();
  await KV.open();
  S.meta = await KV.get('meta'); if (S.meta && S.meta.chatSeen == null) S.meta.chatSeen = Date.now();
  S.remote = (await KV.get('remote')) || {}; Object.values(S.remote).forEach(validMember); rebuildCustom();
  S.cremote = Object.fromEntries(Object.entries(S.remote).filter(([, m]) => m && m.cloud));
  S.chatMine = (await KV.get('chat-mine')) || {}; S.chatAll = (await KV.get('chat-all')) || [];
  const ids = profiles().map(p => p.id);
  for (const id of ids) S.store[id] = (await KV.get('p:' + id)) || {};
  S.pid = (S.meta && S.meta.cur && ids.includes(S.meta.cur)) ? S.meta.cur : 'main';
  S.mode = 'local'; S.metaLoaded = true;
  loadProfileData(); applyAccent(); applyTheme();
  ERRLOG.push(...(((await KV.get('errlog')) || []).slice(-30))); await snapDaily();
  try { if (navigator.storage && navigator.storage.persisted) S.persisted = await navigator.storage.persisted(); } catch (e) { S.persisted = null; }
  if (isStandalone() && !S.persisted) requestPersist();
  if (syncCfg()) setSync('ok');
  render();
  registerSW();
  if (syncCfg()) syncNow(true);
  joinFromHash(); await googleFinish(); await authLink(); await verifyBoot();
  if (cloudOn()) cloudSync({ links:true });
}
window.addEventListener('online', () => { syncNow(); cloudSync(); });
setInterval(() => { if (document.visibilityState === 'visible') { syncNow(); cloudSync(); } }, 90000);
setInterval(() => { if (S.view === 'chat' && document.visibilityState === 'visible') { syncNow(); cloudSync(); } }, 15000);

