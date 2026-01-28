/**
 * 事務シフト（当日部員）の定数
 */

/** 祭り開始日（環境変数から取得） */
const FESTIVAL_START_DATE_STR = process.env.EXPO_PUBLIC_FESTIVAL_START_DATE || '2026-11-01';

/** 祭り終了日（環境変数から取得） */
const FESTIVAL_END_DATE_STR = process.env.EXPO_PUBLIC_FESTIVAL_END_DATE || '2026-11-05';

/**
 * 祭り開始日のDateオブジェクトを生成
 * @returns {Date} 開始日
 */
export const getFestivalStartDate = () => new Date(`${FESTIVAL_START_DATE_STR}T00:00:00`);

/**
 * 祭り終了日のDateオブジェクトを生成
 * @returns {Date} 終了日
 */
export const getFestivalEndDate = () => new Date(`${FESTIVAL_END_DATE_STR}T00:00:00`);

/**
 * エリア名と画像ファイルのマッピング
 *
 * 使い方：
 * 1. src/features/jimu-shift/assets/ に画像を保存
 *    対応形式: .jpg、.jpeg、.png
 * 2. 下記のマッピングに追加
 *    例: 'ステッカー': require('./assets/ステッカー.jpg')
 *    例: '受付': require('./assets/受付.png')
 *    例: '本部': require('./assets/本部.jpeg')
 *
 * 注意：React Nativeでは動的なrequireができないため、
 * 画像を追加するたびにこのマッピングを更新する必要があります
 */
export const AREA_IMAGE_MAP = {
  'ステッカー': require('./assets/ステッカー.jpeg'),
  '渉外部B館前': require('./assets/渉外部B館前.jpeg'),
  '渉外部人工芝': require('./assets/渉外部人工芝.jpeg'),
  '渉外部西門': require('./assets/渉外部西門.jpeg'),
  '謎解き': require('./assets/謎解き.jpeg'),
};
