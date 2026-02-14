/**
 * Item10 メイン画面
 * 時間、タイムスケジュール、全体マップ
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, useWindowDimensions } from 'react-native';
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
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768; // タブレット以下
  const isMobile = width < 480; // スマホ

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />
      
      <ScrollView style={styles.scrollView}>
        <View style={[styles.contentContainer, isMobile && styles.contentContainerMobile]}>
          {/* デジタル時計 */}
          <View style={styles.topRow}>
            <DigitalClock />
          </View>

          {/* レスポンシブレイアウト: 大画面は2列、小画面は1列 */}
          <View style={[
            styles.gridContainer,
            isSmallScreen && styles.gridContainerSmall
          ]}>
            {/* 左列/上: 全体マップ */}
            <View style={[
              styles.leftColumn,
              isSmallScreen && styles.columnSmall
            ]}>
              <CampusMap />
            </View>

            {/* 右列/下: タイムスケジュール */}
            <View style={[
              styles.rightColumn,
              isSmallScreen && styles.columnSmall
            ]}>
              <TimeSchedule />
            </View>
          </View>
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
    padding: 12,
  },
  contentContainerMobile: {
    padding: 8,
  },
  topRow: {
    marginBottom: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 500,
  },
  gridContainerSmall: {
    flexDirection: 'column',
    gap: 8,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
  },
  columnSmall: {
    flex: 1,
    width: '100%',
    minHeight: 400,
  },
});

export default Item10Screen;
