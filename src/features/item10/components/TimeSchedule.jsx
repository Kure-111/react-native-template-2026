/**
 * タイムスケジュールコンポーネント
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { MaterialCommunityIcons } from '../../../shared/components/icons';

// タイムスケジュールデータ（サンプル）
const SCHEDULE_DATA = [
  { time: '09:00', title: '開場', description: '各ブース準備開始', icon: 'door-open' },
  { time: '10:00', title: 'オープニングセレモニー', description: 'メインステージ', icon: 'party-popper' },
  { time: '10:30', title: 'ブース営業開始', description: '全エリア', icon: 'store' },
  { time: '12:00', title: '昼食タイム', description: 'フードエリア混雑予想', icon: 'food' },
  { time: '13:00', title: 'ステージイベント①', description: 'ダンスパフォーマンス', icon: 'music' },
  { time: '14:30', title: 'ステージイベント②', description: 'バンド演奏', icon: 'guitar-electric' },
  { time: '16:00', title: 'クロージングセレモニー', description: 'メインステージ', icon: 'star' },
  { time: '17:00', title: '閉場', description: '片付け開始', icon: 'door-closed' },
];

export const TimeSchedule = () => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 480;
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinutes;

  // 現在時刻と比較して過去/現在/未来を判定
  const getEventStatus = (timeStr) => {
    const [hour, minute] = timeStr.split(':').map(Number);
    const eventTimeInMinutes = hour * 60 + minute;
    
    if (eventTimeInMinutes < currentTimeInMinutes - 30) {
      return 'past'; // 30分以上前
    } else if (eventTimeInMinutes <= currentTimeInMinutes + 30) {
      return 'current'; // 現在進行中（前後30分）
    } else {
      return 'future'; // 未来
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="clock-outline" size={20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>本日のタイムスケジュール</Text>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.timeline}>
          {SCHEDULE_DATA.map((item, index) => {
            const status = getEventStatus(item.time);
            const isLast = index === SCHEDULE_DATA.length - 1;

            return (
              <View key={index} style={styles.timelineItem}>
                {/* タイムライン線 */}
                <View style={styles.timelineLeft}>
                  <View 
                    style={[
                      styles.timelineDot,
                      { 
                        backgroundColor: status === 'current' ? theme.primary : theme.border,
                        borderColor: status === 'current' ? theme.primary : theme.border,
                      }
                    ]}
                  >
                    {status === 'current' && (
                      <View style={[styles.dotInner, { backgroundColor: theme.primary }]} />
                    )}
                  </View>
                  {!isLast && (
                    <View 
                      style={[
                        styles.timelineLine,
                        { backgroundColor: status === 'past' ? theme.border : theme.border }
                      ]}
                    />
                  )}
                </View>

                {/* イベント内容 */}
                <View 
                  style={[
                    styles.eventCard,
                    { 
                      backgroundColor: status === 'current' ? theme.primary + '20' : 'transparent',
                      borderColor: status === 'current' ? theme.primary : theme.border,
                      opacity: status === 'past' ? 0.5 : 1,
                    }
                  ]}
                >
                  <View style={styles.eventHeader}>
                    <Text style={[
                      styles.eventTime,
                      { 
                        color: status === 'current' ? theme.primary : theme.text,
                        fontWeight: status === 'current' ? 'bold' : '600',
                      }
                    ]}>
                      {item.time}
                    </Text>
                    <MaterialCommunityIcons 
                      name={item.icon} 
                      size={20} 
                      color={status === 'current' ? theme.primary : theme.textSecondary} 
                    />
                  </View>
                  <Text style={[
                    styles.eventTitle,
                    { 
                      color: theme.text,
                      fontWeight: status === 'current' ? 'bold' : '600',
                    }
                  ]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.eventDescription, { color: theme.textSecondary }]}>
                    {item.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 0,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flex: 1,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  timeline: {
    paddingLeft: 8,
    paddingBottom: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineLeft: {
    width: 30,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  eventCard: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 13,
  },
  eventTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  eventDescription: {
    fontSize: 11,
  },
});
