/* ================= characters (pick one; drawn in the profile colour, animated by mood) ================= */
const mirrorX = d => d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (m, x, y) => `${+(100 - x).toFixed(2)} ${y}`); // absolute M/L/Q paths only
const earPair = (l, cls = 'c-main', ox = 30, oy = 32, inner = '', icls = 'c-dark') =>
  `<g class="c-ear" style="transform-origin:${ox}px ${oy}px"><path class="${cls}" d="${l}"/>${inner ? `<path class="${icls}" d="${inner}"/>` : ''}</g>` +
  `<g class="c-ear r" style="transform-origin:${100 - ox}px ${oy}px"><path class="${cls}" d="${mirrorX(l)}"/>${inner ? `<path class="${icls}" d="${mirrorX(inner)}"/>` : ''}</g>`;
const bodyBase = '<ellipse class="c-main" cx="50" cy="84" rx="22" ry="12.5"/><ellipse class="c-light" cx="50" cy="86.5" rx="11.5" ry="7.5"/>';
const CHARS = {
  cat:{ name:'Кот', face:{ ex:11, ey:47, my:62.5 },
    back:'<path class="c-tail c-stroke" style="transform-origin:66px 88px" stroke-width="7" d="M66 88 Q87 88 84 66"/>',
    body: bodyBase + earPair('M22 40 L25 12 L44 27 L22 40', 'c-main', 32, 32, 'M26.5 33 L28 19.5 L38 27.5 L26.5 33') +
      '<circle class="c-main" cx="50" cy="50" r="28"/><path class="c-wh" style="opacity:.3;stroke-width:2.4" d="M50 24.5 V31 M44 25.5 L45.5 31 M56 25.5 L54.5 31"/>' +
      '<ellipse class="c-light" cx="50" cy="61" rx="12" ry="8.5"/><path class="c-ink" d="M46.8 56.2 H53.2 L50 59.6Z"/><path class="c-wh" d="M38 59.5 L26 57.5 M38 62.5 L27 65 M62 59.5 L74 57.5 M62 62.5 L73 65"/>' },
  fox:{ name:'Лиса', face:{ ex:12, ey:44, my:66.5 },
    back:'<g class="c-tail" style="transform-origin:64px 88px"><path class="c-main" d="M62 90 Q92 92 90 64 Q89 54 81 53 Q87 72 66 80Z"/><path class="c-light" d="M90 64 Q89 54 81 53 Q84 59 83 64 Q87 62 90 64Z"/></g>',
    body: bodyBase + earPair('M20 42 L22 8 L45 26 L20 42', 'c-main', 30, 30, 'M25 34 L25.5 16 L37.5 27 L25 34') +
      '<path class="c-main" d="M21 45 Q21 24 50 24 Q79 24 79 45 Q79 64 50 77 Q21 64 21 45Z"/><path class="c-light" d="M21.5 47 Q36 53 50 54 Q64 53 78.5 47 Q76 63 50 77 Q24 63 21.5 47Z"/><ellipse class="c-ink" cx="50" cy="61.5" rx="3.6" ry="2.7"/>' },
  panda:{ name:'Панда', face:{ ex:12, ey:48, my:64, light:true },
    back:'',
    body:'<ellipse class="c-main" cx="50" cy="84" rx="22" ry="12.5"/>' + earPair('M18 27 Q18 18 27 18 Q36 18 36 27 Q36 36 27 36 Q18 36 18 27Z', 'c-ink', 27, 30) +
      '<circle class="c-light" cx="50" cy="50" r="28"/><ellipse class="c-ink" cx="38" cy="49" rx="7.5" ry="9.5" transform="rotate(-24 38 49)"/><ellipse class="c-ink" cx="62" cy="49" rx="7.5" ry="9.5" transform="rotate(24 62 49)"/><ellipse class="c-ink" cx="50" cy="59" rx="3.8" ry="2.6"/>' },
  owl:{ name:'Сова', face:{ ex:13, ey:44, my:null, big:true },
    back:'',
    body: earPair('M25 31 L22 11 L40 22 L25 31', 'c-main', 28, 26) +
      '<path class="c-main" d="M50 19 Q79 19 80 52 Q82 93 50 94 Q18 93 20 52 Q21 19 50 19Z"/><path class="c-dark" d="M22 54 Q13 72 26 85 Q29 68 22 54Z"/><path class="c-dark" d="M78 54 Q87 72 74 85 Q71 68 78 54Z"/>' +
      '<ellipse class="c-light" cx="50" cy="74" rx="17" ry="16"/><path class="c-wh" d="M43 69 q2 2.2 4 0 M52 69 q2 2.2 4 0 M47.5 75.5 q2 2.2 4 0 M43 82 q2 2.2 4 0 M52 82 q2 2.2 4 0"/>' +
      '<circle class="c-light" cx="37" cy="44" r="11"/><circle class="c-light" cx="63" cy="44" r="11"/><path class="c-beak" d="M45.5 52 H54.5 L50 60Z"/>' },
  dog:{ name:'Пёс', face:{ ex:11, ey:46, my:63.5 },
    back:'<path class="c-tail c-stroke" style="transform-origin:68px 84px" stroke-width="7" d="M68 84 Q83 80 82 66"/>',
    body: bodyBase + '<circle class="c-main" cx="50" cy="50" r="27"/><ellipse class="c-dark" cx="61" cy="45" rx="8.5" ry="8" style="opacity:.55"/>' +
      earPair('M31 28 Q14 27 14 46 Q14 58 24 61 Q28 45 35 32 L31 28', 'c-dark', 30, 30) +
      '<ellipse class="c-light" cx="50" cy="61" rx="13" ry="10"/><ellipse class="c-ink" cx="50" cy="56" rx="5" ry="3.6"/><circle class="c-shine" cx="48.3" cy="54.8" r="1.1"/>' },
  dragon:{ name:'Дракон', face:{ ex:12, ey:45, my:64.5 },
    back: earPair('M31 72 Q12 50 7 62 Q14 63 11 72 Q19 70 21 79 L31 72', 'c-dark', 31, 72) +
      '<path class="c-tail c-main" style="transform-origin:64px 88px" d="M62 90 Q84 93 88 78 L95 75 L91 84 Q86 97 62 95Z"/>',
    body:'<ellipse class="c-main" cx="50" cy="84" rx="22" ry="12.5"/><path d="M41 80 H59 M40 85 H60 M42 90 H58" style="stroke:var(--cl);stroke-width:3;stroke-linecap:round;fill:none"/>' +
      '<path class="c-light" d="M30 33 L25 15 L39 28Z"/><path class="c-light" d="M70 33 L75 15 L61 28Z"/><path class="c-dark" d="M43 26 L50 16 L57 26Z"/>' +
      '<ellipse class="c-main" cx="50" cy="50" rx="28" ry="26"/><ellipse class="c-light" cx="50" cy="61" rx="14" ry="9"/><ellipse class="c-ink" cx="45.5" cy="58.2" rx="1.6" ry="1.2"/><ellipse class="c-ink" cx="54.5" cy="58.2" rx="1.6" ry="1.2"/>' },
  plate:{ name:'Блинчик', face:{ ex:11, ey:43, my:67.5 },
    back:'',
    body:'<circle class="c-main" cx="50" cy="55" r="40"/><circle cx="50" cy="55" r="32" style="fill:none;stroke:rgba(0,0,0,.2);stroke-width:2.6"/><circle cx="50" cy="55" r="36.5" style="fill:none;stroke:rgba(255,255,255,.18);stroke-width:1.6"/><circle cx="50" cy="57" r="6.4" style="fill:#C5C9D0;stroke:rgba(0,0,0,.25)"/><circle cx="50" cy="57" r="2.5" style="fill:#2A2C31"/>' },
};
const CHAR_ORDER = ['cat', 'fox', 'panda', 'owl', 'dog', 'dragon', 'plate'];
function charFace(f, mood) {
  const L = 50 - f.ex, R = 50 + f.ex, y = f.ey, ln = f.light ? 'c-line" style="stroke:#fff' : 'c-line';
  const rx = f.big ? 4.4 : 3.6, ry = f.big ? 5.4 : 4.6;
  let eyes;
  if (mood === 'sleepy') eyes = `<path class="${ln}" d="M${L - 4} ${y} Q${L} ${y + 4} ${L + 4} ${y} M${R - 4} ${y} Q${R} ${y + 4} ${R + 4} ${y}"/>`;
  else if (mood === 'fire') eyes = `<path class="${ln}" d="M${L - 4} ${y + 1.5} Q${L} ${y - 4} ${L + 4} ${y + 1.5} M${R - 4} ${y + 1.5} Q${R} ${y - 4} ${R + 4} ${y + 1.5}"/>`;
  else { const e = f.light ? 'c-shine' : 'c-ink', sh = f.light ? 'c-ink' : 'c-shine'; eyes = `<g class="c-eyes"><ellipse class="${e}" cx="${L}" cy="${y}" rx="${rx}" ry="${ry}"/><ellipse class="${e}" cx="${R}" cy="${y}" rx="${rx}" ry="${ry}"/><circle class="${sh}" cx="${L + 1.3}" cy="${y - 1.7}" r="1.3"/><circle class="${sh}" cx="${R + 1.3}" cy="${y - 1.7}" r="1.3"/></g>`; }
  const blush = (mood === 'happy' || mood === 'fire') && !f.light ? `<ellipse class="c-blush" cx="${L - 6}" cy="${y + 9}" rx="4.5" ry="2.6"/><ellipse class="c-blush" cx="${R + 6}" cy="${y + 9}" rx="4.5" ry="2.6"/>` : '';
  const m = f.my; let mouth = '';
  if (m != null) {
    if (mood === 'sleepy') mouth = `<ellipse class="c-ink" cx="50" cy="${m + 1}" rx="2.3" ry="1.9"/>`;
    else if (mood === 'calm') mouth = `<path class="c-line" d="M45.5 ${m} Q50 ${m + 4} 54.5 ${m}"/>`;
    else { const w = mood === 'fire' ? 8 : 6, h = mood === 'fire' ? 11 : 8.5; mouth = `<path class="c-ink" d="M${50 - w} ${m - 1} Q50 ${m + h} ${50 + w} ${m - 1}Z"/><path class="c-tongue" d="M${50 - w / 2} ${m + h / 2 - 1} Q50 ${m + h / 2 + 2.5} ${50 + w / 2} ${m + h / 2 - 1} Q50 ${m + h / 2 - 2.5} ${50 - w / 2} ${m + h / 2 - 1}Z"/>`; }
  }
  return eyes + blush + mouth;
}
