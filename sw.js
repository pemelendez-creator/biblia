/* Service worker de la Biblia de Estudio RV1909 — Iglesia Pentecostal El Bosque
   Guarda la aplicación completa en el dispositivo para que funcione sin internet. */

const CACHE = 'biblia-ipb-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sermones.json',
  './favicon-256.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

// Al instalar: descargar y guardar todo
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('No se pudo precargar todo:', err))
  );
});

// Al activar: borrar versiones antiguas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Al pedir un archivo: servir primero desde el dispositivo (rápido y sin internet)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Sermones publicados: primero internet (para ver los nuevos), y si no hay, la copia guardada
  if (new URL(e.request.url).pathname.endsWith('/sermones.json')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put('./sermones.json', copy));
          }
          return res;
        })
        .catch(() => caches.match('./sermones.json', { ignoreSearch: true }))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(e.request)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});

// Permite que la página ordene activar la versión nueva sin esperar
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
