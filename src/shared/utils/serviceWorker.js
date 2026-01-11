/**
 * Service Workerユーティリティ
 * PWAの登録と開放を制御します
 * 
 */

import { Platform } from 'react-native';

/**
 * Service Workerを登録する
 * @returns {void} なし
 */
export const registerServiceWorker = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  // ローカル環境判定
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]';
  // HTTPS判定
  const isSecureContext = window.location.protocol === 'https:';

  if (!('serviceWorker' in navigator)) {
    return;
  }

  // localhost または HTTPS でない場合は登録しない
  if (!isSecureContext && !isLocalhost) {
    return;
  }

  // localhost でも Service Worker を登録（開発時の PWA テスト用）
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((error) => {
        console.error('Service Worker register error:', error);
      });
  });
};
