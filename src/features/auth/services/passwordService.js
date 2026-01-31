/**
 * パスワード変更サービス
 * パスワード変更とpassword_changed_atの更新を行います
 */

import { getSupabaseClient } from '../../../services/supabase/client.js';
import { signIn, updatePassword } from '../../../services/supabase/authService.js';
import { PASSWORD_ERROR_MESSAGES } from '../constants.js';

/**
 * 現在のパスワードを検証
 * @param {String} email - ユーザーのメールアドレス
 * @param {String} currentPassword - 現在のパスワード
 * @returns {Promise<Object>} 検証結果（success, error）
 */
export const verifyCurrentPassword = async (email, currentPassword) => {
  try {
    const { user, error } = await signIn(email, currentPassword);

    if (error) {
      return {
        success: false,
        error: PASSWORD_ERROR_MESSAGES.CURRENT_PASSWORD_INCORRECT,
      };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('パスワード検証でエラーが発生:', error);
    return { success: false, error: PASSWORD_ERROR_MESSAGES.NETWORK_ERROR };
  }
};

/**
 * パスワードを変更してpassword_changed_atを更新
 * @param {String} userId - ユーザーID
 * @param {String} newPassword - 新しいパスワード
 * @returns {Promise<Object>} 変更結果（success, error）
 */
export const changePassword = async (userId, newPassword) => {
  try {
    // 1. Supabase Authでパスワードを更新
    const { user, error: authError } = await updatePassword(newPassword);

    if (authError) {
      console.error('パスワード更新エラー:', authError);
      return { success: false, error: PASSWORD_ERROR_MESSAGES.UPDATE_FAILED };
    }

    // 2. user_profilesのpassword_changed_atを更新
    const { error: profileError } = await updatePasswordChangedAt(userId);

    if (profileError) {
      console.error('password_changed_at更新エラー:', profileError);
      // パスワード自体は変更されているので、このエラーは警告として扱う
      console.warn('パスワードは変更されましたが、変更日時の記録に失敗しました');
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('パスワード変更処理でエラーが発生:', error);
    return { success: false, error: PASSWORD_ERROR_MESSAGES.NETWORK_ERROR };
  }
};

/**
 * password_changed_atを現在時刻で更新
 * @param {String} userId - ユーザーID
 * @returns {Promise<Object>} 更新結果（error）
 */
export const updatePasswordChangedAt = async (userId) => {
  try {
    const { error } = await getSupabaseClient()
      .from('user_profiles')
      .update({ password_changed_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      console.error('password_changed_at更新エラー:', error.message);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('password_changed_at更新処理でエラーが発生:', error);
    return { error };
  }
};

/**
 * 初回ログインかどうかを判定
 * @param {Object} userInfo - ユーザー情報（password_changed_atを含む）
 * @returns {Boolean} 初回ログインの場合true
 */
export const checkIsFirstLogin = (userInfo) => {
  if (!userInfo) {
    return false;
  }

  // password_changed_atがnullまたはundefinedの場合は初回ログイン
  return userInfo.password_changed_at === null || userInfo.password_changed_at === undefined;
};
