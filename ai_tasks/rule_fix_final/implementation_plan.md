# ルール修正とドキュメント生成プロセスの正常化

ドキュメント生成が失敗する原因（Artifact保存パスの制約）を回避するため、`user_global` および `GEMINI.md` のルールを更新し、実際の動作を確認します。

## ユーザーレビューが必要な事項

- **`/home/sho16/.gemini/GEMINI.md` の最終確認**: ユーザー様により追記いただいた内容を、正式なMarkdown形式に整えます（`+-` 記号の除去など）。

## 提案される変更

### [MODIFY] [/home/sho16/.gemini/GEMINI.md](file:///home/sho16/.gemini/GEMINI.md)

現在混入しているDiff形式の記号を取り除き、クリーンな形式に修正します。

### [NEW] ai_tasks/rule_fix_final/

今回の調査と修正の全工程を記録します。
- `implementation_plan.md` (本ファイル)
- `task.md`
- `walkthrough.md`

## 検証計画

### 物理ファイルの存在確認
- `ls -R ai_tasks/rule_fix_final/` を実行し、全てのドキュメントが `IsArtifact: false` で物理的に書き込まれていることを確認します。
