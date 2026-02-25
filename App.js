/**
 * アプリケーションエントリーポイント
 * React Native Expo テンプレート
 */

import React from 'react';
import { AuthProvider } from './src/shared/contexts/AuthContext';
import { ThemeProvider } from './src/shared/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

/**
 * アプリケーションルートコンポーネント
 * @returns {JSX.Element} アプリケーション
 */
export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </AuthProvider>
  );
}
