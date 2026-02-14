-- disaster_status テーブルの作成
-- 外部から災害情報を登録し、アプリが自動検知するためのテーブル

CREATE TABLE IF NOT EXISTS disaster_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  disaster_type TEXT NOT NULL,
  message TEXT,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_by TEXT,
  deactivated_by TEXT,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_disaster_status_is_active ON disaster_status(is_active);
CREATE INDEX idx_disaster_status_created_at ON disaster_status(created_at DESC);

-- RLS (Row Level Security) 有効化
ALTER TABLE disaster_status ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（全員が読み取り可能）
CREATE POLICY "disaster_status_select_policy" ON disaster_status
  FOR SELECT USING (true);

-- 挿入ポリシー（認証済みユーザーのみ）
CREATE POLICY "disaster_status_insert_policy" ON disaster_status
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 更新ポリシー（認証済みユーザーのみ）
CREATE POLICY "disaster_status_update_policy" ON disaster_status
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Realtime 有効化（リアルタイム更新を有効にする場合）
ALTER PUBLICATION supabase_realtime ADD TABLE disaster_status;

-- コメント追加
COMMENT ON TABLE disaster_status IS '災害状態管理テーブル - 外部APIから災害情報を登録し、アプリが自動検知する';
COMMENT ON COLUMN disaster_status.is_active IS '災害が現在発生中かどうか';
COMMENT ON COLUMN disaster_status.disaster_type IS '災害の種類（地震、台風、豪雨など）';
COMMENT ON COLUMN disaster_status.message IS '災害の詳細メッセージ';
COMMENT ON COLUMN disaster_status.activated_at IS '災害発生日時';
COMMENT ON COLUMN disaster_status.activated_by IS '登録者（システムまたはユーザー名）';
COMMENT ON COLUMN disaster_status.deactivated_by IS '解除者';
COMMENT ON COLUMN disaster_status.deactivated_at IS '解除日時';
