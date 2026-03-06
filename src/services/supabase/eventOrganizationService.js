/**
 * 企画組織サービス
 * event_organizations テーブルの取得を担当
 */

import { getSupabaseClient } from './client.js';

/** テーブル名 */
const EVENT_ORGANIZATIONS_TABLE = 'event_organizations';

/** 取得カラム */
const EVENT_ORG_COLUMNS = 'id,name,created_at';

/**
 * 企画組織一覧を取得
 * @param {Object} params - 取得条件
 * @param {number} [params.limit=200] - 最大件数
 * @returns {Promise<{data: Array, error: Error|null}>} 取得結果
 */
export const selectEventOrganizations = async ({ limit = 200 } = {}) => {
  try {
    const { data, error } = await getSupabaseClient()
      .from(EVENT_ORGANIZATIONS_TABLE)
      .select(EVENT_ORG_COLUMNS)
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('企画組織一覧取得エラー:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('企画組織一覧取得処理でエラー:', error);
    return { data: [], error };
  }
};
