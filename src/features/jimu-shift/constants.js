/**
 * 事務シフト（当日部員）の定数
 */

/**
 * 祭り開始月日（環境変数から取得、MM-DD形式）
 * 年は実行時に自動で当年を使用する
 */
const FESTIVAL_START_MD = process.env.EXPO_PUBLIC_FESTIVAL_START_DATE || '11-01';

/**
 * 祭り終了月日（環境変数から取得、MM-DD形式）
 * 年は実行時に自動で当年を使用する
 */
const FESTIVAL_END_MD = process.env.EXPO_PUBLIC_FESTIVAL_END_DATE || '11-05';

/**
 * 当年の祭り開始日のDateオブジェクトを生成
 * @returns {Date} 開始日（当年のMM-DD）
 */
export const getFestivalStartDate = () => {
  /** 実行時の年 */
  const year = new Date().getFullYear();
  return new Date(`${year}-${FESTIVAL_START_MD}T00:00:00`);
};

/**
 * 当年の祭り終了日のDateオブジェクトを生成
 * @returns {Date} 終了日（当年のMM-DD）
 */
export const getFestivalEndDate = () => {
  /** 実行時の年 */
  const year = new Date().getFullYear();
  return new Date(`${year}-${FESTIVAL_END_MD}T00:00:00`);
};

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
