# 企画・屋台一覧の検索リクエスト改善タスク

- [x] `useEventsStallsList01Data.js` のリファクタリング
  - [x] 全件取得用ステート (`rawStalls`, `rawEvents`, etc.) の追加
  - [x] 初回マウント時のみ全データを取得する `useEffect` の実装
  - [x] フィルタリング・ソートを行う `useMemo` の実装
  - [x] `data`, `loading`, `error` の戻り値調整
- [x] かな検索の改善
  - [x] `normalizeSearchText` の正規化順序の修正（半角カタカナ対応）
  - [x] `katakanaToHiragana` の堅牢化
  - [x] `calculatePrefixPriorityScore` のウェイト微調整とタイブレーカー修正
- [ ] 動作確認
  - [ ] ひらがな・カタカナ・半角カタカナ混在での検索確認
  - [ ] 長音（ー）を含む名前の検索確認
  - [ ] 初回ロード時の挙動確認
  - [ ] 検索・タブ・フィルター操作時のネットワーク通信停止の確認
