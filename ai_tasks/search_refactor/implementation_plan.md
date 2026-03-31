# 企画・屋台一覧のkana検索改善計画

## 現状の課題
`name_kana`（ふりがな）を用いた検索が正しく機能していない原因として、以下の点が考えられます。

1.  **正規化順序の誤り**: `normalizeSearchText` 内で、`katakanaToHiragana`（かな変換）が `normalize('NFKC')`（半角・全角の正規化）より先に実行されています。これにより、**半角カタカナ**で入力された場合に変換がスキップされ、検索がヒットしなくなっています。
2.  **長音波記号（ー）の扱い**: カタカナ名に多い長音「ー」が変換対象に含まれておらず、不一致の原因になる可能性があります。
3.  **検索ロジックの厳密性**: 現状は「部分一致があればそれのみを表示」していますが、ユーザーが期待する「あいまいさ」の定義（タイポへの強さなど）に対して Fuse.js へのフォールバックが機能しにくい構成になっています。

## 修正内容

### 1. `normalizeSearchText` の修正 [useEventsStallsList01Data.js](file:///home/sho16/ikomasai-erp-2026/src/features/01_Events&Stalls_list/hooks/useEventsStallsList01Data.js)
- `normalize('NFKC')` を最初に実行し、半角カタカナを全角に揃えてから `katakanaToHiragana` を適用します。
- これにより、全角/半角、ひらがな/カタカナのあらゆる組み合わせで一致するようになります。

### 2. `katakanaToHiragana` の堅牢化
- 変換対象の正規表現を広げ、長音記号などの微調整を行います。

### 3. 検索スコアリングの微調整
- `name_kana` の一致がより優先されるようにウェイトを調整します。

## 変更ファイル

#### [MODIFY] [useEventsStallsList01Data.js](file:///home/sho16/ikomasai-erp-2026/src/features/01_Events&Stalls_list/hooks/useEventsStallsList01Data.js)
- `normalizeSearchText` の順序変更
- `katakanaToHiragana` の修正

## 検証計画
- 以下のパターンで検索がヒットすることを確認します。
  - ひらがな入力
  - 全角カタカナ入力
  - 半角カタカナ入力
  - スペース区切り複数キーワード
  - 長音を含む名前（例：「ステージ」を「すてーじ」で検索）

## QA / 懸念事項
- **Fuse.jsの閾値**: 0.35 はやや厳しめかもしれません。必要に応じて調整します。
- **リクエスト数**: クライアントサイドでの処理に閉じるため、リクエスト数は変更されません。
