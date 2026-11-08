// local stand-in for Firebase Auth (Identity Toolkit + Secure Token) and Firestore REST, with the same access rules as firestore.rules
const http = require('http');
const PORT = +(process.env.PORT || 8899);
const users = {};   // email -> { uid, pass, prov }
const tokens = {};  // refresh -> uid
const docs = {};    // path -> { fields, updateTime }
const log = [];
let n = 0;
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const mails = [], AUTOVER = !!process.env.AUTOVERIFY;
const userBy = uid => Object.values(users).find(x => x.uid === uid);
const idTok = (uid, at) => { const u = userBy(uid); return 'h.' + b64({ uid, ev: !!(u && u.ver), auth_time: Math.floor((at || Date.now()) / 1000), r: ++n }) + '.s'; };
const evOf = tok => { try { return !!JSON.parse(Buffer.from(tok.split('.')[1], 'base64url')).ev; } catch (e) { return false; } };
const uidOf = tok => { try { return JSON.parse(Buffer.from(tok.split('.')[1], 'base64url')).uid; } catch (e) { return null; } };
const DB = 'projects/podhod-5d27f/databases/default/documents';
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }); res.end(JSON.stringify(obj)); };
const err = (res, code, message) => send(res, code, { error: { code, message } });
const session = (res, u, extra = {}) => { const rt = 'rt' + (++n); tokens[rt] = u.uid; u.at = Date.now(); send(res, 200, Object.assign({ localId: u.uid, email: u.email, idToken: idTok(u.uid, u.at), refreshToken: rt, expiresIn: '3600' }, extra)); };
const val = v => v == null ? null : 'integerValue' in v ? +v.integerValue : 'stringValue' in v ? v.stringValue : null;
const data = p => { const d = docs[p]; if (!d) return null; const o = {}; for (const k in d.fields) o[k] = val(d.fields[k]); return o; };
// ---- rules (mirror of firestore.rules) ----
const DENY = !!process.env.DENY_LINKS;
function canRead(uid, p) {
  if (!uid) return false;
  if (DENY && /^(invites|links)\//.test(p)) return false;
  let m = p.match(/^users\/([^/]+)\/(pv|pb|w)\/[^/]+$/);
  if (m) return m[1] === uid || (m[2] !== 'pv' && !!docs[`links/${m[1]}_${uid}`]);
  if (/^invites\/[^/]+$/.test(p)) return true;
  m = p.match(/^links\/[^/]+$/); if (m) { const d = data(p); return !d || d.owner === uid || d.reader === uid; }
  return false;
}
function canWrite(uid, p, newData, isDelete) {
  if (!uid) return false;
  if (DENY && /^(invites|links)\//.test(p)) return false;
  let m = p.match(/^users\/([^/]+)\/(pv|pb|w)\/[^/]+$/); if (m) return m[1] === uid;
  m = p.match(/^invites\/([^/]+)$/);
  if (m) { const cur = data(p); if (isDelete) return !!cur && cur.uid === uid; if (cur) return false; return newData.uid === uid && m[1].length >= 10; }
  m = p.match(/^links\/([^/]+)$/);
  if (m) {
    const cur = data(p);
    if (isDelete) return !!cur && (cur.owner === uid || cur.reader === uid);
    if (cur) return false; // no update rule
    if (m[1] !== newData.owner + '_' + newData.reader || newData.owner === newData.reader) return false;
    if (newData.owner === uid) return true;
    if (newData.reader !== uid) return false;
    const inv = newData.code && data('invites/' + newData.code);
    return !!inv && inv.uid === newData.owner && inv.exp > Date.now();
  }
  return false;
}
const docOut = p => ({ name: DB + '/' + p, fields: docs[p].fields, updateTime: docs[p].updateTime });
http.createServer((req, res) => {
  let body = ''; req.on('data', c => body += c); req.on('end', () => {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    const url = new URL(req.url, 'http://x'), path = url.pathname;
    let j = {}; try { j = body ? JSON.parse(body) : {}; } catch (e) { j = Object.fromEntries(new URLSearchParams(body)); }
    log.push(req.method + ' ' + path);
    if (path === '/__state') return send(res, 200, { users: Object.keys(users), docs: Object.fromEntries(Object.keys(docs).map(k => [k, data(k)])), calls: log.length });
    if (path === '/__mails') return send(res, 200, mails);
    if (path === '/__verify') { const u = users[url.searchParams.get('email')]; if (u) u.ver = true; return send(res, 200, { ok: !!u }); }
    if (path === '/__log') return send(res, 200, log.slice(-200));
    // ---- auth ----
    if (path.startsWith('/idt/accounts:')) {
      const m = path.slice('/idt/accounts:'.length);
      if (m === 'signUp') { if (!j.email || !/@/.test(j.email)) return err(res, 400, 'INVALID_EMAIL'); if (users[j.email]) return err(res, 400, 'EMAIL_EXISTS'); if (!j.password || j.password.length < 6) return err(res, 400, 'WEAK_PASSWORD : Password should be at least 6 characters'); const u = users[j.email] = { uid: 'U' + (++n) + Math.random().toString(36).slice(2, 8), email: j.email, pass: j.password, prov: 'password', ver: AUTOVER }; return session(res, u); }
      if (m === 'signInWithPassword') { const u = users[j.email]; if (!u || u.pass !== j.password) return err(res, 400, 'INVALID_LOGIN_CREDENTIALS'); return session(res, u); }
      if (m === 'sendOobCode') { if (j.requestType === 'PASSWORD_RESET') { if (!/@/.test(j.email || '')) return err(res, 400, 'INVALID_EMAIL'); mails.push({ type: 'reset', email: j.email, code: 'oob' + (++n), ru: req.headers['x-firebase-locale'] || '', cu: j.continueUrl || '' }); return send(res, 200, { email: j.email }); } if (j.requestType === 'VERIFY_EMAIL') { const u = userBy(uidOf(j.idToken)); if (!u) return err(res, 400, 'INVALID_ID_TOKEN'); mails.push({ type: 'verify', email: u.email, code: 'oob' + (++n), ru: req.headers['x-firebase-locale'] || '', cu: j.continueUrl || '' }); return send(res, 200, { email: u.email }); } return err(res, 400, 'BAD_REQUEST'); }
      if (m === 'lookup') { const u = userBy(uidOf(j.idToken)); if (!u) return err(res, 400, 'INVALID_ID_TOKEN'); return send(res, 200, { users: [{ localId: u.uid, email: u.email, emailVerified: !!u.ver }] }); }
      if (m === 'resetPassword') { const ml = mails.find(x => x.code === j.oobCode && x.type === 'reset'); if (!ml) return err(res, 400, 'INVALID_OOB_CODE'); if ((j.newPassword || '').length < 6) return err(res, 400, 'WEAK_PASSWORD'); users[ml.email].pass = j.newPassword; ml.used = 1; return send(res, 200, { email: ml.email }); }
      if (m === 'update' && j.oobCode) { const ml = mails.find(x => x.code === j.oobCode && x.type === 'verify' && !x.used); if (!ml) return err(res, 400, 'INVALID_OOB_CODE'); users[ml.email].ver = true; ml.used = 1; return send(res, 200, { email: ml.email }); }
      if (m === 'update') { const uid = uidOf(j.idToken), u = Object.values(users).find(x => x.uid === uid); if (!u) return err(res, 400, 'INVALID_ID_TOKEN'); if (j.password) { if (j.password.length < 6) return err(res, 400, 'WEAK_PASSWORD'); u.pass = j.password; } return session(res, u); }
      if (m === 'delete') { const uid = uidOf(j.idToken), u = Object.values(users).find(x => x.uid === uid); if (!u) return err(res, 400, 'USER_NOT_FOUND'); if (Date.now() - u.at > 5 * 60000) return err(res, 400, 'CREDENTIAL_TOO_OLD_LOGIN_AGAIN'); delete users[u.email]; return send(res, 200, {}); }
      if (m === 'createAuthUri') return send(res, 200, { authUri: `http://127.0.0.1:${PORT}/google?r=${encodeURIComponent(j.continueUri)}`, sessionId: 'sess' + (++n), providerId: 'google.com' });
      if (m === 'signInWithIdp') { const mm = String(j.requestUri || '').match(/id_token=([^&]+)/); if (!mm || !String(j.sessionId || '').startsWith('sess')) return err(res, 400, 'INVALID_IDP_RESPONSE'); const email = decodeURIComponent(mm[1]); const u = users[email] || (users[email] = { uid: 'G' + (++n) + Math.random().toString(36).slice(2, 8), email, prov: 'google', ver: true }); return session(res, u, { providerId: 'google.com', displayName: 'Гугл Тестов' }); }
      return err(res, 400, 'UNKNOWN ' + m);
    }
    if (path === '/google') { const r = url.searchParams.get('r'); res.writeHead(302, { Location: r + '#state=x&id_token=' + encodeURIComponent(process.env.GEMAIL || 'g@test.ru') }); return res.end(); }
    if (path === '/stk') { const uid = tokens[j.refresh_token]; if (!uid) return err(res, 400, 'INVALID_REFRESH_TOKEN'); const u = Object.values(users).find(x => x.uid === uid); if (!u) return err(res, 400, 'USER_NOT_FOUND'); const rt = 'rt' + (++n); tokens[rt] = uid; return send(res, 200, { id_token: idTok(uid, u.at), refresh_token: rt, expires_in: '3600', user_id: uid }); }
    // ---- firestore ----
    if (path.startsWith('/fs/')) {
      const auth = (req.headers.authorization || '').replace('Bearer ', ''), uid = uidOf(auth);
      if (!uid || !Object.values(users).some(u => u.uid === uid)) return err(res, 401, 'UNAUTHENTICATED');
      if (!evOf(auth)) return err(res, 403, 'PERMISSION_DENIED');
      const rest = path.slice(4);
      if (req.method === 'GET') { const p = rest.slice(DB.length + 1); if (!canRead(uid, p)) return err(res, 403, 'PERMISSION_DENIED'); if (!docs[p]) return err(res, 404, 'NOT_FOUND'); return send(res, 200, docOut(p)); }
      if (rest === DB + ':batchGet') { const out = []; for (const name of j.documents || []) { const p = name.slice(DB.length + 1); if (!canRead(uid, p)) return err(res, 403, 'PERMISSION_DENIED'); out.push(docs[p] ? { found: docOut(p) } : { missing: name }); } return send(res, 200, out); }
      if (rest === DB + ':commit') {
        const ws = j.writes || [];
        for (const w of ws) { // validate all first: commit is atomic
          const name = w.update ? w.update.name : w.delete, p = name.slice(DB.length + 1);
          if (w.currentDocument && w.currentDocument.exists === false && docs[p]) return err(res, 400, 'FAILED_PRECONDITION');
          const nd = w.update ? Object.fromEntries(Object.entries(w.update.fields || {}).map(([k, v]) => [k, val(v)])) : null;
          if (!canWrite(uid, p, nd, !!w.delete)) return err(res, 403, 'PERMISSION_DENIED');
        }
        for (const w of ws) { const name = w.update ? w.update.name : w.delete, p = name.slice(DB.length + 1); if (w.delete) delete docs[p]; else docs[p] = { fields: w.update.fields, updateTime: new Date().toISOString() }; }
        return send(res, 200, { commitTime: new Date().toISOString() });
      }
      if (rest === DB + ':runQuery') {
        const q = j.structuredQuery, coll = q.from[0].collectionId, f = q.where.fieldFilter, key = f.field.fieldPath, v = f.value.stringValue;
        const hits = Object.keys(docs).filter(p => p.startsWith(coll + '/') && p.split('/').length === 2 && data(p)[key] === v);
        if (coll === 'links' && (DENY || v !== uid)) return err(res, 403, 'PERMISSION_DENIED');
        return send(res, 200, hits.length ? hits.map(p => ({ document: docOut(p), readTime: new Date().toISOString() })) : [{ readTime: new Date().toISOString() }]);
      }
      return err(res, 400, 'BAD ' + rest);
    }
    err(res, 404, 'NOT_FOUND');
  });
}).listen(PORT, '127.0.0.1');
