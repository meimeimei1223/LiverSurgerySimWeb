// Service Worker for Liver Surgery Simulator PWA
// プリキャッシュのみ（fetch 介入なし = FPS 影響ゼロ）
const CACHE_NAME = 'liver-sim-v203';
const ASSETS = [
  './',
  './index.html',
  './softbody.js',
  './softbody.wasm',
  './softbody.data',
  './data/cut_icon.png',
  './data/liver_icon.png',
  './data/portal_icon.png',
  './data/vein_icon.png',
  './data/tumor_icon.png',
  './data/gb_icon.png',
  './data/handleSphere_icon.png',
  './data/deform_icon.png',
  './data/segment_icon.png',
  './data/transform_icon.png',
  './data/reset_icon.png',
];

// インストール: アセットをプリキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching assets');
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// アクティベート: 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// fetch: ネットワーク優先、オフライン時のみキャッシュから返す（FPS影響ゼロ）
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
