/**
 * ブラウザ通知権限管理フック
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * ブラウザの通知権限を管理するフック
 * @returns {object} 権限状態と要求関数
 */
export function useNotificationPermission() {
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);

  // 通知APIのサポート確認
  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    } else {
      setIsSupported(false);
    }
  }, []);

  // 通知権限を要求
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('このブラウザは通知をサポートしていません');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('通知権限の要求エラー:', error);
      return 'denied';
    }
  }, [isSupported]);

  // ブラウザ通知を表示
  const showNotification = useCallback(async (title, options = {}) => {
    if (!isSupported) {
      console.warn('このブラウザは通知をサポートしていません');
      return null;
    }

    if (permission !== 'granted') {
      console.warn('通知権限が付与されていません');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icons/notification-icon.png',
        badge: '/icons/notification-badge.png',
        ...options
      });

      return notification;
    } catch (error) {
      console.error('通知の表示エラー:', error);
      return null;
    }
  }, [isSupported, permission]);

  return {
    permission,
    isSupported,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    requestPermission,
    showNotification
  };
}
