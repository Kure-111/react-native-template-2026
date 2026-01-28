/**
 * リアルタイム通知購読フック
 */

import { useEffect, useCallback } from 'react';
import { subscribeToNotifications } from '../services/notificationService';

/**
 * リアルタイム通知を購読するフック
 * @param {string} userId - ユーザーID
 * @param {function} onNotification - 新規通知受信時のコールバック
 * @param {object} options - オプション
 */
export function useNotificationSubscription(userId, onNotification, options = {}) {
  const {
    enabled = true,
    showBrowserNotification = true
  } = options;

  // 通知受信ハンドラ
  const handleNotification = useCallback((notification) => {
    console.log('新規通知を受信:', notification);

    // コールバック実行
    if (onNotification) {
      onNotification(notification);
    }

    // ブラウザ通知を表示
    if (showBrowserNotification && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/icons/notification-icon.png',
          badge: '/icons/notification-badge.png',
          tag: notification.id,
          data: {
            notificationId: notification.id,
            deepLink: notification.deep_link
          }
        });

        // 通知クリック時の処理
        browserNotification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          
          // ディープリンクがあれば遷移
          if (notification.deep_link) {
            window.location.href = notification.deep_link;
          }
          
          browserNotification.close();
        };
      } catch (error) {
        console.error('ブラウザ通知の表示エラー:', error);
      }
    }
  }, [onNotification, showBrowserNotification]);

  // リアルタイム購読
  useEffect(() => {
    if (!enabled || !userId) return;

    console.log('通知のリアルタイム購読を開始:', userId);
    const subscription = subscribeToNotifications(userId, handleNotification);

    return () => {
      console.log('通知のリアルタイム購読を終了');
      subscription.unsubscribe();
    };
  }, [userId, enabled, handleNotification]);
}
