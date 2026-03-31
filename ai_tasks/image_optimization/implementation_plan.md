# 画像配信最適化の実装計画 (最終版)

画像アセットの解像度と配信方法を極限まで最適化し、他の企画 (66GB) を含めても Supabase Pro プランの 250GB 枠内に完全に収まるようにします。

## 現状の課題と目標
- **目標**: HP全体の通信量 ＋ 他の企画 (66GB) ≦ **250GB**
- **現状**: 1000px / 200KB 設定では合計 330GB 程度になる予測。
- **対策**: 解像度を 800px、ターゲットサイズを 120KB まで引き下げ、Lazy Loading と組み合わせて 250GB 以下を目指します。

## 変更内容

### 1. [Admin] 元画像の軽量化 (800px / 120KB)
新規アップロードされる画像のサイズをさらに絞ります。800px は Retina ディスプレイの 400px 表示（カードサイズ）に最適です。

#### [MODIFY] [EventStallRegistration.tsx](file:///home/sho16/ikomasai-hp-admin/ikomasai-admin/src/pages/EventStallRegistration.tsx)
- `IMAGE_MAX_WIDTH / HEIGHT`: 1200 -> **800px**
- `IMAGE_TARGET_BYTES`: 300KB -> **120KB**

---

### 2. [HP] 画像配信の効率化 (Lazy Loading)
ブラウザ標準の遅延読み込み機能を活用し、画面内に入った画像のみをダウンロードするように変更します（実装済み）。

#### [MODIFY] [StallCard.tsx](file:///home/sho16/ikomasai_hp/hp/src/components/Stall/StallCard.tsx)
#### [MODIFY] [EventCard.tsx](file:///home/sho16/ikomasai_hp/hp/src/components/Event/EventCard.tsx)
- `loading="lazy"` を付与した `<img>` タグを使用。

---

## 期待される効果 (3日間 / 3万人アクセス想定)
- **HP 通信量**: 約 **171 GB** (5.7MB / ユーザー)
- **他の企画分**: **66 GB**
- **合計想定**: **237 GB** (← **250GB 枠内に収まる！**)

## 検証プラン
1. **Adminでのアップロードテスト**: 画像が 100KB〜150KB 前後に圧縮されることを確認。
2. **ビジュアル確認**: 800px でモーダル表示した際も十分な画質であるか。
