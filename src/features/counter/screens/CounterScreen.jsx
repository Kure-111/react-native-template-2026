/**
 * カウンター画面
 * カウンターのデモアプリケーション画面
 * StyleSheet でスタイリング
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useCounter } from '../hooks/useCounter';
import CounterDisplay from '../components/CounterDisplay';
import CounterButton from '../components/CounterButton';

/**
 * カウンター画面コンポーネント
 */
const CounterScreen = () => {
  /** カウンター機能を使用 */
  const { count, increment, decrement, reset, isMaxCount, isMinCount } = useCounter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <StatusBar style="auto" />

        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>カウンターデモ</Text>
          <Text style={styles.subtitle}>React Native Expo テンプレート</Text>
        </View>

        {/* カウンター表示 */}
        <View style={styles.displayContainer}>
          <CounterDisplay count={count} />
        </View>

        {/* ボタングループ */}
        <View style={styles.buttonGroup}>
          <CounterButton
            title="＋"
            onPress={increment}
            disabled={isMaxCount}
            variant="primary"
          />
          <CounterButton
            title="－"
            onPress={decrement}
            disabled={isMinCount}
            variant="secondary"
          />
        </View>

        {/* リセットボタン */}
        <View style={styles.resetContainer}>
          <CounterButton title="リセット" onPress={reset} variant="danger" />
        </View>

        {/* フッター */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            このテンプレートをフォークして開発を始めましょう
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  displayContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 32,
  },
  resetContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
});

export default CounterScreen;
