# GitHub運用ルール

## Git運用

### ブランチ戦略

#### ブランチの種類

- **main:** 本番環境（常に安定した状態）
- **develop:** 開発環境（最新の開発コード）
- **feature/xxx:** 機能開発ブランチ
- **fix/xxx:** バグ修正ブランチ
- **hotfix/xxx:** 緊急修正ブランチ

#### ブランチ命名規則

```
feature/[機能名]
fix/[修正内容]
hotfix/[緊急修正内容]
```

**例:**

- `feature/user-authentication`
- `feature/event-list`
- `fix/login-validation`
- `hotfix/crash-on-startup`

---

## コミットメッセージ

### フォーマット

コンベンショナルコミット形式を使用します。

```
[種類] 変更内容

詳細な説明（オプション）
```

### コミットの種類

| 種類   | 説明                             | 例                              |
| ------ | -------------------------------- | ------------------------------- |
| add    | 新機能追加                       | `[add] ユーザー認証機能を追加`  |
| fix    | バグ修正                         | `[fix] ログイン時のエラーを修正` |
| update | 既存機能の更新・改善             | `[update] イベント一覧のUI改善` |
| remove | 機能やファイルの削除             | `[remove] 未使用のコンポーネント削除` |
| docs   | ドキュメントのみの変更           | `[docs] READMEを更新`           |
| style  | コードの意味に影響しない変更     | `[style] コードフォーマット適用` |
| refactor | リファクタリング                | `[refactor] イベントサービスを整理` |
| test   | テストの追加・修正               | `[test] ログイン機能のテスト追加` |
| chore  | ビルドプロセスや補助ツールの変更 | `[chore] 依存関係を更新`        |

### コミットメッセージの例

```
[add] カウンター機能を追加

カウントアップ・カウントダウン・リセット機能を実装しました。
```

```
[fix] カウントが負の数にならないように修正

カウントダウン時に0未満にならないようにガードを追加しました。
```

---

## コミットの原則

### 原子的なコミット

- **1つのコミットは1つの変更に焦点を当てる**
- 複数の機能を同時にコミットしない

**❌ 悪い例:**
```
[add] ログイン機能とイベント一覧機能を追加
```

**✅ 良い例:**
```
[add] ログイン機能を追加
[add] イベント一覧機能を追加
```

### 明確で説明的なメッセージ

- 何を変更したかが一目でわかるように
- 日本語で簡潔に記述

### ブランチへのコミット

- **main/developブランチへの直接コミットは避ける**
- 必ずfeature/fixブランチを作成してから作業

---

## プルリクエスト（PR）

### PRのタイトル

コミットメッセージと同じ形式を使用します。

```
[種類] 変更内容
```

**例:**
```
[add] ユーザー認証機能
```

### PRの説明テンプレート

```markdown
## 概要
この変更の概要を記述

## 変更内容
- 変更点1
- 変更点2
- 変更点3

## テスト
テストした内容を記述

## スクリーンショット（該当する場合）
画像を添付

## 関連Issue
closes #123
```

### PRのレビュー

1. **コードレビューは必須**
2. **最低1人の承認が必要**
3. **CIが通過していること**
4. **コンフリクトが解消されていること**

---

## マージ戦略

### マージ方法

- **Squash and Merge:** feature -> develop
- **Merge Commit:** develop -> main

### マージ後の処理

1. マージ済みのブランチは削除
2. ローカルブランチも削除

```bash
git branch -d feature/xxx
git push origin --delete feature/xxx
```

---

## ワークフロー

### 新機能開発

1. developブランチから最新コードを取得

```bash
git checkout develop
git pull origin develop
```

2. 機能ブランチを作成

```bash
git checkout -b feature/xxx
```

3. 開発・コミット

```bash
git add .
git commit -m "[add] 機能名"
```

4. リモートにプッシュ

```bash
git push origin feature/xxx
```

5. PRを作成

6. レビュー・承認後にマージ

7. ブランチを削除

```bash
git branch -d feature/xxx
git push origin --delete feature/xxx
```

---

## バグ修正

1. developブランチから修正ブランチを作成

```bash
git checkout develop
git checkout -b fix/xxx
```

2. 修正・コミット

```bash
git add .
git commit -m "[fix] 修正内容"
```

3. PRを作成してマージ

---

## 緊急修正（Hotfix）

1. mainブランチからhotfixブランチを作成

```bash
git checkout main
git checkout -b hotfix/xxx
```

2. 修正・コミット

```bash
git add .
git commit -m "[hotfix] 緊急修正内容"
```

3. mainとdevelopの両方にマージ

---

## .gitignoreの管理

### 必ず除外するもの

```
# 環境変数
.env
.env.local

# 依存関係
node_modules/

# ビルド成果物
dist/
build/

# OS固有
.DS_Store
Thumbs.db

# IDE設定
.vscode/
.idea/

# Expo
.expo/
```

---

## まとめ

このGitHubルールに従って、チーム全体で一貫した開発フローを維持してください。
