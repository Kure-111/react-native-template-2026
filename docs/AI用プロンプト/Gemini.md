# AI 開発ガイド

このプロジェクトを AI で開発する際の必須ルールです。

---

## 最初に必ず読むこと

### プロジェクト仕様書（最優先）

```
docs/プロジェクト仕様書.md
```

**コードを書く前に必ず確認してください。**

- プロジェクト概要
- 機能要件
- 画面設計
- データベース設計
- API 設計

---

## 基本情報

- **使用言語：** JavaScript（TypeScript ではない）
- **スタイリング：** StyleSheet
- **フロントエンド：** React Native (Expo)
- **バックエンド：** Supabase
- **その他：** Google Apps Script

---

## ファイル構造

```
project-root/
├── docs/
│   ├── プロジェクト仕様書.md
│   ├── AGENTS.md
│
├── src/
│   ├── features/              # 機能ごとにまとめる
│   │   └── 機能名/           # 例：auth, event, user など
│   │       ├── components/  # UI部品
│   │       ├── screens/     # 画面
│   │       ├── services/    # API通信
│   │       ├── hooks/       # カスタムフック
│   │       └── constants.js
│   │
│   ├── shared/              # 共通で使うもの
│   │   ├── components/     # 汎用コンポーネント
│   │   ├── hooks/          # 汎用フック
│   │   ├── utils/          # ヘルパー関数
│   │   ├── constants/      # 全体の定数
│   │   └── contexts/       # Context API
│   │
│   ├── navigation/         # ナビゲーション
│   ├── services/           # 共通サービス
│   │   ├── supabase/
│   │   │   └── client.js
│   │   └── gas/
│   │       └── gasApi.js
│   └── assets/             # 静的ファイル
│
├── .env.example
├── .gitignore
├── app.json
└── package.json
```

---

## コーディング規約

### ファイル命名

| 種類           | 形式         | 拡張子 | 例                |
| -------------- | ------------ | ------ | ----------------- |
| コンポーネント | PascalCase   | .jsx   | `EventCard.jsx`   |
| サービス       | camelCase    | .js    | `eventService.js` |
| フック         | useCamelCase | .js    | `useEvents.js`    |
| ユーティリティ | camelCase    | .js    | `validation.js`   |

### コメント規則

**全ての関数に JSDoc 形式の日本語コメントを書く**

**変数にもコメントを書く**

### 命名規則

**Supabase API に合わせる：**

- データ取得：`selectEvents`, `selectEventById`
- データ挿入：`insertEvent`
- データ更新：`updateUser`
- データ削除：`deleteEvent`

**変数：**

- 通常の変数：camelCase（例：`userName`, `eventList`）
- 定数：UPPER_SNAKE_CASE（例：`MAX_RETRY_COUNT`）
- ブール：is, has, can, should で始める（例：`isLoading`, `hasError`）

### スタイリング

**必ず StyleSheet を使用します。**

```jsx
// ✅ 正しい例
<View style={styles.container}>
  <Text style={styles.title}>タイトル</Text>
</View>

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});
```

---

## 開発の基本原則

### コード品質

- DRY 原則：重複を避ける
- 意味のある変数名・関数名を使う
- 小さな問題も放置せず、発見次第修正
- コメントは「なぜ」を説明、「何を」はコードで表現
- ボーイスカウトルール：コードを見つけた時よりも良い状態で残す

### エラーハンドリング

- エラーは必ず解決する（抑制しない）
- 早期にエラーを検出し、明確なエラーメッセージを提供
- 外部 API やネットワーク通信は必ず失敗する可能性を考慮
- try-catch でエラーを握りつぶさない

### セキュリティ

- API キー、パスワードは環境変数で管理（ハードコード禁止）
- すべての外部入力を検証
- 必要最小限の権限で動作
- 不要な依存関係を避ける

### パフォーマンス

- 推測ではなく計測に基づいて最適化
- 必要になるまでリソースの読み込みを遅延
- N+1 問題やオーバーフェッチを避ける

### 保守性

- 機能追加と同時に既存コードの改善を検討
- 使用されていないコードは積極的に削除
- 技術的負債は明示的にコメントに記録

---

## Git 運用

### コミットメッセージ

- コンベンショナルコミット形式を使用
- 形式：`[種類] 変更内容`
- 種類：`add`, `fix`, `update`, `remove`, `docs`

### コミットの原則

- コミットは原子的で、単一の変更に焦点を当てる
- 明確で説明的なメッセージを書く
- main/develop ブランチへの直接コミットは避ける

---

## 禁止事項

1. コメントなしのコード
2. 命名規則を無視
3. 仕様書を読まずに実装
4. エラーハンドリング省略
5. `var`の使用（`const`/`let`を使う）
6. マジックナンバー（定数化する）
7. TypeScript で書く（JavaScript のみ）
8. API キーやパスワードのハードコード
9. エラーの抑制（@ts-ignore や try-catch で握りつぶす）
10. 使用されていないコードの放置

---

## 依存関係の管理

- 本当に必要な依存関係のみを追加
- package-lock.json を必ずコミット
- 新しい依存関係追加前にライセンス、サイズ、メンテナンス状況を確認
- セキュリティパッチのため定期的に更新

---

## デバッグ

- 問題を確実に再現できる手順を確立
- 最近の変更から調査を開始
- 適切なツールを活用
- 調査結果と解決策を記録

---

**必ずプロジェクト仕様書を読んでから実装してください。**
