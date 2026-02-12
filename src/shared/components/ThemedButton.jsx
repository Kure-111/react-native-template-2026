/**
 * テーマ対応ボタンコンポーネント
 * 各モードに応じたスタイリングを自動適用
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

/**
 * テーマ対応ボタン
 * @param {Object} props - コンポーネントプロパティ
 * @param {string} props.title - ボタンテキスト
 * @param {Function} props.onPress - 押下時のハンドラ
 * @param {boolean} props.disabled - 無効化フラグ
 * @param {string} props.variant - ボタンの種類 (primary/secondary)
 * @param {Object} props.style - 追加スタイル
 * @returns {JSX.Element} ボタン
 */
export const ThemedButton = ({ 
  title, 
  onPress, 
  disabled = false, 
  variant = 'primary',
  style 
}) => {
  const { theme } = useTheme();

  const getButtonStyle = () => {
    const baseStyle = {
      backgroundColor: variant === 'primary' ? theme.primary : theme.secondary,
      borderRadius: theme.borderRadius,
      opacity: disabled ? 0.5 : 1,
    };

    // モード別のスタイル調整
    if (theme.buttonStyle === 'neon') {
      return {
        ...baseStyle,
        borderWidth: 2,
        borderColor: variant === 'primary' ? theme.primary : theme.secondary,
        shadowColor: variant === 'primary' ? theme.primary : theme.secondary,
        shadowOpacity: 0.8,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
      };
    }

    if (theme.buttonStyle === 'angular') {
      return {
        ...baseStyle,
        borderRadius: 4,
        shadowColor: theme.primary,
        shadowOpacity: theme.shadowOpacity,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
      };
    }

    if (theme.buttonStyle === 'rounded') {
      return {
        ...baseStyle,
        borderRadius: 25,
      };
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    return {
      color: variant === 'primary' ? '#FFFFFF' : theme.text,
      fontSize: theme.fontSize.medium,
      fontWeight: theme.fontWeight,
    };
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, getTextStyle()]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  text: {
    fontSize: 16,
  },
});
