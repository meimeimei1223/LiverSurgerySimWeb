// Service Worker for Liver Surgery Simulator PWA
const CACHE_NAME = 'liver-sim-v195';
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

// インストール: アセットをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching assets');
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

// フェッチ: キャッシュ優先、なければネットワーク
self.addEventListener('fetch', event => {
  // Firebase や外部APIはキャッシュしない
  if (event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // 成功したレスポンスをキャッシュに追加
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // オフライン時のフォールバック
      if (event.request.destination === 'document') {
        return caches.match('./index.html');
      }
    })
  );
});
