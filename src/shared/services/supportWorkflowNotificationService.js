/**
 * 管理部統合システム向け通知ブリッジ
 * item12〜16 の業務イベントを通知サービスへ橋渡しする
 */

import { getRoles, sendNotificationToRoles, sendNotificationToUser } from './notificationService.js';

const ROLE_NAME_TARGETS = {
  hq: ['企画管理部', '管理者'],
  accounting: ['会計部', '管理者'],
  property: ['物品部', '管理者'],
  patrol: ['警備部', '企画管理部', '管理者'],
};

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

const TASK_TYPE_LABELS = {
  confirm_start: '企画開始確認',
  confirm_end: '企画終了確認',
  lock_check: '施錠確認',
  emergency_support: '緊急対応',
  routine_patrol: '定常巡回',
  other: 'その他',
};

const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;

let roleCache = null;
let roleCacheExpiresAt = 0;

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const unique = (values) => Array.from(new Set((values || []).filter(Boolean)));

const loadRoles = async () => {
  if (roleCache && roleCacheExpiresAt > Date.now()) {
    return roleCache;
  }

  const { roles, error } = await getRoles();
  if (error) {
    return [];
  }

  roleCache = roles || [];
  roleCacheExpiresAt = Date.now() + ROLE_CACHE_TTL_MS;
  return roleCache;
};

const resolveRoleIdsByNames = async (roleNames) => {
  const normalizedNames = unique((roleNames || []).map(normalizeText));
  if (normalizedNames.length === 0) {
    return { roleIds: [], error: new Error('通知先ロールが未指定です') };
  }

  const roles = await loadRoles();
  const roleIds = unique(
    roles
      .filter((role) => {
        const roleName = normalizeText(role.name);
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

const sendNotificationToRoleNames = async ({
  roleNames,
  title,
  body,
  metadata = {},
  senderUserId = null,
}) => {
  const { roleIds, error: resolveError } = await resolveRoleIdsByNames(roleNames);
  if (resolveError) {
    return { error: resolveError };
  }

  const result = await sendNotificationToRoles(roleIds, title, body, metadata, senderUserId);
  if (result.error) {
    return { error: result.error };
  }

  return { error: null, data: result };
};

const getRoleNamesForTicket = (ticket) => {
  const ticketType = normalizeText(ticket?.ticket_type);
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

const buildTicketNotification = (ticket) => {
  const ticketType = normalizeText(ticket?.ticket_type);
  const ticketTypeLabel = TICKET_TYPE_LABELS[ticketType] || '連絡案件';
  const ticketTitle = normalizeText(ticket?.title) || '新規連絡';
  const eventName = normalizeText(ticket?.event_name) || '企画名未設定';
  const eventLocation = normalizeText(ticket?.event_location) || '場所未設定';
  const description = normalizeText(ticket?.description);
  const descriptionPreview = description ? description.slice(0, 80) : '詳細なし';

  return {
    title: `[${ticketTypeLabel}] ${ticketTitle}`,
    body: `${eventName} / ${eventLocation}\n${descriptionPreview}`,
  };
};

/**
 * 連絡案件作成通知
 * @param {Object} input
 * @param {Object} input.ticket - 作成済み連絡案件
 * @param {string|null} [input.senderUserId] - 送信者ユーザーID
 * @returns {Promise<{error: Error|null, data?: Object}>}
 */
export const notifySupportTicketCreated = async ({ ticket, senderUserId = null }) => {
  if (!ticket?.id) {
    return { error: new Error('連絡案件IDが不足しているため通知できません') };
  }

  const roleNames = getRoleNamesForTicket(ticket);
  const { title, body } = buildTicketNotification(ticket);
  const metadata = {
    source: 'support_ticket',
    ticket_id: ticket.id,
    ticket_no: ticket.ticket_no || null,
    ticket_type: ticket.ticket_type || null,
    notify_target: ticket.notify_target || null,
  };

  return sendNotificationToRoleNames({
    roleNames,
    title,
    body,
    metadata,
    senderUserId,
  });
};

/**
 * 巡回タスク受諾通知（管理部全員 + 鍵返却者）
 * @param {Object} input
 * @param {Object} input.task - 受諾後タスク
 * @param {string|null} [input.senderUserId] - 送信者ユーザーID
 * @param {string|null} [input.keyReturnerUserId] - 鍵を返却した人のユーザーID（施錠確認タスク時）
 * @returns {Promise<{error: Error|null, data?: Object}>}
 */
export const notifyPatrolTaskAccepted = async ({
  task,
  senderUserId = null,
  keyReturnerUserId = null,
}) => {
  if (!task?.id) {
    return { error: new Error('タスクIDが不足しているため通知できません') };
  }

  const taskType = normalizeText(task.task_type);
  const taskLabel = TASK_TYPE_LABELS[taskType] || '巡回タスク';
  const eventName = normalizeText(task.event_name) || '企画名未設定';
  const eventLocation = normalizeText(task.event_location || task.location_text) || '場所未設定';

  /** 通知メタデータ */
  const metadata = {
    source: 'patrol_task',
    event: 'accepted',
    task_id: task.id,
    task_no: task.task_no || null,
    task_type: task.task_type || null,
    source_ticket_id: task.source_ticket_id || null,
  };

  /** 管理部全員（警備部 + 企画管理部 + 管理者）へ通知 */
  const { error } = await sendNotificationToRoleNames({
    roleNames: ROLE_NAME_TARGETS.patrol,
    title: `巡回受諾: ${taskLabel}`,
    body: `${eventName} / ${eventLocation}`,
    metadata,
    senderUserId,
  });

  /** 鍵を返却した人がいれば個別にも通知（返却者 ≠ 受諾者の場合のみ） */
  const normalizedReturnerUserId = normalizeText(keyReturnerUserId);
  const normalizedSenderUserId = normalizeText(senderUserId);
  const shouldNotifyReturner =
    normalizedReturnerUserId &&
    normalizedReturnerUserId !== normalizedSenderUserId;

  if (shouldNotifyReturner) {
    await sendNotificationToUser(
      normalizedReturnerUserId,
      `巡回受諾: ${taskLabel}`,
      `${eventName} / ${eventLocation}\n担当者が施錠確認のため向かいます。`,
      { ...metadata, event: 'accepted_notify_returner' },
      senderUserId,
    );
  }

  return { error: error || null };
};

/**
 * 巡回タスク完了通知（本部向け）
 * @param {Object} input
 * @param {Object} input.task - 完了後タスク
 * @param {string} input.resultCode - 結果コード
 * @param {string|null} [input.senderUserId] - 送信者ユーザーID
 * @returns {Promise<{error: Error|null, data?: Object}>}
 */
export const notifyPatrolTaskCompleted = async ({ task, resultCode, senderUserId = null }) => {
  if (!task?.id) {
    return { error: new Error('タスクIDが不足しているため通知できません') };
  }

  const taskType = normalizeText(task.task_type);
  const taskLabel = TASK_TYPE_LABELS[taskType] || '巡回タスク';
  const eventName = normalizeText(task.event_name) || '企画名未設定';
  const eventLocation = normalizeText(task.event_location || task.location_text) || '場所未設定';

  return sendNotificationToRoleNames({
    roleNames: ROLE_NAME_TARGETS.hq,
    title: `巡回完了: ${taskLabel}`,
    body: `${eventName} / ${eventLocation}\n結果: ${normalizeText(resultCode) || '未設定'}`,
    metadata: {
      source: 'patrol_task',
      event: 'completed',
      task_id: task.id,
      task_no: task.task_no || null,
      task_type: task.task_type || null,
      result_code: normalizeText(resultCode) || null,
      source_ticket_id: task.source_ticket_id || null,
      source_key_loan_id: task.source_key_loan_id || null,
    },
    senderUserId,
  });
};

/**
 * 施錠確認タスク作成通知（巡回向け）
 * @param {Object} input
 * @param {Object|null} input.task - 作成タスク
 * @param {Object|null} [input.loan] - 元鍵貸出情報
 * @param {string|null} [input.senderUserId] - 送信者ユーザーID
 * @returns {Promise<{error: Error|null, data?: Object}>}
 */
export const notifyLockCheckTaskCreated = async ({ task, loan = null, senderUserId = null }) => {
  if (!task?.id) {
    return { error: null };
  }

  const keyLabel = normalizeText(task?.event_location || task?.location_text || loan?.key_label) || '鍵不明';
  const eventName = normalizeText(task?.event_name || loan?.event_name) || '企画名未設定';

  return sendNotificationToRoleNames({
    roleNames: ROLE_NAME_TARGETS.patrol,
    title: '施錠確認タスクが作成されました',
    body: `${eventName} / ${keyLabel}`,
    metadata: {
      source: 'key_loan',
      event: 'lock_task_created',
      task_id: task.id,
      task_no: task.task_no || null,
      loan_id: loan?.id || task.source_key_loan_id || null,
    },
    senderUserId,
  });
};

