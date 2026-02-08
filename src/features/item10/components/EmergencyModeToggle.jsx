import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// 緊急モードスイッチ
export const EmergencyModeToggle = ({ isEmergency, onToggle, disabled }) => {
  return (
    <View style={[styles.container, isEmergency && styles.emergencyActive]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={[styles.iconContainer, isEmergency && styles.iconEmergency]}>
            <MaterialCommunityIcons 
              name={isEmergency ? "alert-octagon" : "shield-check"} 
              size={24} 
              color={isEmergency ? "#F44336" : "#4CAF50"} 
            />
          </View>
          <View>
            <Text style={[styles.title, isEmergency && styles.emergencyText]}>
              緊急モード
            </Text>
            <Text style={[styles.status, isEmergency && styles.emergencyText]}>
              {isEmergency ? '発動中' : '待機中'}
            </Text>
          </View>
        </View>
        <Switch
          value={isEmergency}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ false: '#BDBDBD', true: '#F44336' }}
          thumbColor={isEmergency ? '#fff' : '#f4f3f4'}
          style={styles.switch}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  emergencyActive: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconEmergency: {
    backgroundColor: '#FFEBEE',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  emergencyText: {
    color: '#F44336',
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  switch: {
    transform: [{ scale: 1.2 }],
  },
});
