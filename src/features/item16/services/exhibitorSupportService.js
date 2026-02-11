/**
 * 企画者サポートサービス
 * 連絡案件（support_tickets）への登録と取得を担当
 */

import { getSupabaseClient } from '../../../services/supabase/client';

/** 連絡案件テーブル名 */
const SUPPORT_TICKETS_TABLE = 'support_tickets';

/**
 * 受付番号を生成する
 * 形式: T-YYYYMMDD-HHMMSS-XXXXXX
 * @returns {string} 受付番号
 */
const generateTicketNo = () => {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `T-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${random}`;
};

/** 質問種別ごとの変換設定 */
const QUESTION_TYPE_CONFIG = {
  rule_change: {
    ticketType: 'rule_question',
    title: '企画ルール変更の相談',
    notifyTarget: 'hq',
  },
  layout_change: {
    ticketType: 'layout_change',
    title: '配置図変更の相談',
    notifyTarget: 'hq',
  },
  distribution_change: {
    ticketType: 'distribution_change',
    title: '会計配布基準変更の連絡',
    notifyTarget: 'accounting',
  },
  damage_report: {
    ticketType: 'damage_report',
    title: '物品破損の報告',
    notifyTarget: 'property',
  },
};

/**
 * 空文字をトリムして返す
 * @param {string} value - 対象文字列
 * @returns {string} トリム済み文字列
 */
const normalizeText = (value) => (value || '').trim();

/**
 * 共通項目のバリデーション
 * @param {Object} input - 入力値
 * @throws {Error} バリデーションエラー
 */
const validateCommonInput = (input) => {
  const eventName = normalizeText(input.eventName);
  const eventLocation = normalizeText(input.eventLocation);
  const createdBy = normalizeText(input.createdBy);

  if (!eventName) {
    throw new Error('企画名が未入力です');
  }
  if (!eventLocation) {
    throw new Error('企画場所が未入力です');
  }
  if (!createdBy) {
    throw new Error('ログインユーザー情報が取得できません');
  }
};

/**
 * 連絡案件を登録
 * @param {Object} payload - 登録用データ
 * @returns {Promise<Object>} 登録結果
 */
const createSupportTicket = async (payload) => {
  try {
    const input = {
      ...payload,
      ticket_no: payload.ticket_no || generateTicketNo(),
    };

    const { data, error } = await getSupabaseClient()
      .from(SUPPORT_TICKETS_TABLE)
      .insert(input)
      .select('*')
      .single();

    if (error) {
      console.error('連絡案件登録エラー:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('連絡案件登録処理でエラー:', error);
    return { data: null, error };
  }
};

/**
 * 質問系統の連絡案件を作成
 * @param {Object} input - 入力値
 * @returns {Promise<Object>} 作成結果
 */
const createQuestionContact = async (input) => {
  try {
    validateCommonInput(input);

    const detail = normalizeText(input.detail);
    if (!detail) {
      throw new Error('質問内容を入力してください');
    }

    const typeKey = normalizeText(input.questionType) || 'rule_change';
    const config = QUESTION_TYPE_CONFIG[typeKey] || QUESTION_TYPE_CONFIG.rule_change;

    const payload = {
      ticket_type: config.ticketType,
      ticket_status: 'new',
      priority: 'normal',
      title: config.title,
      description: detail,
      event_name: normalizeText(input.eventName),
      event_location: normalizeText(input.eventLocation),
      created_by: normalizeText(input.createdBy),
      org_id: input.orgId || null,
      notify_target: config.notifyTarget,
      metadata: {
        question_type: typeKey,
      },
    };

    return await createSupportTicket(payload);
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * 緊急呼び出しを作成
 * @param {Object} input - 入力値
 * @returns {Promise<Object>} 作成結果
 */
const createEmergencyContact = async (input) => {
  try {
    validateCommonInput(input);

    const detail = normalizeText(input.detail);
    if (!detail) {
      throw new Error('緊急内容を入力してください');
    }

    const priority = normalizeText(input.priority) || 'high';

    const payload = {
      ticket_type: 'emergency',
      ticket_status: 'new',
      priority,
      title: '緊急呼び出し',
      description: detail,
      event_name: normalizeText(input.eventName),
      event_location: normalizeText(input.eventLocation),
      created_by: normalizeText(input.createdBy),
      org_id: input.orgId || null,
      notify_target: 'hq',
      metadata: {
        emergency_priority: priority,
      },
    };

    return await createSupportTicket(payload);
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * 鍵の事前申請を作成
 * @param {Object} input - 入力値
 * @returns {Promise<Object>} 作成結果
 */
const createKeyPreapply = async (input) => {
  try {
    validateCommonInput(input);

    const keyTargets = Array.isArray(input.keyTargets)
      ? input.keyTargets
          .map((item) => {
            const id = normalizeText(item?.id);
            const keyCode = normalizeText(item?.keyCode || id);
            const name = normalizeText(item?.name);
            const building = normalizeText(item?.building);
            const location = normalizeText(item?.location);

            if (!name) {
              return null;
            }

            return {
              id: id || keyCode || name,
              keyCode: keyCode || id || name,
              name,
              building,
              location: location || [building, name].filter(Boolean).join(' '),
            };
          })
          .filter(Boolean)
      : [];

    // Backward compatibility for old single-text input UI.
    if (keyTargets.length === 0) {
      const fallbackKeyTarget = normalizeText(input.keyTarget);
      if (fallbackKeyTarget) {
        keyTargets.push({
          id: fallbackKeyTarget,
          keyCode: fallbackKeyTarget,
          name: fallbackKeyTarget,
          building: '',
          location: fallbackKeyTarget,
        });
      }
    }

    const requestedAt = normalizeText(input.requestedAt);
    const reason = normalizeText(input.reason);

    if (keyTargets.length === 0) {
      throw new Error('対象の鍵を選択してください');
    }
    if (!requestedAt) {
      throw new Error('希望時刻を入力してください');
    }
    if (!reason) {
      throw new Error('理由を入力してください');
    }

    const keySummaryForTitle =
      keyTargets.length === 1 ? keyTargets[0].name : `${keyTargets.length}件`;
    const keySummaryLines = keyTargets
      .map((keyItem) => `- ${keyItem.location || keyItem.name}`)
      .join('\n');
    const description = `${reason}\n\n対象鍵\n${keySummaryLines}`;

    const payload = {
      ticket_type: 'key_preapply',
      ticket_status: 'new',
      priority: 'normal',
      title: `鍵の事前申請: ${keySummaryForTitle}`,
      description,
      event_name: normalizeText(input.eventName),
      event_location: normalizeText(input.eventLocation),
      created_by: normalizeText(input.createdBy),
      org_id: input.orgId || null,
      notify_target: 'hq',
      metadata: {
        key_target: keySummaryForTitle,
        key_targets: keyTargets,
        requested_at: requestedAt,
      },
    };

    return await createSupportTicket(payload);
  } catch (error) {
    return { data: null, error };
  }
};
const createEventStatusReport = async (input) => {
  try {
    validateCommonInput(input);

    const status = normalizeText(input.status) || 'start';
    const memo = normalizeText(input.memo);
    const isStart = status === 'start';
    const ticketType = isStart ? 'start_report' : 'end_report';
    const title = isStart ? '企画開始報告' : '企画終了報告';
    const description = memo || (isStart ? '企画開始を報告します。' : '企画終了を報告します。');

    const payload = {
      ticket_type: ticketType,
      ticket_status: 'new',
      priority: 'normal',
      title,
      description,
      event_name: normalizeText(input.eventName),
      event_location: normalizeText(input.eventLocation),
      created_by: normalizeText(input.createdBy),
      org_id: input.orgId || null,
      notify_target: 'hq',
      metadata: {
        event_status: status,
        reported_at: new Date().toISOString(),
      },
    };

    return await createSupportTicket(payload);
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * 自分の連絡案件を取得
 * @param {Object} params - 取得条件
 * @param {string} params.createdBy - 作成者ユーザーID
 * @param {number} [params.limit=20] - 取得件数
 * @returns {Promise<Object>} 取得結果
 */
const listMyContacts = async ({ createdBy, limit = 20 }) => {
  try {
    const userId = normalizeText(createdBy);
    if (!userId) {
      return { data: [], error: null };
    }

    const { data, error } = await getSupabaseClient()
      .from(SUPPORT_TICKETS_TABLE)
      .select(
        'id,ticket_no,ticket_type,ticket_status,priority,title,description,event_name,event_location,created_at,updated_at'
      )
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

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

export const exhibitorSupportService = {
  createQuestionContact,
  createEmergencyContact,
  createKeyPreapply,
  createEventStatusReport,
  listMyContacts,
};
