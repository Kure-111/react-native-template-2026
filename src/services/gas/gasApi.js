/**
 * Google Sheets CSV取得クライアント
 * スプレッドシートを公開してCSV形式で直接取得します
 * GASデプロイ不要、CORS問題なし
 */

/** シフト用スプレッドシートID（環境変数から取得） */
const SPREADSHEET_ID = process.env.EXPO_PUBLIC_SHIFT_SPREADSHEET_ID;

/** デフォルトタイムアウト時間（ミリ秒） */
const DEFAULT_TIMEOUT = 10000;

/**
 * CSV取得用のURLを生成
 * @param {string} sheetName - シート名
 * @returns {string} CSV取得URL
 */
const buildCsvUrl = (sheetName) => {
  const encodedSheetName = encodeURIComponent(sheetName);
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodedSheetName}`;
};

/**
 * CSV行をパースして配列に変換
 * @param {string} row - CSV行
 * @returns {Array<string>} セル値の配列
 */
const parseCsvRow = (row) => {
  const cells = [];
  let buffer = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && i + 1 < row.length && row[i + 1] === '"') {
        buffer += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(buffer);
      buffer = '';
    } else {
      buffer += char;
    }
  }
  cells.push(buffer);
  return cells;
};

/**
 * 指定日のシフトデータをCSV形式で取得
 * @param {string} date - シート名（例: "11月3日"）※ゼロ埋めなし
 * @returns {Promise<Object>} シフトデータ { sheetName, exists, values }
 */
export const fetchShiftData = async (date) => {
  if (!SPREADSHEET_ID) {
    throw new Error('EXPO_PUBLIC_SHIFT_SPREADSHEET_IDが設定されていません');
  }

  try {
    const url = buildCsvUrl(date);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // シートが存在しない場合は404エラー
      if (response.status === 404) {
        return {
          sheetName: date,
          exists: false,
          values: [],
        };
      }
      throw new Error(`HTTPエラー: ${response.status}`);
    }

    const csvText = await response.text();
    const lines = csvText.split('\n').filter((line) => line.trim());

    // CSV行を2次元配列に変換
    const values = lines.map((line) => parseCsvRow(line));

    return {
      sheetName: date,
      exists: true,
      values: values,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('リクエストがタイムアウトしました');
    }
    console.error('CSV取得エラー:', error);
    throw error;
  }
};
