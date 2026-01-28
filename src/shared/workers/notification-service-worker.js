/**
 * 通知用Service Worker
 * プッシュ通知の受信とバックグラウンド処理
 */

/* eslint-env serviceworker */

// Service Workerのインストール
self.addEventListener('install', (event) => {
  console.log('[Service Worker] インストール完了');
  self.skipWaiting();
});

// Service Workerのアクティベーション
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] アクティベーション完了');
  event.waitUntil(self.clients.claim());
});

// プッシュ通知の受信
self.addEventListener('push', (event) => {
  console.log('[Service Worker] プッシュ通知を受信');

  let notificationData = {
    title: 'お知らせ',
    body: '新しい通知があります',
    icon: '/icons/notification-icon.png',
    badge: '/icons/notification-badge.png',
    data: {}
  };

  // プッシュデータの解析
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.message || payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.id || 'notification',
        data: {
          notificationId: payload.id,
          deepLink: payload.deep_link || payload.deepLink,
          type: payload.type,
          ...payload.data
        }
      };
    } catch (error) {
      console.error('[Service Worker] プッシュデータの解析エラー:', error);
    }
  }

  // 通知を表示
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: false,
      vibrate: [200, 100, 200]
    })
  );
});

// 通知のクリックイベント
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] 通知がクリックされました');
  
  event.notification.close();

  const notificationData = event.notification.data || {};
  const deepLink = notificationData.deepLink;

  // アプリを開く、または該当ページに遷移
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 既に開いているウィンドウがあれば、それをフォーカス
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          if (deepLink) {
            // ディープリンクに遷移
            client.postMessage({
              type: 'NAVIGATE',
              url: deepLink
            });
          }
          return client.focus();
        }
      }
      
      // ウィンドウが開いていなければ新しく開く
      const url = deepLink
        ? `${self.registration.scope}${deepLink}`
        : self.registration.scope;
      
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// メッセージの受信（アプリからのメッセージ）
self.addEventListener('message', (event) => {
  console.log('[Service Worker] メッセージを受信:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// バックグラウンド同期（オプション）
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] バックグラウンド同期:', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

/**
 * 通知を同期（バックグラウンド処理）
 */
async function syncNotifications() {
  try {
    console.log('[Service Worker] 通知の同期を開始');
    
    // ここで必要に応じてSupabaseから通知を取得
    // 実装は環境に応じて追加
    
    console.log('[Service Worker] 通知の同期完了');
  } catch (error) {
    console.error('[Service Worker] 通知の同期エラー:', error);
  }
}
