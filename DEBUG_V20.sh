#!/bin/bash

echo "=========================================="
echo "Node.js v20 環境でのデバッグ"
echo "=========================================="
echo ""

echo "1. Node.jsバージョン確認"
node --version
npm --version
echo ""

echo "2. 開発サーバーのプロセス確認"
lsof -ti:8081 2>/dev/null && echo "ポート8081使用中" || echo "ポート8081空き"
lsof -ti:19000 2>/dev/null && echo "ポート19000使用中" || echo "ポート19000空き"
echo ""

echo "3. キャッシュディレクトリの確認"
du -sh .expo 2>/dev/null || echo ".expoなし"
du -sh node_modules/.cache 2>/dev/null || echo "node_modules/.cacheなし"
echo ""

echo "4. 環境変数ファイルの確認"
if [ -f .env ]; then
  echo ".env ファイル: 存在"
  wc -l .env
else
  echo ".env ファイル: なし（.env.exampleをコピーしてください）"
fi
echo ""

echo "5. package.jsonの確認"
node -e "const pkg = require('./package.json'); console.log('Expo SDK:', pkg.dependencies.expo); console.log('React Native:', pkg.dependencies['react-native']);"
echo ""

echo "6. 重要なファイルの構文チェック"
echo "Item10Screen.jsx:"
node --check src/features/item10/screens/Item10Screen.jsx 2>&1 | head -1 || echo "OK"
echo "EmergencyTypeSelector.jsx:"
node --check src/features/item10/components/EmergencyTypeSelector.jsx 2>&1 | head -1 || echo "OK"
echo ""

echo "=========================================="
echo "デバッグ完了"
echo "=========================================="
