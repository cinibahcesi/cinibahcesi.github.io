// Çini Bahçesi – çevrimdışı çalışma için önbellek.
// Oyunu güncellediğinde aşağıdaki sürümü artır (ör. cini-v6).
// Strateji: "önce ağ". İnternet varsa her zaman en yeni dosyalar gelir (eski ve yeni dosyalar
// karışmaz); internet yoksa önbellekteki son sürüm açılır.
var CACHE = 'cini-v5';
var FILES = ['./', 'index.html', 'style.css', 'game.js', 'app.js', 'manifest.json', 'privacy.html',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var same = new URL(e.request.url).origin === location.origin;
  if (!same) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return e.request.mode === 'navigate' ? caches.match('index.html') : Response.error();
    });
  }));
});
