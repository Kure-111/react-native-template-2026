/**
 * アプリケーションナビゲーター
 * アプリ全体のナビゲーション構造を定義します
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../shared/contexts/AuthContext';
import DrawerNavigator from './DrawerNavigator';
import LoginScreen from '../features/auth/screens/LoginScreen';

/**
 * スタックナビゲーター
 */
const Stack = createNativeStackNavigator();

/**
 * アプリケーションナビゲーター
 * 認証状態に応じてログイン画面またはメイン画面を表示します
 * @returns {JSX.Element} ナビゲーターコンポーネント
 */
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // ローディング中の表示
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // ログイン済み: メイン画面を表示
          <Stack.Screen name="Main" component={DrawerNavigator} />
        ) : (
          // 未ログイン: ログイン画面を表示
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

/**
 * スタイル定義
 */
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
});

export default AppNavigator;
