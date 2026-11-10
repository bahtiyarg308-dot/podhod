/* «Подход» — офлайн-кеш. При каждом обновлении приложения меняйте VERSION. */
const VERSION = 'podhod-3.5.0';
const APP_JS = './app.js?v=e66bcb74e6'; // rewritten by tools/build.js
const ASSETS = [
  './',
  './index.html',
  APP_JS,
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './fonts/oswald-cyrillic-wght-normal.woff2',
  './fonts/oswald-latin-wght-normal.woff2',
  './fonts/rubik-cyrillic-wght-normal.woff2',
  './fonts/rubik-latin-wght-normal.woff2',
  './fonts/martian-mono-cyrillic-wght-normal.woff2',
  './fonts/martian-mono-latin-wght-normal.woff2'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache:'reload' })))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const ROOT = new URL('./', self.registration.scope).pathname;
  if (req.mode === 'navigate' && (url.pathname === ROOT || url.pathname === ROOT + 'index.html')) { // other pages of the site (e.g. worker/) open as they are
    e.respondWith(caches.match('./index.html').then(r => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: !url.pathname.endsWith('/app.js') }).then(r => r || fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
