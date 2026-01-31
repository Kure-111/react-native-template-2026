-- user_profilesテーブルにテーマ設定カラムを追加
-- 実行日: 2026-01-31
-- 目的: user_profilesテーブルでテーマ設定を管理

-- theme_mode カラムを追加
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS theme_mode text NOT NULL DEFAULT 'light' 
CHECK (theme_mode IN ('light', 'dark', 'joshi', 'cyber', 'neon'));

-- インデックスを作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_user_profiles_theme_mode ON public.user_profiles(theme_mode);

-- コメントを追加
COMMENT ON COLUMN public.user_profiles.theme_mode IS 'テーマモード (light/dark/joshi/cyber/neon)';
