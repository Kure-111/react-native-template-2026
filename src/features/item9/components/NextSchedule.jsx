/**
 * 次の予定表示コンポーネント
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '../../../shared/components/icons';
import { useTheme } from '../../../shared/hooks/useTheme';

// タイムスケジュールデータ（TimeSchedule.jsxと同じ）
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

// 次の予定を取得
const getNextEvent = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinutes;

  // 現在時刻以降の予定を検索
  for (let i = 0; i < SCHEDULE_DATA.length; i++) {
    const [hour, minute] = SCHEDULE_DATA[i].time.split(':').map(Number);
    const eventTimeInMinutes = hour * 60 + minute;
    
    if (eventTimeInMinutes >= currentTimeInMinutes) {
      return SCHEDULE_DATA[i];
    }
  }

  // すべての予定が終了している場合はnull
  return null;
};

// 残り時間を計算
const getTimeUntilEvent = (eventTime) => {
  const now = new Date();
  const [hour, minute] = eventTime.split(':').map(Number);
  const eventDate = new Date(now);
  eventDate.setHours(hour, minute, 0, 0);

  const diffMs = eventDate - now;
  const diffMins = Math.floor(diffMs / 1000 / 60);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours > 0) {
    return `${hours}時間${mins}分後`;
  } else if (mins > 0) {
    return `${mins}分後`;
  } else {
    return '開始中';
  }
};

export const NextSchedule = () => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 480;
  const [nextEvent, setNextEvent] = useState(null);
  const [timeUntil, setTimeUntil] = useState('');

  useEffect(() => {
    const updateNextEvent = () => {
      const event = getNextEvent();
      setNextEvent(event);
      if (event) {
        setTimeUntil(getTimeUntilEvent(event.time));
      }
    };

    // 初回実行
    updateNextEvent();

    // 1分ごとに更新
    const interval = setInterval(updateNextEvent, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!nextEvent) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="check-circle" size={28} color="#4CAF50" />
        </View>
        <View style={styles.content}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>次の予定</Text>
          <Text style={[styles.title, { color: theme.text }]}>すべて完了</Text>
          <Text style={[styles.time, { color: theme.textSecondary }]}>本日の予定は終了しました</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {!isMobile && (
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
          <MaterialCommunityIcons name={nextEvent.icon} size={28} color={theme.primary} />
        </View>
      )}
      <View style={styles.content}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>次の予定</Text>
        <Text style={[styles.title, { color: theme.text }, isMobile && styles.titleMobile]} numberOfLines={1}>
          {nextEvent.title}
        </Text>
        <View style={styles.timeRow}>
          <MaterialCommunityIcons name="clock-outline" size={14} color={theme.primary} />
          <Text style={[styles.time, { color: theme.primary }, isMobile && styles.timeMobile]}>
            {nextEvent.time} ({timeUntil})
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(33,150,243,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  titleMobile: {
    fontSize: 14,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  timeMobile: {
    fontSize: 12,
  },
});
