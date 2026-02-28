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
 * 鍵を新規追加
 * @param {Object} input - 追加データ
 * @param {string} input.keyCode - 鍵コード（一意の識別子）
 * @param {string} input.displayName - 表示名
 * @param {string} [input.locationText] - 場所テキスト
 * @param {string} [input.building] - 棟名
 * @returns {Promise<{data: Object|null, error: Error|null}>} 追加結果
 */
export const insertKey = async (input) => {
  try {
    const keyCode = normalizeText(input.keyCode);
    const displayName = normalizeText(input.displayName);
    if (!keyCode) {
      throw new Error('鍵コードは必須です');
    }
    if (!displayName) {
      throw new Error('表示名は必須です');
    }

    const building = normalizeText(input.building);
    const locationText = normalizeText(input.locationText) || displayName;

    const { data, error } = await getSupabaseClient()
      .from(KEYS_TABLE)
      .insert({
        key_code: keyCode,
        display_name: displayName,
        location_text: locationText,
        is_active: true,
        metadata: { building, name: displayName, source: 'manual' },
      })
      .select(KEY_COLUMNS)
      .single();

    if (error) {
      console.error('鍵追加エラー:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * 鍵情報を更新
 * @param {string} id - 鍵ID
 * @param {Object} input - 更新データ
 * @param {string} input.displayName - 表示名
 * @param {string} [input.locationText] - 場所テキスト
 * @param {string} [input.building] - 棟名
 * @returns {Promise<{data: Object|null, error: Error|null}>} 更新結果
 */
export const updateKey = async (id, input) => {
  try {
    if (!id) {
      throw new Error('id が未指定です');
    }
    const displayName = normalizeText(input.displayName);
    if (!displayName) {
      throw new Error('表示名は必須です');
    }

    const building = normalizeText(input.building);
    const locationText = normalizeText(input.locationText) || displayName;

    const { data, error } = await getSupabaseClient()
      .from(KEYS_TABLE)
      .update({
        display_name: displayName,
        location_text: locationText,
        metadata: { building, name: displayName, source: 'manual' },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(KEY_COLUMNS)
      .single();

    if (error) {
      console.error('鍵更新エラー:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * 鍵の有効・無効を切り替える
 * @param {string} id - 鍵ID
 * @param {boolean} isActive - 有効にするか
 * @returns {Promise<{data: Object|null, error: Error|null}>} 更新結果
 */
export const setKeyActive = async (id, isActive) => {
  try {
    if (!id) {
      throw new Error('id が未指定です');
    }

    const { data, error } = await getSupabaseClient()
      .from(KEYS_TABLE)
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(KEY_COLUMNS)
      .single();

    if (error) {
      console.error('鍵有効/無効切替エラー:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
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
