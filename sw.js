/* Prism offline support: always try the network first so updates arrive, fall back to the saved copy when offline. */
const CACHE = 'prism-v1';
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png']).catch(() => {})));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (u.origin !== location.origin && !fonts) return;
  e.respondWith(
    fetch(r).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('./')))
  );
});
