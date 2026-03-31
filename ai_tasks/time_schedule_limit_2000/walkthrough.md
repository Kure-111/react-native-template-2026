# タイムスケジュールの運用終了時間の短縮 (20:00) 修正完了

タイムスケジュール画面の運用終了時間を 22:00 から 20:00 に変更しました。これにより、スケジュール表の表示範囲がユーザーの要望通り 20:00 までに制限されます。

## 変更内容
- **サービス層の定数修正**: `src/features/TimeSchedule/services/timeScheduleService.js` 内の `OPERATION_END_MINUTES` を `1320` (22:00) から `1200` (20:00) へ修正しました。
- **ドキュメントの更新**: `docs/プロジェクト仕様書_TimeSchedule.md` 内の運用時間に関する記述をすべて 20:00 に更新しました。
- **履歴の記録**: `docs/Codex編集履歴.md` に今回の変更内容を追記しました。

## 検証結果
- コード上で `22:00` および `1320` のハードコードが TimeSchedule 関連ファイル内に残っていないことを確認しました。
- サービス層の修正により、タイムライン生成ロジックが 20:00 で終了するようになっています。

## 修正ファイル一覧
- [timeScheduleService.js](file:///home/sho16/ikomasai-erp-2026/src/features/TimeSchedule/services/timeScheduleService.js)
- [プロジェクト仕様書_TimeSchedule.md](file:///home/sho16/ikomasai-erp-2026/docs/プロジェクト仕様書_TimeSchedule.md)
- [Codex編集履歴.md](file:///home/sho16/ikomasai-erp-2026/docs/Codex編集履歴.md)
