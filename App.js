/**
 * アプリケーションエントリーポイント
 * React Native Expo テンプレート
 */

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { AuthProvider } from './src/shared/contexts/AuthContext';
import { ThemeProvider } from './src/shared/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

/**
 * アプリケーションルートコンポーネント
 * @returns {JSX.Element | null} アプリケーション
 */
export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </AuthProvider>
  );
}
