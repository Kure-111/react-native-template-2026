/**
 * テーマ対応テキストコンポーネント
 * 各モードに応じたフォントスタイリングを自動適用
 */

import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

/**
 * テーマ対応テキスト
 * @param {Object} props - コンポーネントプロパティ
 * @param {React.ReactNode} props.children - 子要素
 * @param {string} props.variant - テキストの種類 (heading/body/caption)
 * @param {Object} props.style - 追加スタイル
 * @returns {JSX.Element} テキスト
 */
export const ThemedText = ({ 
  children, 
  variant = 'body', 
  style,
  ...props 
}) => {
  const { theme } = useTheme();

  const getTextStyle = () => {
    switch (variant) {
      case 'heading':
        return {
          color: theme.text,
          fontSize: theme.fontSize.xlarge,
          fontWeight: theme.fontWeight,
        };
      case 'body':
        return {
          color: theme.text,
          fontSize: theme.fontSize.medium,
          fontWeight: theme.fontWeight,
        };
      case 'caption':
        return {
          color: theme.textSecondary,
          fontSize: theme.fontSize.small,
        };
      default:
        return {
          color: theme.text,
          fontSize: theme.fontSize.medium,
        };
    }
  };

  return (
    <RNText style={[getTextStyle(), style]} {...props}>
      {children}
    </RNText>
  );
};
