# Item10 データベースセットアップガイド

## item10_tables.sql の用途

このSQLファイルは、**Item10実長システムで使用するSupabaseデータベースのテーブルを作成**するためのものです。

## 📊 含まれるテーブル

### 1. visitor_counts（来場者カウント）
**用途**: 来場者数を記録・管理
- リアルタイムでカウント数を保存
- 時間帯別の履歴を記録
- 複数デバイスで同期可能

**データ例**:
```
id: uuid
count: 1523（現在の来場者数）
counted_at: 2026-02-08 15:30:00
operation: 'increment'
```

### 2. suspicious_persons（不審者情報）
**用途**: 不審者情報の登録・管理
- 発見場所・時刻を記録
- 緊急度レベル設定（低・中・高）
- 対応状況の管理
- 写真URLの保存（Google Drive連携予定）

**データ例**:
```
location: '正面ゲート付近'
urgency_level: 'high'
status: 'pending'
description: '不審な行動を確認'
```

### 3. emergency_logs（緊急モード履歴）
**用途**: 緊急モードの発動・解除履歴
- 自然災害時の対応記録
- 発動者・時刻の記録
- 災害種別の保存

**データ例**:
```
action: 'activate'
emergency_type: 'earthquake'
reason: '震度5強の地震発生'
```

### 4. security_members（警備員マスタ）
**用途**: 警備員の基本情報管理
- 名前・連絡先
- 無線チャンネル情報

### 5. security_placements（警備配置情報）
**用途**: 警備員の配置状況管理
- リアルタイム位置情報
- 配置エリア
- 勤務状態

## 🚀 使用手順

### ステップ1: Supabaseプロジェクトを開く

1. [Supabase](https://supabase.com/)にログイン
2. プロジェクトを選択
3. 左側メニューから「SQL Editor」を開く

### ステップ2: SQLファイルを実行

1. 「New query」をクリック
2. `item10_tables.sql` の内容をコピー
3. SQL Editorに貼り付け
4. 「Run」ボタンをクリック

または、ファイルをアップロード：
1. SQL Editor画面で「Upload SQL」
2. `item10_tables.sql` を選択
3. 実行

### ステップ3: テーブル作成の確認

1. 左側メニューから「Table Editor」を開く
2. 以下のテーブルが作成されていることを確認：
   - visitor_counts
   - suspicious_persons
   - emergency_logs
   - security_members
   - security_placements

### ステップ4: Realtimeを有効化

各テーブルでリアルタイム同期を有効化（SQLで自動設定済み）：
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE visitor_counts;
ALTER PUBLICATION supabase_realtime ADD TABLE suspicious_persons;
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE security_placements;
```

## 🔒 セキュリティ設定（RLS）

すべてのテーブルに**Row Level Security（RLS）**が設定されています：

### 読み取り
- ✅ **全員が可能**（認証不要）
- 理由: 現場で誰でも情報を確認できる必要がある

### 書き込み
- ✅ **認証済みユーザーのみ**
- 理由: データの改ざん防止

## 📝 データ操作例

### 来場者数を記録

```javascript
// JavaScriptでの実装例
const { data, error } = await supabase
  .from('visitor_counts')
  .insert({
    count: 1500,
    operation: 'increment',
  });
```

### 不審者情報を登録

```javascript
const { data, error } = await supabase
  .from('suspicious_persons')
  .insert({
    location: '正面ゲート',
    urgency_level: 'high',
    status: 'pending',
    description: '不審な行動を確認',
  });
```

### 緊急モードを発動

```javascript
const { data, error } = await supabase
  .from('emergency_logs')
  .insert({
    action: 'activate',
    emergency_type: 'earthquake',
    reason: '震度5強の地震発生',
  });
```

## 🔄 リアルタイム同期

Supabase Realtimeを使用して、複数デバイスで自動同期：

```javascript
// 来場者数の変更をリアルタイムで監視
const subscription = supabase
  .channel('visitor_counts')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'visitor_counts' 
  }, (payload) => {
    console.log('来場者数が更新されました:', payload);
    // UIを更新
  })
  .subscribe();
```

## 🗑️ テーブルの削除（必要な場合）

すべてのテーブルを削除して再作成する場合：

```sql
-- 注意: すべてのデータが削除されます
DROP TABLE IF EXISTS visitor_counts CASCADE;
DROP TABLE IF EXISTS suspicious_persons CASCADE;
DROP TABLE IF EXISTS emergency_logs CASCADE;
DROP TABLE IF EXISTS security_members CASCADE;
DROP TABLE IF EXISTS security_placements CASCADE;

-- その後、item10_tables.sql を再実行
```

## 📊 テーブル構造の確認

```sql
-- visitor_countsの構造を確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'visitor_counts';

-- すべてのテーブルを一覧表示
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

## 🎯 まとめ

このSQLファイルは：

1. **データベーステーブルを自動作成**
   - 手動でテーブルを作る必要なし
   - 一度実行するだけでOK

2. **セキュリティを自動設定**
   - RLS（Row Level Security）
   - 適切なアクセス権限

3. **リアルタイム同期を有効化**
   - 複数デバイスで自動同期
   - データ変更を即座に反映

4. **インデックスで高速化**
   - クエリパフォーマンス向上
   - 大量データでも快適

## ⚠️ 注意事項

- **一度だけ実行**: 既にテーブルが存在する場合はエラーになりません（`IF NOT EXISTS`）
- **本番環境**: テスト後に本番環境で実行してください
- **バックアップ**: 既存データがある場合は必ずバックアップを取ってください

## 🔗 関連ドキュメント

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)
- [Item10 README](../../src/features/item10/README.md)
