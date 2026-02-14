#!/bin/bash

echo "=================================="
echo "エラー診断スクリプト"
echo "=================================="
echo ""

echo "1. Node.jsバージョン確認"
node --version
echo ""

echo "2. npm バージョン確認"
npm --version
echo ""

echo "3. Expo バージョン確認"
npx expo --version 2>&1 || echo "Expo not found"
echo ""

echo "4. 重要なパッケージの確認"
npm list @react-native-picker/picker 2>&1 | head -3
npm list react-native-maps 2>&1 | head -3
npm list expo-location 2>&1 | head -3
echo ""

echo "5. キャッシュディレクトリの確認"
ls -la .expo 2>&1 | head -5 || echo ".expo directory not found"
echo ""

echo "6. Item10Screen.jsx の構文チェック"
node -c src/features/item10/screens/Item10Screen.jsx 2>&1 || echo "構文エラーあり"
echo ""

echo "7. EmergencyTypeSelector.jsx の構文チェック"
node -c src/features/item10/components/EmergencyTypeSelector.jsx 2>&1 || echo "構文エラーあり"
echo ""

echo "=================================="
echo "診断完了"
echo "=================================="
