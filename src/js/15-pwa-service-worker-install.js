/* ================= PWA: service worker, install ================= */
/* a downloaded update installs itself when it cannot disturb anything: at launch and when the app comes back to the screen, with no workout running */
function autoUpdate() { const w = S.updateReady; if (!w || S.active || (S.sheets.length && !gateSheet())) return; flush(); w.postMessage('skip'); }
function registerSW() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.register('./sw.js').then(reg => {
    const watch = w => { if (!w) return; w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { S.updateReady = w; toast('Вышло обновление приложения', '', { label:'Обновить', act:'applyUpdate' }); render(); } }); };
    if (reg.waiting && navigator.serviceWorker.controller) { S.updateReady = reg.waiting; render(); autoUpdate(); }
    reg.addEventListener('updatefound', () => watch(reg.installing));
    setInterval(() => { reg.update().catch(() => {}); }, 3600000);
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; render(); });
window.addEventListener('appinstalled', () => { S.installEvt = null; toast('Приложение установлено на телефон'); requestPersist(); render(); });

