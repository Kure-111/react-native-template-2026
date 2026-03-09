-- 企画・屋台一覧機能: 場所（Location）マスタの分離用SQLスクリプト

-- 1. stall_locations (屋台場所) テーブルの作成
CREATE TABLE IF NOT EXISTS stall_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (Row Level Security) 有効化
ALTER TABLE stall_locations ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（全員が読み取り可能）
CREATE POLICY "stall_locations_select_policy" ON stall_locations
  FOR SELECT USING (true);

-- 挿入・更新ポリシー（認証済みユーザーのみ）
CREATE POLICY "stall_locations_insert_policy" ON stall_locations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "stall_locations_update_policy" ON stall_locations
  FOR UPDATE USING (auth.role() = 'authenticated');


-- 2. event_locations (企画場所) テーブルの作成
CREATE TABLE IF NOT EXISTS event_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (Row Level Security) 有効化
ALTER TABLE event_locations ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（全員が読み取り可能）
CREATE POLICY "event_locations_select_policy" ON event_locations
  FOR SELECT USING (true);

-- 挿入・更新ポリシー（認証済みユーザーのみ）
CREATE POLICY "event_locations_insert_policy" ON event_locations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "event_locations_update_policy" ON event_locations
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 2.5 既存のlocationsテーブルからのデータ移行（外部キーエラー回避のため）
INSERT INTO stall_locations (id, name, created_at, updated_at)
SELECT id, name, created_at, updated_at FROM locations
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_locations (id, name, created_at, updated_at)
SELECT id, name, created_at, updated_at FROM locations
ON CONFLICT (id) DO NOTHING;


-- 3. stalls テーブルのFK更新 (既存の location_id 外部キーを削除し、stall_locations に張り替える)
ALTER TABLE stalls DROP CONSTRAINT IF EXISTS stalls_location_id_fkey;
ALTER TABLE stalls ADD CONSTRAINT stalls_location_id_fkey FOREIGN KEY (location_id) REFERENCES stall_locations(id);

-- 4. events テーブルのFK更新 (既存の location_id 外部キーを削除し、event_locations に張り替える)
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_location_id_fkey;
ALTER TABLE events ADD CONSTRAINT events_location_id_fkey FOREIGN KEY (location_id) REFERENCES event_locations(id);

-- 5. (オプション) 初期データの投入
INSERT INTO stall_locations (name, display_order) VALUES
  ('1号館前', 1),
  ('3号館前', 2),
  ('11号館前', 3),
  ('記念会館前', 4);

INSERT INTO event_locations (name, display_order) VALUES
  ('B館', 1),
  ('11号館', 2),
  ('記念会館', 3),
  ('屋外ステージ', 4);
