/**
 * PWAサービスワーカー
 * オフラインキャッシュと通知を管理します
 */

// キャッシュバージョン
const CACHE_VERSION = 'v1';
// キャッシュ名
const CACHE_NAME = `ikoma-erp-cache-${CACHE_VERSION}`;
// プリキャッシュ対象
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-180.png',
  '/favicon.ico',
];
// キャッシュ対象のリソース種別
const ASSET_DESTINATIONS = ['style', 'script', 'image', 'font'];

/**
 * プリキャッシュを実行する
 * @returns {Promise<void>} 実行結果
 */
const precacheAssets = async () => {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(PRECACHE_URLS);
};

/**
 * 古いキャッシュを削除する
 * @returns {Promise<void>} 削除結果
 */
const clearOldCaches = async () => {
  const cacheKeys = await caches.keys();
  const obsoleteKeys = cacheKeys.filter((key) => key !== CACHE_NAME);
  await Promise.all(obsoleteKeys.map((key) => caches.delete(key)));
};

/**
 * キャッシュにレスポンスを保存する
 * @param {Request} request - 対象リクエスト
 * @param {Response} response - 対象レスポンス
 * @returns {Promise<void>} 保存結果
 */
const cacheResponse = async (request, response) => {
  if (!response || response.status !== 200) {
    return;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
};

/**
 * ナビゲーションリクエストを処理する
 * @param {Request} request - 対象リクエスト
 * @returns {Promise<Response>} レスポンス
 */
const handleNavigationRequest = async (request) => {
  try {
    const response = await fetch(request);

    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/index.html', response.clone());
    }

    return response;
  } catch (error) {
    const cachedResponse = await caches.match('/index.html');
    return cachedResponse || Response.error();
  }
};

/**
 * 静的アセットリクエストを処理する
 * @param {Request} request - 対象リクエスト
 * @returns {Promise<Response>} レスポンス
 */
const handleAssetRequest = async (request) => {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  await cacheResponse(request, response);
  return response;
};

/**
 * プッシュ通知のデータを取得する
 * @param {PushEvent} event - プッシュイベント
 * @returns {Object} 通知データ
 */
const getNotificationData = (event) => {
  if (!event.data) {
    return {
      title: 'Ikoma Festival ERP 2026',
      body: 'You have a new notification.',
      url: '/',
    };
  }

  try {
    const parsedData = event.data.json();
    return {
      title: parsedData.title || 'Ikoma Festival ERP 2026',
      body: parsedData.body || 'You have a new notification.',
      url: parsedData.url || '/',
    };
  } catch (error) {
    return {
      title: 'Ikoma Festival ERP 2026',
      body: event.data.text(),
      url: '/',
    };
  }
};

/**
 * 通知のオプションを生成する
 * @param {Object} data - 通知データ
 * @returns {NotificationOptions} 通知オプション
 */
const buildNotificationOptions = (data) => {
  return {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      url: data.url,
    },
  };
};

/**
 * 通知クリック時の遷移を処理する
 * @param {NotificationEvent} event - 通知イベント
 * @returns {Promise<void>} 処理結果
 */
const handleNotificationClick = async (event) => {
  const targetUrl = event.notification?.data?.url || '/';
  const resolvedUrl = new URL(targetUrl, self.location.origin).href;
  const clientList = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  for (const client of clientList) {
    if (client.url === resolvedUrl && 'focus' in client) {
      await client.focus();
      return;
    }
  }

  if (clients.openWindow) {
    await clients.openWindow(resolvedUrl);
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAssets());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clearOldCaches());
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  if (ASSET_DESTINATIONS.includes(event.request.destination)) {
    event.respondWith(handleAssetRequest(event.request));
  }
});

self.addEventListener('push', (event) => {
  const notificationData = getNotificationData(event);
  const notificationOptions = buildNotificationOptions(notificationData);

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(handleNotificationClick(event));
});
