/**
 * アプリケーションナビゲーター
 * アプリ全体のナビゲーション構造を定義します
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CounterScreen from '../features/counter/screens/CounterScreen';

/** ネイティブスタックナビゲーター */
const Stack = createNativeStackNavigator();

/**
 * アプリケーションナビゲーター
 * @returns {JSX.Element} ナビゲーターコンポーネント
 */
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Counter"
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* カウンター画面（デモ） */}
        <Stack.Screen name="Counter" component={CounterScreen} />

        {/*
          ここに新しい画面を追加できます
          例：
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
