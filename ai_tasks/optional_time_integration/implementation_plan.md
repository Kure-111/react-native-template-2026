# 企画詳細・タイムスケジュール詳細モーダルへのオプション時間表示の統合と調整

オプション時間（準備・片付け時間）を詳細モーダルに統合し、視認性とデザインを向上させます。ERP側（React Native）と管理画面側（React Web）の両方で、5分単位の短いスロットでも見切れないように調整し、余白を最適化します。

## ユーザーレビューが必要な項目
> [!IMPORTANT]
> ERP側（スマホ・タブレット）では画面幅が限られるため、オプション時間のフォントサイズをメイン時間より小さく（12px）設定し、上下に配置することで視認性を確保しています。

## 提案される変更内容

### 1. ERPプロジェクト (ikomasai-erp-2026)

#### [MODIFY] [DetailModal.jsx](file:///home/sho16/ikomasai-erp-2026/src/features/01_Events&Stalls_list/components/DetailModal.jsx)
- `optionalTimeText` スタイルに `marginBottom` および `marginTop` を追加し、メインの開催時間との間に適切な余白（4px程度）を設けます。
- `scheduleTimeRangeContainer` のレイアウトを微調整し、短い時間枠でもテキストが重ならないようにします。

### 2. 管理画面プロジェクト (ikomasai-hp-admin)

#### [MODIFY] [EventsStallsManagement.tsx](file:///home/sho16/ikomasai-hp-admin/ikomasai-admin/src/pages/EventsStallsManagement.tsx)
- 詳細モーダル内のスケジュール表示部分で、オプション時間のバッジ（開始前・終了後）とメイン時間の間の余白を調整します。
- 必要に応じて、`gap` や `margin` を微調整し、よりプレミアムな質感に仕上げます。

## 検証計画

### 自動テスト
- なし（UI変更のため）

### 手動確認
- ERP側: 企画一覧およびタイムスケジュールから詳細モーダルを開き、オプション時間がある場合に正しく・きれいに表示されるか。
- 管理画面側: 企画詳細を開き、スケジュール欄のオプション時間がメイン時間と適切に分離され、見やすくなっているか。
