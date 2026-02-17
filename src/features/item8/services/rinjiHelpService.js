/**
 * 臨時ヘルプ機能 Supabase アクセス層
 * このフォルダ内のみで完結させ、他ディレクトリには触れない
 */

import { getSupabaseClient } from '../../../services/supabase/client.js';
import { RINJI_STATUS, OPTIONAL_FIELD_DEFAULTS } from '../constants.js';

const supabase = getSupabaseClient();
const IMMEDIATE_TIME_LABEL = '現在時刻';
const LEGACY_IMMEDIATE_TIME_LABEL = 'いますぐ';

/**
 * 表示用の作業時間文字列から開始時刻を推定する。
 *
 * @param {string | null | undefined} workTime
 * @returns {string | null}
 */
const inferStartTime = (workTime) => {
  if (!workTime || typeof workTime !== 'string') return null;
  if (
    workTime === IMMEDIATE_TIME_LABEL ||
    workTime.startsWith(`${IMMEDIATE_TIME_LABEL}〜`) ||
    workTime === LEGACY_IMMEDIATE_TIME_LABEL ||
    workTime.startsWith(`${LEGACY_IMMEDIATE_TIME_LABEL}〜`)
  ) {
    return IMMEDIATE_TIME_LABEL;
  }
  const start = workTime.split('〜')[0]?.trim();
  if (!start) return null;
  return /^\d{2}:\d{2}$/.test(start) ? start : null;
};

/**
 * 任意項目を既定値で補完して DB へ送る payload を正規化する。
 *
 * @param {Record<string, any>} payload
 * @returns {Record<string, any>}
 */
const withOptionalDefaults = (payload = {}) => {
  const location = payload.location;
  const inferredMeetTime = inferStartTime(payload.work_time);
  // 空文字は null 扱いにするユーティリティ
  const nullIfEmpty = (v) => (v === '' ? null : v);

  const normalized = {
    ...payload,
    department_id: nullIfEmpty(payload.department_id),
    // meet_place が未入力なら location を使用
    meet_place:
      payload.meet_place === undefined || payload.meet_place === null || payload.meet_place === ''
        ? OPTIONAL_FIELD_DEFAULTS.meet_place(location)
        : payload.meet_place,
    // meet_time 未入力なら null のまま（表示しない）
    meet_time:
      payload.meet_time === undefined || payload.meet_time === ''
        ? inferredMeetTime
        : payload.meet_time,
    // belongings 未入力なら「なし」
    belongings:
      payload.belongings === undefined || payload.belongings === null || payload.belongings === ''
        ? OPTIONAL_FIELD_DEFAULTS.belongings
        : payload.belongings,
  };

  return normalized;
};

/**
 * 募集一覧を取得する。
 *
 * @param {{ includeClosed?: boolean, filters?: { location?: string, department_id?: string } }} params
 * @returns {Promise<{ data: any, error: any }>}
 */
export const fetchRecruits = async ({ includeClosed = false, filters = {} } = {}) => {
  let query = supabase.from('rinji_help_recruits').select('*').order('updated_at', { ascending: false });

  if (!includeClosed) {
    query = query.eq('status', RINJI_STATUS.OPEN);
  }

  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }

  if (filters.department_id) {
    query = query.eq('department_id', filters.department_id);
  }

  const { data, error } = await query;
  return { data, error };
};

/**
 * 募集を新規作成する。
 *
 * @param {Record<string, any>} payload
 * @returns {Promise<{ data: any, error: any }>}
 */
export const createRecruit = async (payload) => {
  const body = withOptionalDefaults(payload);
  const { data, error } = await supabase
    .from('rinji_help_recruits')
    .insert(body)
    .select()
    .single();
  return { data, error };
};

/**
 * 募集を更新する。
 *
 * @param {string} id
 * @param {Record<string, any>} payload
 * @returns {Promise<{ data: any, error: any }>}
 */
export const updateRecruit = async (id, payload) => {
  const body = withOptionalDefaults(payload);
  const { data, error } = await supabase
    .from('rinji_help_recruits')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id);
  return { data, error };
};

/**
 * 募集ステータスを closed に更新する。
 *
 * @param {string} id
 * @returns {Promise<{ data: any, error: any }>}
 */
export const closeRecruit = async (id) => {
  const { data, error } = await supabase
    .from('rinji_help_recruits')
    .update({ status: RINJI_STATUS.CLOSED })
    .eq('id', id);
  return { data, error };
};

/**
 * 募集ステータスを open に戻す。
 *
 * @param {string} id
 * @returns {Promise<{ data: any, error: any }>}
 */
export const reopenRecruit = async (id) => {
  const { data, error } = await supabase
    .from('rinji_help_recruits')
    .update({ status: RINJI_STATUS.OPEN, updated_at: new Date().toISOString() })
    .eq('id', id);
  return { data, error };
};

/**
 * 指定募集への応募一覧を取得する。
 *
 * @param {string} recruitId
 * @returns {Promise<{ data: any, error: any }>}
 */
export const fetchApplications = async (recruitId) => {
  const { data, error } = await supabase
    .from('rinji_help_applications')
    .select('*')
    .eq('recruit_id', recruitId)
    .order('created_at', { ascending: false });
  return { data, error };
};

/**
 * 募集へ応募する。
 *
 * @param {string} recruitId
 * @param {string} applicantUserId
 * @returns {Promise<{ data: any, error: any }>}
 */
export const applyRecruit = async (recruitId, applicantUserId) => {
  const { data, error } = await supabase
    .from('rinji_help_applications')
    .insert({
      recruit_id: recruitId,
      applicant_user_id: applicantUserId,
    })
    .select()
    .single();
  return { data, error };
};
