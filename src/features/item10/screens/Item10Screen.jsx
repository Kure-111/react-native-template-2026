/**
 * Item10 メイン画面
 * 時間、タイムスケジュール、全体マップ
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ThemedHeader } from '../../../shared/components/ThemedHeader';
import { DigitalClock } from '../components/DigitalClock';
import { TimeSchedule } from '../components/TimeSchedule';
import { CampusMap } from '../components/CampusMap';

/** 画面名 */
const SCREEN_NAME = 'タイムスケジュール・マップ';

/**
 * Item10 メイン画面コンポーネント
 */
const Item10Screen = ({ navigation }) => {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />
      
      <View style={styles.contentContainer}>
        {/* デジタル時計 */}
        <View style={styles.topRow}>
          <DigitalClock />
        </View>

        {/* 2列レイアウト: 左にマップ、右にスケジュール */}
        <View style={styles.gridContainer}>
          {/* 左列: 全体マップ */}
          <View style={styles.leftColumn}>
            <CampusMap />
          </View>

          {/* 右列: タイムスケジュール */}
          <View style={styles.rightColumn}>
            <TimeSchedule />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 12,
  },
  topRow: {
    marginBottom: 8,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
  },
});

export default Item10Screen;
