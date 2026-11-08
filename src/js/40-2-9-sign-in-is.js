/* ================= 2.9: sign-in is required, e-mail must be confirmed ================= */
const NEWS_FLAGS = ['v2seen', 'v22seen', 'v23seen', 'v24seen', 'v25seen', 'v26seen', 'v27seen', 'v271seen', 'v28seen'];
const verOk = a => !!a && !a.bad && a.ver !== 0;
const gateOk = () => Object.values(accs()).some(verOk);
const gateSheet = () => S.sheets.find(s => s.gate);
const gateDone = () => { S.sheets = S.sheets.filter(s => !s.gate); };
const unverAcc = () => Object.values(accs()).find(a => a.ver === 0 && !a.bad);
const gateHead = (title, eyebrow = '') => `<header class="sheet-head"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h2 id="sheet-title">${title}</h2></div></header>`;
async function sendVerify(acc, force) {
  if (!force && acc.vs && Date.now() - acc.vs < 55000) return;
  acc.vs = Date.now(); saveMeta();
  await idt('sendOobCode', { requestType:'VERIFY_EMAIL', idToken:await accToken(acc), continueUrl:appUrl() }, true);
}
async function checkVerified(acc) {
  const j = await idt('lookup', { idToken:await accToken(acc) }), u = (j.users || [])[0];
  if (!u) throw { code:'relogin' };
  if (u.emailVerified) { acc.ver = 1; await accToken(acc, true); saveMeta(); return true; } // a fresh token carries the «verified» mark the cloud rules look for
  acc.ver = 0; saveMeta(); return false;
}
let vPoll = null;
function verifyWatch(on) { clearInterval(vPoll); vPoll = on ? setInterval(verifyTick, 4000) : null; }
async function verifyTick() {
  const a = unverAcc(); if (!a) { verifyWatch(false); return; }
  if (document.visibilityState !== 'visible' || navigator.onLine === false) return;
  try { if (await checkVerified(a)) { verifyWatch(false); await finishSignIn(true); } } catch (e) { /* try again in a moment */ }
}
async function verifyBoot() {
  for (const a of Object.values(accs())) {
    if (a.prov === 'google') { a.ver = 1; continue; }
    if (a.bad || a.ver === 1 || navigator.onLine === false) continue;
    try { if (!(await checkVerified(a))) { sendVerify(a).catch(() => {}); verifyWatch(true); } } catch (e) { if (e && e.code === 'relogin') a.bad = 1; }
  }
  saveMeta(); render();
}
async function finishSignIn(celebrate) {
  const m = ensureMeta(), a = Object.values(accs()).find(verOk), fresh = !curProf().name;
  if (fresh) { NEWS_FLAGS.forEach(k => { m[k] = true; }); if (!m.mode) m.mode = 'solo'; if (m.chatSeen == null) m.chatSeen = Date.now(); }
  saveMeta(); buzz([10, 40, 10]); sfx(celebrate ? 'goal' : 'quest'); gateDone();
  if (celebrate) { S.sheets.push({ type:'verified', key:uid() }); setTimeout(() => confetti(innerWidth / 2, innerHeight * .32, 120), 450); }
  render();
  await cloudSync({ first:true, links:true, show:true });
  const p = curProf();
  if (!p.name) { S.welcomed = true; S.sheets = S.sheets.filter(s => s.type !== 'welcome'); S.sheets.unshift({ type:'welcome', name:String((a && a.dn) || '').split(' ')[0].slice(0, 24), color:'lime', char:'cat', key:uid() }); applyAccent('lime'); toast('Почта подтверждена. Осталось познакомиться'); }
  else toast(fresh ? `С возвращением, ${p.name}! Данные загружены` : 'Аккаунт подключён — данные в облаке');
  if (S.pendingJoin) { const code = S.pendingJoin; S.pendingJoin = null; try { localStorage.removeItem('podhod-join'); } catch (e) { /* private mode */ } openSheet({ type:'cpair', mode:'join', code, busy:false, err:'' }); }
  render();
}
async function afterSignIn(res, prov, sh, isNew) {
  const m = ensureMeta(), u = res.localId;
  m.accs = m.accs || {};
  const other = Object.entries(m.accs).find(([pid, a]) => a.uid === u && pid !== S.pid);
  if (other) switchProfile(other[0]);
  const pid = other ? other[0] : S.pid, old = m.accs[pid];
  if (old && old.uid !== u) { delete CL.st[old.uid]; KV.del('cs:' + old.uid); }
  const a = m.accs[pid] = { uid:u, email:res.email || (old && old.email) || '', prov, rt:res.refreshToken, it:res.idToken, exp:Date.now() + (+res.expiresIn || 3600) * 1000, dn:res.displayName || '' };
  if (prov === 'google' || res.emailVerified === true) a.ver = 1;
  else if (isNew) a.ver = 0;
  else { try { await checkVerified(a); } catch (e) { a.ver = 0; } }
  saveMeta();
  if (sh) { sh.busy = false; sh.pass = ''; sh.err = ''; }
  if (a.ver === 0) {
    const g = gateSheet() || sh || top();
    try { await sendVerify(a, !!isNew); } catch (e) { if (g) g.err = authErr(e); }
    if (g) { g.mode = 'verify'; g.gate = true; }
    verifyWatch(true); render(); return;
  }
  verifyWatch(false); await finishSignIn();
}
/* links from the e-mails: …/?mode=verifyEmail&oobCode=… and …/?mode=resetPassword&oobCode=… (if the action URL is set to the app in Firebase) */
async function authLink() {
  const q = new URLSearchParams(location.search), mode = q.get('mode'), oob = q.get('oobCode'); if (!mode || !oob) return;
  history.replaceState(null, '', appUrl() + (location.hash || ''));
  if (mode === 'verifyEmail') {
    try { await idt('update', { oobCode:oob }); toast('Почта подтверждена. Вернитесь в приложение и войдите'); verifyTick(); } catch (e) { toast(authErr(e)); }
  } else if (mode === 'resetPassword') {
    const g = gateSheet(), sh = { type:'acc', gate:!gateOk(), mode:'newpass', oob, pass:'', busy:false, err:'', key:uid() };
    if (g) Object.assign(g, sh, { key:g.key }); else S.sheets = [sh];
    render();
  }
}

const gateH = (t, e = '') => `<div class="gate-h">${e ? `<div class="eyebrow">${e}</div>` : ''}<h2 id="sheet-title">${t}</h2></div>`;
const accBody = sh => {
  const H = sh.gate ? gateH : sheetHead, a = sh.gate ? null : accOf(), pw = sh.eye ? 'text' : 'password', mode = sh.mode || 'login';
  const err = sh.err ? `<p class="acc-err" role="alert">${esc(sh.err)}</p>` : '', busy = sh.busy ? ' disabled aria-busy="true"' : '';
  if (mode === 'start') return `<div class="sheet-body"><ul class="gate-feats">${['Подходы, рекорды, прогресс', 'Напарник, который растёт вместе с вами', 'Данные в облаке — на любом телефоне'].map((t, i) => `<li><span class="num">0${i + 1}</span><span>${t}</span></li>`).join('')}</ul>
    <button class="btn btn-primary btn-lg btn-block" data-act="accMode" data-m="signup">Создать аккаунт</button>
    <button class="btn btn-g btn-lg btn-block" data-act="accGoogle"${busy}>${GLOGO} Продолжить с Google</button>
    ${err}<button class="link gate-has" data-act="accMode" data-m="login">У меня уже есть аккаунт</button></div>`;
  if (mode === 'verify') {
    const u = unverAcc(), cool = (sh.cool || 0) > Date.now();
    return `${H('Подтвердите почту', 'Последний шаг')}<div class="sheet-body">
      ${sh.gate ? '' : `<div class="ver-hero"><div class="ver-mate wait">${charSVG(charOf(curProf()), 'calm')}</div></div>`}
      <div class="hint">${icon('cloud')}<span>Мы отправили письмо на <b>${esc(u ? u.email : '')}</b>. Откройте ссылку в письме и вернитесь сюда — вход откроется сам. Письмо придёт от адреса noreply@podhod-5d27f.firebaseapp.com. Нет пару минут — загляните в «Спам» и «Промоакции».</span></div>
      ${err}<button class="btn btn-primary btn-block" style="margin-top:14px" data-act="accCheck"${busy}>${sh.busy ? 'Проверяем…' : 'Я подтвердил'}</button>
      <button class="btn btn-block" data-act="accResend"${cool || sh.busy ? ' disabled' : ''}>${cool ? 'Письмо отправлено' : 'Отправить письмо ещё раз'}</button>
      <button class="btn btn-ghost btn-block" data-act="accOut2">Другая почта</button></div>`;
  }
  if (mode === 'newpass') return `${H('Новый пароль', 'Восстановление')}<div class="sheet-body">${sh.done
    ? `<div class="hint">${icon('check')}<span>Пароль изменён. Теперь войдите с новым паролем.</span></div><button class="btn btn-primary btn-block" style="margin-top:14px" data-act="accMode" data-m="login">Войти</button>`
    : `<form class="acc-form" onsubmit="return false">${accField('acc-new', 'Новый пароль', 'pass', sh, { type:pw, ac:'new-password', eye:true, ek:'done', ph:'Не меньше 6 символов' })}${err}<button class="btn btn-primary btn-block" data-act="accNewPass"${busy}>${sh.busy ? 'Сохраняем…' : 'Сохранить пароль'}</button></form>`}</div>`;
  if (a && mode !== 'pass' && mode !== 'del') {
    return `${H('Аккаунт', esc(pname(curProf())))}<div class="sheet-body">
      <div class="acc-card"><span class="acc-ava" aria-hidden="true">${a.prov === 'google' ? GLOGO : icon('user')}</span><span class="acc-id"><b>${esc(a.email || 'Аккаунт')}</b><small>${a.prov === 'google' ? 'Вход через Google' : 'Вход по почте, почта подтверждена'}</small></span></div>
      <p class="acc-st${a.bad || CL.status === 'err' ? ' bad' : ''}" role="status">${icon(CL.status === 'sync' ? 'repeat' : 'cloud')} ${esc(cloudText())}</p>
      ${a.bad ? `<button class="btn btn-primary btn-block" data-act="accRelogin">Войти заново</button>` : `<button class="btn btn-block" data-act="accSync"${CL.busy ? ' disabled' : ''}>${icon('repeat')} Синхронизировать сейчас</button>`}
      <div class="hint" style="margin-top:14px">${icon('cloud')}<span><b>Что хранится в облаке:</b> тренировки, программы, добавки, вес и замеры, сундуки и гардероб, настройки. Войдите с другого телефона — всё появится там. <b>Фото тела остаются только на этом телефоне.</b></span></div>
      <div class="sblock"><div class="row">${a.prov !== 'google' ? `<button class="btn btn-sm" data-act="accMode" data-m="pass">${icon('key')} Сменить пароль</button>` : ''}<button class="btn btn-sm" data-act="accOut">${icon('logout')} ${sh.outc ? 'Точно выйти?' : 'Выйти'}</button><button class="btn btn-sm btn-danger-soft" data-act="accMode" data-m="del">${icon('trash')} Удалить аккаунт</button></div>
      <p class="fine" style="margin:10px 0 0">После выхода нужно будет войти снова. Данные на телефоне остаются.</p></div>
    </div>`;
  }
  if (a && mode === 'pass') return `${H('Смена пароля', esc(a.email))}<div class="sheet-body">${sh.sent
    ? `<div class="hint">${icon('check')}<span>Письмо отправлено на <b>${esc(sh.sent)}</b>. Откройте ссылку в письме, задайте новый пароль и войдите снова. Письма нет — загляните в «Спам».</span></div><button class="btn btn-block" style="margin-top:14px" data-act="accMode" data-m="me">Готово</button>`
    : `<p>Для безопасности пароль меняется по ссылке из письма. Мы отправим её на <b>${esc(a.email)}</b>.</p>${err}<button class="btn btn-primary btn-block" data-act="accPassMail"${busy}>${sh.busy ? 'Отправляем…' : 'Прислать письмо'}</button><button class="btn btn-ghost btn-block" data-act="accMode" data-m="me">Назад</button>`}</div>`;
  if (a && mode === 'del') {
    const fresh = Date.now() - jwtAuthAt(a.it || '') < 4 * 60000;
    return `${H('Удалить аккаунт', esc(a.email))}<div class="sheet-body">
      <p>Удалим аккаунт и всё, что хранится в облаке: тренировки, программы, добавки, вес. Партнёр перестанет видеть ваши тренировки. <b>На этом телефоне данные останутся</b>, но чтобы пользоваться приложением дальше, нужно будет создать аккаунт заново.</p>
      ${a.prov === 'google' && !fresh ? `<div class="hint">${icon('help')}<span>Для удаления Google просит подтвердить, что это вы. Войдите через Google ещё раз — и сразу удаляйте.</span></div><button class="btn btn-block" style="margin-top:12px" data-act="accGoogle">${GLOGO} Подтвердить через Google</button>`
        : `${a.prov === 'google' ? '' : accField('acc-dp', 'Пароль для подтверждения', 'cur', sh, { type:pw, ac:'current-password', eye:true, ek:'done' })}${err}<button class="btn btn-danger btn-block" style="margin-top:12px" data-act="accDel"${busy}>${sh.busy ? 'Удаляем…' : sh.delc ? 'Да, удалить навсегда' : 'Удалить аккаунт и облако'}</button>`}
      <button class="btn btn-ghost btn-block" data-act="accMode" data-m="me">Отмена</button></div>`;
  }
  if (mode === 'reset') return `${H('Восстановить пароль', 'Аккаунт')}<div class="sheet-body">${sh.sent
      ? `<div class="hint">${icon('check')}<span>Если такой аккаунт есть, письмо уже летит на <b>${esc(sh.sent)}</b>. Откройте ссылку из письма, задайте новый пароль и войдите. Письма нет пару минут — загляните в «Спам».</span></div><button class="btn btn-primary btn-block" style="margin-top:14px" data-act="accMode" data-m="login">Ко входу</button>`
      : `<form class="acc-form" onsubmit="return false">${accField('acc-email', 'Почта', 'email', sh, { type:'email', ac:'email', im:'email', ek:'send', ph:'name@mail.ru' })}${err}
        <button class="btn btn-primary btn-block" data-act="accReset"${busy}>${sh.busy ? 'Отправляем…' : 'Прислать ссылку'}</button><button class="btn btn-ghost btn-block" type="button" data-act="accMode" data-m="login">Назад</button></form>`}</div>`;
  const up = mode === 'signup';
  const intro = sh.gate ? `<p class="gate-intro">${up ? 'Создайте аккаунт: на вашу почту придёт письмо со ссылкой. Пока почта не подтверждена, приложение закрыто — так в нём только настоящие люди.' : 'Войдите или создайте аккаунт, чтобы пользоваться «Подходом». Данные не пропадут при смене телефона.'}</p>` : '';
  return `${H(up ? 'Создать аккаунт' : 'Вход', sh.why ? esc(sh.why) : sh.gate ? '' : 'Данные в облаке')}<div class="sheet-body">${intro}
    <button class="btn btn-block btn-g" data-act="accGoogle"${busy}>${GLOGO} ${up ? 'Создать через Google' : 'Войти через Google'}</button>
    <div class="or"><span>или по почте</span></div>
    <form class="acc-form" onsubmit="return false">
      ${accField('acc-email', 'Почта', 'email', sh, { type:'email', ac:'email', im:'email', ph:'name@mail.ru' })}
      ${accField('acc-pass', 'Пароль', 'pass', sh, { type:pw, ac:up ? 'new-password' : 'current-password', eye:true, ek:'go', ph:up ? 'Не меньше 6 символов' : '' })}
      ${err}<button class="btn btn-primary btn-block" data-act="${up ? 'accSignup' : 'accLogin'}"${busy}>${sh.busy ? (up ? 'Создаём…' : 'Входим…') : up ? 'Создать аккаунт' : 'Войти'}</button>
    </form>
    <div class="acc-links">${up ? `<button class="link" data-act="accMode" data-m="login">Уже есть аккаунт? Войти</button>` : `<button class="link" data-act="accMode" data-m="signup">Создать аккаунт</button><button class="link" data-act="accMode" data-m="reset">Забыли пароль?</button>`}</div>
    <p class="fine">Данные сохраняются в облаке (Google Firebase): новый телефон — и всё на месте. Фото тела в облако не попадают.</p>
  </div>`;
};
const GATE_SUB = 'Дневник тренировок';
const GATE_MARK = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true"><path d="M8 32h48M17 17v30M26 22v20M38 22v20M47 17v30"/></svg>';
const gateFrame = (sh, inner) => {
  const mode = sh.mode || 'login', start = mode === 'start', back = ['login', 'signup', 'reset'].includes(mode);
  return `<div class="gate-bg" aria-hidden="true"><i class="g1"></i><i class="g2"></i></div><div class="gate-wrap${start ? '' : ' compact'}">${back ? `<button class="gate-back" data-act="accMode" data-m="start" aria-label="Назад">${icon('back')}</button>` : ''}<div class="gate-hero"><div class="gate-mark">${GATE_MARK}</div>${start ? `<h1 id="sheet-title" class="gate-title">Подход</h1><p class="gate-sub">${GATE_SUB}</p>` : '<div class="gate-title sm" aria-hidden="true">Подход</div>'}</div>${inner}</div>`;
};
SHEETS.acc = sh => sh.gate ? gateFrame(sh, accBody(sh)) : accBody(sh);
SHEETS.verified = () => `${closeOnly()}<div class="sheet-body"><div class="ver-hero"><div class="ver-mate">${charSVG(charOf(curProf()), 'happy')}<span class="ver-check">${icon('check')}</span></div><h2 id="sheet-title" class="big-title">Почта подтверждена</h2><p>Теперь «Подход» ваш: данные сохраняются в облаке и ждут вас на любом телефоне.</p></div></div><footer class="sheet-foot"><button class="btn btn-primary btn-lg btn-block" data-act="closeSheet">Поехали</button></footer>`;
Object.assign(A, {
  accPassMail: () => { const sh = top(), a = accOf(); if (!a) return; accRun(sh, async () => { await idt('sendOobCode', { requestType:'PASSWORD_RESET', email:a.email, continueUrl:appUrl() }, true); sh.sent = a.email; }); },
  accNewPass: () => { const sh = top(); if ((sh.pass || '').length < 6) { sh.err = authErr({ code:'short' }); render(); return; } accRun(sh, async () => { await idt('resetPassword', { oobCode:sh.oob, newPassword:sh.pass }); sh.done = true; sh.pass = ''; sfx('set'); }); },
  accCheck: () => { const sh = top(), a = unverAcc(); if (!a) { render(); return; } accRun(sh, async () => { if (await checkVerified(a)) { verifyWatch(false); await finishSignIn(true); } else throw { code:'unver' }; }); },
  accResend: () => { const sh = top(), a = unverAcc(); if (!a) return; sh.cool = Date.now() + 60000; setTimeout(render, 60500); accRun(sh, async () => { await sendVerify(a, true); toast('Письмо отправлено ещё раз'); }); },
  accOut2: () => { Object.entries(accs()).forEach(([pid, a]) => { if (a.ver === 0) signOut(pid); }); verifyWatch(false); const g = gateSheet() || top(); if (g) { g.mode = 'signup'; g.err = ''; } render(); },
});

