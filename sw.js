// 052_CRESTIES — 이전 서비스워커 정리용 (self-destruct)
// 과거 버전이 카탈로그를 옛 화면으로 캐시하던 문제를 없애기 위해,
// 등록돼 있던 서비스워커가 캐시를 비우고 스스로 등록 해제한 뒤 페이지를 새로고침합니다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
