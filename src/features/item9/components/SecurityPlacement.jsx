/**
 * 警備配置図コンポーネント
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const SecurityPlacement = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.surface,
      borderColor: theme.border,
    }]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="shield-account" size={20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>警備配置図</Text>
      </View>

      <View style={[styles.placeholderArea, { backgroundColor: theme.background }]}>
        <MaterialCommunityIcons name="map-marker-multiple" size={48} color={theme.textSecondary} />
        <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
          警備配置図は準備中です
        </Text>
        <Text style={[styles.placeholderSubtext, { color: theme.textSecondary }]}>
          各警備員の配置位置を地図上に表示予定
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  placeholderArea: {
    height: 200,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  placeholderSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
});
