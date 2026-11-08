/* ================= state ================= */
const DEFAULT_PROFILE = { rest:90, sound:true, bar:20, goal:3, rirAsk:true, templates:[], custom:[], body:[], meas:[], deleted:[], kudos:{}, gear:{}, freeze:[], supps:[], slog:{}, sfull:[] };
const S = {
  mode:'loading', loaded:{ profile:false, workouts:false, active:false }, metaLoaded:false,
  meta:null, pid:'main', store:{},
  profile: clone(DEFAULT_PROFILE), workouts:[], active:null, editing:null,
  view:'today', sheets:[], toast:null,
  prog:{ period:'90', ex:null, metric:null }, bodyTab:'w', measKey:'waist', photos:null,
  rest:{ end:0, total:0, alerted:false },
  justKey:null, bumpPr:false, countUp:false, welcomed:false, poke:0, bubble:null, ateAt:0, eatUntil:0, supDay:0, supOrder:false,
  installEvt:null, updateReady:null, persisted:null,
  remote:{}, rd:{}, sync:{ status:'off', last:0, etag:null, msg:'' }, syncOffConfirm:false,
  chatMine:{}, chatAll:[], chatDraft:'', chatScroll:false,
};
let D = { hist:{}, best:{}, prSets:{}, prCount:{}, prEvents:[], usage:{} };
const ready = () => S.mode !== 'loading' && S.loaded.profile && S.loaded.workouts && S.loaded.active;
const top = () => S.sheets[S.sheets.length - 1];
const curW = () => (S.view === 'editor' && S.editing) ? S.editing : S.active;
const isLive = w => w && S.active && w === S.active;
const isStandalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function normP(d) {
  const p = Object.assign(clone(DEFAULT_PROFILE), d ? clone(d) : {});
  if (typeof p.body === 'string') { if (!p.sex && (p.body === 'f' || p.body === 'm')) p.sex = p.body; p.bodyLost = 1; }
  if (p.sex !== 'f' && p.sex !== 'm') delete p.sex;
  ['templates','custom','body','meas','deleted','freeze','supps','sfull'].forEach(k => { if (!Array.isArray(p[k])) p[k] = []; });
  ['kudos','gear','slog','plan','rx'].forEach(k => { if (!p[k] || typeof p[k] !== 'object' || Array.isArray(p[k])) p[k] = {}; });
  p.supps = p.supps.filter(x => x && x.id && typeof x.name === 'string');
  if (p.chest && (typeof p.chest !== 'object' || !p.chest.op || typeof p.chest.op !== 'object')) delete p.chest;
  if (p.chest) { if (!Array.isArray(p.chest.st)) p.chest.st = []; if (!Array.isArray(p.chest.buy)) p.chest.buy = []; }
  if (!(p.goal >= 1 && p.goal <= 7)) p.goal = 3;
  return p;
}
function normW(w, id) {
  const o = clone(w) || {};
  if (id) o.id = id;
  o.exercises = (o.exercises || []).map(x => ({ ...x, k: x.k || uid(), sets: (x.sets || []).map(s => ({ ...s })) }));
  return o;
}

