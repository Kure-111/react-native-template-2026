import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 来場者カウンター表示（表示のみ）
export const VisitorCounter = ({ count }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>来場者数</Text>
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.unit}>人</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  count: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  unit: {
    fontSize: 18,
    color: '#666',
    marginTop: 4,
  },
});
