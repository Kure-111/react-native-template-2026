# 実装計画：time_schedule_areas テーブルの完全廃止とクリーンアップ

`time_schedule_areas` テーブルがデータベースから削除され、`area_locations` への統合が完了したため、コード内に残存する古い参照やフォールバックロジックを整理し、ドキュメントを最新化します。

## 変更内容

### 1. フロントエンド：サービス層のクリーンアップ

#### [MODIFY] [timeScheduleService.js](file:///home/sho16/ikomasai-erp-2026/src/features/TimeSchedule/services/timeScheduleService.js)
- `buildAreaResolveMap` 関数: `candidates` から `area?.area_code` を除外。
- `selectEventScheduleSlots` 関数: `queryCandidates` から `area_name` を含む古い select 候補を削除（`area_id` に一本化）。
- `attachSourceDetailsToSlots` 関数: `areaId` の解決において `slot.area_id` を優先し、古い `area_code`/`area_name` への参照を削除。

---

### 2. ドキュメントの更新

#### [MODIFY] [プロジェクト仕様書_TimeSchedule.md](file:///home/sho16/ikomasai-erp-2026/docs/プロジェクト仕様書_TimeSchedule.md)
- データ要件セクション（4.2節）から `area_code` / `area_name` フォールバックに関する記述を削除。

#### [MODIFY] [Codex編集履歴.md](file:///home/sho16/ikomasai-erp-2026/docs/Codex編集履歴.md)
- `time_schedule_areas` の廃止と `area_locations` への統合完了を記録。
