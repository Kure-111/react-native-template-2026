# 500エラーの緊急修正ガイド

## エラーの症状
```
Failed to load resource: 500 (Internal Server Error)
MIME type ('application/json') is not executable
```

## 根本原因の可能性

1. **Node.js バージョンが新しすぎる（v24）**
   - Expo は Node.js v18-v20 を推奨
   - v24 は実験的バージョンで互換性問題がある可能性

2. **@react-native-picker/picker のWeb互換性問題**
   - Web環境で動的importが失敗している

3. **Metro Bundler のキャッシュ破損**

## 🚨 即座に試すべき解決方法

### 方法1: キャッシュを完全削除（最優先）

```bash
cd /Users/shiraishuugou/Documents/GitHub/ikomasai-erp-2026

# すべてのキャッシュを削除
rm -rf .expo
rm -rf node_modules/.cache
rm -rf /tmp/metro-*
rm -rf /tmp/haste-*

# Expoを再起動
npx expo start -c --clear
```

### 方法2: Node.jsのバージョンを確認

```bash
# 現在のバージョン確認
node --version

# v24の場合はv20にダウングレード推奨
# nvmを使用している場合:
nvm install 20
nvm use 20

# 再インストール
rm -rf node_modules package-lock.json
npm install
npx expo start -c
```

### 方法3: Web環境で一時的に問題のコンポーネントを無効化

以下のファイルを確認し、問題がある場合は一時的にコメントアウト：

`src/features/item10/screens/Item10Screen.jsx`

```javascript
// 一時的にEmergencyTypeSelectorをコメントアウト
/*
<EmergencyTypeSelector
  value={selectedDisasterType}
  onValueChange={setSelectedDisasterType}
  disabled={isEmergency}
/>
*/
```

### 方法4: 開発サーバーのログを確認

```bash
# 別のターミナルで実行
npx expo start --clear

# エラーメッセージを確認
# 以下のようなエラーが表示されるはず:
# - SyntaxError
# - Module not found
# - Transform error
```

## 🔍 具体的なエラーログの確認方法

### ターミナルで確認

1. 開発サーバーを起動:
   ```bash
   npx expo start -c
   ```

2. ターミナルに表示されるエラーを確認

3. よくあるエラー:
   ```
   Error: Unable to resolve module @react-native-picker/picker
   → npm install @react-native-picker/picker
   
   SyntaxError: Unexpected token
   → 構文エラー。該当ファイルを確認
   
   Transform error: Cannot find module
   → インポートパスが間違っている
   ```

### ブラウザのコンソールで確認

1. ブラウザで開発ツールを開く（F12）
2. Console タブを確認
3. Network タブで `index.bundle` のレスポンスを確認

## 📝 推奨する修正手順（順番に試す）

### ステップ1: 基本的なクリーンアップ

```bash
cd /Users/shiraishuugou/Documents/GitHub/ikomasai-erp-2026

# キャッシュクリア
rm -rf .expo
rm -rf node_modules/.cache

# 再起動
npx expo start -c
```

### ステップ2: 完全な再インストール

```bash
# すべて削除
rm -rf node_modules
rm -rf package-lock.json
rm -rf .expo

# 再インストール
npm install

# 起動
npx expo start -c
```

### ステップ3: 特定のコンポーネントを無効化してテスト

1. `src/features/item10/screens/Item10Screen.jsx` を開く
2. EmergencyTypeSelector をコメントアウト
3. 再起動してエラーが消えるか確認
4. 消えた場合、そのコンポーネントが原因

### ステップ4: 段階的にコンポーネントを追加

```javascript
// Item10Screen.jsx で一つずつコメントを外す

// 1. まずデジタル時計だけ
<DigitalClock />

// 2. 来場者カウンター追加
<DigitalClock />
<VisitorCounter count={count} />

// 3. 順番に追加していく
```

## 🛠️ Node.js v24 の問題の場合

### Node.js v20 にダウングレード（推奨）

```bash
# nvmを使用している場合
nvm install 20
nvm use 20
nvm alias default 20

# プロジェクトの再セットアップ
cd /Users/shiraishuugou/Documents/GitHub/ikomasai-erp-2026
rm -rf node_modules package-lock.json
npm install
npx expo start
```

### nvmをインストールしていない場合

```bash
# Homebrewでnvmをインストール
brew install nvm

# ~/.zshrc または ~/.bash_profile に追加
export NVM_DIR="$HOME/.nvm"
[ -s "/usr/local/opt/nvm/nvm.sh" ] && . "/usr/local/opt/nvm/nvm.sh"

# ターミナルを再起動
# その後上記の手順を実行
```

## 🎯 最も可能性が高い解決方法

現在のNode.js v24が原因の可能性が高いため、以下を試してください：

```bash
# 1. Node.js v20 に切り替え
nvm use 20

# 2. 完全クリーンアップ
cd /Users/shiraishuugou/Documents/GitHub/ikomasai-erp-2026
rm -rf node_modules package-lock.json .expo

# 3. 再インストール
npm install

# 4. キャッシュクリアで起動
npx expo start -c
```

## 📞 それでも解決しない場合

1. **エラーログを共有**
   - ターミナルの完全なエラーログをコピー
   - ブラウザのコンソールエラーをコピー

2. **環境情報を確認**
   ```bash
   node --version
   npm --version
   npx expo --version
   ```

3. **最小限の動作確認**
   ```bash
   # 新しいExpoプロジェクトを作成してテスト
   npx create-expo-app test-app
   cd test-app
   npm start
   ```

## まとめ

**最優先で試すこと:**

1. ✅ `npx expo start -c` （キャッシュクリア）
2. ✅ Node.js v20 にダウングレード
3. ✅ `rm -rf node_modules && npm install`
4. ✅ エラーログを確認

これらを順番に試してください！
