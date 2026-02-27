-- エリアマスタ (area_locations) の追加と、既存ロケーションとの関連付け

-- 1. area_locations テーブルの作成
CREATE TABLE IF NOT EXISTS public.area_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (Row Level Security) の設定
ALTER TABLE public.area_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users on area_locations"
    ON public.area_locations FOR SELECT
    USING (true);

-- 2. サンプルデータの投入 (エリアマスタ)
-- 必要に応じて削除・追加してください
INSERT INTO public.area_locations (name) VALUES
    ('本キャンパス'),
    ('Eキャンパス'),
    ('11月ホール'),
    ('記念会館'),
    ('人工芝グラウンド'),
    ('実学ホール'),
    ('その他')
ON CONFLICT DO NOTHING;

-- 3. stall_locations に area_id を追加
ALTER TABLE public.stall_locations
ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.area_locations(id) ON DELETE SET NULL;

-- 4. event_locations に area_id を追加
ALTER TABLE public.event_locations
ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.area_locations(id) ON DELETE SET NULL;

-- ※ 既に存在する stall_locations や event_locations のデータに対しては、
-- この後 Supabase Dashboard などで手動で適切な area_id を割り当ててください。
