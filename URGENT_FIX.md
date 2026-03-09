# 🚨 緊急修正: Node.js v24 互換性問題

## 問題の特定

**Node.js v24 がReact（.jsx）ファイルを処理できません**

```
TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".jsx"
```

この問題により、Expo Metro Bundlerが.jsxファイルを変換できず、
500エラーが発生しています。

## ✅ 確実な解決方法

### 方法1: Node.js v20 にダウングレード（推奨・最も確実）

```bash
# ステップ1: nvmをインストール（まだの場合）
brew install nvm

# ステップ2: シェル設定（zshの場合）
mkdir -p ~/.nvm
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc

# ステップ3: 新しいターミナルを開くか、設定を再読み込み
source ~/.zshrc

# ステップ4: Node.js v20 をインストール
nvm install 20
nvm use 20
nvm alias default 20

# ステップ5: バージョン確認
node --version  # v20.x.x と表示されるはず

# ステップ6: プロジェクトをクリーンアップして再起動
cd /Users/shiraishuugou/Documents/GitHub/ikomasai-erp-2026
rm -rf node_modules package-lock.json .expo
npm install
npx expo start -c
```

### 方法2: .nvmrc ファイルを作成（プロジェクト用の設定）

```bash
cd /Users/shiraishuugou/Documents/GitHub/ikomasai-erp-2026

# Node.js v20 を指定
echo "20" > .nvmrc

# nvmで自動的に切り替え
nvm use

# 以降、このディレクトリでは自動的にv20が使われます
```

## 📋 詳細な手順（初めての場合）

### ステップ1: nvmのインストール確認

```bash
# nvmが既にインストールされているか確認
nvm --version

# エラーが出る場合はインストールが必要
```

### ステップ2: Homebrewでnvmをインストール

```bash
# Homebrewの確認
brew --version

# nvmのインストール
brew install nvm

# インストール後の設定
mkdir -p ~/.nvm
```

### ステップ3: シェル設定ファイルの編集

**zshの場合（macOS標準）:**

```bash
# .zshrcに追記
cat >> ~/.zshrc << 'SHELL_CONFIG'

# NVM設定
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"
SHELL_CONFIG

# 設定を反映
source ~/.zshrc
```

**bashの場合:**

```bash
# .bash_profileに追記
cat >> ~/.bash_profile << 'SHELL_CONFIG'

# NVM設定
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
SHELL_CONFIG

# 設定を反映
source ~/.bash_profile
```

### ステップ4: Node.js v20のインストールと切り替え

```bash
# 利用可能なバージョンを確認
nvm ls-remote | grep "v20"

# 最新のv20 LTSをインストール
nvm install 20

# v20に切り替え
nvm use 20

# デフォルトに設定（次回起動時も自動的にv20を使用）
nvm alias default 20

# 確認
node --version  # v20.x.x と表示されるはず
npm --version   # 10.x.x と表示されるはず
```

### ステップ5: プロジェクトの完全リセット

```bash
cd /Users/shiraishuugou/Documents/GitHub/ikomasai-erp-2026

# すべてのキャッシュを削除
rm -rf node_modules
rm -rf package-lock.json
rm -rf .expo
rm -rf node_modules/.cache
rm -rf /tmp/metro-*
rm -rf /tmp/haste-*

# 再インストール
npm install

# 起動（キャッシュクリア付き）
npx expo start -c
```

## 🔍 トラブルシューティング

### Q: nvmコマンドが見つからない

```bash
# パスを確認
echo $NVM_DIR

# 空の場合、シェル設定を再確認
cat ~/.zshrc | grep NVM

# ターミナルを完全に再起動
```

### Q: nvm use 20 がエラーになる

```bash
# まずインストール
nvm install 20

# その後使用
nvm use 20
```

### Q: expo start がまだエラーになる

```bash
# Node.jsのバージョンを再確認
node --version  # v20.x.x であることを確認

# 完全クリーンアップを再実行
rm -rf node_modules package-lock.json .expo
npm install
npx expo start -c
```

## ⚡ クイックコマンド集

```bash
# すべてを一度に実行（nvmが既にインストール済みの場合）
nvm install 20 && \
nvm use 20 && \
nvm alias default 20 && \
cd /Users/shiraishuugou/Documents/GitHub/ikomasai-erp-2026 && \
rm -rf node_modules package-lock.json .expo && \
npm install && \
npx expo start -c
```

## 📊 動作確認

以下のコマンドで正しく設定されているか確認：

```bash
# 1. Node.jsバージョン
node --version
# 期待値: v20.x.x

# 2. nvmが動作しているか
nvm current
# 期待値: v20.x.x

# 3. Expoが起動できるか
cd /Users/shiraishuugou/Documents/GitHub/ikomasai-erp-2026
npx expo start
# エラーなく起動することを確認
```

## ✅ 成功の確認

1. ターミナルでエラーが出ない
2. ブラウザで `http://localhost:8081` にアクセスできる
3. Item10画面が表示される

## 🎯 まとめ

**必須対応:**
- Node.js v24 → v20 へダウングレード

**理由:**
- Node.js v24は.jsxファイルを標準でサポートしていない
- Expo/React NativeはNode.js v18-v20を推奨
- v24は実験的バージョンで本番環境には不適切

このドキュメントの手順に従えば、確実に問題が解決します！
