/**
 * Item10 簡易テスト版
 * エラー特定用の最小限の実装
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { ThemedHeader } from '../../../shared/components/ThemedHeader';
import { useTheme } from '../../../shared/hooks/useTheme';

const SCREEN_NAME = '実長システム（テスト版）';

const Item10Screen = ({ navigation }) => {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>✅ Item10画面が表示されました</Text>
          <Text style={styles.text}>
            このシンプル版が表示される場合、
            元のItem10Screen.jsxに問題があります。
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.subtitle}>次のステップ：</Text>
          <Text style={styles.text}>
            1. 開発サーバーのターミナルでエラーログを確認{'\n'}
            2. 赤文字のエラーメッセージをコピー{'\n'}
            3. そのエラーメッセージを共有
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>想定される原因：</Text>
          <Text style={styles.infoText}>
            • パッケージが見つからない{'\n'}
            • インポートパスが間違っている{'\n'}
            • コンポーネントに構文エラー{'\n'}
            • Supabase接続エラー
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#E65100',
    lineHeight: 22,
  },
});

export default Item10Screen;
