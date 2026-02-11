/**
 * Service Workerユーティリティ
 * PWAの登録と開放を制御します
 * 
 */

import { Platform } from 'react-native';

/**
 * 既存のService Worker登録を解除する（開発環境向け）
 * @returns {Promise<void>} 実行結果
 */
const unregisterServiceWorkers = async () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
};

/**
 * 既存キャッシュを削除する（開発環境向け）
 * @returns {Promise<void>} 実行結果
 */
const clearCaches = async () => {
  if (typeof caches === 'undefined') {
    return;
  }

  const cacheKeys = await caches.keys();
  await Promise.all(cacheKeys.map((key) => caches.delete(key)));
};

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

  const isDevelopment =
    typeof __DEV__ !== 'undefined'
      ? __DEV__
      : process.env.NODE_ENV !== 'production';

  // 開発環境とlocalhostではService Workerを無効化し、
  // 既存登録/キャッシュを削除して古いバンドル混入を防ぐ
  if (isDevelopment || isLocalhost) {
    unregisterServiceWorkers().catch((error) => {
      console.error('Service Worker unregister error:', error);
    });
    clearCaches().catch((error) => {
      console.error('Cache clear error:', error);
    });
    return;
  }

  // HTTPS でない場合は登録しない
  if (!isSecureContext) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((error) => {
        console.error('Service Worker register error:', error);
      });
  });
};
