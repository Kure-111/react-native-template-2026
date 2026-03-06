/**
 * 景品配布基準サービス
 * prize_distribution テーブルの取得を担当
 */

import { getSupabaseClient } from './client.js';

/** テーブル名 */
const PRIZE_DISTRIBUTION_TABLE = 'prize_distribution';

/** 取得カラム */
const PRIZE_COLUMNS = 'id,organization_name,event_name,prize_number,prize_name,prize_count,distribution_criteria,created_at';

/**
 * 景品配布基準一覧を取得
 * @param {Object} params - 取得条件
 * @param {number} [params.limit=300] - 最大件数
 * @returns {Promise<{data: Array, error: Error|null}>} 取得結果
 */
export const selectPrizeDistributions = async ({ limit = 300 } = {}) => {
  try {
    const { data, error } = await getSupabaseClient()
      .from(PRIZE_DISTRIBUTION_TABLE)
      .select(PRIZE_COLUMNS)
      .order('organization_name', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('景品配布基準取得エラー:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('景品配布基準取得処理でエラー:', error);
    return { data: [], error };
  }
};
