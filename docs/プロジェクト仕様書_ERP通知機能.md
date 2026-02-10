# プロジェクト仕様書 — ERP 通知機能（テスト用UI含む）

最終更新日: 2026/02/09

---

## 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [対象ユーザー](#対象ユーザー)
3. [機能要件](#機能要件)
4. [画面設計](#画面設計)
5. [データベース設計](#データベース設計)
6. [API 設計](#api設計)
7. [非機能要件](#非機能要件)
8. [使用技術](#使用技術)
9. [セキュリティ設計](#セキュリティ設計)

---

## プロジェクト概要

### 目的

- 管理者が「ロールを選択 → 通知本文を入力 → 送信」して、そのロールに属するユーザーへ通知を送信できるテスト用機能を提供する。
- 将来的に内部 API / バッチ処理等から呼べる共通の通知サービスを `src/shared` 以下に配置し、再利用可能な構成にする。
- 既存DBの不明点が多いため、通知機能に必要なテーブルは新規で定義する。

### スケジュール

- 開発開始：2026/02/09
- リリース予定：未定（テスト用のため段階リリース）

---

## 対象ユーザー

### 管理者

- **いつ使うか：** テスト期間中（通知機能の動作確認時）
- **どういうときに使うか：** ロールまたは個別ユーザーに対して通知を送信し、DB 保存やUIの挙動を確認したいとき

### 一般ユーザー

- **いつ使うか：** 通知が送信されたとき
- **どういうときに使うか：** 通知一覧画面で内容を確認するとき

---

## 機能要件

### 1. 通知送信機能（テスト用）

**概要：**
管理者が対象（個人 / ロール）を選択し、通知タイトルと本文を入力して送信できる。

**詳細仕様：**

- 対象タイプは「個人」「ロール」から選択可能（全員送信は当面なし）。
- ロール選択時は `roles` テーブルから一覧を取得して表示する。
- 個人送信は `user_id` を指定して送信する（同名ユーザーがいるため名前一致は使用しない）。
- 送信時に `notifications` と `notification_recipients` にレコードを作成する。
- 送信後に通知IDと送信先件数を表示する。
- 失敗時はエラーメッセージを表示する。
- タイトルは必須。

---

### 2. 通知一覧表示機能

**概要：**
ユーザーが自分宛ての通知一覧を閲覧できる。

**詳細仕様：**

- 画面右上のベルアイコンから通知一覧画面へ遷移する。
- 未読は強調表示する。
- 通知を開いたら `read_at` を更新する。
- 一覧は作成日時の降順で表示する。

---

### 3. 通知サービス（共通ロジック）

**概要：**
通知送信ロジックを `src/shared/services/notificationService.js` に集約し、UI・API・バッチから再利用可能にする。

**詳細仕様：**

- `getRoles()` でロール一覧を取得可能。
- `getUsersByRole(roleId)` で対象ユーザーを取得可能。
- `sendNotificationToUser / sendNotificationToRole` を提供する。
- 将来的に配信エンジン（メール / プッシュ / In-app）と連携できる構成とする。

---

## 画面設計

### 1. テスト通知画面

**画面名:** TestNotificationForm
**パス/識別子:** `/admin/test-notification`

**表示項目:**

- 対象タイプ（ラジオ: 個人 / ロール）
- 対象選択（個人: ユーザー検索 / ロール: ドロップダウン）
- 通知概要（title）※必須
- 通知本文（body）
- 追加情報（metadata: JSON 入力、任意）
- 送信ボタン（確認ダイアログ付き）

**動作:**

1. 画面表示時に `roles` を取得し、ドロップダウンを生成
2. ユーザーが対象・タイトル・本文・オプションを入力
3. 送信ボタンを押下
4. 成功 → 通知IDと送信件数を表示
5. 失敗 → エラーメッセージを表示

---

### 2. 通知一覧画面

**画面名:** NotificationList
**パス/識別子:** `/notifications`

**表示項目:**

- 通知タイトル
- 通知本文（短縮表示）
- 未読表示
- 作成日時

**動作:**

1. 画面表示時に自分宛ての通知一覧を取得
2. 未読は強調表示
3. 通知をタップすると詳細表示（または展開）
4. タップ時に `read_at` を更新

---

### 3. ヘッダー（ベルアイコン）

**仕様:**

- 既存ヘッダーの右上にベルアイコンを配置する。
- クリック/タップで通知一覧画面に遷移。

---

## データベース設計

### テーブル一覧

| テーブル名 | 説明 |
| ---------- | ---- |
| notifications | 通知マスタ |
| notification_recipients | 通知受信者 |

---

### notifications テーブル

**説明:** 通知の基本情報を管理

| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | uuid | PK | 通知ID |
| sender_user_id | uuid | NULL | 送信者ユーザーID（管理者） |
| title | text | NOT NULL | 通知タイトル |
| body | text | NOT NULL | 通知本文 |
| metadata | jsonb | DEFAULT '{}' | 追加情報 |
| created_at | timestamptz | NOT NULL | 作成日時 |

**リレーション:**

- `notifications.id` → `notification_recipients.notification_id`

---

### notification_recipients テーブル

**説明:** 通知の受信者情報を管理

| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | uuid | PK | 受信者ID |
| notification_id | uuid | NOT NULL, FK | 通知ID |
| user_id | uuid | NOT NULL | 受信者ユーザーID |
| read_at | timestamptz | NULL | 既読日時 |
| created_at | timestamptz | NOT NULL | 作成日時 |

**リレーション:**

- `notification_recipients.user_id` は `auth.users.id` を参照

---

### マイグレーション（作成用SQL）

```sql
-- filepath: db/migrations/20260209_create_notifications.sql
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id uuid NULL,
  title text NOT NULL,
  body text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_id
  ON notification_recipients (user_id);
```

---

## API 設計

### 1. 通知サービス（内部呼び出し）

**アクセス方法:**
UI から `src/shared/services/notificationService.js` を呼び出す。

**主な関数:**

- `getRoles()`
- `getUsersByRole(roleId)`
- `sendNotificationToUser(userId, title, body, metadata)`
- `sendNotificationToRole(roleId, title, body, metadata)`
- `getNotificationsForUser(userId)`
- `markNotificationRead(notificationRecipientId)`

**注意:**
全員送信は当面実装しない。

---

## 非機能要件

### パフォーマンス

- 通知送信の UI 操作は 3 秒以内に完了することを目標とする。
- 通知一覧取得は 1 秒以内を目標とする。

### 可用性

- テスト期間中は簡易運用（DB への保存確認が優先）

### スケーラビリティ

- 送信対象が大量になる場合はサーバー側でバッチ処理へ移行する。

### 対応環境

- **iOS:** 15.0 以上
- **Android:** Android 10 以上

---

## 使用技術

### フロントエンド

- **React Native (Expo)**
  - 管理画面（テスト UI）と通知一覧画面を提供

### バックエンド

- **Supabase**
  - PostgreSQL データベース
  - 認証機能
  - RLS 設定

---

## セキュリティ設計

### 認証・認可

- 管理者のみがテスト通知画面にアクセス可能な設計とする。
- 送信処理は信頼できる環境で行うことを推奨（サービスロール or サーバー側）。

### データ保護

- **通信:** HTTPS のみ
- **API キー管理:** 環境変数（`.env`）で管理
- **RLS:** `notifications` / `notification_recipients` は管理者・サービスロールのみ書き込み可能にする

---

## 更新履歴

| 日付 | バージョン | 更新内容 | 更新者 |
| --- | --- | --- | --- |
| 2026/02/09 | 1.0 | 初版作成 | - |