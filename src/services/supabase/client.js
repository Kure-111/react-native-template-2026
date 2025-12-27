/**
 * Supabaseクライアント設定
 * Supabaseへの接続を管理します
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Supabase URL
 * 環境変数から取得します
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

/**
 * Supabase Anon Key
 * 環境変数から取得します
 */
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabaseクライアントインスタンス
 * アプリケーション全体で共有されます
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // 認証設定
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * 接続テスト関数
 * Supabaseへの接続が正常かどうかをテストします
 * @returns {Promise<boolean>} 接続成功の場合true
 */
export const testConnection = async () => {
  try {
    const { error } = await supabase.from('_test').select('*').limit(1);
    // テーブルが存在しない場合もエラーが返るが、接続自体は成功している
    if (error && !error.message.includes('does not exist')) {
      console.error('Supabase接続エラー:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Supabase接続テスト失敗:', error);
    return false;
  }
};
