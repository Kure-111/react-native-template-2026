-- Item10 実長システム用テーブル定義
-- Supabase で実行してください

-- 1. 来場者カウントテーブル
CREATE TABLE IF NOT EXISTS visitor_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count INTEGER NOT NULL,
  counted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  operation TEXT NOT NULL CHECK (operation IN ('increment', 'decrement', 'reset')),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_visitor_counts_counted_at ON visitor_counts(counted_at DESC);
CREATE INDEX idx_visitor_counts_updated_by ON visitor_counts(updated_by);

-- RLS (Row Level Security) 有効化
ALTER TABLE visitor_counts ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（全員が読み取り可能）
CREATE POLICY "visitor_counts_select_policy" ON visitor_counts
  FOR SELECT USING (true);

-- 挿入ポリシー（認証済みユーザーのみ）
CREATE POLICY "visitor_counts_insert_policy" ON visitor_counts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2. 不審者情報テーブル
CREATE TABLE IF NOT EXISTS suspicious_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location TEXT NOT NULL,
  description TEXT,
  urgency_level TEXT NOT NULL CHECK (urgency_level IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'resolved')) DEFAULT 'pending',
  photo_url TEXT,
  latitude FLOAT,
  longitude FLOAT,
  reported_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_suspicious_persons_discovered_at ON suspicious_persons(discovered_at DESC);
CREATE INDEX idx_suspicious_persons_urgency_level ON suspicious_persons(urgency_level);
CREATE INDEX idx_suspicious_persons_status ON suspicious_persons(status);

-- RLS 有効化
ALTER TABLE suspicious_persons ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（全員が読み取り可能）
CREATE POLICY "suspicious_persons_select_policy" ON suspicious_persons
  FOR SELECT USING (true);

-- 挿入ポリシー（認証済みユーザーのみ）
CREATE POLICY "suspicious_persons_insert_policy" ON suspicious_persons
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 更新ポリシー（認証済みユーザーのみ）
CREATE POLICY "suspicious_persons_update_policy" ON suspicious_persons
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 3. 緊急モード履歴テーブル
CREATE TABLE IF NOT EXISTS emergency_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN ('activate', 'deactivate')),
  activated_by UUID REFERENCES auth.users(id),
  emergency_type TEXT CHECK (emergency_type IN ('earthquake', 'typhoon', 'heavy_rain', 'other')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_emergency_logs_created_at ON emergency_logs(created_at DESC);
CREATE INDEX idx_emergency_logs_action ON emergency_logs(action);

-- RLS 有効化
ALTER TABLE emergency_logs ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（全員が読み取り可能）
CREATE POLICY "emergency_logs_select_policy" ON emergency_logs
  FOR SELECT USING (true);

-- 挿入ポリシー（認証済みユーザーのみ）
CREATE POLICY "emergency_logs_insert_policy" ON emergency_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. 警備員マスタテーブル（詳細仕様未定）
CREATE TABLE IF NOT EXISTS security_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  radio_channel TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS 有効化
ALTER TABLE security_members ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（全員が読み取り可能）
CREATE POLICY "security_members_select_policy" ON security_members
  FOR SELECT USING (true);

-- 5. 警備員配置情報テーブル（詳細仕様未定）
CREATE TABLE IF NOT EXISTS security_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_member_id UUID REFERENCES security_members(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('on_duty', 'break', 'moving')) DEFAULT 'on_duty',
  latitude FLOAT,
  longitude FLOAT,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_security_placements_member_id ON security_placements(security_member_id);
CREATE INDEX idx_security_placements_status ON security_placements(status);
CREATE INDEX idx_security_placements_start_time ON security_placements(start_time DESC);

-- RLS 有効化
ALTER TABLE security_placements ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（全員が読み取り可能）
CREATE POLICY "security_placements_select_policy" ON security_placements
  FOR SELECT USING (true);

-- 挿入・更新ポリシー（認証済みユーザーのみ）
CREATE POLICY "security_placements_insert_policy" ON security_placements
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "security_placements_update_policy" ON security_placements
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Realtime 有効化
ALTER PUBLICATION supabase_realtime ADD TABLE visitor_counts;
ALTER PUBLICATION supabase_realtime ADD TABLE suspicious_persons;
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE security_placements;

-- コメント追加
COMMENT ON TABLE visitor_counts IS '来場者カウント情報（渉外部システムからデータを取得して表示）';
COMMENT ON TABLE suspicious_persons IS '不審者情報管理（Google Drive連携で写真保存）';
COMMENT ON TABLE emergency_logs IS '緊急モード発動・解除履歴（自然災害のみ）';
COMMENT ON TABLE security_members IS '警備員マスタ情報（詳細仕様未定）';
COMMENT ON TABLE security_placements IS '警備員配置情報（詳細仕様未定）';
