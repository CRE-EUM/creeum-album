// 크레이음 PWA Service Worker
// 정적 셸은 캐시 우선, Supabase API/사진은 네트워크 우선
const CACHE = 'creeum-shell-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/styles.css',
  './assets/js/config.js',
  './assets/js/supabase-client.js',
  './assets/js/auth.js',
  './assets/js/geckos.js',
  './assets/js/ui.js',
  './assets/js/app.js',
  './assets/icons/logo.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Supabase API/Storage 는 항상 네트워크
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) {
    return; // 기본 네트워크 처리
  }

  // 동일 출처 정적 파일만 캐시 우선
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request).then((resp) => {
        const copy = resp.clone();
        if (resp.ok && e.request.method === 'GET') {
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => cached))
    );
  }
});
