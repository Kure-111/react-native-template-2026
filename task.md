# 企画者サポートページ 実装タスク

## 目的
`item16（企画者サポート）` を先に見た目から実装し、その後に Supabase の DB/サービスを接続する。

## 進捗（2026-02-11）
- [x] フェーズ1: UI雛形（下部タブ切替、4フォーム、企画名/企画場所ローカル保存）
- [x] フェーズ2: DB設計SQL追加（`docs/database/004_create_support_tickets.sql`）
- [x] フェーズ3: サービス層実装（`exhibitorSupportService`）
- [x] フェーズ4-1: UI送信処理をDB接続
- [x] フェーズ4-2: 自分の最近の連絡案件一覧（最小）
- [x] フェーズ5: Supabase本番データでの総合動作確認
  - 4カテゴリ（質問/緊急/鍵申請/開始報告）のINSERT確認
  - ticket_no必須不整合を修正
    - サービス側採番追加
    - DB側デフォルト採番追加（`docs/database/005_support_tickets_ticket_no_default.sql`）
  - 未認証（anon）INSERTがRLSで拒否されることを確認
  - 検証用データは削除済み

## 前提・制約
- 先に UI を完成させる（DB接続は後）
- 対象機能は以下の4つ
  - 質問系統
    - 企画のルール変更
    - 配置図の変更
    - 会計の商品配布基準の変更
    - 物品の破損報告（写真なし）
  - 緊急呼び出し
  - 鍵の事前申請
  - 企画の開始/終了報告
- 企画名・企画場所は保存できるようにする
- `src/shared` は編集しない

---

## フェーズ1: UI雛形（DB未接続）

### 1-1. 画面レイアウト（item16）
- `src/features/item16/screens/Item16Screen.jsx` を実装
- 上部: タイトル + 共通入力
  - 企画名
  - 企画場所
- 中央: 選択中機能の入力フォーム
- 下部: iOS風の切替UI（4ボタン）
  - 質問系統
  - 緊急呼び出し
  - 鍵の事前申請
  - 開始/終了報告

### 1-2. 各フォームの入力項目（UIのみ）
- 質問系統
  - 種別（ルール変更 / 配置図変更 / 会計配布基準変更 / 物品破損）
  - 詳細
- 緊急呼び出し
  - 緊急内容
  - 優先度（高固定でも可）
- 鍵の事前申請
  - 対象鍵・教室
  - 希望時刻
  - 理由
- 開始/終了報告
  - 開始 or 終了
  - メモ（任意）

### 1-3. 保存（UI段階）
- 企画名・企画場所はローカル保存（`AsyncStorage`）で保持
- 画面再表示時に復元

### 1-4. 完了条件
- 下部4ボタンでフォーム切替できる
- 企画名・企画場所が再起動後も保持される
- 送信ボタンはダミー動作（console/log または alert）

---

## フェーズ2: DB設計（Supabase）

### 2-1. 利用テーブル方針
- `support_tickets` を中心に利用（仕様書準拠）
- `ticket_type` を使って4機能を表現
  - `rule_question`
  - `emergency`
  - `key_preapply`
  - `start_report` / `end_report`

### 2-2. 必要カラム確認
- 最低限必要:
  - `ticket_type`
  - `title`
  - `description`
  - `priority`
  - `location_id`（またはテキスト運用の暫定項目）
  - `event_id`（開始/終了報告）
  - `created_by`
  - `org_id`
- 不足があれば migration 作成

### 2-3. RLS確認
- Exhibitor は自団体の案件のみ作成/閲覧できること
- HQ/Accounting/Property の閲覧範囲も仕様書に合わせる

---

## フェーズ3: サービス層実装

### 3-1. 新規サービス作成
- 追加先: `src/features/item16/services/exhibitorSupportService.js`
- 実装関数（案）
  - `createQuestionContact(payload)`
  - `createEmergencyContact(payload)`
  - `createKeyPreapply(payload)`
  - `createEventStatusReport(payload)` // 開始/終了

### 3-2. 入力バリデーション
- 必須項目チェック
- 種別ごとの入力ルールチェック
- エラーメッセージ統一

---

## フェーズ4: UIとDB接続

### 4-1. item16送信処理接続
- フォーム送信でサービスを呼ぶ
- 成功時:
  - 完了メッセージ表示
  - 必要項目リセット
- 失敗時:
  - エラー表示

### 4-2. 最低限の履歴表示
- 自分が送った案件の簡易一覧を追加（新着順）

---

## フェーズ5: 動作確認
- 4種別すべて送信できる
- 企画名・企画場所が保存/復元できる
- DBに正しい `ticket_type` で保存される
- RLS違反が出ない

---

## 実装順（着手順）
1. `item16` の iOS風下部切替UI
2. 企画名/企画場所のローカル保存
3. Supabaseテーブル/カラム/RLS確認
4. `exhibitorSupportService` 実装
5. 送信処理接続
6. 履歴表示（最小）

---

## 連絡回答フロー実装タスク（2026-02-11）

### 目的
- 質問/緊急などの連絡案件を、担当画面（本部・会計・物品）で閲覧できるようにする
- 担当者が連絡案件に回答できるようにする
- 回答内容を企画者（item16）側で確認できるようにする

### フェーズ
- [x] フェーズA: 共通サービス実装
  - `support_tickets` 一覧取得（本部/会計/物品向けフィルタ）
  - `ticket_messages` 一覧取得
  - `ticket_messages` 返信投稿
  - `support_tickets.ticket_status` 更新（対応中/解決済み）
- [x] フェーズB: 本部サポート（item13）実装
  - 本部対象案件一覧（`notify_target = hq` を中心）
  - 案件詳細表示
  - 回答投稿 + ステータス更新
- [x] フェーズC: 会計対応（item14）実装
  - 会計対象案件一覧（`notify_target = accounting`）
  - 案件詳細表示
  - 回答投稿 + ステータス更新
- [x] フェーズD: 物品対応（item15）実装
  - 物品対象案件一覧（`notify_target = property`）
  - 案件詳細表示
  - 回答投稿 + ステータス更新
- [x] フェーズE: 企画者サポート（item16）回答閲覧実装
  - 自分が送信した案件を選択
  - 対応メッセージ（回答）スレッド表示
  - ステータス表示（新規/対応中/解決済み）
- [x] フェーズF: 動作確認
  - ビルド確認
  - 質問→担当回答→企画者表示の往復確認

### 制約
- `src/shared` は編集しない
