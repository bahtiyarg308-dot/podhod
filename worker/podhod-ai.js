// «Подход» — ИИ-посредник для Cloudflare Workers.
// Приложение лежит в открытом доступе, поэтому ключи ИИ-сервисов в нём хранить нельзя. Этот воркер стоит между приложением и ИИ:
//   1. пускает только вошедших в приложение (проверяет токен Firebase: подпись, проект, срок, подтверждённую почту);
//   2. считает дневной лимит на человека и общий, чтобы бесплатные тарифы не кончились (нужен KV «LIMITS»);
//   3. сам задаёт роль и правила ИИ (приложение шлёт только вопрос и краткую сводку по тренировкам);
//   4. спрашивает ИИ по цепочке и берёт первый ответ: Groq → Gemini → Cloudflare Workers AI (что настроено, то и работает).
// Настройки — в панели Cloudflare (Settings → Variables and Secrets / Bindings), см. worker/README.md.

const DEFAULTS = {
  ALLOWED_ORIGIN: 'https://bahtiyarg308-dot.github.io', // откуда можно обращаться (адрес приложения); несколько — через запятую
  FIREBASE_PROJECT: 'podhod-5d27f',
  DAILY_LIMIT: '30',        // вопросов в день на человека
  GLOBAL_DAILY: '300',      // вопросов в день на всех (KV на бесплатном тарифе даёт ~1000 записей в сутки, по две на вопрос)
  PROVIDERS: 'groq,gemini,cf',
  MODEL_GROQ: 'openai/gpt-oss-120b',
  MODEL_GEMINI: 'gemini-2.5-flash',
  MODEL_CF: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  TIMEOUT_MS: '14000',
};
const MODES = { chat: { tokens: 700, temp: .6, json: false }, week: { tokens: 600, temp: .5, json: false }, program: { tokens: 1500, temp: .4, json: true }, goal: { tokens: 1000, temp: .4, json: true } };

const PERSONA = `Ты — тренер в приложении-дневнике тренировок «Подход». Пишешь по-русски, на «вы», тепло и по делу, без воды и без канцелярита.
Опирайся только на данные пользователя из блока ДАННЫЕ (JSON). Если чего-то в данных нет — так и скажи или задай один уточняющий вопрос, ничего не выдумывай.
Ты не врач: при боли, травмах, беременности, хронических болезнях и жёстких диетах советуй обратиться к врачу. Не предлагай опасных практик (голодание, обезвоживание, запрещённые препараты).
Не повторяй данные целиком, выбирай главное. Не используй таблицы и заголовки с решётками; можно короткие списки через «-» и выделение **жирным**.`;
const TASKS = {
  chat: `Отвечай на вопрос пользователя. Обычно хватает 80–180 слов. Если вопрос про тренировки — учитывай его историю из ДАННЫХ.`,
  week: `Сделай разбор недели по ДАННЫХ в трёх коротких частях, каждая начинается с жирного заголовка: **Что получилось**, **Что подтянуть**, **План на следующую неделю**. Всего до 170 слов. Называй конкретные упражнения и цифры из данных.`,
  program: `Составь недельную программу тренировок под цель и уровень пользователя. Верни ТОЛЬКО JSON без пояснений, без разметки и без кодовых блоков, в таком виде:
{"name":"Название программы","note":"1-2 предложения, на что опираетесь","days":[{"name":"День 1 — Верх","items":[{"ex":"Жим штанги лёжа","sets":4,"reps":8}]}]}
Правила: 2–5 дней; в дне 4–7 упражнений; "ex" — точное название ТОЛЬКО из списка УПРАЖНЕНИЯ; sets 2–6; reps 3–20 (для времени и кардио — минуты или секунды числом). Учитывай, сколько раз в неделю человек реально тренируется (поле perWeek).`,
  goal: `Помоги с целью или привычками. Верни ТОЛЬКО JSON без пояснений, без разметки и без кодовых блоков, в таком виде:
{"summary":"1-3 предложения: с чего начать","steps":["короткий шаг","..."],"habits":[{"name":"Вода 2 литра","cat":"v","d":0,"days":[]}]}
Правила: steps — 3–6 шагов по порядку; habits — 2–5 привычек, ежедневных или по дням недели; cat — одна буква: s сила, v выносливость, d дисциплина, r разум, c спокойствие, z достаток; d — сложность 0 лёгкая, 1 средняя, 2 трудная; days — массив номеров дней недели (0 — воскресенье … 6 — суббота), пустой массив = каждый день.`,
};

const enc = new TextEncoder(), dec = new TextDecoder();
const cfg = (env, k) => (env[k] != null && env[k] !== '' ? String(env[k]) : DEFAULTS[k]);
const num = (env, k) => { const v = parseInt(cfg(env, k), 10); return Number.isFinite(v) ? v : parseInt(DEFAULTS[k], 10); };

/* ---------- CORS ---------- */
function allowedOrigin(env, origin) {
  if (!origin) return null;
  const list = cfg(env, 'ALLOWED_ORIGIN').split(',').map(s => s.trim()).filter(Boolean);
  return list.includes(origin) ? origin : null;
}
function reply(env, req, status, body, extra = {}) {
  const o = allowedOrigin(env, req.headers.get('Origin'));
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Origin', ...extra };
  if (o) { h['Access-Control-Allow-Origin'] = o; h['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'; h['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS'; h['Access-Control-Max-Age'] = '86400'; }
  return new Response(body == null ? null : JSON.stringify(body), { status, headers: h });
}

/* ---------- проверка токена Firebase (RS256) ---------- */
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let jwks = { keys: null, at: 0, tried: 0 };
const b64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4); const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
async function jwk(kid, force) {
  const now = Date.now();
  if (!jwks.keys || force || now - jwks.at > 3600e3) {
    if (now - jwks.tried < 30e3 && jwks.keys) return jwks.keys.find(k => k.kid === kid);   // ключи не чаще раза в полминуты
    jwks.tried = now;
    const r = await fetch(JWKS_URL); if (!r.ok) throw new Error('jwks');
    jwks = { keys: (await r.json()).keys || [], at: now, tried: now };
  }
  return jwks.keys.find(k => k.kid === kid);
}
async function verifyToken(token, project) {
  const p = String(token || '').split('.'); if (p.length !== 3) throw new Error('format');
  let head, body; try { head = JSON.parse(dec.decode(b64u(p[0]))); body = JSON.parse(dec.decode(b64u(p[1]))); } catch (e) { throw new Error('format'); }
  if (head.alg !== 'RS256' || !head.kid) throw new Error('alg');
  const now = Math.floor(Date.now() / 1000);
  if (body.aud !== project || body.iss !== 'https://securetoken.google.com/' + project) throw new Error('project');
  if (typeof body.sub !== 'string' || !body.sub || body.sub.length > 128) throw new Error('sub');
  if (!(body.exp > now) || !(body.iat <= now + 300)) throw new Error('expired');
  if (body.email_verified !== true) throw new Error('unverified');
  let key = await jwk(head.kid); if (!key) key = await jwk(head.kid, true); if (!key) throw new Error('kid');
  const ck = await crypto.subtle.importKey('jwk', { kty: key.kty, n: key.n, e: key.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', ck, b64u(p[2]), enc.encode(p[0] + '.' + p[1])))) throw new Error('signature');
  return body.sub;
}

/* ---------- дневной лимит ---------- */
async function takeQuota(env, uid) {
  const kv = env.LIMITS, day = new Date().toISOString().slice(0, 10), uk = `u:${day}:${uid}`, gk = `g:${day}`;
  const [u, g] = await Promise.all([kv.get(uk), kv.get(gk)]), un = +u || 0, gn = +g || 0, lim = num(env, 'DAILY_LIMIT'), glim = num(env, 'GLOBAL_DAILY');
  if (un >= lim) return { ok: false, why: 'user' };
  if (gn >= glim) return { ok: false, why: 'global' };
  await Promise.all([kv.put(uk, String(un + 1), { expirationTtl: 172800 }), kv.put(gk, String(gn + 1), { expirationTtl: 172800 })]);
  return { ok: true, left: lim - un - 1, uk, un };
}
const refund = (env, q) => env.LIMITS.put(q.uk, String(q.un), { expirationTtl: 172800 }).catch(() => {});

/* ---------- запрос и проверка входных данных ---------- */
const clean = s => String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ');
function parseBody(raw) {
  let b; try { b = JSON.parse(raw); } catch (e) { return { err: 'json' }; }
  if (!b || typeof b !== 'object' || !MODES[b.mode]) return { err: 'mode' };
  const msgs = Array.isArray(b.messages) ? b.messages : []; if (!msgs.length || msgs.length > 12) return { err: 'messages' };
  let total = 0; const messages = [];
  for (const m of msgs) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return { err: 'messages' };
    const t = clean(m.content).trim().slice(0, 2000); total += t.length; if (t) messages.push({ role: m.role, content: t });
  }
  if (!messages.length || total > 9000 || messages[messages.length - 1].role !== 'user') return { err: 'messages' };
  let context = b.context == null ? {} : b.context; if (typeof context !== 'object') return { err: 'context' };
  const ctx = clean(JSON.stringify(context)); if (ctx.length > 8000) return { err: 'context' };
  let names = []; if (b.mode === 'program') { if (!Array.isArray(b.names) || b.names.length > 500) return { err: 'names' }; names = b.names.filter(x => typeof x === 'string').map(x => clean(x).slice(0, 60)); }
  return { mode: b.mode, messages, ctx, names };
}
function buildSystem(q) {
  let s = PERSONA + '\n\n' + TASKS[q.mode] + '\n\nДАННЫЕ:\n' + q.ctx;
  if (q.mode === 'program') s += '\n\nУПРАЖНЕНИЯ (выбирай только из этого списка):\n' + q.names.join('; ');
  return s;
}

/* ---------- поставщики ИИ ---------- */
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
const tidy = t => String(t || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
async function viaGroq(env, q, m, ms) {
  const model = cfg(env, 'MODEL_GROQ'), body = { model, messages: [{ role: 'system', content: buildSystem(q) }, ...q.messages], temperature: m.temp, max_completion_tokens: m.tokens };
  if (/gpt-oss/.test(model)) body.reasoning_effort = q.mode === 'program' ? 'medium' : 'low';
  if (m.json && !/gpt-oss/.test(model)) body.response_format = { type: 'json_object' };
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + env.GROQ_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error('groq ' + r.status);
  const j = await r.json(); return { text: tidy(j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content), model };
}
async function viaGemini(env, q, m, ms) {
  const model = cfg(env, 'MODEL_GEMINI'), gc = { temperature: m.temp, maxOutputTokens: m.tokens + (/flash/.test(model) ? 0 : 1500) };
  if (m.json) gc.responseMimeType = 'application/json';
  if (/flash/.test(model)) gc.thinkingConfig = { thinkingBudget: q.mode === 'program' ? 512 : 0 };
  const body = { systemInstruction: { parts: [{ text: buildSystem(q) }] }, contents: q.messages.map(x => ({ role: x.role === 'assistant' ? 'model' : 'user', parts: [{ text: x.content }] })), generationConfig: gc };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error('gemini ' + r.status);
  const j = await r.json(), parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
  return { text: tidy(parts.map(p => p.text || '').join('')), model };
}
async function viaCf(env, q, m, ms) {
  const model = cfg(env, 'MODEL_CF'), r = await withTimeout(env.AI.run(model, { messages: [{ role: 'system', content: buildSystem(q) }, ...q.messages], max_tokens: m.tokens, temperature: m.temp }), ms + 8000);
  const t = r && (r.response ?? (r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content) ?? (r.result && r.result.response));
  return { text: tidy(typeof t === 'string' ? t : ''), model };
}
const PROVIDERS = {
  groq: { ok: env => !!env.GROQ_API_KEY, run: viaGroq },
  gemini: { ok: env => !!env.GEMINI_API_KEY, run: viaGemini },
  cf: { ok: env => !!env.AI && typeof env.AI.run === 'function', run: viaCf },
};
const chain = env => cfg(env, 'PROVIDERS').split(',').map(s => s.trim()).filter(n => PROVIDERS[n] && PROVIDERS[n].ok(env));
async function ask(env, q) {
  const m = MODES[q.mode], ms = num(env, 'TIMEOUT_MS'), tried = [];
  for (const name of chain(env)) {
    try { const r = await PROVIDERS[name].run(env, q, m, ms); if (r.text) return { text: r.text.slice(0, 6000), provider: name, model: r.model }; tried.push(name + ':empty'); }
    catch (e) { tried.push(name + ':' + String(e && e.message || e).slice(0, 40)); }
  }
  console.log('all providers failed', tried.join(' '));
  return null;
}

/* ---------- вход ---------- */
export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get('Origin');
    if (req.method === 'OPTIONS') return allowedOrigin(env, origin) ? reply(env, req, 204, null) : new Response(null, { status: 403 });
    if (url.pathname === '/' || url.pathname === '/health') return reply(env, req, 200, { ok: true, service: 'podhod-ai', providers: chain(env), kv: !!env.LIMITS });
    if (url.pathname !== '/ask' || req.method !== 'POST') return reply(env, req, 404, { error: 'not_found' });
    if (origin && !allowedOrigin(env, origin)) return reply(env, req, 403, { error: 'origin' });
    if (!env.LIMITS) return reply(env, req, 503, { error: 'not_configured', detail: 'нет хранилища LIMITS' });
    if (!chain(env).length) return reply(env, req, 503, { error: 'not_configured', detail: 'нет ни одного ИИ' });
    const auth = req.headers.get('Authorization') || '';
    let uid; try { uid = await verifyToken(auth.replace(/^Bearer\s+/i, ''), cfg(env, 'FIREBASE_PROJECT')); } catch (e) { return reply(env, req, 401, { error: 'auth', detail: String(e && e.message || e) }); }
    const raw = await req.text(); if (raw.length > 24000) return reply(env, req, 413, { error: 'too_big' });
    const q = parseBody(raw); if (q.err) return reply(env, req, 400, { error: 'bad_request', detail: q.err });
    const quota = await takeQuota(env, uid);
    if (!quota.ok) return reply(env, req, 429, { error: 'limit', why: quota.why });
    const out = await ask(env, q);
    if (!out) { await refund(env, quota); return reply(env, req, 502, { error: 'ai_down' }); }
    return reply(env, req, 200, { text: out.text, provider: out.provider, model: out.model, left: quota.left });
  },
};
