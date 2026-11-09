/* ================= sounds: synthesised on the phone, no files, no internet ================= */
const SND_DEF = { on:true, vol:2, train:true, game:true, ui:true };
const sndCfg = () => Object.assign({}, SND_DEF, (S.meta && S.meta.snd) || {});
const SFX_CAT = { tap:'ui', lens:'ui', del:'ui', arm:'ui', tab:'ui', toggle:'ui', close:'ui', send:'ui', set:'train', unset:'train', tick:'train', count:'train', pr:'train', start:'train', finish:'train', level:'train',
  shake:'game', openc:'game', openr:'game', opene:'game', openl:'game', gift:'game', rank:'game', equip:'game', locked:'game', buy:'game', grow:'game', mate:'game', nom:'game', like:'game', sup:'game', supFull:'game' };
const SFXN = { n:0, t:0 };
let sfxOut = null, noiseBuf = null;
function sfxBus() {
  if (!actx) return null;
  if (!sfxOut) {
    const comp = actx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.connect(actx.destination);
    sfxOut = actx.createGain(); sfxOut.connect(comp);
  }
  sfxOut.gain.value = [0, .3, .55, .9][sndCfg().vol] || .55;
  return sfxOut;
}
function tone(o, f, t, d, v, type = 'sine', f2 = null, a = .006) {
  const c = actx, T = c.currentTime + t, os = c.createOscillator(), g = c.createGain();
  os.type = type; os.frequency.setValueAtTime(f, T); if (f2) os.frequency.exponentialRampToValueAtTime(f2, T + a + d);
  g.gain.setValueAtTime(.0001, T); g.gain.exponentialRampToValueAtTime(v, T + a); g.gain.exponentialRampToValueAtTime(.0001, T + a + d);
  os.connect(g); g.connect(o); os.start(T); os.stop(T + a + d + .05);
  return os;
}
function hiss(o, t, d, v, f, f2 = null, q = 1, type = 'bandpass') {
  const c = actx, T = c.currentTime + t;
  if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate * .5, c.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
  const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noiseBuf; fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, T); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, T + d);
  g.gain.setValueAtTime(.0001, T); g.gain.exponentialRampToValueAtTime(v, T + .004); g.gain.exponentialRampToValueAtTime(.0001, T + d);
  s.connect(fl); fl.connect(g); g.connect(o); s.start(T); s.stop(T + d + .05);
}
const arp = (o, fs, step, d, v, type = 'triangle', t0 = 0) => fs.forEach((f, i) => tone(o, f, t0 + i * step, d, v, type));
/* companion voices: each character sounds different; babies are higher, legends lower */
const VOICE = {
  cat:(o, k) => { const os = tone(o, 620 * k, 0, .38, .22, 'sawtooth'); const T = actx.currentTime; os.frequency.setValueAtTime(620 * k, T); os.frequency.linearRampToValueAtTime(980 * k, T + .1); os.frequency.exponentialRampToValueAtTime(540 * k, T + .38); },
  fox:(o, k) => { tone(o, 1050 * k, 0, .07, .2, 'triangle', 1500 * k); tone(o, 1150 * k, .11, .08, .2, 'triangle', 1650 * k); },
  panda:(o, k) => { tone(o, 330 * k, 0, .12, .3, 'sine', 250 * k); tone(o, 300 * k, .16, .14, .3, 'sine', 230 * k); },
  owl:(o, k) => { tone(o, 440 * k, 0, .18, .28, 'sine', 410 * k, .03); tone(o, 400 * k, .26, .24, .28, 'sine', 360 * k, .03); },
  dog:(o, k) => { tone(o, 260 * k, 0, .12, .3, 'square', 120 * k); hiss(o, 0, .09, .12, 900, null, 1, 'lowpass'); tone(o, 280 * k, .2, .1, .25, 'square', 130 * k); },
  dragon:(o, k) => { const os = tone(o, 170 * k, 0, .45, .26, 'sawtooth', 90 * k, .04), lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = 22; lg.gain.value = 40; lfo.connect(lg); lg.connect(os.frequency); lfo.start(); lfo.stop(actx.currentTime + .55); hiss(o, 0, .4, .06, 500, 250, 1, 'lowpass'); },
  plate:(o, k) => { [523, 1393, 2257, 3011].forEach((f, i) => tone(o, f * k, 0, .7 - i * .12, .14 / (i + 1), 'sine')); hiss(o, 0, .04, .1, 5000, null, 2); },
};
const SFX = {
  tap:o => { tone(o, 1180, 0, .06, .07, 'sine', 960, .004); tone(o, 2360, 0, .03, .02, 'sine', null, .003); hiss(o, 0, .01, .03, 4500, null, 1.2, 'highpass'); },
  // a soft glass «tink»; every tab has its own note of a pentatonic scale, so sliding along the bar plays a little run
  lens:(o, a) => { const f = [659.25, 783.99, 880, 1046.5, 1174.66][(+a || 0) % 5]; tone(o, f, 0, .22, .085, 'sine', null, .004); tone(o, f * 2.005, 0, .11, .03, 'sine', null, .003); tone(o, f * 3.01, 0, .05, .012, 'sine', null, .002); hiss(o, 0, .008, .035, 5200, null, 1.5, 'highpass'); },
  arm:o => tone(o, 1500, 0, .04, .05),
  del:o => { hiss(o, 0, .14, .07, 2600, 500, 1.1); tone(o, 480, 0, .12, .04, 'sine', 260, .004); },
  tab:(o, a) => { if (a != null) return SFX.lens(o, a); tone(o, 1046, 0, .035, .07); hiss(o, 0, .012, .06, 4200, null, 1.5, 'highpass'); },
  toggle:o => { tone(o, 1200, 0, .025, .07); tone(o, 1600, .045, .03, .07); },
  close:o => tone(o, 900, 0, .05, .05, 'sine', 650),
  send:o => hiss(o, 0, .16, .12, 700, 2600, 2),
  set:o => { tone(o, 784, 0, .05, .22, 'triangle'); tone(o, 1175, .055, .08, .22, 'triangle'); },
  unset:o => { tone(o, 1175, 0, .04, .14, 'triangle'); tone(o, 740, .05, .07, .14, 'triangle'); },
  tick:o => tone(o, 620, 0, .03, .14, 'triangle'),
  count:o => tone(o, 880, 0, .09, .3, 'sine'),
  start:o => { hiss(o, 0, .08, .18, 180, null, 1, 'lowpass'); tone(o, 120, 0, .14, .4, 'sine', 60); tone(o, 660, .09, .08, .18, 'square'); tone(o, 990, .17, .14, .18, 'square'); },
  pr:o => { arp(o, [523, 659, 784, 1047], .07, .2, .24); tone(o, 2093, .3, .35, .1); tone(o, 2637, .36, .3, .07); },
  finish:o => { [392, 494, 587].forEach(f => tone(o, f, 0, .7, .14, 'triangle', null, .05)); tone(o, 784, .16, .6, .16, 'triangle', null, .03); tone(o, 1568, .34, .5, .1); },
  level:o => { SFX.finish(o); arp(o, [1047, 1319, 1568, 2093], .08, .3, .16, 'triangle', .5); hiss(o, .5, .6, .05, 6000, null, 1, 'highpass'); },
  shake:o => [0, .22, .45, .67, .9, 1.12].forEach(t => { hiss(o, t, .06, .25, 900, null, 4); tone(o, 170, t, .07, .25, 'sine', 120); }),
  openc:o => { hiss(o, 0, .35, .16, 400, 3000, 1.5); tone(o, 1047, .12, .5, .2); tone(o, 2093, .12, .35, .06); },
  openr:o => { hiss(o, 0, .35, .16, 400, 3500, 1.5); tone(o, 1047, .12, .4, .2); tone(o, 1568, .26, .55, .2); [2637, 3136, 3520].forEach((f, i) => tone(o, f, .4 + i * .06, .18, .06)); },
  opene:o => { hiss(o, 0, .38, .17, 350, 3800, 1.5); arp(o, [880, 1109, 1319], .09, .35, .2, 'triangle', .1); [2217, 2637, 3322].forEach((f, i) => tone(o, f, .42 + i * .07, .22, .06)); tone(o, 1760, .4, .7, .07, 'sine', null, .06); },
  gift:o => { tone(o, 1319, 0, .08, .14, 'triangle'); tone(o, 1760, .08, .12, .14, 'triangle'); tone(o, 2637, .18, .3, .07); },
  rank:o => { SFX.level(o); [523, 784, 1047].forEach(f => tone(o, f, .9, .9, .1, 'triangle', null, .08)); },
  openl:o => { hiss(o, 0, .4, .18, 300, 4000, 1.5); arp(o, [784, 988, 1175, 1568], .09, .35, .2, 'triangle', .1); [1568, 1976, 2349].forEach(f => tone(o, f, .5, 1.1, .08, 'sine', null, .08)); [2637, 3136, 3520, 4186].forEach((f, i) => tone(o, f, .55 + i * .08, .2, .05)); },
  equip:o => { hiss(o, 0, .12, .1, 2500, 6000, 1, 'highpass'); tone(o, 880, .06, .07, .18, 'sine', 1320); },
  locked:o => tone(o, 196, 0, .12, .2, 'triangle', 150),
  buy:o => { tone(o, 1175, 0, .07, .16, 'square'); tone(o, 1760, .08, .28, .16, 'square'); },
  grow:o => { tone(o, 400, 0, .6, .14, 'sine', 1600, .05); arp(o, [523, 659, 784, 1047, 1319], .08, .45, .16, 'triangle', .35); [2093, 2637, 3136].forEach((f, i) => tone(o, f, .8 + i * .07, .25, .06)); },
  nom:o => { tone(o, 520, 0, .07, .25, 'sine', 380); tone(o, 560, .16, .07, .25, 'sine', 400); },
  like:o => { tone(o, 1568, 0, .1, .12); tone(o, 2093, .06, .14, .1); },
  sup:o => { hiss(o, 0, .03, .1, 5000, null, 2, 'highpass'); hiss(o, .05, .03, .08, 5500, null, 2, 'highpass'); tone(o, 1480, .02, .05, .1); },
  supFull:o => { SFX.sup(o); tone(o, 1319, .12, .35, .15); tone(o, 1760, .22, .45, .15); },
  mate:o => { const p = curProf(), k = charOf(p), st = stageOf(S.workouts.length).k; (VOICE[k] || VOICE.cat)(o, [1.35, 1.15, 1, .95, .9][st] || 1); },
};
function sfx(name, a) {
  SFXN.n++; SFXN.t = performance.now();
  const c = sndCfg(), cat = SFX_CAT[name];
  if (!c.on || !c.vol || (cat && !c[cat]) || document.visibilityState === 'hidden') return;
  unlockAudio(); const o = sfxBus(); if (!o || !SFX[name]) return;
  try { SFX[name](o, a); } catch (e) { /* audio unavailable */ }
}

