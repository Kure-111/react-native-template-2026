# AI 用プロンプト

AI ツール向け設定ファイルの配置先ガイド。

## ツール別設定ファイル

各ファイルは自己完結型。外部参照に依存しない。

| ファイル | 対象ツール |
|---------|-----------|
| `.claude/CLAUDE.md` | Claude Code |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `.cursorrules` | Cursor |
| `.codex/instructions.md` | OpenAI Codex |
| `GEMINI.md` | Gemini Code Assist / CLI |

## 参照ドキュメント

| ファイル | 内容 |
|---------|------|
| `supabaseスキーマ参照.md` | 全49テーブルの詳細スキーマ（Claude Code + 人間用） |
| `docs/プロジェクト仕様書.md` | 機能要件・画面設計・DB設計・API設計 |
| `docs/開発ルール.md` | コーディング規約の詳細版（コード例付き） |

## 更新時の注意

- 5つのルールファイルは同一内容を維持する（CLAUDE.md のみ開発コマンド・スキーマ参照追加あり）
- ルール変更時は5ファイル全てを同時更新する
- セキュリティ設定（`.claude/settings.local.json`, `.codex/config.toml`）は別途管理
