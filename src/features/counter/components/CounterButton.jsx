/**
 * カウンターボタンコンポーネント
 * カウント操作用のボタンを表示します
 * StyleSheet でスタイリング
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

/**
 * カウンターボタン
 * @param {Object} props - プロパティ
 * @param {string} props.title - ボタンのタイトル
 * @param {Function} props.onPress - ボタンが押された時のコールバック
 * @param {boolean} props.disabled - ボタンの無効化状態
 * @param {string} props.variant - ボタンのバリエーション（'primary', 'secondary', 'danger'）
 */
const CounterButton = ({ title, onPress, disabled = false, variant = 'primary' }) => {
  /** バリエーションに応じたスタイルを取得 */
  const getButtonStyle = () => {
    if (disabled) return [styles.button, styles.buttonDisabled];
    if (variant === 'secondary') return [styles.button, styles.buttonSecondary];
    if (variant === 'danger') return [styles.button, styles.buttonDanger];
    return [styles.button, styles.buttonPrimary];
  };

  /** バリエーションに応じたテキストスタイルを取得 */
  const getTextStyle = () => {
    if (disabled) return [styles.buttonText, styles.buttonTextDisabled];
    return styles.buttonText;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#5856D6',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextDisabled: {
    color: '#666666',
  },
});

export default CounterButton;
