/**
 * 通知機能テストスクリプト
 * Node.jsから直接通知を送信してテストします
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Supabase設定が不足しています');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testNotification() {
  try {
    console.log('📝 通知テストを開始します...\n');

    // 1. ログインユーザーを確認
    console.log('1️⃣ 認証状態を確認中...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ 認証エラー:', authError?.message || 'ユーザーが認証されていません');
      console.log('💡 アプリケーションにログインしてから実行してください');
      process.exit(1);
    }

    console.log('✅ 認証ユーザー:', user.email);

    // 2. ユーザーの情報を取得
    console.log('\n2️⃣ ユーザー情報を取得中...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, roles')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('❌ ユーザー取得エラー:', userError.message);
      process.exit(1);
    }

    console.log('✅ ユーザーロール:', userData.roles);

    // 3. 通知を取得（テスト前）
    console.log('\n3️⃣ テスト前の通知数を確認中...');
    const { data: beforeNotifications, error: beforeError } = await supabase
      .from('notifications')
      .select('id')
      .not('target_user_ids', 'is', null)
      .limit(1);

    if (beforeError) {
      console.error('❌ 通知取得エラー:', beforeError.message);
    } else {
      console.log('✅ 既存通知数:', beforeNotifications?.length || 0);
    }

    // 4. テスト通知を作成
    console.log('\n4️⃣ テスト通知を送信中...');
    const testNotificationData = {
      type: 'info',
      title: 'テスト通知',
      message: '通知機能のテストメッセージです。' + new Date().toLocaleString('ja-JP'),
      recipient_roles: ['staff'],
      target_user_ids: [user.id],
      sent_by: user.id,
      deep_link: null,
      metadata: {
        test: true,
        sent_at: new Date().toISOString()
      },
      status: 'pending',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    const { data: notificationData, error: notificationError } = await supabase
      .from('notifications')
      .insert([testNotificationData])
      .select()
      .single();

    if (notificationError) {
      console.error('❌ 通知送信エラー:', notificationError.message);
      process.exit(1);
    }

    console.log('✅ 通知送信成功');
    console.log('📌 通知ID:', notificationData.id);
    console.log('📝 通知内容:', {
      タイプ: notificationData.type,
      タイトル: notificationData.title,
      メッセージ: notificationData.message,
      送信時刻: notificationData.created_at
    });

    // 5. 送信した通知を確認
    console.log('\n5️⃣ 送信した通知を確認中...');
    const { data: checkNotification, error: checkError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationData.id)
      .single();

    if (checkError) {
      console.error('❌ 通知確認エラー:', checkError.message);
    } else {
      console.log('✅ 通知確認成功');
      console.log('📊 ステータス:', checkNotification.status);
    }

    console.log('\n✨ テスト完了！');
    console.log('\n📱 ブラウザの画面を確認してください：');
    console.log('  1. ヘッダーのベルアイコンに未読バッジが表示されるか確認');
    console.log('  2. ベルアイコンをクリックして通知センターで通知が表示されるか確認');
    console.log('  3. 通知画面で通知一覧に表示されるか確認');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

testNotification();
