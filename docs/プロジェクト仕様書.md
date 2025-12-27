# プロジェクト仕様書

## プロジェクト概要

このプロジェクトは、React Native Expo テンプレートです。
ここからフォークして新しいプロジェクトを開発できるように設計されています。

### 技術スタック

- **フロントエンド:** React Native (Expo)
- **バックエンド:** Supabase
- **その他:** Google Apps Script（必要に応じて）
- **使用言語:** JavaScript（TypeScript ではない）

---

## デモアプリ

テンプレートには、シンプルなカウンターアプリが含まれています。

### 機能

- カウントアップボタン
- カウントダウンボタン
- リセットボタン
- カウント値の表示

---

## ディレクトリ構造

```
project-root/
├── docs/                                # ドキュメント
│   ├── プロジェクト仕様書.md
│   ├── 開発ルール.md
│   ├── GitHubルール.md
│   └── AI用プロンプト/
│       ├── copilot-instructions.md
│       ├── AGENTS.md
│       ├── claude.md
│       └── Gemini.md
│
├── src/
│   ├── features/                        # 機能ごとにまとめる
│   │   └── counter/                     # カウンター機能（デモ）
│   │       ├── components/            # UI部品
│   │       ├── screens/               # 画面
│   │       ├── hooks/                 # カスタムフック
│   │       └── constants.js           # 定数
│   │
│   ├── shared/                         # 共通で使うもの
│   │   ├── components/                # 汎用コンポーネント
│   │   ├── hooks/                     # 汎用フック
│   │   ├── utils/                     # ユーティリティ関数
│   │   ├── constants/                 # 全体の定数
│   │   └── contexts/                  # Context API
│   │
│   ├── navigation/                     # ナビゲーション
│   ├── services/                       # 共通サービス
│   │   ├── supabase/
│   │   │   └── client.js
│   │   └── gas/
│   │       └── gasApi.js
│   └── assets/                         # 静的ファイル
│
├── supabase/                           # Supabase設定
├── gas/                                # Google Apps Script
├── .claude/                            # Claude Code設定
│   └── CLAUDE.md
├── .env.example
├── .gitignore
├── app.json
├── package.json
└── README.md
```

---

## 機能要件

### デモアプリ（カウンター）

1. **カウント表示**
   - 現在のカウント値を大きく表示

2. **カウントアップ**
   - ボタンをタップでカウント+1

3. **カウントダウン**
   - ボタンをタップでカウント-1

4. **リセット**
   - カウントを0に戻す

---

## 画面設計

### ホーム画面

- カウント値の表示（大きなフォント）
- カウントアップボタン（+ ボタン）
- カウントダウンボタン（- ボタン）
- リセットボタン

---

## データベース設計

テンプレートとしてSupabase接続の設定のみ含めます。
実際のテーブル設計は、フォーク後のプロジェクトで定義してください。

---

## API 設計

テンプレートとしてSupabase clientとGAS APIの基本設定を含めます。
実際のAPI設計は、フォーク後のプロジェクトで定義してください。

---

## 開発の進め方

1. このテンプレートをフォーク
2. プロジェクト名を変更
3. Supabase プロジェクトを作成し、環境変数を設定
4. 必要に応じてデータベース設計
5. 機能を追加開発

---

## セットアップ手順

1. リポジトリをクローン
   ```bash
   git clone [repository-url]
   cd react-native-expo-template-2026
   ```

2. 依存関係をインストール
   ```bash
   npm install
   ```

3. 環境変数を設定
   ```bash
   cp .env.example .env
   # .env ファイルを編集してSupabaseの認証情報を設定
   ```

4. アプリを起動
   ```bash
   npm start
   ```

---

## ライセンス

MIT License
