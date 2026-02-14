# 🌍 地震発生デモ手順

地震が発生した時のシステム動作をテストする方法です。

## 方法1: SQLで直接実行（推奨）

### ステップ1: RLSポリシーを修正

Supabase SQL Editorで以下を実行：

```sql
-- 挿入権限を修正
DROP POLICY IF EXISTS "disaster_status_insert_policy" ON disaster_status;

CREATE POLICY "disaster_status_insert_policy" ON disaster_status
  FOR INSERT WITH CHECK (true);
```

### ステップ2: 地震を発生させる

以下のSQLを実行：

```sql
-- シナリオ1: 東京都 震度5強
INSERT INTO disaster_status (is_active, disaster_type, message, activated_by)
VALUES (true, '地震', '東京都で地震が発生しました。最大震度5強、M6.5', 'デモシステム');
```

### ステップ3: Webアプリで確認

**10秒以内**に以下が発生します：
1. 🚨 緊急モードが自動発動
2. 画面が赤色に変わる
3. 「地震: 東京都で地震が発生しました...」と表示
4. アイコンが脈打つアニメーション

### ステップ4: 地震を解除

```sql
UPDATE disaster_status
SET 
  is_active = false,
  deactivated_by = 'デモシステム',
  deactivated_at = NOW()
WHERE is_active = true;
```

**10秒以内**に緊急モードが解除されます。

---

## 方法2: 用意されたSQLファイルを使用

### 地震を発生させる

`docs/database/earthquake_demo.sql` を開き、以下のいずれかを実行：

```sql
-- シナリオ1: 東京都 震度5強 M6.5
INSERT INTO disaster_status (is_active, disaster_type, message, activated_by)
VALUES (true, '地震', '東京都で地震が発生しました。最大震度5強、M6.5', 'デモシステム');

-- シナリオ2: 大阪府 震度6弱 M7.2（より大きな地震）
INSERT INTO disaster_status (is_active, disaster_type, message, activated_by)
VALUES (true, '地震', '大阪府で地震が発生しました。最大震度6弱、M7.2', 'デモシステム');

-- シナリオ3: 北海道 震度5弱 M5.8
INSERT INTO disaster_status (is_active, disaster_type, message, activated_by)
VALUES (true, '地震', '北海道で地震が発生しました。最大震度5弱、M5.8', 'デモシステム');
```

### 地震を解除

```sql
UPDATE disaster_status
SET 
  is_active = false,
  deactivated_by = 'デモシステム',
  deactivated_at = NOW()
WHERE is_active = true;
```

---

## 確認用クエリ

### 現在アクティブな地震を確認
```sql
SELECT * FROM disaster_status WHERE is_active = true;
```

### 地震履歴を確認
```sql
SELECT * FROM disaster_status ORDER BY created_at DESC LIMIT 10;
```

### テストデータをクリーンアップ
```sql
DELETE FROM disaster_status WHERE activated_by = 'デモシステム';
```

---

## 📱 期待される動作

### 地震発生時（INSERT実行後）
- **0-10秒後**: Webアプリが自動検知
- 緊急モードカードが赤色に
- アイコンが脈打つアニメーション
- 「🚨 発動中」表示
- 災害情報カードに詳細表示
- 「全スタッフに緊急通知が送信されました」バナー

### 地震解除時（UPDATE実行後）
- **0-10秒後**: Webアプリが自動検知
- 緊急モードカードが通常色に
- 「✓ 待機中」表示
- 災害情報カードが消える

---

## トラブルシューティング

### 地震が発生しない
1. Webアプリが起動しているか確認
2. ブラウザのコンソールでエラーを確認
3. Supabaseの接続を確認

### 地震が解除されない
```sql
-- 強制的にすべて解除
UPDATE disaster_status SET is_active = false WHERE is_active = true;
```

### RLSエラーが出る
```sql
-- docs/database/fix_disaster_status_rls.sql を実行
```

---

## 注意事項

⚠️ これはデモ機能です。本番環境では使用しないでください。
⚠️ P2PQuake API監視サービスは常時動作させておく必要があります。
⚠️ データベースに直接アクセスするため、慎重に実行してください。
