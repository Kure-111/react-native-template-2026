/**
 * アプリケーションナビゲーター
 * アプリ全体のナビゲーション構造を定義します
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import DrawerNavigator from './DrawerNavigator';

/**
 * アプリケーションナビゲーター
 * @returns {JSX.Element} ナビゲーターコンポーネント
 */
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <DrawerNavigator />
    </NavigationContainer>
  );
};

export default AppNavigator;
