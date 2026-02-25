/**
 * 警備配置図コンポーネント
 */

import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { MaterialCommunityIcons } from '../../../shared/components/icons';

export const SecurityPlacement = () => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 480;

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.surface,
      borderColor: theme.border,
    }]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="shield-account" size={isMobile ? 18 : 20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }, isMobile && styles.titleMobile]}>警備配置図</Text>
      </View>

      <View style={[styles.placeholderArea, { backgroundColor: theme.background }, isMobile && styles.placeholderAreaMobile]}>
        <MaterialCommunityIcons name="map-marker-multiple" size={isMobile ? 36 : 48} color={theme.textSecondary} />
        <Text style={[styles.placeholderText, { color: theme.textSecondary }, isMobile && styles.placeholderTextMobile]}>
          警備配置図は準備中です
        </Text>
        <Text style={[styles.placeholderSubtext, { color: theme.textSecondary }, isMobile && styles.placeholderSubtextMobile]}>
          各警備員の配置位置を地図上に表示予定
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
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
  titleMobile: {
    fontSize: 14,
  },
  placeholderArea: {
    height: 200,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderAreaMobile: {
    height: 150,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  placeholderTextMobile: {
    fontSize: 12,
  },
  placeholderSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  placeholderSubtextMobile: {
    fontSize: 11,
  },
});
