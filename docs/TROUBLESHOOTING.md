# トラブルシューティングガイド

## エラー: "Failed to load resource: 500 (Internal Server Error)"

### 症状
```
index.bundle:1 Failed to load resource: the server responded with a status of 500 (Internal Server Error)
Refused to execute script from 'http://localhost:8081/index.bundle...' because its MIME type ('application/json') is not executable
```

### 原因
- Expo開発サーバーがバンドルのビルドに失敗
- コードに構文エラーがある
- パッケージの互換性問題
- キャッシュの問題

### 解決方法

#### 1. キャッシュをクリアして再起動

```bash
# Expo キャッシュをクリア
npx expo start -c

# または
rm -rf .expo
rm -rf node_modules/.cache

# 再起動
npm start
```

#### 2. node_modules を再インストール

```bash
# node_modules と package-lock.json を削除
rm -rf node_modules
rm package-lock.json

# 再インストール
npm install

# 起動
npm start
```

#### 3. Watchman のキャッシュをクリア（Macの場合）

```bash
watchman watch-del-all
npm start
```

#### 4. Metro Bundler を完全にリセット

```bash
# Metro のキャッシュをクリア
npx react-native start --reset-cache

# または Expo の場合
npx expo start -c --clear
```

#### 5. コンソールでエラーを確認

開発サーバーのターミナルを確認して、具体的なエラーメッセージを探す：

```bash
npm start
# エラーメッセージをよく読む
```

よくあるエラー：
- `SyntaxError`: 構文エラー → コードを修正
- `Module not found`: パッケージが見つからない → `npm install`
- `Invariant Violation`: React/React Native の互換性問題

## エラー: "@react-native-picker/picker が動作しない"

### Web環境での制限

`@react-native-picker/picker` は React Native Web での動作に制限があります。

### 解決方法

Web環境用の代替コンポーネントを作成：

```javascript
// src/features/item10/components/EmergencyTypeSelector.jsx
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

export const EmergencyTypeSelector = ({ value, onValueChange, disabled }) => {
  // Web環境の場合は通常のselectタグを使用
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>災害種別</Text>
        <select
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={disabled}
          style={{
            width: '100%',
            height: 50,
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            backgroundColor: '#fff',
            fontSize: 16,
            padding: 12,
          }}
        >
          <option value="">選択してください</option>
          <option value="earthquake">地震</option>
          <option value="typhoon">台風</option>
          <option value="heavy_rain">大雨・洪水</option>
          <option value="other">その他</option>
        </select>
      </View>
    );
  }

  // モバイル環境ではPickerを使用
  const { Picker } = require('@react-native-picker/picker');
  
  return (
    <View style={styles.container}>
      <Text style={styles.label}>災害種別</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={value}
          onValueChange={onValueChange}
          enabled={!disabled}
          style={styles.picker}
        >
          <Picker.Item label="選択してください" value="" />
          <Picker.Item label="地震" value="earthquake" />
          <Picker.Item label="台風" value="typhoon" />
          <Picker.Item label="大雨・洪水" value="heavy_rain" />
          <Picker.Item label="その他" value="other" />
        </Picker>
      </View>
    </View>
  );
};
```

## エラー: "Supabase connection failed"

### 原因
- `.env` ファイルが設定されていない
- 環境変数が正しく読み込まれていない

### 解決方法

```bash
# .env.example をコピー
cp .env.example .env

# .env を編集
# EXPO_PUBLIC_SUPABASE_URL=your_url
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
```

## エラー: "Module not found"

### 解決方法

```bash
# パッケージを再インストール
npm install

# 特定のパッケージが見つからない場合
npm install パッケージ名
```

## 開発サーバーが起動しない

### 解決方法

```bash
# ポートが使用中の場合
lsof -ti:8081 | xargs kill -9

# 再起動
npm start
```

## Web版でスタイルが適用されない

### 解決方法

NativeWind（Tailwind CSS）を使用している場合：

```bash
# tailwind.config.js が正しいか確認
# babel.config.js に nativewind/babel が含まれているか確認

# キャッシュをクリア
npx expo start -c
```

## その他のよくある問題

### 問題: コンポーネントが表示されない

1. import パスを確認
2. コンポーネント名のスペルを確認
3. export/import の形式を確認（default export か named export か）

### 問題: 画像が表示されない

```javascript
// 正しい方法
import { Image } from 'react-native';

<Image source={require('./path/to/image.png')} />

// Web の場合
<Image source={{ uri: 'https://...' }} />
```

### 問題: navigation が動作しない

1. `@react-navigation` パッケージが正しくインストールされているか確認
2. NavigationContainer で囲まれているか確認
3. Screen が正しく登録されているか確認

## サポート

問題が解決しない場合：

1. Expo ドキュメント: https://docs.expo.dev/
2. React Native ドキュメント: https://reactnative.dev/
3. GitHub Issues でエラーメッセージを検索
