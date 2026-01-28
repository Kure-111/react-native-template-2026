/**
 * 通知マネージャー
 * 通知の送信前処理とビジネスロジック
 */

import { supabase } from '../../services/supabase/client';
import { USER_ROLES } from '../constants/userRoles';

/**
 * ロールに基づいてユーザーIDを取得
 * @param {string|string[]} roles - ロール（単一または配列）
 * @returns {Promise<string[]>} ユーザーIDの配列
 */
export async function getUserIdsByRoles(roles) {
  try {
    const roleArray = Array.isArray(roles) ? roles : [roles];

    // すべてのユーザーを取得してから、クライアント側でフィルタリング
    const { data, error } = await supabase
      .from('users')
      .select('id, roles');

    if (error) throw error;

    // rolesフィールドが指定されたロールを含むユーザーをフィルタリング
    const matchedUsers = data.filter(user => {
      const userRoles = user.roles || [];
      return roleArray.some(role => userRoles.includes(role));
    });

    return matchedUsers.map(user => user.id);
  } catch (error) {
    console.error('ロールによるユーザーID取得エラー:', error);
    return [];
  }
}

/**
 * 通知の有効期限を計算
 * @param {number} hours - 有効時間（デフォルト: 24時間）
 * @returns {string} ISO形式の日時文字列
 */
export function calculateExpiresAt(hours = 24) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hours);
  return expiresAt.toISOString();
}

/**
 * 通知タイトルを生成（省略時）
 * @param {string} type - 通知タイプ
 * @returns {string} 通知タイトル
 */
export function generateNotificationTitle(type) {
  const titleMap = {
    info: 'お知らせ',
    success: '完了通知',
    warning: '警告',
    error: 'エラー',
    vendor_stop: '屋台停止',
    schedule_change: 'スケジュール変更',
    inventory_alert: '在庫アラート',
    user_action: 'ユーザーアクション'
  };

  return titleMap[type] || 'お知らせ';
}

/**
 * 現在のユーザー情報を取得
 * @returns {Promise<{userId: string, roles: string[]}>}
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('ユーザーが認証されていません');
    }

    // ユーザーのロール情報を取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    return {
      userId: user.id,
      roles: userData?.roles || []
    };
  } catch (error) {
    console.error('現在のユーザー取得エラー:', error);
    throw error;
  }
}

/**
 * 通知送信権限をチェック
 * @param {string} userId - ユーザーID
 * @param {string[]} userRoles - ユーザーのロール
 * @returns {boolean} 送信権限の有無
 */
export function checkNotificationPermission(userId, userRoles) {
  // 管理者とオペレーターは常に送信可能
  if (userRoles.includes(USER_ROLES.ADMIN) || userRoles.includes(USER_ROLES.OPERATOR)) {
    return true;
  }

  // マネージャーロールは自部門への通知が可能
  const managerRoles = [
    USER_ROLES.MANAGER,
    USER_ROLES.VENDOR_MANAGER,
    USER_ROLES.INVENTORY_MANAGER,
    USER_ROLES.SCHEDULE_MANAGER
  ];

  return userRoles.some(role => managerRoles.includes(role));
}

/**
 * 通知データを検証
 * @param {object} params - 通知パラメータ
 * @returns {{valid: boolean, error?: string}}
 */
export function validateNotificationData(params) {
  const { type, message, recipientRoles } = params;

  if (!type) {
    return { valid: false, error: '通知タイプが指定されていません' };
  }

  if (!message || message.trim() === '') {
    return { valid: false, error: 'メッセージが空です' };
  }

  if (!recipientRoles || (Array.isArray(recipientRoles) && recipientRoles.length === 0)) {
    return { valid: false, error: '受信者が指定されていません' };
  }

  return { valid: true };
}
