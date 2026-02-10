-- 地震発生デモSQL
-- SupabaseのSQL Editorで実行してください

-- ==========================================
-- シナリオ1: 東京都 震度5強 M6.5
-- ==========================================

-- 既存の地震情報を確認
SELECT * FROM disaster_status WHERE is_active = true;

-- 地震を発生させる
INSERT INTO disaster_status (is_active, disaster_type, message, activated_by)
VALUES (true, '地震', '東京都で地震が発生しました。最大震度5強、M6.5', 'デモシステム');

-- ==========================================
-- シナリオ2: 大阪府 震度6弱 M7.2
-- ==========================================

-- 地震を発生させる（より大きな地震）
INSERT INTO disaster_status (is_active, disaster_type, message, activated_by)
VALUES (true, '地震', '大阪府で地震が発生しました。最大震度6弱、M7.2', 'デモシステム');

-- ==========================================
-- シナリオ3: 北海道 震度5弱 M5.8
-- ==========================================

-- 地震を発生させる
INSERT INTO disaster_status (is_active, disaster_type, message, activated_by)
VALUES (true, '地震', '北海道で地震が発生しました。最大震度5弱、M5.8', 'デモシステム');

-- ==========================================
-- すべての地震を解除
-- ==========================================

UPDATE disaster_status
SET 
  is_active = false,
  deactivated_by = 'デモシステム',
  deactivated_at = NOW()
WHERE is_active = true;

-- ==========================================
-- 確認用クエリ
-- ==========================================

-- 現在アクティブな地震
SELECT * FROM disaster_status WHERE is_active = true ORDER BY created_at DESC;

-- 最近の地震履歴（直近10件）
SELECT * FROM disaster_status ORDER BY created_at DESC LIMIT 10;

-- すべてのデータを削除（テストデータクリーンアップ）
DELETE FROM disaster_status WHERE activated_by = 'デモシステム';
