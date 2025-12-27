/**
 * Google Apps Script (GAS) API クライアント
 * GASデプロイ済みのWeb Appと通信するための関数群
 */

/** GAS Web AppのURL（環境変数から取得） */
const GAS_WEB_APP_URL = process.env.EXPO_PUBLIC_GAS_WEB_APP_URL;

/** デフォルトタイムアウト時間（ミリ秒） */
const DEFAULT_TIMEOUT = 10000;

/**
 * GAS Web Appにリクエストを送信する
 * @param {string} action - 実行するアクション名
 * @param {Object} params - パラメータ
 * @returns {Promise<Object>} レスポンスデータ
 * @throws {Error} リクエストが失敗した場合
 */
export const sendRequest = async (action, params = {}) => {
  if (!GAS_WEB_APP_URL) {
    throw new Error('GAS_WEB_APP_URLが設定されていません');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        params,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTPエラー: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('リクエストがタイムアウトしました');
    }
    console.error('GAS APIエラー:', error);
    throw error;
  }
};

/**
 * GASでデータを取得する（例）
 * @param {string} sheetName - シート名
 * @returns {Promise<Array>} データの配列
 */
export const fetchDataFromSheet = async (sheetName) => {
  return await sendRequest('getData', { sheetName });
};

/**
 * GASでデータを追加する（例）
 * @param {string} sheetName - シート名
 * @param {Array} rowData - 追加する行データ
 * @returns {Promise<Object>} 結果
 */
export const appendDataToSheet = async (sheetName, rowData) => {
  return await sendRequest('appendData', { sheetName, rowData });
};
