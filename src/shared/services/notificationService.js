/**
 * 通知サービス
 * 通知の作成・送信・取得・既読処理を提供します
 */

import { getSupabaseClient } from '../../services/supabase/client.js';

const notificationEventTarget = new EventTarget();

export const subscribeNotificationUpdates = (handler) => {
  notificationEventTarget.addEventListener('change', handler);
  return () => notificationEventTarget.removeEventListener('change', handler);
};

export const emitNotificationUpdate = () => {
  notificationEventTarget.dispatchEvent(new Event('change'));
};

/**
 * ロール一覧を取得
 * @returns {Promise<Object>} roles, error
 */
export const getRoles = async () => {
  try {
    const { data, error } = await getSupabaseClient()
      .from('roles')
      .select('id, name, display_name')
      .order('display_name', { ascending: true });

    if (error) {
      return { roles: [], error };
    }

    return { roles: data ?? [], error: null };
  } catch (error) {
    return { roles: [], error };
  }
};

/**
 * 指定ロールのユーザー一覧を取得
 * @param {string} roleId
 * @returns {Promise<Object>} users, error
 */
export const getUsersByRole = async (roleId) => {
  try {
    const { data, error } = await getSupabaseClient()
      .from('user_roles')
      .select('user_id')
      .eq('role_id', roleId);

    if (error) {
      return { users: [], error };
    }

    const users = (data ?? []).map((item) => item.user_id);
    return { users, error: null };
  } catch (error) {
    return { users: [], error };
  }
};

/**
 * 複数ロールのユーザー一覧を取得（重複除外）
 * @param {string[]} roleIds
 * @returns {Promise<Object>} users, error
 */
export const getUsersByRoles = async (roleIds) => {
  try {
    if (!Array.isArray(roleIds) || roleIds.length === 0) {
      return { users: [], error: null };
    }

    const { data, error } = await getSupabaseClient()
      .from('user_roles')
      .select('user_id')
      .in('role_id', roleIds);

    if (error) {
      return { users: [], error };
    }

    const userSet = new Set((data ?? []).map((item) => item.user_id));
    return { users: Array.from(userSet), error: null };
  } catch (error) {
    return { users: [], error };
  }
};

/**
 * ユーザーID一覧からプロフィールを取得
 * @param {string[]} userIds
 * @returns {Promise<Object>} profiles, error
 */
export const getUserProfilesByIds = async (userIds) => {
  try {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return { profiles: [], error: null };
    }

    const { data, error } = await getSupabaseClient()
      .from('user_profiles')
      .select('user_id, name, organization')
      .in('user_id', userIds);

    if (error) {
      return { profiles: [], error };
    }

    return { profiles: data ?? [], error: null };
  } catch (error) {
    return { profiles: [], error };
  }
};

/**
 * 通知を作成
 * @param {Object} payload
 * @returns {Promise<Object>} notification, error
 */
const createNotification = async (payload) => {
  const { data, error } = await getSupabaseClient()
    .from('notifications')
    .insert([payload])
    .select()
    .single();

  if (error) {
    return { notification: null, error };
  }

  return { notification: data, error: null };
};

/**
 * 単一ユーザーへ通知を送信
 * @param {string} userId
 * @param {string} title
 * @param {string} body
 * @param {Object} metadata
 * @param {string|null} senderUserId
 * @returns {Promise<Object>} notification, recipientsCount, error
 */
export const sendNotificationToUser = async (userId, title, body, metadata = {}, senderUserId = null) => {
  try {
    const { notification, error: createError } = await createNotification({
      sender_user_id: senderUserId,
      title,
      body,
      metadata,
    });

    if (createError) {
      return { notification: null, recipientsCount: 0, error: createError };
    }

    const { error: insertError } = await getSupabaseClient()
      .from('notification_recipients')
      .insert([{ notification_id: notification.id, user_id: userId }]);

    if (insertError) {
      return { notification, recipientsCount: 0, error: insertError };
    }

    emitNotificationUpdate();
    return { notification, recipientsCount: 1, error: null };
  } catch (error) {
    return { notification: null, recipientsCount: 0, error };
  }
};

/**
 * ロールの全ユーザーへ通知を送信
 * @param {string} roleId
 * @param {string} title
 * @param {string} body
 * @param {Object} metadata
 * @param {string|null} senderUserId
 * @returns {Promise<Object>} notification, recipientsCount, error
 */
export const sendNotificationToRole = async (roleId, title, body, metadata = {}, senderUserId = null) => {
  try {
    const { users, error: usersError } = await getUsersByRole(roleId);
    if (usersError) {
      return { notification: null, recipientsCount: 0, error: usersError };
    }
    if (users.length === 0) {
      return { notification: null, recipientsCount: 0, error: new Error('送信先ユーザーが見つかりません') };
    }

    const { notification, error: createError } = await createNotification({
      sender_user_id: senderUserId,
      title,
      body,
      metadata,
    });

    if (createError) {
      return { notification: null, recipientsCount: 0, error: createError };
    }

    const recipients = users.map((userId) => ({
      notification_id: notification.id,
      user_id: userId,
    }));

    const { error: insertError } = await getSupabaseClient()
      .from('notification_recipients')
      .insert(recipients);

    if (insertError) {
      return { notification, recipientsCount: 0, error: insertError };
    }

    emitNotificationUpdate();
    return { notification, recipientsCount: recipients.length, error: null };
  } catch (error) {
    return { notification: null, recipientsCount: 0, error };
  }
};

/**
 * 複数ロールの全ユーザーへ通知を送信
 * @param {string[]} roleIds
 * @param {string} title
 * @param {string} body
 * @param {Object} metadata
 * @param {string|null} senderUserId
 * @returns {Promise<Object>} notification, recipientsCount, error
 */
export const sendNotificationToRoles = async (roleIds, title, body, metadata = {}, senderUserId = null) => {
  try {
    const { users, error: usersError } = await getUsersByRoles(roleIds);
    if (usersError) {
      return { notification: null, recipientsCount: 0, error: usersError };
    }
    if (users.length === 0) {
      return { notification: null, recipientsCount: 0, error: new Error('送信先ユーザーが見つかりません') };
    }

    const { notification, error: createError } = await createNotification({
      sender_user_id: senderUserId,
      title,
      body,
      metadata,
    });

    if (createError) {
      return { notification: null, recipientsCount: 0, error: createError };
    }

    const recipients = users.map((userId) => ({
      notification_id: notification.id,
      user_id: userId,
    }));

    const { error: insertError } = await getSupabaseClient()
      .from('notification_recipients')
      .insert(recipients);

    if (insertError) {
      return { notification, recipientsCount: 0, error: insertError };
    }

    emitNotificationUpdate();
    return { notification, recipientsCount: recipients.length, error: null };
  } catch (error) {
    return { notification: null, recipientsCount: 0, error };
  }
};

/**
 * 自分宛ての通知一覧を取得
 * @param {string} userId
 * @returns {Promise<Object>} items, error
 */
export const getNotificationsForUser = async (userId) => {
  try {
    const { data, error } = await getSupabaseClient()
      .from('notification_recipients')
      .select('id, read_at, created_at, notifications ( id, title, body, created_at )')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { items: [], error };
    }

    const items = (data ?? []).map((row) => ({
      recipientId: row.id,
      readAt: row.read_at,
      createdAt: row.created_at,
      notification: row.notifications,
    }));

    return { items, error: null };
  } catch (error) {
    return { items: [], error };
  }
};

/**
 * 未読件数を取得
 * @param {string} userId
 * @returns {Promise<Object>} count, error
 */
export const getUnreadCount = async (userId) => {
  try {
    const { error, count } = await getSupabaseClient()
      .from('notification_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      return { count: 0, error };
    }

    return { count: count ?? 0, error: null };
  } catch (error) {
    return { count: 0, error };
  }
};

/**
 * 既読にする
 * @param {string} recipientId
 * @returns {Promise<Object>} success, error
 */
export const markNotificationRead = async (recipientId) => {
  try {
    const { error } = await getSupabaseClient()
      .from('notification_recipients')
      .update({ read_at: new Date().toISOString() })
      .eq('id', recipientId);

    if (error) {
      return { success: false, error };
    }

    emitNotificationUpdate();
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
};
