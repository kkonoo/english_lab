// 네트워크 우선, 오프라인이면 캐시
const CACHE = 'english_lab-v1';
const SHELL = [
  './', 'index.html', 'css/style.css',
  'data/core.js', 'data/phrasals.js', 'data/shadow.js', 'data/idioms.js', 'data/words.js',
  'js/app.js', 'js/card.js', 'js/today.js', 'js/quiz.js', 'js/grid.js', 'js/list.js', 'js/sounds.js', 'js/shadow.js', 'js/idioms.js', 'js/words.js', 'js/notes.js', 'js/search.js',
  'js/sync.js', 'js/firebase-config.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req, { cacheName: CACHE }))
  );
});
