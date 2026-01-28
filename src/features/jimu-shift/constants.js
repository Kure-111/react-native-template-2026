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
