import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/hooks/useTheme';

// 緊急モードスイッチ
export const EmergencyModeToggle = ({ isEmergency, onToggle, disabled }) => {
  const { theme } = useTheme();
  
  return (
    <View style={[
      styles.container, 
      { backgroundColor: theme.surface, borderColor: theme.border },
      isEmergency && { 
        backgroundColor: theme.name === 'dark' ? '#4A1212' : '#FFEBEE',
        borderColor: theme.name === 'dark' ? '#FF5252' : '#F44336'
      }
    ]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={[
            styles.iconContainer, 
            { backgroundColor: theme.name === 'dark' ? '#1B3A1B' : '#E8F5E9' },
            isEmergency && { 
              backgroundColor: theme.name === 'dark' ? '#4A1212' : '#FFEBEE' 
            }
          ]}>
            <MaterialCommunityIcons 
              name={isEmergency ? "alert-octagon" : "shield-check"} 
              size={24} 
              color={isEmergency ? (theme.name === 'dark' ? "#FF5252" : "#F44336") : "#4CAF50"} 
            />
          </View>
          <View>
            <Text style={[
              styles.title, 
              { color: theme.text },
              isEmergency && { color: theme.name === 'dark' ? '#FF5252' : '#F44336' }
            ]}>
              緊急モード
            </Text>
            <Text style={[
              styles.status, 
              { color: theme.textSecondary },
              isEmergency && { color: theme.name === 'dark' ? '#FF5252' : '#F44336' }
            ]}>
              {isEmergency ? '発動中' : '待機中'}
            </Text>
          </View>
        </View>
        <Switch
          value={isEmergency}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ 
            false: theme.name === 'dark' ? '#555' : '#BDBDBD', 
            true: theme.name === 'dark' ? '#FF5252' : '#F44336' 
          }}
          thumbColor={isEmergency ? '#fff' : (theme.name === 'dark' ? '#888' : '#f4f3f4')}
          style={styles.switch}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
  },
  switch: {
    transform: [{ scale: 1.2 }],
  },
});
