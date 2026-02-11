/**
 * 項目14画面
 * 会計対応画面の雛形
 */

import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ThemedHeader } from '../../../shared/components/ThemedHeader';
import { FEATURE_PLACEHOLDERS, SCREEN_DESCRIPTION, SCREEN_NAME } from '../constants';

/**
 * 項目14画面コンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.navigation - React Navigationのnavigationオブジェクト
 * @returns {JSX.Element} 項目14画面
 */
const Item14Screen = ({ navigation }) => {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{SCREEN_DESCRIPTION}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>実装予定の機能</Text>
          {FEATURE_PLACEHOLDERS.map((item, index) => (
            <Text key={`${item}-${index}`} style={[styles.featureItem, { color: theme.textSecondary }]}>
              {'\u2022'} {item}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  featureItem: {
    fontSize: 14,
    lineHeight: 22,
  },
});

export default Item14Screen;

