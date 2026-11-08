/* ================= events ================= */
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el || el.disabled) return; const fn = A[el.dataset.act]; if (fn) { e.preventDefault(); SFXN.n = 0; fn(el, e); if (!SFXN.n) sfx(el.dataset.act === 'nav' ? 'tab' : el.dataset.act === 'closeSheet' ? 'close' : el.getAttribute('role') === 'switch' ? 'toggle' : 'tap'); } });
document.addEventListener('input', e => { const el = e.target; if (el.dataset && el.dataset.in && IN[el.dataset.in]) IN[el.dataset.in](el, e); });
document.addEventListener('change', e => { const el = e.target; if (el.dataset && el.dataset.ch && CHG[el.dataset.ch]) CHG[el.dataset.ch](el, e); });
document.addEventListener('focusin', e => {
  const el = e.target; if (!el.dataset || el.dataset.in !== 'set' || el.dataset.f !== 'w') return;
  const c = ctx(el); if (!c || c.ex.equip !== 'barbell') return;
  const pl = document.getElementById('pl-' + c.x.k); if (pl) pl.innerHTML = platesHTML(num(c.s.w) ?? ghost(c.w, c.x, c.si, c.ex.kind).w ?? 0, S.profile.bar);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && S.sheets.length) { closeSheet(); return; }
  const el = e.target;
  if (e.key === 'Enter' && el.dataset && el.dataset.in === 'set') {
    e.preventDefault();
    const c = ctx(el); if (!c) return; const fs = KINDS[c.ex.kind].f.map(f => f[0]);
    if (el.dataset.f === fs[0]) { const nx = document.getElementById(`s-${c.x.k}-${c.si}-${fs[1]}`); if (nx) nx.focus(); }
    else { el.blur(); if (!c.s.done) { const btn = el.closest('.set-row').querySelector('.set-check'); A.setDone(btn || el); } }
  }
  if (e.key === 'Enter' && el.id === 'b-w') { e.preventDefault(); A.bodyAdd(); }
  if (e.key === 'Enter' && el.id && el.id.startsWith('m-') && el.id !== 'm-date') { e.preventDefault(); A.measAdd(); }
  if ((e.key === 'Enter' || e.key === ' ') && el.getAttribute && el.getAttribute('for') === 'ph-file') { e.preventDefault(); const f = $('#ph-file'); if (f) f.click(); }
  if (e.key === 'Enter' && el.id === 'w-title') { e.preventDefault(); el.blur(); }
  if (e.key === 'Enter' && el.id === 'wl-name') { e.preventDefault(); A.welcomeSave(); }
  if (e.key === 'Enter' && el.id === 'np-name') { e.preventDefault(); A.profCreate(); }
  if (e.key === 'Enter' && el.id === 'cp-name') { e.preventDefault(); el.blur(); }
  if (e.key === 'Enter' && el.id && el.id.startsWith('sup-')) { e.preventDefault(); el.blur(); }
  if (e.key === 'Enter' && !e.shiftKey && el.id === 'chat-in') { e.preventDefault(); A.chatSend(); }
});
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VIEWS.includes(v) && v !== S.view) { S.editing = null; S.view = v; S.sheets = []; render(); window.scrollTo(0, 0); } });
let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { drawCharts(true); moveInd(); }, 150); });
try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme); } catch (e) { /* old browser */ }

const h0 = location.hash.slice(1); if (VIEWS.includes(h0)) S.view = h0;
/* the sound engine wakes up on the very first touch, so the first sound later does not stutter the screen */
document.addEventListener('pointerdown', () => { try { if (sndCfg().on) unlockAudio(); } catch (e) { /* audio unavailable */ } }, { once:true, passive:true, capture:true });
boot();
})();
