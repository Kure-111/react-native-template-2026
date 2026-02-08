import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from "../../../shared/hooks/useTheme";

// 来場者カウンター表示（表示のみ）
export const VisitorCounter = ({ count }) => {
  const { theme } = useTheme();
  // 数値を3桁区切りでフォーマット
  const formattedCount = count.toLocaleString();
  
  return (
    <View style={[styles.container, { 
      backgroundColor: theme.surface,
      borderLeftColor: theme.primary,
      borderColor: theme.border,
    }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
        <MaterialCommunityIcons name="account-group" size={40} color={theme.primary} />
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>来場者数</Text>
        <View style={styles.countRow}>
          <Text style={[styles.count, { color: theme.primary }]}>{formattedCount}</Text>
          <Text style={[styles.unit, { color: theme.textSecondary }]}>人</Text>
        </View>
      </View>
      <View style={[styles.badge, { 
        backgroundColor: theme.name === 'dark' ? '#1A472A' : '#FFEBEE' 
      }]}>
        <MaterialCommunityIcons 
          name="circle" 
          size={8} 
          color={theme.name === 'dark' ? '#4ADE80' : '#F44336'} 
        />
        <Text style={[styles.badgeText, { 
          color: theme.name === 'dark' ? '#4ADE80' : '#F44336' 
        }]}>LIVE</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
    borderWidth: 2,
  },
  iconContainer: {
    marginRight: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  count: {
    fontSize: 42,
    fontWeight: 'bold',
    lineHeight: 42,
  },
  unit: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
