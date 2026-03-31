# タイムスケジュールの運用終了時間の変更 (22:00 -> 20:00)

タイムスケジュール画面の運用終了時間を、現在の 22:00 から 20:00 に短縮します。

## ユーザーレビューが必要な事項
- 特になし。運用時間の短縮のみを目的としています。

## 変更内容

### タイムスケジュール機能

#### [MODIFY] [timeScheduleService.js](file:///home/sho16/ikomasai-erp-2026/src/features/TimeSchedule/services/timeScheduleService.js)
- `OPERATION_END_MINUTES` を `22 * 60` (1320) から `20 * 60` (1200) に変更し、スケジュール表の表示範囲を制限します。

#### [MODIFY] [プロジェクト仕様書_TimeSchedule.md](file:///home/sho16/ikomasai-erp-2026/docs/プロジェクト仕様書_TimeSchedule.md)
- 仕様書内の運用終了時間の記述（22:00）をすべて 20:00 に更新します。

## 検証計画

### 手動確認
- ブラウザでタイムスケジュール画面を開き、タイムラインが 20:00 で終了していることを確認する。
- 5分刻み/15分刻みの目盛りが正しく 20:00 まで描画されていることを確認する。
