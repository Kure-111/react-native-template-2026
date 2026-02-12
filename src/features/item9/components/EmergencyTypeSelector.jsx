import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { DISASTER_TYPES, DISASTER_TYPE_LABELS } from '../constants';

// 自然災害種別選択
export const EmergencyTypeSelector = ({ value, onValueChange, disabled }) => {
  // Web環境の場合は通常のselectタグを使用
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>災害種別</Text>
        <select
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={disabled}
          style={{
            width: '100%',
            height: 50,
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            backgroundColor: '#fff',
            fontSize: 16,
            padding: 12,
          }}
        >
          <option value="">選択してください</option>
          {Object.entries(DISASTER_TYPES).map(([key, value]) => (
            <option key={key} value={value}>
              {DISASTER_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
      </View>
    );
  }

  // モバイル環境ではPickerを使用
  const { Picker } = require('@react-native-picker/picker');
  
  return (
    <View style={styles.container}>
      <Text style={styles.label}>災害種別</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={value}
          onValueChange={onValueChange}
          enabled={!disabled}
          style={styles.picker}
        >
          <Picker.Item label="選択してください" value="" />
          {Object.entries(DISASTER_TYPES).map(([key, value]) => (
            <Picker.Item 
              key={key} 
              label={DISASTER_TYPE_LABELS[value]} 
              value={value} 
            />
          ))}
        </Picker>
      </View>
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
});
