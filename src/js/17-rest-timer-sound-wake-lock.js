/* ================= rest timer, sound, wake lock, confetti ================= */
let actx = null, wakeLock = null;
function unlockAudio() { try { if (navigator.audioSession && navigator.audioSession.type !== 'ambient') navigator.audioSession.type = 'ambient'; } catch (e) { /* no audio session API */ } try { if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); } if (actx && actx.state === 'suspended') actx.resume(); } catch (e) { actx = null; } }
function beep() {
  buzz([140, 90, 140]);
  if (!S.profile.sound || !actx) return;
  try {
    const t = actx.currentTime;
    [0, .24].forEach((dt, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = i ? 1175 : 880; g.gain.setValueAtTime(.0001, t + dt); g.gain.exponentialRampToValueAtTime(.3, t + dt + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dt + .2); o.connect(g); g.connect(actx.destination); o.start(t + dt); o.stop(t + dt + .22); });
  } catch (e) { /* audio blocked */ }
}
async function keepAwake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { flush(); if (SY.pushT) { clearTimeout(SY.pushT); SY.pushT = null; syncNow(); } if (CL.t) { clearTimeout(CL.t); CL.t = null; cloudSync(); } } else { if (S.active) keepAwake(true); syncNow(); cloudSync({ links:true }); verifyTick(); autoUpdate(); } });
window.addEventListener('pagehide', flush);
function confetti(x, y, n = 70) {
  if (RM) return;
  try {
    const c = document.createElement('canvas'); c.className = 'confetti';
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
    c.width = W * dpr; c.height = H * dpr; document.body.appendChild(c);
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const cs = getComputedStyle(document.documentElement);
    const cols = ['--plate-red', '--plate-blue', '--plate-yellow', '--plate-green', '--accent', '--gold-fill'].map(v => cs.getPropertyValue(v).trim() || '#E0283F');
    const P = Array.from({ length:n }, () => { const a = -Math.PI / 2 + (Math.random() - .5) * 1.9, sp = 6 + Math.random() * 8; return { x, y, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, w:4 + Math.random() * 5, h:7 + Math.random() * 8, r:Math.random() * 6, vr:(Math.random() - .5) * .4, c:cols[Math.floor(Math.random() * cols.length)], round:Math.random() < .3 }; });
    const t0 = performance.now();
    const f = t => { const k = (t - t0) / 1700; g.clearRect(0, 0, W, H); P.forEach(p => { p.vy += .32; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.globalAlpha = Math.max(0, 1 - k * k); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; if (p.round) { g.beginPath(); g.arc(0, 0, p.w / 1.6, 0, Math.PI * 2); g.fill(); } else g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); g.restore(); }); if (k < 1) requestAnimationFrame(f); else c.remove(); };
    requestAnimationFrame(f);
  } catch (e) { /* canvas unavailable */ }
}
function startRest(sec) { const s = sec || S.profile.rest || 90; S.rest = { end:Date.now() + s * 1000, total:s * 1000, alerted:false }; if (s >= 20) sfx('rest'); renderRest(); if (!ringLoop.on) { ringLoop.on = true; requestAnimationFrame(ringLoop); } }
function ringLoop() {
  if (!S.rest.end) { ringLoop.on = false; return; }
  const fg = document.getElementById('ring-fg'); if (fg) fg.setAttribute('stroke-dashoffset', String(Math.max(0, Math.min(100, 100 * (1 - (S.rest.end - Date.now()) / S.rest.total)))));
  requestAnimationFrame(ringLoop);
}
setInterval(() => {
  const now = Date.now();
  if (S.active) $$('[data-tick="elapsed"]').forEach(el => { el.textContent = fmtClock((now - S.active.start) / 1000); });
  if (S.rest.end) {
    const left = Math.max(0, Math.ceil((S.rest.end - now) / 1000));
    const t = document.getElementById('rest-time'); if (t) t.textContent = fmtClock(left);
    if (left > 0 && left <= 3 && S.rest.cd !== left) { S.rest.cd = left; sfx('count'); }
    if (left === 10 && S.rest.total >= 25000 && !S.rest.ten) { S.rest.ten = true; sfx('ten'); }
    if (left === 0 && !S.rest.alerted) { S.rest.alerted = true; beep(); renderRest(); }
    if (S.rest.alerted && now - S.rest.end > 7000) { S.rest = { end:0, total:0, alerted:false }; renderRest(); }
  }
}, 250);

