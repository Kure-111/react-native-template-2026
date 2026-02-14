# テーマシステム

## 概要

このアプリケーションは5つのテーマモードをサポートしており、各モードは背景色だけでなく、フォント、ボーダー、シャドウなど、全体的なデザインに影響を与えます。

## テーマモード一覧

### 1. ライトモード (light) ☀️
**明るく読みやすい標準テーマ**

- **対象ユーザー**: 一般的な使用、日中の使用
- **特徴**:
  - 明るい背景色
  - 標準的なボーダー半径 (8px)
  - 控えめなシャドウ (opacity: 0.1)
  - 読みやすいフォントサイズ
  - ソリッドなボタンスタイル

### 2. ダークモード (dark) 🌙
**目に優しい暗いテーマ**

- **対象ユーザー**: 夜間使用、目の疲労を軽減したい方
- **特徴**:
  - 暗い背景色
  - 標準的なボーダー半径 (8px)
  - やや強めのシャドウ (opacity: 0.3)
  - 読みやすいフォントサイズ
  - ソリッドなボタンスタイル

### 3. ゆるふわモード (joshi) 💗
**丸みのある優しいデザイン**

- **対象ユーザー**: 柔らかい印象を好む方
- **特徴**:
  - ピンク系の優しい配色
  - 丸みのあるボーダー半径 (20px)
  - 柔らかいシャドウ (opacity: 0.2)
  - やや大きめのフォントサイズ
  - セミボールドのフォントウェイト (500)
  - ラウンドボタンスタイル

### 4. サイバーモード (cyber) 🌐
**未来的で鋭角的なデザイン**

- **対象ユーザー**: テクノロジー感を好む方
- **特徴**:
  - ダークブルーと蛍光色の配色
  - シャープなボーダー半径 (4px)
  - 強めのシャドウ (opacity: 0.5)
  - やや小さめのフォントサイズ
  - ボールドのフォントウェイト (600)
  - 角ばったボタンスタイル

### 5. ネオンモード (neon) ✨
**強調された発光的デザイン**

- **対象ユーザー**: 高コントラストを好む方
- **特徴**:
  - 黒背景に鮮やかな蛍光色
  - 角ばったボーダー (0px)
  - 最も強いシャドウ (opacity: 0.8)
  - 標準的なフォントサイズ
  - ボールドのフォントウェイト
  - グロー効果のあるネオンボタンスタイル

## テーマトークン構造

各テーマモードは以下のトークンを持ちます：

```javascript
{
  // 色
  background: string,        // 背景色
  surface: string,          // サーフェス色 (カード等)
  primary: string,          // プライマリ色
  primaryVariant: string,   // プライマリバリエーション
  secondary: string,        // セカンダリ色
  text: string,            // テキスト色
  textSecondary: string,   // セカンダリテキスト色
  border: string,          // ボーダー色
  error: string,           // エラー色
  success: string,         // 成功色
  
  // スタイル
  borderRadius: number,    // ボーダー半径
  shadowOpacity: number,   // シャドウ透明度
  
  // フォント
  fontSize: {
    small: number,
    medium: number,
    large: number,
    xlarge: number,
  },
  fontWeight: string,      // フォントウェイト
  buttonStyle: string,     // ボタンスタイル (solid/rounded/angular/neon)
}
```

## 使用方法

### コンポーネントでテーマを使用

```javascript
import { useTheme } from '../shared/hooks/useTheme';

function MyComponent() {
  const { theme, themeMode } = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.background }}>
      <Text style={{ 
        color: theme.text,
        fontSize: theme.fontSize.medium,
        fontWeight: theme.fontWeight
      }}>
        Hello World
      </Text>
    </View>
  );
}
```

### テーマ対応コンポーネントを使用

```javascript
import { ThemedCard, ThemedButton, ThemedText } from '../shared/components';

function MyScreen() {
  return (
    <ThemedCard>
      <ThemedText variant="heading">タイトル</ThemedText>
      <ThemedText variant="body">本文</ThemedText>
      <ThemedButton 
        title="送信" 
        onPress={handleSubmit} 
        variant="primary" 
      />
    </ThemedCard>
  );
}
```

## アクセシビリティ対応

- **光過敏性てんかん対策**: テーマ切り替え時はゆっくりとしたフェード処理を実行
- **高コントラスト**: 各モードで適切なコントラスト比を確保
- **フォントサイズ**: モードごとに最適なフォントサイズを設定

## 今後の拡張可能性

- ハイコントラストモードの追加
- アニメーション速度の設定
- カスタムテーマの作成機能
