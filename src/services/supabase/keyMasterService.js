/**
 * 鍵マスタサービス
 * keys テーブルの取得・同期を担当
 */

import { getSupabaseClient } from './client.js';

const KEYS_TABLE = 'keys';
const KEY_COLUMNS = 'id,key_code,display_name,location_id,location_text,is_active,metadata,created_at,updated_at';

const normalizeText = (value) => (value || '').trim();

const toCatalogRecord = (item) => {
  const keyCode = normalizeText(item?.keyCode || item?.id);
  const displayName = normalizeText(item?.displayName || item?.name || keyCode);
  const locationText = normalizeText(item?.location || item?.locationText || displayName);
  const building = normalizeText(item?.building);
  const name = normalizeText(item?.name || displayName);

  return {
    key_code: keyCode,
    display_name: displayName,
    location_text: locationText,
    metadata: {
      building,
      name,
      source: 'key_catalog',
    },
    is_active: true,
  };
};

/**
 * 鍵マスタ一覧を取得
 * @param {Object} params - 取得条件
 * @param {boolean} [params.activeOnly=true] - 有効鍵のみ取得
 * @param {number} [params.limit=400] - 最大件数
 * @returns {Promise<{data: Array, error: Error|null}>} 取得結果
 */
export const listKeys = async ({ activeOnly = true, limit = 400 } = {}) => {
  try {
    let query = getSupabaseClient()
      .from(KEYS_TABLE)
      .select(KEY_COLUMNS)
      .order('display_name', { ascending: true })
      .limit(limit);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error('鍵マスタ取得エラー:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('鍵マスタ取得処理でエラー:', error);
    return { data: [], error };
  }
};

/**
 * 既存の鍵が無い場合にカタログを同期
 * @param {Array} catalogItems - カタログ配列
 * @returns {Promise<{data: Array, error: Error|null}>} 同期結果
 */
export const ensureKeysSeededFromCatalog = async (catalogItems = []) => {
  try {
    const { count, error: countError } = await getSupabaseClient()
      .from(KEYS_TABLE)
      .select('id', { count: 'exact', head: true });

    if (countError) {
      return { data: [], error: countError };
    }

    if ((count || 0) > 0) {
      return listKeys({ activeOnly: true, limit: 400 });
    }

    const records = Array.isArray(catalogItems)
      ? catalogItems.map(toCatalogRecord).filter((item) => normalizeText(item.key_code))
      : [];

    if (records.length === 0) {
      return { data: [], error: null };
    }

    const { error: upsertError } = await getSupabaseClient()
      .from(KEYS_TABLE)
      .upsert(records, { onConflict: 'key_code' });

    if (upsertError) {
      console.error('鍵マスタ初期同期エラー:', upsertError);
      return { data: [], error: upsertError };
    }

    return listKeys({ activeOnly: true, limit: 400 });
  } catch (error) {
    console.error('鍵マスタ初期同期処理でエラー:', error);
    return { data: [], error };
  }
};
