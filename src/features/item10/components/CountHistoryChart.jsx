import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';

// 時間帯別グラフ（簡易版）
export const CountHistoryChart = ({ history }) => {
  const { theme } = useTheme();
  
  if (!history || history.length === 0) {
    return (
      <View style={[styles.container, { 
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }]}>
        <Text style={[styles.title, { color: theme.text }]}>時間帯別来場者数</Text>
        <Text style={[styles.noData, { color: theme.textSecondary }]}>データがありません</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.surface,
      borderColor: theme.border,
    }]}>
      <Text style={[styles.title, { color: theme.text }]}>時間帯別来場者数</Text>
      <View style={styles.chartArea}>
        {history.map((item, index) => {
          const time = new Date(item.counted_at).getHours();
          return (
            <View key={index} style={styles.chartItem}>
              <Text style={[styles.chartValue, { color: theme.primary }]}>{item.count}</Text>
              <Text style={[styles.chartLabel, { color: theme.textSecondary }]}>{time}時</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  noData: {
    textAlign: 'center',
    paddingVertical: 20,
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  chartItem: {
    alignItems: 'center',
  },
  chartValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  chartLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});
