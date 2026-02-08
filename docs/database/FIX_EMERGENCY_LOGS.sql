-- Item10 緊急モード用テーブル修正SQL
-- Supabase SQL Editor で実行してください

-- ステップ1: テーブルが存在するか確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'emergency_logs';

-- ステップ2: テーブルがない場合は作成
CREATE TABLE IF NOT EXISTS emergency_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN ('activate', 'deactivate')),
  activated_by UUID REFERENCES auth.users(id),
  emergency_type TEXT CHECK (emergency_type IN ('earthquake', 'typhoon', 'heavy_rain', 'other')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ステップ3: インデックス作成
CREATE INDEX IF NOT EXISTS idx_emergency_logs_created_at ON emergency_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_logs_action ON emergency_logs(action);

-- ステップ4: RLS 有効化
ALTER TABLE emergency_logs ENABLE ROW LEVEL SECURITY;

-- ステップ5: 既存のポリシーを削除
DROP POLICY IF EXISTS "emergency_logs_select_policy" ON emergency_logs;
DROP POLICY IF EXISTS "emergency_logs_insert_policy" ON emergency_logs;

-- ステップ6: 新しいポリシー作成（認証なしでも使用可能）
-- 読み取りポリシー（全員）
CREATE POLICY "emergency_logs_select_policy" ON emergency_logs
  FOR SELECT USING (true);

-- 挿入ポリシー（全員 - 開発用）
CREATE POLICY "emergency_logs_insert_policy" ON emergency_logs
  FOR INSERT WITH CHECK (true);

-- ステップ7: Realtime を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_logs;

-- 確認: テーブルとポリシーを表示
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies 
WHERE tablename = 'emergency_logs';

-- 完了メッセージ
SELECT '✅ emergency_logs テーブルのセットアップ完了' AS status;
