/* ================= 2.7: anatomy map, muscle maps of exercises and workouts, smart search ================= */
/* Muscle outlines: react-native-body-highlighter, Copyright (c) 2022 ELABBASSI Hicham, MIT License.
   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
   to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
   and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
   The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. Split into separate muscles for «Подход». */
EXL.forEach(e => { if (e.tech && !TECH[e.id]) TECH[e.id] = e.tech.split('|'); });
const EXMUS = Object.fromEntries(EXL.map(e => [e.id, musParse(e.mus)]));
const EXSYN = Object.fromEntries(EXL.map(e => [e.id, e.syn || '']));
function musOf(id) { if (EXMUS[id]) return EXMUS[id]; const e = exById(id); return musParse(MUS_DEF[e.muscle] || ''); }
const ANAT_VB = { mf:'0 0 724 1448', mb:'724 0 724 1448', ff:'-50 -40 734 1538', fb:'756 0 774 1448' };
let anatDefs = false;
function anatInject() {
  if (anatDefs || !document.body) return; anatDefs = true;
  let defs = '';
  for (const k of ['mf', 'mb', 'ff', 'fb']) ANAT[k].forEach((r, i) => {
    const id = `an-${k}-${i}`;
    if (r[2]) defs += `<clipPath id="${id}c"><rect x="${r[2][0]}" y="${r[2][1]}" width="${r[2][2]}" height="${r[2][3]}"/></clipPath>`;
    defs += `<path id="${id}" d="${r[1]}"${r[2] ? ` clip-path="url(#${id}c)"` : ''}/>`;
  });
  document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${defs}</defs></svg>`);
}
const bodySex = (p = S.profile) => (p && (p.sex || (typeof p.body === 'string' ? p.body : ''))) === 'f' ? 'f' : 'm';
/* cls(m) → css class of a muscle, tip(m) → text shown when a muscle is tapped */
function anatSVG(cls, tip, o = {}) {
  anatInject();
  const sx = o.sex || bodySex(), half = side => { const k = sx + side; return `<svg x="${side === 'f' ? 0 : 780}" y="0" width="760" height="1540" viewBox="${ANAT_VB[k]}">${ANAT[k].map((r, i) => r[0] ? `<use href="#an-${k}-${i}" class="am ${cls(r[0])}" data-act="musTap" data-t="${esc(tip ? tip(r[0]) : MUS[r[0]][0])}"/>` : `<use href="#an-${k}-${i}" class="an"/>`).join('')}</svg>`; };
  return `<svg class="anat${o.cls ? ' ' + o.cls : ''}" viewBox="0 0 1540 1540" role="img" aria-label="${esc(o.label || 'Карта мышц')}">${half('f')}${half('b')}</svg>`;
}
const heatCls = v => v == null || v <= 0 ? 'h0' : v >= .75 ? 'h3' : v >= .45 ? 'h2' : 'h1';
function workoutMus(w) {
  const o = {};
  workSets(w, (e, s, x) => { if (e.muscle === 'stretch') return; const m = musOf(x.ex); for (const k in m) o[k] = (o[k] || 0) + m[k]; });
  const mx = Math.max(0, ...Object.values(o)); if (mx) for (const k in o) o[k] /= mx;
  return o;
}
function musListHTML(m, cut = .75) {
  const ent = Object.entries(m).sort((a, b) => b[1] - a[1]), main = ent.filter(([, v]) => v >= cut), help = ent.filter(([, v]) => v < cut && v > 0);
  return `${main.length ? `<p class="mus-l"><i class="h3"></i><b>Главные:</b> ${main.map(([k]) => MUS[k][0]).join(', ')}</p>` : ''}${help.length ? `<p class="mus-l"><i class="h1"></i><b>Помогают:</b> ${help.map(([k]) => MUS[k][0]).join(', ')}</p>` : ''}`;
}
function workoutMapHTML(w) {
  const m = workoutMus(w); if (!Object.keys(m).length) return '';
  return `<div class="sblock wmap"><b>Какие мышцы работали</b><div class="wmap-in">${anatSVG(k => heatCls(m[k]), k => `${MUS[k][0]}${m[k] ? ' · нагрузка ' + Math.round(m[k] * 100) + '%' : ' · не нагружалась'}`, { cls:'mid', label:'Мышцы этой тренировки' })}${musListHTML(m, .6)}</div></div>`;
}
/* recovery per real muscle; groups take their most tired muscle */
const RCACHE2 = { k:'', v:null };
function recoveryOf(list, now = Date.now()) {
  const key = (list[0] ? list[0].id + list[0].u : '') + list.length + '|' + Math.floor(now / 6e5);
  if (RCACHE2.k === key) return RCACHE2.v;
  const mus = {}; Object.keys(MUS).forEach(m => { mus[m] = { pct:100, left:0, last:null, days:null }; });
  for (const w of list) {
    const end = w.end || w.start, h = (now - end) / 3600e3; if (h < 0) continue;
    const load = {};
    workSets(w, (e, s, x) => { if (e.muscle === 'stretch') return; const m = musOf(x.ex); for (const k in m) load[k] = (load[k] || 0) + m[k]; });
    for (const m in load) {
      const r = mus[m]; if (!r || load[m] < .45) continue;
      if (r.last == null) { r.last = end; r.days = Math.floor(h / 24); }
      if (h > 120) continue;
      const big = MUS_BIG.has(m), k = w.feel === 4 ? 1.15 : w.feel === 1 ? .85 : 1, need = ((big ? 24 : 18) + Math.min(big ? 48 : 36, load[m] * (big ? 3.5 : 3))) * k;
      const pct = Math.max(0, Math.min(100, h / need * 100));
      if (pct < r.pct) Object.assign(r, { pct, left:Math.max(0, need - h) });
    }
    if (h > 240) break;
  }
  const out = { _mus:mus };
  MAIN_M.forEach(g => {
    const ms = Object.keys(MUS).filter(m => MUS[m][1] === g && mus[m].last != null);
    if (!ms.length) { out[g] = { pct:100, left:0, last:null, days:null }; return; }
    const worst = ms.reduce((a, b) => mus[b].pct < mus[a].pct ? b : a), lastM = ms.reduce((a, b) => mus[b].last > mus[a].last ? b : a);
    out[g] = { pct:mus[worst].pct, left:mus[worst].left, last:mus[lastM].last, days:mus[lastM].days, worst };
  });
  RCACHE2.k = key; RCACHE2.v = out; return out;
}
function bodySVG(r, cls = '') {
  const M = r._mus || {};
  return anatSVG(m => 'rg-' + recState(M[m] || { last:null }), m => { const x = M[m]; if (!x || x.last == null) return `${MUS[m][0]} · давно не тренировали`; return `${MUS[m][0]} · ${x.pct >= 100 ? 'готова' : Math.round(x.pct) + '%, готова через ' + hoursTxt(x.left)}`; }, { cls:'rec-anat' + (cls ? ' ' + cls : ''), label:'Карта восстановления мышц' });
}
/* lagging real muscles over four weeks */
function lagMuscles() {
  const from = Date.now() - 28 * DAY, o = {};
  S.workouts.forEach(w => { if (w.start < from) return; workSets(w, (e, s, x) => { if (e.muscle === 'stretch') return; const m = musOf(x.ex); for (const k in m) o[k] = (o[k] || 0) + m[k]; }); });
  if (!Object.keys(o).length) return [];
  const key = ['delt_side', 'delt_rear', 'traps_mid', 'lats', 'pec', 'biceps', 'triceps_long', 'glute_max', 'glute_med', 'biceps_fem', 'rect_fem', 'abs_up', 'obliques', 'gastro'];
  return key.map(m => [m, (o[m] || 0) / 4]).filter(([, v]) => v < 3).sort((a, b) => a[1] - b[1]).slice(0, 5);
}
/* search: words, word stems, slang; ё = е */
const SLANG = { 'бицух':'бицепс', 'трицух':'трицепс', 'турник':'подтягив', 'пресак':'пресс', 'попа':'ягодиц', 'попу':'ягодиц', 'жопа':'ягодиц', 'икры':'икронож', 'плечи':'дельт', 'спина':'широчайш', 'грудак':'груд', 'ноги':'бедр', 'квадр':'квадрицепс', 'кор':'пресс', 'кардио':'кардио', 'растяж':'растяжк' };
function exParts(e) {
  const m = musOf(e.id);
  return { name:normQ(e.name), syn:normQ(EXSYN[e.id] || ''), grp:normQ((MUSCLES[e.muscle] || '') + ' ' + (EQUIP[e.equip] || '')), main:normQ(Object.keys(m).filter(k => m[k] >= .75).map(k => MUS[k][0]).join(' ')) };
}
/* every word must be found; the score ranks name hits above synonyms, group/equipment and main muscles */
function exScore(e, words) {
  const P = exParts(e); let sc = 0;
  const weigh = t => { const st = t.length >= 5 ? t.slice(0, t.length >= 7 ? -2 : -1) : t, hit = h => h.includes(t) || (st !== t && h.includes(st)); return hit(P.name) ? 3 : hit(P.syn) ? 2 : hit(P.grp) ? 1.5 : hit(P.main) ? 1 : 0; };
  for (const t0 of words) {
    const sl = SLANG[t0] || (Object.entries(SLANG).find(([k]) => t0.startsWith(k)) || [])[1];
    const w = weigh(t0) || (sl ? weigh(sl) * .5 : 0); // the word itself first, slang translation counts half
    if (!w) return 0; sc += w;
  }
  return sc;
}
const lastUse = (() => { let k = '', v = {}; return () => { const kk = S.workouts.length + '|' + (S.workouts[0] ? S.workouts[0].id : ''); if (kk !== k) { k = kk; v = {}; S.workouts.forEach(w => (w.exercises || []).forEach(x => { if (!v[x.ex] || v[x.ex] < w.start) v[x.ex] = w.start; })); } return v; }; })();
function pickList(sh) {
  const q = normQ(sh.q).trim(), words = q.split(/\s+/).filter(Boolean), lu = lastUse();
  const sc = {}, list = allExercises().filter(e => (sh.m === 'all' || e.muscle === sh.m) && (!sh.e || sh.e === 'all' || e.equip === sh.e) && (!words.length || (sc[e.id] = exScore(e, words)) > 0))
    .sort((a, b) => (sc[b.id] || 0) - (sc[a.id] || 0) || (lu[b.id] || 0) - (lu[a.id] || 0) || (D.usage[b.id] || 0) - (D.usage[a.id] || 0) || a.name.localeCompare(b.name, 'ru'));
  const recentN = !words.length ? list.filter(e => lu[e.id]).length : 0;
  const row = e => { const on = sh.sel.includes(e.id), u = D.usage[e.id] || 0, m = Object.entries(musOf(e.id)).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => MUS[k][0]); return `<div class="pick-w" data-key="pk-${esc(e.id)}"><button class="pick-row${on ? ' on' : ''}" data-act="pickToggle" data-id="${esc(e.id)}" aria-pressed="${on}"><span class="pick-name">${esc(e.name)}</span><span class="pick-meta">${m.length ? esc(m.join(', ')) + ' · ' : ''}${EQUIP[e.equip] || ''}${u ? ` · ${u} ${plural(u, ['раз','раза','раз'])}` : ''}</span></button><button class="icon-btn pick-info" data-act="techOpen" data-id="${esc(e.id)}" aria-label="Что работает и техника: ${esc(e.name)}">${icon('help')}</button></div>`; };
  const rows = list.map((e, i) => (i === 0 && recentN ? '<p class="pick-h">Недавние</p>' : i === recentN && recentN ? '<p class="pick-h">Все упражнения</p>' : '') + row(e)).join('');
  const exact = list.some(e => normQ(e.name) === q);
  let create = '';
  if (sh.creating) {
    create = `<div class="pick-new"><b>Новое упражнение</b><input class="field" id="cr-name" value="${esc(sh.q)}" placeholder="Название" autocomplete="off" aria-label="Название упражнения">
      <div class="pick-new-g"><label class="select"><span class="sr">Группа мышц</span><select class="field" id="cr-m">${Object.entries(MUSCLES).map(([k, l]) => `<option value="${k}"${k === (sh.m !== 'all' ? sh.m : 'chest') ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="select"><span class="sr">Оборудование</span><select class="field" id="cr-e">${Object.entries(EQUIP).map(([k, l]) => `<option value="${k}">${l[0].toUpperCase() + l.slice(1)}</option>`).join('')}</select></label>
      <label class="select"><span class="sr">Что записывать</span><select class="field" id="cr-k">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></label></div>
      <button class="btn btn-primary" data-act="pickCreate">Создать упражнение</button></div>`;
  } else if (!exact) {
    create = `<button class="btn btn-ghost btn-block" style="margin-top:10px" data-act="pickCreateStart">${icon('plus')} ${q ? `Создать «${esc(sh.q.trim())}»` : 'Создать своё упражнение'}</button>`;
  }
  return (rows || `<p class="muted" style="padding:16px 2px">Ничего не нашлось. Попробуйте часть слова: «жим», «прис», «бицепс».</p>`) + create;
}
SHEETS.tech = sh => {
  const ex = exById(sh.id), t = TECH[sh.id], m = musOf(sh.id), stretch = ex.muscle === 'stretch';
  return `${sheetHead(esc(ex.name), `${MUSCLES[ex.muscle] || ''} · ${EQUIP[ex.equip] || ''}`)}<div class="sheet-body">
    ${!stretch && Object.keys(m).length ? `<div class="ex-map">${anatSVG(k => heatCls(m[k]), k => `${MUS[k][0]}${m[k] ? (m[k] >= .75 ? ' · главная' : ' · помогает') : ''}`, { cls:'mid', label:'Мышцы упражнения' })}${musListHTML(m)}</div>` : ''}
    ${t ? `<b class="tech-h">Техника</b><ol class="tech">${t.map(c => `<li>${esc(c)}</li>`).join('')}</ol>` : '<p class="fine" style="margin-top:0">Для своих упражнений подсказок нет. Запишите ориентиры в заметку к упражнению — она сохранится в тренировке.</p>'}
    <div class="hint">${icon('shield')}<span><b>Общее правило.</b> Рабочий вес — тот, с которым остаётся 1–3 повтора в запасе и техника не ломается. Боль в суставах — сигнал остановиться и снизить вес.</span></div></div>`;
};
SHEETS.news27 = () => `${sheetHead('Что нового', 'Версия ' + APP_VERSION)}<div class="sheet-body">
  <div class="ex-map">${anatSVG(k => heatCls(musOf('squat')[k]), null, { cls:'mid' })}</div>
  <ul class="pr-list news">
    <li>${icon('target')}<span><b>Настоящая анатомия</b> — 34 мышцы спереди и сзади. Нажмите на мышцу, чтобы увидеть её название и состояние</span></li>
    <li>${icon('help')}<span><b>Что работает</b> — у каждого упражнения карта мышц: главные и помогающие. Кнопка «?» в списке упражнений или «⋯ → Техника»</span></li>
    <li>${icon('log')}<span><b>${EXL.length} упражнений</b> — штанга, гантели, тренажёры, блоки, Смит, гири, резинки, свой вес, кардио и растяжка</span></li>
    <li>${icon('search')}<span><b>Умный поиск</b> — по части слова, мышце, снаряду и даже «бицуха», фильтр по снаряду, недавние вверху</span></li>
  </ul>
  <div class="lbl" style="margin-top:14px">Тело на карте мышц${bodySeg()}</div>
</div><footer class="sheet-foot"><button class="btn btn-primary btn-block" data-act="closeSheet">Готово</button></footer>`;
const bodySeg = () => `<div class="seg" role="group" aria-label="Тело на карте мышц">${[['m', 'Мужское'], ['f', 'Женское']].map(([k, l]) => `<button data-act="setBody" data-v="${k}" aria-pressed="${bodySex() === k}">${l}</button>`).join('')}</div>`;
Object.assign(A, {
  musTap: el => { const t = el.getAttribute('data-t'); if (t) { toast(t); buzz(6); sfx('mus'); } },
  setBody: el => { if (!Array.isArray(S.profile.body)) S.profile.body = []; S.profile.sex = el.dataset.v === 'f' ? 'f' : 'm'; saveProfile(); render(); },
  bodyLostOk: () => { delete S.profile.bodyLost; saveProfile(); render(); },
  pickE: el => { top().e = el.dataset.e; render(); },
});


