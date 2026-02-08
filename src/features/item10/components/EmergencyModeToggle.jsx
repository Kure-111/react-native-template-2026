import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';

// 緊急モードスイッチ
export const EmergencyModeToggle = ({ isEmergency, onToggle, disabled }) => {
  return (
    <View style={[styles.container, isEmergency && styles.emergencyActive]}>
      <View style={styles.header}>
        <Text style={[styles.title, isEmergency && styles.emergencyText]}>
          緊急モード
        </Text>
        <Switch
          value={isEmergency}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ false: '#767577', true: '#F44336' }}
          thumbColor={isEmergency ? '#fff' : '#f4f3f4'}
        />
      </View>
      <Text style={[styles.status, isEmergency && styles.emergencyText]}>
        {isEmergency ? '緊急モード発動中' : '通常モード'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emergencyActive: {
    backgroundColor: '#FFEBEE',
    borderWidth: 2,
    borderColor: '#F44336',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  emergencyText: {
    color: '#F44336',
  },
  status: {
    fontSize: 14,
    color: '#666',
  },
});
