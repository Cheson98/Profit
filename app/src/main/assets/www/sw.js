/* Service worker: bewaart de hele app op het apparaat, zodat Profit ook zonder internet werkt
 * (bijvoorbeeld in de sportzaal). VERSION wordt bij het publiceren op GitHub Pages vervangen;
 * een nieuwe versie haalt dan alle bestanden opnieuw op en ruimt de oude op. */
var VERSION = 'dev';
var CACHE = 'profit-' + VERSION;

// Elk bestand van de app staat hier; tests/web-tests.js controleert dat er niets ontbreekt.
var FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'version.js',
  'css/style.css',
  'js/norms.js',
  'js/engine.js',
  'js/results.js',
  'js/charts.js',
  'js/backup.js',
  'js/reminders.js',
  'js/web.js',
  'js/app.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf('profit-') === 0 && k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        return fetch(req).catch(function () {
          return req.mode === 'navigate' ? c.match('index.html') : Response.error();
        });
      });
    })
  );
});
