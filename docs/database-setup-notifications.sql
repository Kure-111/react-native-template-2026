-- 通知機能用データベーススキーマ
-- Supabaseで実行してください

-- ========================================
-- 0. usersテーブルの作成（存在しない場合）
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  roles JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- rolesカラムにインデックスを作成
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN (roles);

-- ========================================
-- 1. notifications テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_roles JSONB NOT NULL DEFAULT '[]',
  target_user_ids JSONB NOT NULL DEFAULT '[]',
  sent_by UUID NOT NULL,
  deep_link TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- インデックス
  CONSTRAINT notifications_status_check CHECK (status IN ('pending', 'sent', 'failed'))
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_notifications_target_user_ids ON notifications USING GIN (target_user_ids);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications (expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_by ON notifications (sent_by);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (type);

-- ========================================
-- 2. notification_reads テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 重複防止
  UNIQUE(notification_id, user_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON notification_reads (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_notification_id ON notification_reads (notification_id);

-- ========================================
-- 3. notification_types テーブル（オプション）
-- ========================================
CREATE TABLE IF NOT EXISTS notification_types (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  color TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  auto_dismiss_seconds INTEGER,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- デフォルト通知タイプの挿入
INSERT INTO notification_types (id, display_name, color, priority, auto_dismiss_seconds, icon)
VALUES 
  ('info', '情報', '#3B82F6', 1, 7, 'ℹ️'),
  ('success', '成功', '#10B981', 1, 5, '✓'),
  ('warning', '警告', '#F59E0B', 2, NULL, '⚠️'),
  ('error', 'エラー', '#EF4444', 3, NULL, '✕'),
  ('vendor_stop', '屋台停止', '#DC2626', 3, NULL, '🛑'),
  ('schedule_change', 'スケジュール変更', '#8B5CF6', 2, 10, '📅'),
  ('inventory_alert', '在庫アラート', '#F59E0B', 2, NULL, '📦'),
  ('user_action', 'ユーザーアクション', '#6366F1', 1, 5, '👤')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 4. Row Level Security (RLS) の設定
-- ========================================

-- notificationsテーブルのRLSを有効化
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分宛の通知のみ閲覧可能
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT
  USING (target_user_ids @> to_jsonb(auth.uid()::text));

-- 管理者とマネージャーは通知を作成可能
CREATE POLICY "Admins and managers can create notifications" ON notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        users.roles @> '["admin"]'::jsonb OR
        users.roles @> '["operator"]'::jsonb OR
        users.roles @> '["manager"]'::jsonb OR
        users.roles @> '["vendor_manager"]'::jsonb OR
        users.roles @> '["inventory_manager"]'::jsonb OR
        users.roles @> '["schedule_manager"]'::jsonb
      )
    )
  );

-- 管理者は通知を削除可能
CREATE POLICY "Admins can delete notifications" ON notifications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  );

-- notification_readsテーブルのRLSを有効化
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の既読情報のみ閲覧可能
CREATE POLICY "Users can view their own reads" ON notification_reads
  FOR SELECT
  USING (user_id = auth.uid());

-- ユーザーは自分の既読情報のみ追加可能
CREATE POLICY "Users can mark notifications as read" ON notification_reads
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- 5. 自動削除トリガー（有効期限切れ通知）
-- ========================================

-- 有効期限切れの通知を削除する関数
CREATE OR REPLACE FUNCTION delete_expired_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- cron jobとして実行（Supabase Pro以上が必要）
-- または、アプリケーション側で定期的に実行

-- ========================================
-- 6. リアルタイム更新の有効化
-- ========================================

-- notificationsテーブルのリアルタイム更新を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- notification_readsテーブルのリアルタイム更新を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE notification_reads;

-- ========================================
-- 完了
-- ========================================

-- 以下のコメントアウトを解除してテストデータを挿入できます
/*
-- テスト用の通知を作成
INSERT INTO notifications (
  type,
  title,
  message,
  recipient_roles,
  target_user_ids,
  sent_by,
  status,
  expires_at
) VALUES (
  'info',
  'テスト通知',
  'これはテスト通知です',
  '["staff"]',
  '["ユーザーIDを入れてください"]',
  'システム管理者のIDを入れてください',
  'pending',
  NOW() + INTERVAL '24 hours'
);
*/
