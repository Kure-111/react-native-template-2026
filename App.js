/**
 * アプリケーションエントリーポイント
 * React Native Expo テンプレート
 */

import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';

/**
 * アプリケーションルートコンポーネント
 * @returns {JSX.Element} アプリケーション
 */
export default function App() {
  return <AppNavigator />;
}
