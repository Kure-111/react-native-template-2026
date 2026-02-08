import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

/**
 * 緊急メッセージ入力コンポーネント
 */
export const EmergencyMessageInput = ({ value, onChangeText, disabled, placeholder }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>詳細メッセージ</Text>
      <TextInput
        style={[styles.input, disabled && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || '詳細な状況を入力してください'}
        placeholderTextColor="#999"
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
    color: '#666',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
});
