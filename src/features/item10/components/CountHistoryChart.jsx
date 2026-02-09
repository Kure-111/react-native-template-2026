import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';

// 時間帯別グラフ（棒グラフ版）
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

  // 最大値を取得してスケーリング
  const maxCount = Math.max(...history.map(item => item.count), 1);
  const chartHeight = 150;

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.surface,
      borderColor: theme.border,
    }]}>
      <Text style={[styles.title, { color: theme.text }]}>時間帯別来場者数</Text>
      
      {/* 最大値表示 */}
      <View style={styles.maxValueContainer}>
        <Text style={[styles.maxValue, { color: theme.textSecondary }]}>
          最大: {maxCount}人
        </Text>
      </View>

      {/* グラフエリア */}
      <View style={[styles.chartArea, { height: chartHeight }]}>
        {history.map((item, index) => {
          const time = new Date(item.counted_at).getHours();
          const barHeight = (item.count / maxCount) * (chartHeight - 30);
          
          return (
            <View key={index} style={styles.barContainer}>
              {/* 数値ラベル */}
              <Text style={[styles.barValue, { color: theme.text }]}>
                {item.count}
              </Text>
              
              {/* 棒グラフ */}
              <View style={styles.barWrapper}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: Math.max(barHeight, 2),
                      backgroundColor: theme.primary,
                    }
                  ]} 
                />
              </View>
              
              {/* 時間ラベル */}
              <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>
                {time}時
              </Text>
            </View>
          );
        })}
      </View>

      {/* X軸の線 */}
      <View style={[styles.xAxis, { backgroundColor: theme.border }]} />
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
    marginBottom: 8,
  },
  maxValueContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  maxValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  noData: {
    textAlign: 'center',
    paddingVertical: 20,
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 2,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  barWrapper: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: '80%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  timeLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  xAxis: {
    height: 1,
    marginTop: 0,
  },
});

