-- emergency_logs テーブルのスキーマを修正
-- activated_by を NULL 許可にして外部キー制約を削除

-- ステップ1: 外部キー制約を削除
ALTER TABLE emergency_logs 
DROP CONSTRAINT IF EXISTS emergency_logs_activated_by_fkey;

-- ステップ2: activated_by を NULL 許可の TEXT 型に変更
ALTER TABLE emergency_logs 
ALTER COLUMN activated_by DROP NOT NULL,
ALTER COLUMN activated_by TYPE TEXT USING activated_by::TEXT;

-- ステップ3: emergency_type も NULL 許可に（既になっているはず）
ALTER TABLE emergency_logs 
ALTER COLUMN emergency_type DROP NOT NULL;

-- ステップ4: テーブル構造を確認
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'emergency_logs'
ORDER BY ordinal_position;

-- 完了メッセージ
SELECT '✅ emergency_logs スキーマの修正完了' AS status;
