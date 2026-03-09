import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';

/**
 * 緊急メッセージ入力コンポーネント
 */
export const EmergencyMessageInput = ({ value, onChangeText, disabled, placeholder }) => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>詳細メッセージ</Text>
      <TextInput
        style={[
          styles.input, 
          { 
            borderColor: theme.border, 
            backgroundColor: theme.input,
            color: theme.text 
          },
          disabled && { backgroundColor: theme.name === 'dark' ? '#2A2A2A' : '#f5f5f5', color: theme.textSecondary }
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || '詳細な状況を入力してください'}
        placeholderTextColor={theme.textSecondary}
        multiline
        numberOfLines={4}
        editable={!disabled}
        textAlignVertical="top"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
});
