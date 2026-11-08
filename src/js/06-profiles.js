/* ================= profiles ================= */
const COLORS = {
  lime:['#5C9A00','#C5F23A','#0F1A00','#132000','Лайм'],
  green:['#12935C','#3EDC8F','#FFFFFF','#04170D','Зелёный'],
  mint:['#0F8F6B','#6EE7B7','#FFFFFF','#022C22','Мятный'],
  teal:['#0B8A86','#2ED3CC','#FFFFFF','#00201E','Бирюзовый'],
  sky:['#0B7FC0','#4CC3FF','#FFFFFF','#00192B','Голубой'],
  blue:['#2450E8','#6F8BFF','#FFFFFF','#050A1F','Синий'],
  violet:['#6C3CE0','#A88BFF','#FFFFFF','#0E0624','Фиолетовый'],
  fuchsia:['#B21FB8','#F07CFF','#FFFFFF','#2A0530','Фуксия'],
  pink:['#D02F74','#FF6FAE','#FFFFFF','#240414','Розовый'],
  red:['#D42A3C','#FF4D5E','#FFFFFF','#1A0306','Красный'],
  coral:['#D4472F','#FF8A70','#FFFFFF','#2A0A04','Коралловый'],
  orange:['#D9530C','#FF7A2E','#FFFFFF','#1F0B00','Оранжевый'],
  amber:['#B86E00','#FFB020','#FFFFFF','#241500','Янтарный'],
  yellow:['#E9B300','#FFD23F','#1A1400','#1A1400','Жёлтый'],
  sand:['#8C6E46','#E3C79A','#FFFFFF','#241A0C','Песочный'],
  mono:['#1E1F22','#F1F1EE','#FFFFFF','#0D0E10','Графит'],
};
const profiles = () => (S.meta && Array.isArray(S.meta.profiles) && S.meta.profiles.length) ? S.meta.profiles : [{ id:'main', name:'', color:'red' }];
const curProf = () => profiles().find(p => p.id === S.pid) || profiles()[0];
const pname = p => (p && p.name) || 'Я';
const lookOf = () => (S.meta && S.meta.look) || 'noir';
const NOIR_ACC = { bone:['#1E1F22','#E9E7E2','#FFFFFF','#0B0B0C','Кость'], blood:['#8E2F2A','#C4564F','#FFFFFF','#1A0807','Кровь'], brass:['#7A6430','#C2A86C','#FFFFFF','#16110A','Латунь'], steel:['#44607F','#8DA6C4','#FFFFFF','#0A1118','Сталь'], moss:['#476B44','#8DB08A','#FFFFFF','#0A140A','Мох'], violet:['#5B4A7E','#A593C8','#FFFFFF','#100C18','Аметист'], ash:['#55534F','#8C8A85','#FFFFFF','#0E0E0D','Пепел'] };
const NC = {};
const noirC = k => NC[k] || (NC[k] = (() => { const c = COLORS[k] || COLORS.red, m = h => { const n = parseInt(h.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, y = .3 * r + .59 * g + .11 * b, f = v => Math.round(y + (v - y) * .3).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); }; return [m(c[0]), m(c[1]), c[2], c[3], c[4]]; })());
const col = p => lookOf() === 'noir' ? noirC(p && p.color) : (COLORS[p && p.color] || COLORS.red);
const isLight = () => { const t = document.documentElement.getAttribute('data-theme'); if (t) return t === 'light'; try { return matchMedia('(prefers-color-scheme: light)').matches; } catch (e) { return false; } };
const pcolor = p => col(p)[isLight() ? 0 : 1];
const ava = (p, cls = '') => `<span class="ava ${cls}" style="--pc:${col(p)[0]};--pci:${col(p)[2]}" aria-hidden="true">${esc((pname(p)[0] || '?').toUpperCase())}</span>`;
function applyAccent(colorKey) { const c = lookOf() === 'noir' ? (NOIR_ACC[(S.meta && S.meta.noirAcc)] || NOIR_ACC.bone) : (COLORS[colorKey || curProf().color] || COLORS.red); const st = document.documentElement.style; st.setProperty('--acc-l', c[0]); st.setProperty('--acc-d', c[1]); st.setProperty('--acc-ink-l', c[2]); st.setProperty('--acc-ink-d', c[3]); }
const nextColor = () => { const used = new Set(profiles().map(p => p.color)); return ['pink', 'lime', 'sky', 'orange', 'violet', 'mint', 'coral', 'blue', 'amber', 'fuchsia', 'teal', 'green', 'yellow', 'red', 'sand', 'mono'].find(k => !used.has(k)) || 'pink'; };
function applyTheme() {
  const t0 = (S.meta && S.meta.theme) || 'auto', t = t0 === 'auto' && lookOf() === 'noir' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t0, r = document.documentElement;
  r.setAttribute('data-look', lookOf());
  if (S.meta && S.meta.oled) r.setAttribute('data-oled', '1'); else r.removeAttribute('data-oled');
  if (t === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t);
  requestAnimationFrame(() => { const bg = getComputedStyle(r).getPropertyValue('--bg').trim(); const m = $('meta[name="theme-color"]'); if (m && bg) m.setAttribute('content', bg); });
}

try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (lookOf() === 'noir' && ((S.meta && S.meta.theme) || 'auto') === 'auto') { applyTheme(); render(); } }); } catch (e) { /* old browser */ }

