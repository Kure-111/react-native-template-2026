# タイムスケジュール仕様書の更新完了

TimeSchedule 機能を最新のデータ構造（`events` 配列カラム）および UI 仕様（等幅数字、レスポンシブ配置）に合わせて更新しました。

## 実施内容

### [ikomasai-erp-2026](file:///home/sho16/ikomasai-erp-2026)

#### [MODIFY] [プロジェクト仕様書_TimeSchedule.md](file:///home/sho16/ikomasai-erp-2026/docs/プロジェクト仕様書_TimeSchedule.md)

1.  **データソースの刷新**:
    - `event_schedule_slots` テーブルの参照を廃止し、`events` テーブルの配列カラム（`schedule_dates`, `schedule_start_times` 等）から動的にスロットを生成する現行の仕組みを明記しました。
2.  **運用時間の延長**:
    - 実装（`timeScheduleService.js`）に合わせて、運用終了時刻を 20:00 から 22:00 へ更新しました。
3.  **時刻表示とレイアウト**:
    - オプション時間（準備・片付け）の追加、および詳細モーダルにおけるスマホ（縦並び）・PC（横並び）のレスポンシブ対応を追記しました。
    - 表記のズレを防ぐための `tabular-nums`（等幅フォント）採用について明記しました。

#### [MODIFY] [Codex編集履歴.md](file:///home/sho16/ikomasai-erp-2026/docs/Codex編集履歴.md)

- 今回の仕様書更新内容を履歴に追加しました。

## 検証結果

- 更新された仕様書の内容が、現在のソースコード（`timeScheduleService.js`, `DetailModal.jsx`）の実装内容と整合していることを確認しました。
