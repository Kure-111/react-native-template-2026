/**
 * 連絡案件/返信サービス
 * support_tickets と ticket_messages の取得・更新を担当
 */

import { getSupabaseClient } from './client.js';

/** テーブル名 */
const SUPPORT_TICKETS_TABLE = 'support_tickets';
const TICKET_MESSAGES_TABLE = 'ticket_messages';

/** 役割種別 */
export const SUPPORT_DESK_ROLE_TYPES = {
  HQ: 'hq',
  ACCOUNTING: 'accounting',
  PROPERTY: 'property',
  PATROL: 'patrol',
};

/** 連絡案件ステータス */
export const SUPPORT_TICKET_STATUSES = {
  NEW: 'new',
  ACKNOWLEDGED: 'acknowledged',
  IN_PROGRESS: 'in_progress',
  WAITING_EXTERNAL: 'waiting_external',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

/** 有効ステータス一覧 */
const VALID_STATUSES = new Set(Object.values(SUPPORT_TICKET_STATUSES));

/** 連絡案件の取得カラム */
const TICKET_COLUMNS =
  'id,ticket_no,ticket_type,ticket_status,priority,title,description,event_name,event_location,notify_target,created_by,created_at,updated_at';

/** 返信の取得カラム */
const MESSAGE_COLUMNS = 'id,ticket_id,author_id,body,created_at';

/**
 * 文字列正規化
 * @param {string} value - 入力文字列
 * @returns {string} trim済み文字列
 */
const normalizeText = (value) => (value || '').trim();

/**
 * 役割ごとのフィルタを適用
 * @param {Object} query - Supabase query builder
 * @param {string} roleType - 役割種別
 * @returns {Object} query builder
 */
const applyRoleFilter = (query, roleType) => {
  if (roleType === SUPPORT_DESK_ROLE_TYPES.HQ) {
    return query.in('notify_target', ['hq', 'none']);
  }
  if (roleType === SUPPORT_DESK_ROLE_TYPES.ACCOUNTING) {
    return query.eq('notify_target', 'accounting');
  }
  if (roleType === SUPPORT_DESK_ROLE_TYPES.PROPERTY) {
    return query.eq('notify_target', 'property');
  }
  return query;
};

/**
 * 対応者向け連絡案件一覧を取得
 * @param {Object} params - 取得条件
 * @param {'hq'|'accounting'|'property'} params.roleType - 役割種別
 * @param {number} [params.limit=50] - 最大取得件数
 * @returns {Promise<{data: Array, error: Error|null}>} 取得結果
 */
export const listTicketsForRole = async ({ roleType, limit = 50 }) => {
  try {
    let query = getSupabaseClient()
      .from(SUPPORT_TICKETS_TABLE)
      .select(TICKET_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(limit);

    query = applyRoleFilter(query, roleType);

    const { data, error } = await query;
    if (error) {
      console.error('連絡案件一覧取得エラー:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('連絡案件一覧取得処理でエラー:', error);
    return { data: [], error };
  }
};

/**
 * 企画者が自分の連絡案件一覧を取得
 * @param {Object} params - 取得条件
 * @param {string} params.createdBy - 作成者ユーザーID
 * @param {number} [params.limit=50] - 最大取得件数
 * @returns {Promise<{data: Array, error: Error|null}>} 取得結果
 */
export const listMyCreatedTickets = async ({ createdBy, limit = 50 }) => {
  try {
    const userId = normalizeText(createdBy);
    if (!userId) {
      return { data: [], error: null };
    }

    const { data, error } = await getSupabaseClient()
      .from(SUPPORT_TICKETS_TABLE)
      .select(TICKET_COLUMNS)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('自分の連絡案件取得エラー:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('自分の連絡案件取得処理でエラー:', error);
    return { data: [], error };
  }
};

/**
 * 巡回向け緊急案件一覧を取得
 * @param {Object} params - 取得条件
 * @param {number} [params.limit=50] - 最大取得件数
 * @returns {Promise<{data: Array, error: Error|null}>} 取得結果
 */
export const listEmergencyTicketsForPatrol = async ({ limit = 50 }) => {
  try {
    const { data, error } = await getSupabaseClient()
      .from(SUPPORT_TICKETS_TABLE)
      .select(TICKET_COLUMNS)
      .eq('ticket_type', 'emergency')
      .in('ticket_status', [
        SUPPORT_TICKET_STATUSES.NEW,
        SUPPORT_TICKET_STATUSES.ACKNOWLEDGED,
        SUPPORT_TICKET_STATUSES.IN_PROGRESS,
        SUPPORT_TICKET_STATUSES.WAITING_EXTERNAL,
        SUPPORT_TICKET_STATUSES.RESOLVED,
      ])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('巡回向け緊急案件取得エラー:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('巡回向け緊急案件取得処理でエラー:', error);
    return { data: [], error };
  }
};

/**
 * 連絡案件の返信一覧を取得
 * @param {Object} params - 取得条件
 * @param {string} params.ticketId - 連絡案件ID
 * @returns {Promise<{data: Array, error: Error|null}>} 取得結果
 */
export const listTicketMessages = async ({ ticketId }) => {
  try {
    const normalizedTicketId = normalizeText(ticketId);
    if (!normalizedTicketId) {
      return { data: [], error: null };
    }

    const { data, error } = await getSupabaseClient()
      .from(TICKET_MESSAGES_TABLE)
      .select(MESSAGE_COLUMNS)
      .eq('ticket_id', normalizedTicketId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('返信一覧取得エラー:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('返信一覧取得処理でエラー:', error);
    return { data: [], error };
  }
};

/**
 * 返信を投稿
 * @param {Object} input - 投稿データ
 * @param {string} input.ticketId - 連絡案件ID
 * @param {string} input.authorId - 投稿者ユーザーID
 * @param {string} input.body - 返信本文
 * @returns {Promise<{data: Object|null, error: Error|null}>} 投稿結果
 */
export const createTicketMessage = async (input) => {
  try {
    const ticketId = normalizeText(input.ticketId);
    const authorId = normalizeText(input.authorId);
    const body = normalizeText(input.body);

    if (!ticketId) {
      throw new Error('連絡案件IDが未指定です');
    }
    if (!authorId) {
      throw new Error('投稿者情報が未取得です');
    }
    if (!body) {
      throw new Error('返信内容を入力してください');
    }

    const payload = {
      ticket_id: ticketId,
      author_id: authorId,
      body,
    };

    const { data, error } = await getSupabaseClient()
      .from(TICKET_MESSAGES_TABLE)
      .insert(payload)
      .select(MESSAGE_COLUMNS)
      .single();

    if (error) {
      console.error('返信投稿エラー:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * 連絡案件ステータスを更新
 * @param {Object} input - 更新データ
 * @param {string} input.ticketId - 連絡案件ID
 * @param {string} input.status - 更新後ステータス
 * @returns {Promise<{data: Object|null, error: Error|null}>} 更新結果
 */
export const updateTicketStatus = async (input) => {
  try {
    const ticketId = normalizeText(input.ticketId);
    const status = normalizeText(input.status);

    if (!ticketId) {
      throw new Error('連絡案件IDが未指定です');
    }
    if (!VALID_STATUSES.has(status)) {
      throw new Error('不正なステータスです');
    }

    const { data, error } = await getSupabaseClient()
      .from(SUPPORT_TICKETS_TABLE)
      .update({ ticket_status: status })
      .eq('id', ticketId)
      .select(TICKET_COLUMNS)
      .single();

    if (error) {
      console.error('連絡案件ステータス更新エラー:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

