/* ================= training alone or with a partner ================= */
const pairOn = () => !!syncCfg() || cloudPartnersN() > 0 || (S.meta && S.meta.mode ? S.meta.mode === 'pair' : profiles().length > 1);
const tabsNow = () => TABS;
const modeSeg = act => `<div class="seg" role="group" aria-label="Как тренируетесь">${[['solo', 'Один', 'user'], ['pair', 'С партнёром', 'users']].map(([k, l, ic]) => `<button data-act="${act}" data-v="${k}" aria-pressed="${(act === 'wlMode' ? (top() && top().mode) || 'solo' : pairOn() ? 'pair' : 'solo') === k}"${act !== 'wlMode' && k === 'solo' && (syncCfg() || cloudPartnersN()) ? ' disabled' : ''}>${icon(ic)} ${l}</button>`).join('')}</div>`;


