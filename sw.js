/* Prism offline support.
   Online: always fetch the newest copy, and keep it for later.
   Offline, or if the network stalls: use the copy saved on this device. */
const CACHE = 'prism-v3';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'fonts/michroma.woff2', 'fonts/share-tech-mono.woff2', 'models/turntable.glb'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function fromCache(req) {
  return caches.match(req, { ignoreSearch: true }).then(hit => {
    if (hit) return hit;
    if (req.mode === 'navigate') return caches.match('./').then(page => page || caches.match('index.html')).then(page => page || Response.error());
    return Response.error();
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(new Promise(resolve => {
    let done = false;
    const finish = r => { if (!done) { done = true; resolve(r); } };
    const timer = setTimeout(() => fromCache(req).then(r => { if (r && r.type !== 'error') finish(r); }), 4000);
    fetch(req).then(res => {
      clearTimeout(timer);
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      finish(res);
    }).catch(() => { clearTimeout(timer); fromCache(req).then(finish); });
  }));
});
