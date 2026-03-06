## 概要
企画・屋台一覧における場所表記の仕様変更と、実態に合わせたSupabaseスキーマの修正およびドキュメントの同期を行いました。

## 変更内容
### 1. アプリ側の表示・ソート仕様変更
- **Hooks (`useEventsStallsList01Data.js`)**
  - Supabaseからのデータ取得処理を修正し、`stall_locations` および `event_locations` から紐づく `building_locations (name, display_order)` を取得するように変更。
  - 取得データのマッピングを修正：
    - 一覧表示用 (`listLocationName`): 企画は「building_locations.name」、屋台は「building_locations.name + 前」となるよう実装。
    - モーダル用 (`locationName`): 「building_locations.name + (半角スペース) + stall_locations.name (または event_locations.name)」の形式で表示するよう実装。
  - 一覧のソート基準 (`SORT_OPTIONS.LOCATION_ASC`) を `building_locations.display_order` 優先に変更（同値の場合は文字列の辞書順）。
- **コンポーネント (`ItemCard.jsx`)**
  - ロケーションの表示参照先を `locationName` から `listLocationName` に変更し、一覧画面で適切な場所名が表示されるよう修正。

### 2. スキーマ変更への追従・ドキュメント更新
- **コードベースの修正**
  - レガシーな `sub_category` カラムへの参照を廃止し、新しい `category_id` を使用するようにマッピングを更新。
- **仕様書の更新 (`docs/プロジェクト仕様書_企画屋台一覧.md`, `docs/AI用プロンプト/supabaseスキーマ参照.md`)**
  - 現在の Supabase のテーブル定義に合わせて、存在しない古いカラム（`temperature`, `menu_items`, `capacity_per_slot` 等）や旧表記のメンションを削除。
  - `event_locations`, `stall_locations` の `area_id` を `building_id` へ更新し、参照関係を最新化。

## 関連Issue
- #20
