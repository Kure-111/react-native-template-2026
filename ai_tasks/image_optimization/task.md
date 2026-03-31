# 画像最適化 タスクリスト

## Admin (ikomasai-hp-admin)
- [x] `EventStallRegistration.tsx` の定数修正 (解像度 1000px, ターゲット 200KB)
- [x] 動作確認（定数変更の反映を確認）

## HP (ikomasai_hp)
- [x] `StallCard.tsx` の `backgroundImage` を `<img>` タグ + `loading="lazy"` に変更
- [x] `EventCard.tsx` の `backgroundImage` を `<img>` タグ + `loading="lazy"` に変更
- [x] `StallModal.tsx` / `EventModal.tsx` を `<img>` タグに変更（アクセシビリティ向上）
- [x] スタイル調整（`object-fit: cover` の適用、背景プレースホルダーの追加）

## 完了後の作業
- [x] `walkthrough.md` の作成
