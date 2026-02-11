-- disaster_status テーブルのRLS（Row Level Security）ポリシーを修正
-- 挿入権限を緩和して、認証なしでも挿入できるようにします（開発環境用）

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "disaster_status_insert_policy" ON disaster_status;

-- 新しいポリシーを作成（誰でも挿入可能）
CREATE POLICY "disaster_status_insert_policy" ON disaster_status
  FOR INSERT WITH CHECK (true);

-- または、既存のポリシーを更新
ALTER POLICY "disaster_status_insert_policy" ON disaster_status
  USING (true) WITH CHECK (true);

-- 確認
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'disaster_status';
