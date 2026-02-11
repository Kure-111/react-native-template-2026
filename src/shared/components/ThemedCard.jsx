/**
 * テーマ対応カードコンポーネント
 * 各モードに応じたスタイリングを自動適用
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

/**
 * テーマ対応カード
 * @param {Object} props - コンポーネントプロパティ
 * @param {React.ReactNode} props.children - 子要素
 * @param {Object} props.style - 追加スタイル
 * @returns {JSX.Element} カード
 */
export const ThemedCard = ({ children, style }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderRadius: theme.borderRadius,
          borderColor: theme.border,
          shadowOpacity: theme.shadowOpacity,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 3.84,
    elevation: 5,
  },
});
