/**
 * 通知サービス
 * Supabaseとの通信を行う基本的なCRUD操作
 */

import { supabase } from '../../services/supabase/client';

/**
 * 通知を作成
 * @param {object} notificationData - 通知データ
 * @returns {Promise<{success: boolean, notificationId: string, error?: string}>}
 */
export async function createNotification(notificationData) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      notificationId: data.id
    };
  } catch (error) {
    console.error('通知の作成エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * ユーザーの通知一覧を取得
 * @param {string} userId - ユーザーID
 * @param {object} options - オプション（limit, offset, filterByType）
 * @returns {Promise<Array>}
 */
export async function getUserNotifications(userId, options = {}) {
  try {
    const {
      limit = 20,
      offset = 0,
      filterByType = null
    } = options;

    let query = supabase
      .from('notifications')
      .select(`
        *,
        notification_reads!left(read_at, user_id)
      `)
      .contains('target_user_ids', [userId])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filterByType) {
      query = query.eq('type', filterByType);
    }

    const { data, error } = await query;

    if (error) throw error;

    // 既読情報を含めて整形
    return data.map(notification => ({
      ...notification,
      isRead: notification.notification_reads?.some(
        read => read.user_id === userId
      ) || false
    }));
  } catch (error) {
    console.error('通知一覧の取得エラー:', error);
    return [];
  }
}

/**
 * 未読通知数を取得
 * @param {string} userId - ユーザーID
 * @returns {Promise<number>}
 */
export async function getUnreadNotificationCount(userId) {
  try {
    // 自分宛の通知を取得
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('id')
      .contains('target_user_ids', [userId])
      .gt('expires_at', new Date().toISOString());

    if (notificationsError) throw notificationsError;

    if (!notifications || notifications.length === 0) return 0;

    // 既読済みの通知を取得
    const notificationIds = notifications.map(n => n.id);
    const { data: reads, error: readsError } = await supabase
      .from('notification_reads')
      .select('notification_id')
      .eq('user_id', userId)
      .in('notification_id', notificationIds);

    if (readsError) throw readsError;

    const readIds = new Set(reads?.map(r => r.notification_id) || []);
    const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

    return unreadCount;
  } catch (error) {
    console.error('未読通知数の取得エラー:', error);
    return 0;
  }
}

/**
 * 通知を既読にする
 * @param {string} notificationId - 通知ID
 * @param {string} userId - ユーザーID
 * @returns {Promise<boolean>}
 */
export async function markNotificationAsRead(notificationId, userId) {
  try {
    const { error } = await supabase
      .from('notification_reads')
      .insert([{
        notification_id: notificationId,
        user_id: userId,
        read_at: new Date().toISOString()
      }]);

    if (error) {
      // 既に既読の場合はエラーを無視
      if (error.code === '23505') return true;
      throw error;
    }

    return true;
  } catch (error) {
    console.error('通知の既読化エラー:', error);
    return false;
  }
}

/**
 * 複数の通知を一括で既読にする
 * @param {string[]} notificationIds - 通知IDの配列
 * @param {string} userId - ユーザーID
 * @returns {Promise<boolean>}
 */
export async function markMultipleNotificationsAsRead(notificationIds, userId) {
  try {
    const reads = notificationIds.map(notificationId => ({
      notification_id: notificationId,
      user_id: userId,
      read_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('notification_reads')
      .insert(reads);

    if (error && error.code !== '23505') throw error;

    return true;
  } catch (error) {
    console.error('複数通知の既読化エラー:', error);
    return false;
  }
}

/**
 * リアルタイム通知を購読
 * @param {string} userId - ユーザーID
 * @param {function} callback - 新規通知受信時のコールバック
 * @returns {object} 購読オブジェクト（unsubscribeメソッド付き）
 */
export function subscribeToNotifications(userId, callback) {
  const subscription = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `target_user_ids=cs.{${userId}}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(subscription);
    }
  };
}

/**
 * 通知を削除（管理者用）
 * @param {string} notificationId - 通知ID
 * @returns {Promise<boolean>}
 */
export async function deleteNotification(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('通知の削除エラー:', error);
    return false;
  }
}
