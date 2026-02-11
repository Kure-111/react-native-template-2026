/**
 * テーマ対応ヘッダーコンポーネント
 * 全画面で共通利用できるヘッダー
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const MOBILE_BREAKPOINT = 768;

/**
 * テーマ対応ヘッダー
 * @param {Object} props - コンポーネントプロパティ
 * @param {string} props.title - ヘッダータイトル
 * @param {Object} props.navigation - React Navigation
 * @returns {JSX.Element} ヘッダー
 */
export const ThemedHeader = ({ title, navigation }) => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;

  const openDrawer = () => {
    navigation.openDrawer();
  };

  return (
    <View style={[
      styles.header, 
      { 
        backgroundColor: theme.surface, 
        borderBottomColor: theme.border,
        shadowOpacity: theme.shadowOpacity,
      }
    ]}>
      {isMobile && (
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <Text style={[styles.menuButtonText, { color: theme.text }]}>☰</Text>
        </TouchableOpacity>
      )}
      <Text style={[
        styles.headerTitle, 
        { 
          color: theme.text,
          fontSize: theme.fontSize.large,
          fontWeight: theme.fontWeight,
        }
      ]}>
        {title}
      </Text>
      {isMobile && <View style={styles.menuButton} />}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
  },
});
