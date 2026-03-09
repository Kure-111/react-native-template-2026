# 地震情報監視サービス

P2PQuake JSON API v2から地震情報を取得し、震度5弱以上の地震を検知したら自動的にSupabaseに保存します。

## セットアップ

### 1. Supabaseテーブルの作成
Supabaseのダッシュボードで以下のSQLを実行:
```bash
docs/database/create_disaster_status_table.sql
```

### 2. サービスの起動
```bash
# 簡単起動
./START_EARTHQUAKE_MONITOR.sh

# または直接起動
npm run earthquake-monitor
```

## 機能

- **P2PQuake API v2** から最新の地震情報を取得
- **10秒ごと**に自動チェック
- **震度5弱以上**の地震を検知したら自動通知
- Supabaseの`disaster_status`テーブルに保存
- アプリ側は10秒ごとにポーリングして自動検知
- 重複通知を防止（既にアクティブな地震情報がある場合はスキップ）

## 動作フロー

```
1. P2PQuake API → 地震情報を10秒ごとに取得
   ↓
2. 震度5弱以上をフィルタリング
   ↓
3. Supabase に保存
   ↓
4. Webアプリが検知（10秒ごとのポーリング）
   ↓
5. 緊急モード自動発動 🚨
```

## 監視対象

| 震度 | 通知 |
|------|------|
| 震度1〜4 | ❌ 通知なし |
| 震度5弱 | ✅ 通知 |
| 震度5強 | ✅ 通知 |
| 震度6弱 | ✅ 通知 |
| 震度6強 | ✅ 通知 |
| 震度7 | ✅ 通知 |

## P2PQuake API v2

- エンドポイント: `https://api.p2pquake.net/v2/history`
- パラメータ: `codes=551` (地震情報)
- リミット: `limit=1` (最新1件のみ)
- ドキュメント: https://www.p2pquake.net/json_api_v2/

## ログ例

### 通常動作
```
🌍 P2PQuake 地震情報監視サービスを開始します
チェック間隔: 10秒
監視対象: 震度5弱以上の地震
地震情報をチェック中... 2026-02-10T12:00:00.000Z
地震情報なし
```

### 地震検知時
```
地震情報をチェック中... 2026-02-10T12:30:00.000Z
新しい地震情報を検出: { maxScale: 50, hypocenter: {...} }
⚠️ 震度5弱以上の地震を検出
災害情報を保存: 東京都で地震が発生しました。最大震度5強、M6.5
✅ 災害情報を保存しました: 東京都で地震が発生しました。最大震度5強、M6.5
```

## 常駐化（本番環境）

### PM2を使用
```bash
# PM2インストール
npm install -g pm2

# サービス起動
pm2 start src/services/earthquakeMonitor.js --name earthquake-monitor

# 自動起動設定
pm2 save
pm2 startup

# ステータス確認
pm2 status

# ログ確認
pm2 logs earthquake-monitor

# 停止
pm2 stop earthquake-monitor

# 削除
pm2 delete earthquake-monitor
```

## トラブルシューティング

### 環境変数エラー
`.env` ファイルに以下を設定:
```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### APIエラー
P2PQuake APIのステータスを確認:
```bash
curl "https://api.p2pquake.net/v2/history?codes=551&limit=1"
```

### データベースエラー
- Supabaseで`disaster_status`テーブルが作成されているか確認
- RLSポリシーが正しく設定されているか確認

## テスト方法

### 手動テスト
Supabaseで直接データを挿入してテスト:
```sql
INSERT INTO disaster_status (is_active, disaster_type, message, activated_by)
VALUES (true, '地震', 'テスト地震', 'Manual Test');
```

Webアプリで10秒以内に緊急モードが発動すれば成功です。

