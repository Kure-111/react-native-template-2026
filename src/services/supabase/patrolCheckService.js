/**
 * 巡回チェックサービス
 * patrol_checks の登録・取得を担当
 */

import { getSupabaseClient } from './client.js';

const PATROL_CHECKS_TABLE = 'patrol_checks';
// event_organizations テーブルを巡回場所候補として使用する
const LOCATIONS_TABLE = 'event_organizations';

const normalizeText = (value) => (value || '').trim();

// event_organizations テーブルの巡回場所候補に使うカラム
const LOCATION_COLUMNS = 'id,name';
const PATROL_CHECK_COLUMNS =
  'id,patrol_user_id,location_id,location_text,check_items,memo,checked_at,created_at';

/**
 * 場所レコードから表示用ラベルを生成する
 * @param {Object} location - event_organizations テーブルのレコード
 * @returns {string} 表示ラベル
 */
const toLocationLabel = (location) => {
  if (!location) {
    return '';
  }
  // name カラムを使用する
  return normalizeText(location.name) || '場所未設定';
};

/**
 * 場所一覧を取得
 * @param {Object} params - 取得条件
 * @param {number} [params.limit=200] - 最大件数
 * @returns {Promise<{data: Array, error: Error|null}>} 取得結果
 */
export const listPatrolLocations = async ({ limit = 200 } = {}) => {
  try {
    const { data, error } = await getSupabaseClient()
      .from(LOCATIONS_TABLE)
      .select(LOCATION_COLUMNS)
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('巡回場所一覧取得エラー:', error);
      return { data: [], error };
    }

    return {
      data: (data || []).map((location) => ({
        ...location,
        label: toLocationLabel(location),
      })),
      error: null,
    };
  } catch (error) {
    console.error('巡回場所一覧取得処理でエラー:', error);
    return { data: [], error };
  }
};

/**
 * 巡回チェックを登録
 * @param {Object} input - 登録内容
 * @param {string} input.patrolUserId - 巡回ユーザーID
 * @param {string|null} [input.locationId] - 場所ID
 * @param {string} input.locationText - 場所表示文字列
 * @param {string[]} [input.checkItems] - チェック項目
 * @param {string} [input.memo] - メモ
 * @returns {Promise<{data: Object|null, error: Error|null}>} 登録結果
 */
export const createPatrolCheck = async (input) => {
  try {
    const patrolUserId = normalizeText(input.patrolUserId);
    const locationId = normalizeText(input.locationId) || null;
    const locationText = normalizeText(input.locationText);
    const memo = normalizeText(input.memo);

    if (!patrolUserId) {
      throw new Error('patrolUserId が未指定です');
    }
    if (!locationText) {
      throw new Error('場所を入力してください');
    }

    const rawCheckItems = Array.isArray(input.checkItems) ? input.checkItems : [];
    const checkItems = rawCheckItems
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .slice(0, 20);

    const payload = {
      patrol_user_id: patrolUserId,
      location_id: locationId,
      location_text: locationText,
      check_items: checkItems,
      memo: memo || null,
      checked_at: new Date().toISOString(),
    };

    const { data, error } = await getSupabaseClient()
      .from(PATROL_CHECKS_TABLE)
      .insert(payload)
      .select(PATROL_CHECK_COLUMNS)
      .single();

    if (error) {
      console.error('巡回チェック登録エラー:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * 巡回チェック履歴を取得
 * @param {Object} params - 取得条件
 * @param {number} [params.limit=50] - 最大件数
 * @returns {Promise<{data: Array, error: Error|null}>} 取得結果
 */
export const listPatrolChecks = async ({ limit = 50 } = {}) => {
  try {
    const { data, error } = await getSupabaseClient()
      .from(PATROL_CHECKS_TABLE)
      .select(PATROL_CHECK_COLUMNS)
      .order('checked_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('巡回チェック履歴取得エラー:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('巡回チェック履歴取得処理でエラー:', error);
    return { data: [], error };
  }
};

/**
 * 未巡回アラート用一覧を計算
 * @param {Object} params - 取得条件
 * @param {number} [params.alertMinutes=90] - アラート閾値（分）
 * @param {number} [params.limit=200] - 最大件数
 * @returns {Promise<{data: Array, error: Error|null}>} 取得結果
 */
export const listUnvisitedLocations = async ({ alertMinutes = 90, limit = 200 } = {}) => {
  try {
    const [locationsResult, checksResult] = await Promise.all([
      listPatrolLocations({ limit }),
      listPatrolChecks({ limit: 500 }),
    ]);

    if (locationsResult.error) {
      return { data: [], error: locationsResult.error };
    }
    if (checksResult.error) {
      return { data: [], error: checksResult.error };
    }

    const latestByLocationId = new Map();
    (checksResult.data || []).forEach((check) => {
      const key = normalizeText(check.location_id);
      if (!key || latestByLocationId.has(key)) {
        return;
      }
      latestByLocationId.set(key, check);
    });

    const now = Date.now();
    const rows = (locationsResult.data || []).map((location) => {
      const latestCheck = latestByLocationId.get(location.id) || null;
      const lastCheckedAt = latestCheck?.checked_at || null;
      const elapsedMinutes = lastCheckedAt
        ? Math.max(0, Math.floor((now - new Date(lastCheckedAt).getTime()) / 60000))
        : null;

      return {
        location_id: location.id,
        location_label: location.label,
        last_checked_at: lastCheckedAt,
        elapsed_minutes: elapsedMinutes,
        is_alert: elapsedMinutes === null || elapsedMinutes >= alertMinutes,
      };
    });

    rows.sort((a, b) => {
      if (a.is_alert !== b.is_alert) {
        return a.is_alert ? -1 : 1;
      }
      if (a.elapsed_minutes === null && b.elapsed_minutes === null) {
        return a.location_label.localeCompare(b.location_label, 'ja');
      }
      if (a.elapsed_minutes === null) {
        return -1;
      }
      if (b.elapsed_minutes === null) {
        return 1;
      }
      return b.elapsed_minutes - a.elapsed_minutes;
    });

    return { data: rows, error: null };
  } catch (error) {
    console.error('未巡回一覧作成処理でエラー:', error);
    return { data: [], error };
  }
};
