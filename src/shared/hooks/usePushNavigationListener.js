/**
 * プッシュ通知タップ時の画面遷移リスナーフック
 *
 * アプリが開いているとき（Service Worker postMessage）と
 * 開いていないとき（URLパラメータ）の両方に対応します。
 *
 * 使い方:
 *   AppNavigator.jsx など NavigationContainer の ref を持つコンポーネントで呼ぶ
 *
 *   usePushNavigationListener({ navigationRef, isAuthenticated });
 *
 * Service Worker 側は以下の形式で postMessage を送信してください:
 *   client.postMessage({ type: 'SW_NAVIGATE', screen: 'JimuShift', tab: 'jimuRequests' });
 *
 * URLパラメータは以下を使用してください:
 *   ?sw_screen=JimuShift&sw_tab=jimuRequests
 */

import { useEffect } from 'react';

/** Service WorkerのpostMessageタイプ識別子 */
const SW_NAVIGATE_TYPE = 'SW_NAVIGATE';

/** URLパラメータキー：遷移先画面名 */
const SW_SCREEN_PARAM = 'sw_screen';

/** URLパラメータキー：遷移先タブキー */
const SW_TAB_PARAM = 'sw_tab';

/** NavigationContainer初期化完了の待機時間（ms） */
const NAV_READY_DELAY_MS = 300;

/**
 * プッシュ通知タップ時の画面遷移リスナーフック
 *
 * @param {Object} params - パラメータ
 * @param {React.RefObject} params.navigationRef - NavigationContainerのref（useRefで作成したもの）
 * @param {boolean} params.isAuthenticated - 認証済みかどうか（URLパラメータ読み取りのタイミング制御用）
 */
export const usePushNavigationListener = ({ navigationRef, isAuthenticated }) => {
  /**
   * Service WorkerからのpostMessageを監視してナビゲートする
   * アプリが既に開いている状態でプッシュ通知をタップした時に使用
   */
  useEffect(() => {
    /**
     * Service Workerからのメッセージを処理する
     * @param {MessageEvent} event - メッセージイベント
     */
    const handleMessage = (event) => {
      if (!event.data || event.data.type !== SW_NAVIGATE_TYPE) {
        return;
      }
      if (!navigationRef.current) {
        return;
      }

      /** 遷移先画面名 */
      const screen = event.data.screen;
      /** 遷移先タブキー */
      const tab = event.data.tab;

      if (!screen || !tab) {
        return;
      }

      navigationRef.current.navigate('Main', {
        screen,
        params: { initialTab: tab },
      });
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigationRef]);

  /**
   * URLパラメータを読み取ってナビゲートする
   * アプリが起動していない状態でプッシュ通知をタップした時に使用
   * 認証完了後に一度だけ実行される
   */
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    /** 遷移先画面名 */
    const screen = searchParams.get(SW_SCREEN_PARAM);
    /** 遷移先タブキー */
    const tab = searchParams.get(SW_TAB_PARAM);

    if (!screen || !tab) {
      return;
    }

    // URLパラメータをクリア（ブラウザバック・リロード時に再適用されないよう）
    window.history.replaceState({}, '', window.location.pathname);

    // NavigationContainerの初期化完了を待ってからナビゲート
    const timer = setTimeout(() => {
      if (navigationRef.current) {
        navigationRef.current.navigate('Main', {
          screen,
          params: { initialTab: tab },
        });
      }
    }, NAV_READY_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isAuthenticated, navigationRef]);
};
