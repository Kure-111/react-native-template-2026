import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// 来場者カウンター表示（表示のみ）
export const VisitorCounter = ({ count }) => {
  // 数値を3桁区切りでフォーマット
  const formattedCount = count.toLocaleString();
  
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name="account-group" size={40} color="#2196F3" />
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.label}>来場者数</Text>
        <View style={styles.countRow}>
          <Text style={styles.count}>{formattedCount}</Text>
          <Text style={styles.unit}>人</Text>
        </View>
      </View>
      <View style={styles.badge}>
        <MaterialCommunityIcons name="circle" size={8} color="#F44336" />
        <Text style={styles.badgeText}>LIVE</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: '#2196F3',
  },
  iconContainer: {
    marginRight: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  count: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#2196F3',
    lineHeight: 42,
  },
  unit: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F44336',
  },
});
