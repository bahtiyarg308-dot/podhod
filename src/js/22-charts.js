/* ================= charts ================= */
let CH = {}; const DRAWN = {};
function chart(type, id, data, opts = {}) {
  const sig = hash(type + JSON.stringify(data instanceof Map ? [...data] : data) + '|' + (opts.key || '') + '|' + S.pid);
  CH[id] = { type, data, opts };
  return `<div class="chart" id="${id}" data-sig="${sig}" style="min-height:${opts.h || 200}px"></div>`;
}
function drawCharts(force) {
  for (const id in CH) {
    const el = document.getElementById(id); if (!el) continue;
    if (!force && el.childElementCount && DRAWN[id] === el.dataset.sig) continue;
    const c = CH[id]; ({ line:drawLine, bar:drawBar, heat:drawHeat })[c.type](el, c.data, c.opts, !force && !RM);
    DRAWN[id] = el.dataset.sig;
  }
}
function niceTicks(min, max, n = 4) {
  if (min === max) { const p = Math.abs(min) * .1 || 1; min -= p; max += p; }
  const step0 = (max - min) / n, mag = 10 ** Math.floor(Math.log10(step0)), err = step0 / mag;
  const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(8));
  return { lo, hi, ticks };
}
function attachTip(el, xs, get) {
  const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), g = el.querySelector('.guide'), d = el.querySelector('.pt-hover');
  if (!svg || !tip) return;
  let last = -1;
  const move = e => {
    const r = svg.getBoundingClientRect(), mx = e.clientX - r.left;
    let bi = 0, bd = Infinity; xs.forEach((x, i) => { const dd = Math.abs(x - mx); if (dd < bd) { bd = dd; bi = i; } });
    const p = get(bi); tip.innerHTML = p.html; tip.hidden = false;
    tip.style.left = Math.max(56, Math.min(r.width - 56, p.x)) + 'px'; tip.style.top = p.y + 'px';
    if (g) { g.setAttribute('x1', p.x); g.setAttribute('x2', p.x); g.setAttribute('visibility', 'visible'); }
    if (d) { d.setAttribute('cx', p.x); d.setAttribute('cy', p.y); d.setAttribute('visibility', 'visible'); }
    if (bi !== last && e.pointerType === 'touch') buzz(4); last = bi;
  };
  const leave = () => { tip.hidden = true; last = -1; if (g) g.setAttribute('visibility', 'hidden'); if (d) d.setAttribute('visibility', 'hidden'); };
  svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move); svg.addEventListener('pointerleave', leave);
}
function drawLine(el, pts, o, anim) {
  if (!pts.length) { el.innerHTML = `<div class="chart-empty">${esc(o.empty || 'Пока нет данных')}</div>`; return; }
  const W = Math.max(240, Math.floor(el.clientWidth)), H = o.h || 200, pl = 46, pr = 18, pt = 24, pb = 26, iw = W - pl - pr, ih = H - pt - pb;
  const fy = o.fy || (v => nf(v, 1)), fa = o.fa || fy;
  const ys = pts.map(p => p.y); const { lo, hi, ticks } = niceTicks(Math.min(...ys), Math.max(...ys), H < 180 ? 3 : 4);
  const x0 = pts[0].x, x1 = pts[pts.length - 1].x;
  const sx = x => x1 === x0 ? pl + iw / 2 : pl + (x - x0) / (x1 - x0) * iw;
  const sy = y => pt + (1 - (y - lo) / ((hi - lo) || 1)) * ih;
  const gid = 'g' + Math.random().toString(36).slice(2);
  let s = `<svg class="${anim ? 'anim' : ''}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || 'График')}"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>`;
  ticks.forEach(t => { const y = sy(t).toFixed(1); s += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text class="axis-t" x="${pl - 8}" y="${y}" text-anchor="end" dominant-baseline="middle">${esc(fa(t))}</text>`; });
  const P = pts.map(p => [sx(p.x), sy(p.y)]);
  const d = P.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('');
  if (P.length > 1) s += `<path class="area" d="${d}L${P[P.length - 1][0].toFixed(1)} ${pt + ih}L${P[0][0].toFixed(1)} ${pt + ih}Z" fill="url(#${gid})"/><path class="line" pathLength="1" d="${d}"/>`;
  if (P.length <= 48) P.slice(0, -1).forEach((q, i) => { s += `<circle class="pt" style="--i:${i}" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="3"/>`; });
  const L = P[P.length - 1];
  s += `<circle class="pt-ring" cx="${L[0].toFixed(1)}" cy="${L[1].toFixed(1)}" r="5"/><circle class="pt-last" cx="${L[0].toFixed(1)}" cy="${L[1].toFixed(1)}" r="5.5"/>`;
  const ly = L[1] - 12 < 10 ? L[1] + 22 : L[1] - 12;
  s += `<text class="lbl-last" x="${L[0].toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${L[0] > W - 70 ? 'end' : L[0] < pl + 40 ? 'start' : 'middle'}">${esc(fy(pts[pts.length - 1].y))}</text>`;
  const idx = pts.length === 1 ? [0] : [0, pts.length - 1];
  if (W > 420 && pts.length > 4) idx.splice(1, 0, Math.floor((pts.length - 1) / 2));
  idx.forEach(i => { const anchor = pts.length === 1 ? 'middle' : i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'; s += `<text class="axis-t" x="${P[i][0].toFixed(1)}" y="${H - 6}" text-anchor="${anchor}">${dShort(pts[i].x)}</text>`; });
  s += `<line class="guide" x1="0" x2="0" y1="${pt}" y2="${pt + ih}" visibility="hidden"/><circle class="pt-hover" r="5" visibility="hidden"/><rect x="${pl - 10}" y="0" width="${iw + 20}" height="${H}" fill="transparent"/></svg><div class="tip" hidden></div>`;
  el.innerHTML = s;
  attachTip(el, P.map(q => q[0]), i => ({ x:P[i][0], y:P[i][1], html:`<b>${esc(fy(pts[i].y))}</b> · ${dShort(pts[i].x)}` }));
}
function drawBar(el, bars, o, anim) {
  const mx = Math.max(0, ...bars.map(b => b.v));
  if (!bars.length || mx <= 0) { el.innerHTML = `<div class="chart-empty">${esc(o.empty || 'Пока нет данных')}</div>`; return; }
  const W = Math.max(240, Math.floor(el.clientWidth)), H = o.h || 180, pl = 46, pr = 6, pt = 14, pb = 26, iw = W - pl - pr, ih = H - pt - pb;
  const fa = o.fa || (v => nf(v, 0)), fy = o.fy || fa;
  const { hi, ticks } = niceTicks(0, mx, 3);
  const sy = v => pt + (1 - v / hi) * ih;
  const bw = iw / bars.length, w = Math.max(5, Math.min(30, bw * .62));
  let s = `<svg class="${anim ? 'anim' : ''}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || 'Диаграмма')}">`;
  ticks.forEach(t => { const y = sy(t).toFixed(1); s += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text class="axis-t" x="${pl - 8}" y="${y}" text-anchor="end" dominant-baseline="middle">${esc(fa(t))}</text>`; });
  const xs = [];
  const every = Math.max(1, Math.ceil(bars.length / Math.max(1, Math.floor(iw / 60))));
  bars.forEach((b, i) => {
    const cx = pl + i * bw + bw / 2; xs.push(cx);
    if (b.v > 0) { const y = sy(b.v); s += `<rect class="bar${b.cur ? ' cur' : ''}" style="--i:${i}" x="${(cx - w / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${(pt + ih - y).toFixed(1)}" rx="4"/>`; }
    else s += `<rect class="bar zero" x="${(cx - w / 2).toFixed(1)}" y="${pt + ih - 2}" width="${w.toFixed(1)}" height="2" rx="1"/>`;
    if ((bars.length - 1 - i) % every === 0) s += `<text class="axis-t" x="${cx.toFixed(1)}" y="${H - 6}" text-anchor="${i === bars.length - 1 && cx > W - 24 ? 'end' : 'middle'}">${esc(b.label)}</text>`;
  });
  s += `<line class="guide" x1="0" x2="0" y1="${pt}" y2="${pt + ih}" visibility="hidden"/><rect x="${pl}" y="0" width="${iw}" height="${H}" fill="transparent"/></svg><div class="tip" hidden></div>`;
  el.innerHTML = s;
  attachTip(el, xs, i => ({ x:xs[i], y:sy(Math.max(0, bars[i].v)), html:`<b>${esc(fy(bars[i].v))}</b> · ${esc(bars[i].title || bars[i].label)}` }));
}
function drawHeat(el, map, o, anim) {
  const W = Math.max(240, Math.floor(el.clientWidth));
  const cs = W < 480 ? 12 : 14, g = 3, left = 26, topP = 16;
  const N = Math.max(8, Math.min(30, Math.floor((W - left) / (cs + g))));
  const thisWeek = weekStart(Date.now()), start = addDays(thisWeek, -(N - 1) * 7), today = startOfDay(Date.now());
  const vols = [...map.values()].map(v => v.vol); const mx = Math.max(1, ...vols);
  const width = left + N * (cs + g), height = topP + 7 * (cs + g);
  let s = `<svg class="${anim ? 'anim' : ''}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Календарь тренировок за ${N} недель">`;
  [['пн', 0], ['ср', 2], ['пт', 4]].forEach(([l, r]) => { s += `<text class="axis-t" x="0" y="${topP + r * (cs + g) + cs / 2}" dominant-baseline="middle">${l}</text>`; });
  let lastM = -1;
  for (let c = 0; c < N; c++) {
    const ws = addDays(start, c * 7), m = new Date(ws).getMonth();
    if (m !== lastM && c < N - 1) { s += `<text class="axis-t" x="${left + c * (cs + g)}" y="10">${MON_SN[m]}</text>`; lastM = m; }
    for (let r = 0; r < 7; r++) {
      const day = addDays(ws, r); if (day > today) continue;
      const v = map.get(dayKey(day));
      const lvl = !v ? 0 : v.vol <= 0 ? 1 : 1 + Math.round(v.vol / mx * 3);
      const title = v ? `${dayMonth(day)}: ${v.titles.join(', ')}${v.vol ? ' · ' + ton(v.vol) : ''}` : `${dayMonth(day)}: отдых`;
      s += `<rect class="hm l${lvl}${day === today ? ' today' : ''}" style="--i:${c}" x="${left + c * (cs + g)}" y="${topP + r * (cs + g)}" width="${cs}" height="${cs}" rx="${cs / 2}"><title>${esc(title)}</title></rect>`;
    }
  }
  el.innerHTML = s + '</svg>';
}

