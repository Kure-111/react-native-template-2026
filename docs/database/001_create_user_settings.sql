-- ユーザー設定テーブルのマイグレーション
-- 実行日: 2026-01-30
-- 目的: テーマ設定機能のためのuser_settingsテーブルを作成

-- user_settings テーブルを作成
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_mode text NOT NULL DEFAULT 'light' CHECK (theme_mode IN ('light', 'dark', 'joshi', 'world_trigger', 'eva')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS (Row Level Security) を有効化
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の設定のみ参照可能
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分の設定のみ更新可能
CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ユーザーは自分の設定のみ挿入可能
CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- インデックスを作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON public.user_settings(updated_at);

-- updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- コメントを追加
COMMENT ON TABLE public.user_settings IS 'ユーザーごとの設定を保存するテーブル';
COMMENT ON COLUMN public.user_settings.user_id IS 'ユーザーID (auth.usersへの外部キー)';
COMMENT ON COLUMN public.user_settings.theme_mode IS 'テーマモード (light/dark/joshi/world_trigger/eva)';
COMMENT ON COLUMN public.user_settings.updated_at IS '最終更新日時';
