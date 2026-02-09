/**
 * 来場者推移グラフ（折れ線グラフ）
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, useWindowDimensions } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const CHART_HEIGHT = 180;

export const VisitorTrendChart = ({ history }) => {
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  
  // グラフの幅を画面幅から余白を引いたものに設定
  const CHART_WIDTH = Math.max(windowWidth - 56, 300);
  
  if (!history || history.length === 0) {
    return (
      <View style={[styles.container, { 
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }]}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="chart-line" size={20} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>来場者推移グラフ</Text>
        </View>
        <Text style={[styles.noData, { color: theme.textSecondary }]}>
          データがありません
        </Text>
      </View>
    );
  }

  // データの準備
  const maxCount = Math.max(...history.map(item => item.count), 1);
  const minCount = Math.min(...history.map(item => item.count), 0);
  const range = maxCount - minCount || 1;
  
  // 統計情報
  const totalCount = history.reduce((sum, item) => sum + item.count, 0);
  const avgCount = Math.round(totalCount / history.length);
  const latestCount = history[history.length - 1]?.count || 0;

  // グラフのポイントを計算
  const points = history.map((item, index) => {
    const x = (index / (history.length - 1)) * CHART_WIDTH;
    const y = CHART_HEIGHT - ((item.count - minCount) / range) * (CHART_HEIGHT - 40);
    return { x, y, count: item.count, time: new Date(item.counted_at) };
  });

  // SVGパスを生成（折れ線）
  const linePath = points.map((point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    return `L ${point.x} ${point.y}`;
  }).join(' ');

  // エリアパスを生成（塗りつぶし）
  const areaPath = `${linePath} L ${CHART_WIDTH} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`;

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.surface,
      borderColor: theme.border,
    }]}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="chart-line" size={20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>来場者推移グラフ</Text>
      </View>

      {/* 統計情報 */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>現在</Text>
          <Text style={[styles.statValue, { color: theme.primary }]}>{latestCount}人</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>平均</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>{avgCount}人</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>最大</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>{maxCount}人</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>合計</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>{totalCount}人</Text>
        </View>
      </View>

      {/* グラフエリア */}
      <View style={styles.chartContainer}>
        <View style={[styles.chartArea, { height: CHART_HEIGHT, width: CHART_WIDTH }]}>
          {/* グリッドライン */}
          {[0, 1, 2, 3, 4].map(i => {
            const y = (i / 4) * (CHART_HEIGHT - 40) + 20;
            const value = Math.round(maxCount - (i / 4) * range);
            return (
              <View key={i} style={[styles.gridLine, { top: y }]}>
                <View style={[styles.gridLineBar, { backgroundColor: theme.border }]} />
                <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>
                  {value}
                </Text>
              </View>
            );
          })}

          {/* エリアグラフ（塗りつぶし）- Canvas代替 */}
          <View style={styles.areaContainer}>
            {points.map((point, index) => {
              if (index === 0) return null;
              const prevPoint = points[index - 1];
              const width = point.x - prevPoint.x;
              const avgY = (point.y + prevPoint.y) / 2;
              const barHeight = CHART_HEIGHT - avgY;
              
              return (
                <View
                  key={index}
                  style={[
                    styles.areaSegment,
                    {
                      left: prevPoint.x,
                      top: avgY,
                      width: width,
                      height: barHeight,
                      backgroundColor: theme.primary,
                      opacity: 0.1,
                    }
                  ]}
                />
              );
            })}
          </View>

          {/* 折れ線グラフ */}
          {points.map((point, index) => {
            if (index === 0) return null;
            const prevPoint = points[index - 1];
            const width = Math.sqrt(
              Math.pow(point.x - prevPoint.x, 2) + Math.pow(point.y - prevPoint.y, 2)
            );
            const angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x) * (180 / Math.PI);
            
            return (
              <View
                key={index}
                style={[
                  styles.lineSegment,
                  {
                    left: prevPoint.x,
                    top: prevPoint.y,
                    width: width,
                    backgroundColor: theme.primary,
                    transform: [{ rotate: `${angle}deg` }],
                  }
                ]}
              />
            );
          })}

          {/* データポイント */}
          {points.map((point, index) => (
            <View
              key={index}
              style={[
                styles.dataPoint,
                {
                  left: point.x - 4,
                  top: point.y - 4,
                  backgroundColor: theme.primary,
                  borderColor: theme.surface,
                }
              ]}
            />
          ))}
        </View>

        {/* X軸ラベル */}
        <View style={styles.xAxisLabels}>
          {points.map((point, index) => {
            if (index % Math.ceil(points.length / 6) !== 0) return null;
            const hour = point.time.getHours();
            return (
              <Text
                key={index}
                style={[
                  styles.xLabel,
                  { 
                    left: point.x - 15,
                    color: theme.textSecondary,
                  }
                ]}
              >
                {hour}時
              </Text>
            );
          })}
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noData: {
    textAlign: 'center',
    paddingVertical: 40,
  },
  chartContainer: {
    position: 'relative',
    alignSelf: 'stretch',
  },
  chartArea: {
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  gridLineBar: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  gridLabel: {
    fontSize: 10,
    marginLeft: 8,
    width: 40,
    textAlign: 'right',
  },
  areaContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  areaSegment: {
    position: 'absolute',
  },
  lineSegment: {
    position: 'absolute',
    height: 3,
    transformOrigin: 'left center',
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  xAxisLabels: {
    position: 'relative',
    height: 20,
    marginTop: 8,
  },
  xLabel: {
    position: 'absolute',
    fontSize: 10,
    width: 30,
    textAlign: 'center',
  },
});
