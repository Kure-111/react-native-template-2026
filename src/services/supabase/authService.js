/**
 * 認証サービス
 * Supabase Authを使用したユーザー認証機能を提供します
 */

import { supabase } from './client.js';

/**
 * メールアドレスとパスワードでログイン
 * @param {String} email - メールアドレス
 * @param {String} password - パスワード
 * @returns {Promise<Object>} ログイン結果（user, session, error）
 */
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('ログインエラー:', error.message);
      return { user: null, session: null, error };
    }

    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    console.error('ログイン処理でエラーが発生:', error);
    return { user: null, session: null, error };
  }
};

/**
 * ログアウト
 * @returns {Promise<Object>} ログアウト結果（error）
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('ログアウトエラー:', error.message);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('ログアウト処理でエラーが発生:', error);
    return { error };
  }
};

/**
 * 現在のセッション情報を取得
 * @returns {Promise<Object>} セッション情報（session, error）
 */
export const getSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('セッション取得エラー:', error.message);
      return { session: null, error };
    }

    return { session: data.session, error: null };
  } catch (error) {
    console.error('セッション取得処理でエラーが発生:', error);
    return { session: null, error };
  }
};

/**
 * 現在ログインしているユーザー情報を取得
 * @returns {Promise<Object>} ユーザー情報（user, error）
 */
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error('ユーザー情報取得エラー:', error.message);
      return { user: null, error };
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('ユーザー情報取得処理でエラーが発生:', error);
    return { user: null, error };
  }
};

/**
 * パスワードを変更
 * @param {String} newPassword - 新しいパスワード
 * @returns {Promise<Object>} 変更結果（user, error）
 */
export const updatePassword = async (newPassword) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('パスワード変更エラー:', error.message);
      return { user: null, error };
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('パスワード変更処理でエラーが発生:', error);
    return { user: null, error };
  }
};

/**
 * 認証状態の変化を監視
 * @param {Function} callback - 認証状態が変わった時に実行されるコールバック関数
 * @returns {Object} サブスクリプション（解除用）
 */
export const onAuthStateChange = (callback) => {
  const { data: subscription } = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(event, session);
    }
  );

  return subscription;
};
