-- user_profilesテーブルのtheme_mode制約を更新
-- 実行日: 2026-01-31
-- 目的: 古いテーマ名（world_trigger, eva）を新しい名前（cyber, neon）に変更

-- 既存のCHECK制約を削除
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_theme_mode_check;

-- 新しいCHECK制約を追加
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_theme_mode_check 
CHECK (theme_mode IN ('light', 'dark', 'joshi', 'cyber', 'neon'));

-- 既存データの更新（もし古いテーマ名が保存されていた場合）
UPDATE public.user_profiles 
SET theme_mode = 'cyber' 
WHERE theme_mode = 'world_trigger';

UPDATE public.user_profiles 
SET theme_mode = 'neon' 
WHERE theme_mode = 'eva';
