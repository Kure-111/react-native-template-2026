/**
 * テーマ設定ステータステキストコンポーネント
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';

export const ThemeStatusText = ({ status }) => {
  const { theme } = useTheme();

  if (!status) return null;

  const isSuccess = status.type === 'success';

  return (
    <Text
      style={[
        styles.text,
        { color: isSuccess ? theme.success : theme.error }
      ]}
    >
      {status.message}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});
