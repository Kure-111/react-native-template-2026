-- emergency_logs のRLSポリシーだけを修正
-- Supabase SQL Editor で実行してください

-- ステップ1: 既存のポリシーを削除
DROP POLICY IF EXISTS "emergency_logs_select_policy" ON emergency_logs;
DROP POLICY IF EXISTS "emergency_logs_insert_policy" ON emergency_logs;

-- ステップ2: 新しいポリシーを作成（認証なしでも使用可能）
-- 読み取りポリシー（全員）
CREATE POLICY "emergency_logs_select_policy" ON emergency_logs
  FOR SELECT USING (true);

-- 挿入ポリシー（全員）
CREATE POLICY "emergency_logs_insert_policy" ON emergency_logs
  FOR INSERT WITH CHECK (true);

-- ステップ3: 確認
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'emergency_logs';

-- 完了メッセージ
SELECT '✅ RLSポリシーの修正完了' AS status;
