/**
 * 管理部統合システム通知サービス
 * shared を編集せず、返信・状態更新・巡回割当の通知を補完する
 */

import {
  getRoles,
  sendNotificationToRoles,
  sendNotificationToUser,
} from '../../shared/services/notificationService.js';

/** ロール名ベースの通知先 */
const ROLE_NAME_TARGETS = {
  hq: ['企画管理部', '管理者'],
  accounting: ['会計部', '管理者'],
  property: ['物品部', '管理者'],
  patrol: ['警備部', '企画管理部', '管理者'],
};

/** 連絡案件種別表示名 */
const TICKET_TYPE_LABELS = {
  emergency: '緊急連絡',
  rule_question: 'ルール問い合わせ',
  layout_change: '配置図変更',
  distribution_change: '配布ルール変更',
  damage_report: '物品破損報告',
  key_preapply: '鍵事前申請',
  start_report: '企画開始報告',
  end_report: '企画終了報告',
};

/** 連絡案件状態表示名 */
const TICKET_STATUS_LABELS = {
  new: '新規',
  acknowledged: '受付済',
  in_progress: '対応中',
  waiting_external: '確認待ち',
  resolved: '対応完了',
  closed: 'クローズ',
};

/** 巡回タスク種別表示名 */
const PATROL_TASK_TYPE_LABELS = {
  confirm_start: '企画開始確認',
  confirm_end: '企画終了確認',
  lock_check: '施錠確認',
  emergency_support: '緊急対応',
  routine_patrol: '定常巡回',
  other: 'その他',
};

/** ロール一覧のキャッシュ保持時間 */
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;

/** ロール一覧キャッシュ */
let roleCache = null;
/** ロール一覧キャッシュ期限 */
let roleCacheExpiresAt = 0;

/**
 * 文字列をtrimして返す
 * @param {string|null|undefined} value - 入力値
 * @returns {string} 正規化後文字列
 */
const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * 配列から空値と重複を除去する
 * @param {Array<string>} values - 入力配列
 * @returns {Array<string>} 正規化後配列
 */
const unique = (values) => Array.from(new Set((values || []).filter(Boolean)));

/**
 * ロール一覧を取得する
 * @returns {Promise<Array>} ロール一覧
 */
const loadRoles = async () => {
  if (roleCache && roleCacheExpiresAt > Date.now()) {
    return roleCache;
  }

  /** ロール取得結果 */
  const { roles, error } = await getRoles();
  if (error) {
    return [];
  }

  roleCache = roles || [];
  roleCacheExpiresAt = Date.now() + ROLE_CACHE_TTL_MS;
  return roleCache;
};

/**
 * ロール名からロールIDを解決する
 * @param {Array<string>} roleNames - ロール名一覧
 * @returns {Promise<{roleIds: Array<string>, error: Error|null}>} 解決結果
 */
const resolveRoleIdsByNames = async (roleNames) => {
  /** 正規化済みロール名 */
  const normalizedNames = unique((roleNames || []).map(normalizeText));

  if (normalizedNames.length === 0) {
    return { roleIds: [], error: new Error('通知先ロールが未指定です') };
  }

  /** ロール一覧 */
  const roles = await loadRoles();
  /** 解決済みロールID */
  const roleIds = unique(
    roles
      .filter((role) => {
        /** ロール名 */
        const roleName = normalizeText(role.name);
        /** ロール表示名 */
        const roleDisplayName = normalizeText(role.display_name);
        return normalizedNames.includes(roleName) || normalizedNames.includes(roleDisplayName);
      })
      .map((role) => role.id)
  );

  if (roleIds.length === 0) {
    return { roleIds: [], error: new Error('通知先ロールが見つかりません') };
  }

  return { roleIds, error: null };
};

/**
 * ロール名ベースで通知を送る
 * @param {Object} params - 通知パラメータ
 * @param {Array<string>} params.roleNames - 通知先ロール名一覧
 * @param {string} params.title - タイトル
 * @param {string} params.body - 本文
 * @param {Object} [params.metadata={}] - メタデータ
 * @param {string|null} [params.senderUserId=null] - 送信者ユーザーID
 * @returns {Promise<{error: Error|null, data?: Object}>} 送信結果
 */
const sendNotificationToRoleNames = async ({
  roleNames,
  title,
  body,
  metadata = {},
  senderUserId = null,
}) => {
  /** ロール解決結果 */
  const { roleIds, error: resolveError } = await resolveRoleIdsByNames(roleNames);
  if (resolveError) {
    return { error: resolveError };
  }

  /** 通知送信結果 */
  const result = await sendNotificationToRoles(roleIds, title, body, metadata, senderUserId);
  if (result.error) {
    return { error: result.error };
  }

  return { error: null, data: result };
};

/**
 * 連絡案件に紐づくロール通知先を返す
 * @param {Object} ticket - 連絡案件
 * @returns {Array<string>} ロール名一覧
 */
const getRoleNamesForTicket = (ticket) => {
  /** 連絡案件種別 */
  const ticketType = normalizeText(ticket?.ticket_type);
  /** 通知対象 */
  const notifyTarget = normalizeText(ticket?.notify_target);

  if (ticketType === 'start_report' || ticketType === 'end_report') {
    return unique([...ROLE_NAME_TARGETS.hq, ...ROLE_NAME_TARGETS.patrol]);
  }

  if (ticketType === 'emergency') {
    return unique([...ROLE_NAME_TARGETS.hq, ...ROLE_NAME_TARGETS.patrol]);
  }

  if (notifyTarget === 'accounting') {
    return ROLE_NAME_TARGETS.accounting;
  }

  if (notifyTarget === 'property') {
    return ROLE_NAME_TARGETS.property;
  }

  return ROLE_NAME_TARGETS.hq;
};

/**
 * 通知本文の冒頭プレビューを返す
 * @param {string} value - 元本文
 * @returns {string} プレビュー文字列
 */
const buildPreviewText = (value) => {
  /** 正規化済み本文 */
  const normalizedBody = normalizeText(value);
  if (!normalizedBody) {
    return '詳細なし';
  }

  return normalizedBody.slice(0, 80);
};

/**
 * 連絡案件通知向けメタデータを作成する
 * @param {Object} ticket - 連絡案件
 * @param {Object} extraMetadata - 追加メタデータ
 * @returns {Object} メタデータ
 */
const buildTicketMetadata = (ticket, extraMetadata = {}) => {
  return {
    source: 'support_ticket',
    ticket_id: ticket?.id || null,
    ticket_no: ticket?.ticket_no || null,
    ticket_type: ticket?.ticket_type || null,
    notify_target: ticket?.notify_target || null,
    ...extraMetadata,
  };
};

/**
 * 連絡案件タイトルを返す
 * @param {Object} ticket - 連絡案件
 * @returns {string} 表示タイトル
 */
const buildTicketTitle = (ticket) => {
  /** 種別ラベル */
  const ticketTypeLabel = TICKET_TYPE_LABELS[normalizeText(ticket?.ticket_type)] || '連絡案件';
  /** 連絡案件タイトル */
  const ticketTitle = normalizeText(ticket?.title) || ticketTypeLabel;

  return `${ticketTypeLabel}: ${ticketTitle}`;
};

/**
 * 企画名と場所を1行にまとめる
 * @param {Object} ticket - 連絡案件
 * @returns {string} 企画情報
 */
const buildEventContextLine = (ticket) => {
  /** 企画名 */
  const eventName = normalizeText(ticket?.event_name) || '企画名未設定';
  /** 企画場所 */
  const eventLocation = normalizeText(ticket?.event_location) || '場所未設定';

  return `${eventName} / ${eventLocation}`;
};

/**
 * 返信投稿時の通知を送信する
 * 出展団体の追記は担当ロールへ、担当側の返信は出展団体本人へ通知する
 * @param {Object} params - 通知パラメータ
 * @param {Object} params.ticket - 対象連絡案件
 * @param {string} params.authorId - 投稿者ユーザーID
 * @param {string} params.body - 投稿本文
 * @returns {Promise<{error: Error|null, data?: Object}>} 送信結果
 */
export const notifySupportTicketMessageCreated = async ({ ticket, authorId, body }) => {
  /** 正規化済み作成者ID */
  const normalizedAuthorId = normalizeText(authorId);
  /** 連絡案件作成者ID */
  const ticketCreatorId = normalizeText(ticket?.created_by);

  if (!ticket?.id || !normalizedAuthorId) {
    return { error: null };
  }

  /** 本文プレビュー */
  const previewText = buildPreviewText(body);
  /** 共通本文 */
  const notificationBody = `${buildEventContextLine(ticket)}\n${previewText}`;

  if (normalizedAuthorId === ticketCreatorId) {
    return sendNotificationToRoleNames({
      roleNames: getRoleNamesForTicket(ticket),
      title: `追加連絡: ${buildTicketTitle(ticket)}`,
      body: notificationBody,
      metadata: buildTicketMetadata(ticket, {
        type: ticket?.ticket_type || null,
        event: 'message_created',
      }),
      senderUserId: normalizedAuthorId,
    });
  }

  if (!ticketCreatorId) {
    return { error: null };
  }

  /** 通知送信結果 */
  const result = await sendNotificationToUser(
    ticketCreatorId,
    `回答あり: ${buildTicketTitle(ticket)}`,
    notificationBody,
    buildTicketMetadata(ticket, {
      type: 'support_contact_update',
      event: 'message_created',
    }),
    normalizedAuthorId,
  );

  if (result.error) {
    return { error: result.error };
  }

  return { error: null, data: result };
};

/**
 * 連絡案件状態更新時の通知を送信する
 * 担当側が状態を変えた時のみ出展団体本人へ通知する
 * @param {Object} params - 通知パラメータ
 * @param {Object} params.ticket - 更新後連絡案件
 * @param {string} params.nextStatus - 更新後ステータス
 * @param {string|null} [params.actorUserId=null] - 更新者ユーザーID
 * @returns {Promise<{error: Error|null, data?: Object}>} 送信結果
 */
export const notifySupportTicketStatusChanged = async ({
  ticket,
  nextStatus,
  actorUserId = null,
}) => {
  /** 連絡案件作成者ID */
  const ticketCreatorId = normalizeText(ticket?.created_by);
  /** 更新者ユーザーID */
  const normalizedActorUserId = normalizeText(actorUserId);
  /** 状態ラベル */
  const statusLabel = TICKET_STATUS_LABELS[normalizeText(nextStatus)] || normalizeText(nextStatus) || '更新';

  if (!ticket?.id || !ticketCreatorId || !normalizedActorUserId) {
    return { error: null };
  }

  if (ticketCreatorId === normalizedActorUserId) {
    return { error: null };
  }

  /** 通知本文 */
  const notificationBody = `${buildEventContextLine(ticket)}\n対応状況: ${statusLabel}`;
  /** 通知送信結果 */
  const result = await sendNotificationToUser(
    ticketCreatorId,
    `対応状況更新: ${buildTicketTitle(ticket)}`,
    notificationBody,
    buildTicketMetadata(ticket, {
      type: 'support_contact_update',
      event: 'status_changed',
      status: normalizeText(nextStatus) || null,
    }),
    normalizedActorUserId,
  );

  if (result.error) {
    return { error: result.error };
  }

  return { error: null, data: result };
};

/**
 * 巡回タスク割当通知を送信する
 * 本部が担当者へ個別通知する
 * @param {Object} params - 通知パラメータ
 * @param {Object} params.task - 更新後タスク
 * @param {string|null} [params.senderUserId=null] - 実行者ユーザーID
 * @returns {Promise<{error: Error|null, data?: Object}>} 送信結果
 */
export const notifyPatrolTaskAssigned = async ({ task, senderUserId = null }) => {
  /** 担当者ユーザーID */
  const assignedTo = normalizeText(task?.assigned_to);
  /** タスク種別 */
  const taskType = normalizeText(task?.task_type);
  /** タスク種別ラベル */
  const taskTypeLabel = PATROL_TASK_TYPE_LABELS[taskType] || '巡回タスク';
  /** 企画名 */
  const eventName = normalizeText(task?.event_name) || '企画名未設定';
  /** 場所 */
  const eventLocation = normalizeText(task?.event_location || task?.location_text) || '場所未設定';

  if (!task?.id || !assignedTo) {
    return { error: null };
  }

  /** 通知送信結果 */
  const result = await sendNotificationToUser(
    assignedTo,
    `巡回割当: ${taskTypeLabel}`,
    `${eventName} / ${eventLocation}`,
    {
      source: 'patrol_task',
      type: 'patrol_task_assigned',
      event: 'assigned',
      task_id: task.id,
      task_no: task.task_no || null,
      task_type: task.task_type || null,
      source_ticket_id: task.source_ticket_id || null,
    },
    normalizeText(senderUserId) || null,
  );

  if (result.error) {
    return { error: result.error };
  }

  return { error: null, data: result };
};
