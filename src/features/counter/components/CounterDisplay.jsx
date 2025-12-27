/**
 * カウンター表示コンポーネント
 * 現在のカウント値を表示します
 * StyleSheet でスタイリング
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * カウンター表示
 * @param {Object} props - プロパティ
 * @param {number} props.count - カウント値
 */
const CounterDisplay = ({ count }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>現在のカウント</Text>
      <Text style={styles.count}>{count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    minWidth: 200,
  },
  label: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  count: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});

export default CounterDisplay;
