# Item10 実長システム

大学祭の実長（現場責任者）向けの統合管理システムです。

## 主な機能

### 1. 来場者人数カウンター機能
- 来場者数のリアルタイム表示（渉外部システムからのデータを表示）
- 時間帯別来場者数のグラフ表示
- 複数デバイスでのリアルタイム同期

### 2. 不審者情報管理機能
- 不審者情報の登録・閲覧
- 緊急度レベル設定（低・中・高）
- 写真アップロード機能（Google Drive連携）
- 通知ポップアップ表示

### 3. 天気情報表示機能
- 現在の天気情報表示
- 降水量（mm/h）表示
- 5分ごとの自動更新
- OpenWeatherMap API連携

### 4. デジタル時計
- 現在時刻と日付の表示
- 1秒ごとの自動更新

### 5. 緊急モード機能
- 自然災害発生時の緊急モード発動
- 災害種別選択（地震/台風/大雨・洪水/その他）
- 詳細メッセージ入力
- 通知ポップアップ表示
- 発動履歴の記録

### 6. 警備配置情報管理機能（未実装）
- 警備員の配置情報管理
- 無線チャンネル情報
- ※詳細仕様は今後検討

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env` ファイルを作成し、以下の環境変数を設定してください：

```
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenWeatherMap API
OPENWEATHERMAP_API_KEY=your_openweathermap_api_key
```

### 3. Supabase データベースセットアップ

`docs/database/item10_tables.sql` を Supabase の SQL Editor で実行してください。

```sql
-- 来場者カウントテーブル
-- 不審者情報テーブル
-- 緊急モード履歴テーブル
-- 警備員マスタ・配置テーブル
```

### 4. OpenWeatherMap API キーの取得

1. [OpenWeatherMap](https://openweathermap.org/) でアカウント作成
2. API Keys セクションから API キーを取得
3. `.env` ファイルに設定

### 5. アプリの起動

```bash
npm start
```

## ディレクトリ構造

```
src/features/item10/
├── components/          # UI コンポーネント
│   ├── VisitorCounter.jsx
│   ├── CountHistoryChart.jsx
│   ├── SuspiciousPersonCard.jsx
│   ├── SuspiciousPersonList.jsx
│   ├── DigitalClock.jsx
│   ├── WeatherInfo.jsx
│   ├── EmergencyModeToggle.jsx
│   ├── EmergencyTypeSelector.jsx
│   ├── EmergencyMessageInput.jsx
│   └── NotificationPopup.jsx
├── hooks/               # カスタムフック
│   ├── useVisitorCount.js
│   ├── useSuspiciousPersons.js
│   ├── useWeatherData.js
│   ├── useEmergencyMode.js
│   ├── useNotificationPopup.js
│   ├── useSecurityPlacements.js
│   └── useRealtimeSync.js
├── screens/             # 画面
│   └── Item10Screen.jsx
├── services/            # サービス層
│   ├── visitorCountService.js
│   ├── suspiciousPersonService.js
│   ├── weatherService.js
│   ├── emergencyService.js
│   ├── securityService.js
│   └── notificationService.js
└── constants.js         # 定数定義
```

## データベーステーブル

### visitor_counts
来場者カウント情報を管理

### suspicious_persons
不審者情報を管理（写真はGoogle Driveに保存）

### emergency_logs
緊急モード発動・解除履歴

### security_members
警備員マスタ情報（詳細仕様未定）

### security_placements
警備員配置情報（詳細仕様未定）

## 使用技術

- React Native (Expo)
- Supabase（データベース・リアルタイム同期）
- OpenWeatherMap API（天気情報）
- React Native Maps（位置情報表示）
- Google Drive API（写真保存、今後実装）

## 注意事項

### 未実装機能

1. **Google Drive 連携**
   - 不審者情報の写真アップロード機能は未実装
   - `suspiciousPersonService.js` の `create` 関数内で実装予定

2. **ERP 通知システム連携**
   - 通知送信機能は未実装
   - `notificationService.js` で将来的に実装予定

3. **警備配置情報管理**
   - 詳細仕様が未定のため、基本構造のみ実装
   - 今後の要件定義次第で拡張予定

### 来場者カウンター機能について

- 来場者数は**渉外部システムでカウントされたデータを表示するのみ**
- 本システムでのカウント操作機能は実装していません

### 緊急モードについて

- 緊急モードは**自然災害のみ**を対象としています
- 発動時は全員に通知が送信される想定です（通知機能は今後実装）
- 避難情報画面への自動切替機能も今後実装予定です

## トラブルシューティング

### 天気情報が取得できない場合

1. OpenWeatherMap API キーが正しく設定されているか確認
2. API キーが有効化されているか確認（登録後、数時間かかる場合があります）
3. 位置情報の緯度・経度が正しいか確認

### Supabase 接続エラー

1. `.env` ファイルの設定を確認
2. Supabase プロジェクトのステータスを確認
3. RLS（Row Level Security）ポリシーが正しく設定されているか確認

### リアルタイム同期が動作しない

1. Supabase の Realtime が有効化されているか確認
2. テーブルが Realtime Publication に追加されているか確認

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE visitor_counts;
```

## 開発者向け情報

### カスタムフックの使用方法

```javascript
import { useVisitorCount } from '../hooks/useVisitorCount';

const { count, history, loading, fetchCurrent, fetchHistory } = useVisitorCount();
```

### サービス層の呼び出し方

```javascript
import { suspiciousPersonService } from '../services/suspiciousPersonService';

const { data, error } = await suspiciousPersonService.getAll();
```

## ライセンス

MIT License
