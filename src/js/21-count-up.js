/* ================= count-up ================= */
const FMT = { ton, int:v => nf(v, 0), h:v => nf(v / 3.6e6, 1) + ' ч', kg1:v => nf(v, 1) + ' кг', dur:v => fmtDur(v) };
function countUp(root) {
  if (RM || !root) return;
  root.querySelectorAll('[data-count]').forEach(el => {
    const to = +el.dataset.count, f = FMT[el.dataset.fmt] || FMT.int; if (!(to > 0)) return;
    const t0 = performance.now(), d = 800;
    const step = t => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 4); el.textContent = f(to * e); if (k < 1) requestAnimationFrame(step); };
    el.textContent = f(0); requestAnimationFrame(step);
  });
}
const cnt = (v, fmt) => `data-count="${v}" data-fmt="${fmt}"`;

