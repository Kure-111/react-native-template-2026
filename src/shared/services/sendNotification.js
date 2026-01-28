/**
 * ERPシステム共通の通知送信関数
 * 全体で共有して使用する通知API
 */

import { createNotification } from './notificationService';
import {
  getUserIdsByRoles,
  calculateExpiresAt,
  generateNotificationTitle,
  getCurrentUser,
  checkNotificationPermission,
  validateNotificationData
} from './notificationManager';

/**
 * ERPシステム共通の通知送信関数
 * @param {Object} params - 通知パラメータ
 * @param {string} params.type - 通知タイプ（info, success, warning, error等）
 * @param {string} params.message - 通知メッセージ本文
 * @param {string|string[]} params.recipientRoles - 通知対象ロール（単一またはリスト）
 * @param {string} [params.title] - 通知タイトル（省略時はタイプから自動生成）
 * @param {string} [params.deepLink] - クリック時の遷移先画面
 * @param {object} [params.metadata] - 追加情報（用途に応じてカスタマイズ可能）
 * @returns {Promise<{success: boolean, notificationId?: string, error?: string}>}
 * 
 * @example
 * // 基本的な使い方
 * await sendNotification({
 *   type: 'warning',
 *   message: '屋台番号105麻薬卵が出店停止しました',
 *   recipientRoles: 'vendor_manager',
 *   title: '屋台停止のお知らせ',
 *   deepLink: '/item5/vendor/105'
 * });
 * 
 * @example
 * // 複数ロールへの通知
 * await sendNotification({
 *   type: 'info',
 *   message: 'システムメンテナンスの予定があります',
 *   recipientRoles: ['admin', 'operator', 'staff']
 * });
 */
export async function sendNotification(params) {
  try {
    // 1. バリデーション
    const validation = validateNotificationData(params);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // 2. 現在のユーザー情報を取得
    let currentUser;
    try {
      currentUser = await getCurrentUser();
    } catch (error) {
      return {
        success: false,
        error: '認証エラー: ログインが必要です'
      };
    }

    // 3. 送信権限をチェック
    if (!checkNotificationPermission(currentUser.userId, currentUser.roles)) {
      return {
        success: false,
        error: '権限エラー: 通知を送信する権限がありません'
      };
    }

    // 4. パラメータの展開
    const {
      type,
      message,
      recipientRoles,
      title = null,
      deepLink = null,
      metadata = {}
    } = params;

    // 5. タイトルの生成（省略時）
    const notificationTitle = title || generateNotificationTitle(type);

    // 6. 受信者のユーザーIDを取得
    const targetUserIds = await getUserIdsByRoles(recipientRoles);

    if (targetUserIds.length === 0) {
      return {
        success: false,
        error: '受信者が見つかりません'
      };
    }

    // 7. 有効期限を計算
    const expiresHours = metadata.expiresHours || 24;
    const expiresAt = calculateExpiresAt(expiresHours);

    // 8. 通知データを作成
    const notificationData = {
      type,
      title: notificationTitle,
      message,
      recipient_roles: Array.isArray(recipientRoles) ? recipientRoles : [recipientRoles],
      target_user_ids: targetUserIds,
      sent_by: currentUser.userId,
      deep_link: deepLink,
      metadata: {
        ...metadata,
        sent_at: new Date().toISOString()
      },
      status: 'pending',
      expires_at: expiresAt
    };

    // 9. Supabaseに保存
    const result = await createNotification(notificationData);

    if (!result.success) {
      return {
        success: false,
        error: result.error || '通知の作成に失敗しました'
      };
    }

    // 10. 成功
    console.log('通知送信成功:', {
      notificationId: result.notificationId,
      type,
      recipientCount: targetUserIds.length
    });

    return {
      success: true,
      notificationId: result.notificationId
    };

  } catch (error) {
    console.error('通知送信エラー:', error);
    return {
      success: false,
      error: error.message || '通知の送信に失敗しました'
    };
  }
}

/**
 * 特定のユーザーに直接通知を送信（管理者用）
 * @param {Object} params - 通知パラメータ
 * @param {string} params.type - 通知タイプ
 * @param {string} params.message - 通知メッセージ
 * @param {string|string[]} params.recipientIds - 受信者のユーザーID
 * @param {string} [params.title] - 通知タイトル
 * @param {string} [params.deepLink] - 遷移先
 * @param {object} [params.metadata] - メタデータ
 * @returns {Promise<{success: boolean, notificationId?: string, error?: string}>}
 */
export async function sendDirectNotification(params) {
  try {
    const {
      type,
      message,
      recipientIds,
      title = null,
      deepLink = null,
      metadata = {}
    } = params;

    // バリデーション
    if (!type || !message || !recipientIds) {
      return {
        success: false,
        error: '必須パラメータが不足しています'
      };
    }

    // 現在のユーザー情報を取得
    const currentUser = await getCurrentUser();

    // 管理者権限をチェック
    if (!currentUser.roles.includes('admin')) {
      return {
        success: false,
        error: '管理者権限が必要です'
      };
    }

    const targetUserIds = Array.isArray(recipientIds) ? recipientIds : [recipientIds];
    const notificationTitle = title || generateNotificationTitle(type);
    const expiresAt = calculateExpiresAt(metadata.expiresHours || 24);

    const notificationData = {
      type,
      title: notificationTitle,
      message,
      recipient_roles: [],
      target_user_ids: targetUserIds,
      sent_by: currentUser.userId,
      deep_link: deepLink,
      metadata: {
        ...metadata,
        direct: true,
        sent_at: new Date().toISOString()
      },
      status: 'pending',
      expires_at: expiresAt
    };

    const result = await createNotification(notificationData);

    if (!result.success) {
      return {
        success: false,
        error: result.error || '通知の作成に失敗しました'
      };
    }

    return {
      success: true,
      notificationId: result.notificationId
    };

  } catch (error) {
    console.error('直接通知送信エラー:', error);
    return {
      success: false,
      error: error.message || '通知の送信に失敗しました'
    };
  }
}
