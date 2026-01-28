/**
 * 通知画面
 * すべての通知履歴を表示
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions
} from 'react-native';
import { NotificationList } from '../components/NotificationList';
import { useNotifications } from '../hooks/useNotifications';
import { markNotificationAsRead, markMultipleNotificationsAsRead } from '../../../shared/services/notificationService';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../../services/supabase/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_MOBILE = SCREEN_WIDTH < 768;

export default function NotificationScreen() {
  const [userId, setUserId] = useState(null);
  const [filterType, setFilterType] = useState(null);
  const navigation = useNavigation();

  // ユーザーIDを取得
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  const {
    notifications,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  } = useNotifications(userId, {
    limit: 20,
    filterByType: filterType
  });

  const handleNotificationPress = async (notification) => {
    // 既読にする
    if (!notification.isRead && userId) {
      await markNotificationAsRead(notification.id, userId);
    }

    // ディープリンクがあれば遷移
    if (notification.deep_link) {
      const parts = notification.deep_link.split('/').filter(Boolean);
      if (parts.length > 0) {
        const screenName = parts[0];
        navigation.navigate(screenName);
      }
    }

    // 一覧を再読み込み
    setTimeout(() => {
      refresh();
    }, 500);
  };

  const handleMarkAsRead = async (notificationId) => {
    if (!userId) return;
    await markNotificationAsRead(notificationId, userId);
    refresh();
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    
    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;

    const notificationIds = unreadNotifications.map(n => n.id);
    await markMultipleNotificationsAsRead(notificationIds, userId);
    refresh();
  };

  const filterButtons = [
    { label: 'すべて', value: null },
    { label: '情報', value: 'info' },
    { label: '成功', value: 'success' },
    { label: '警告', value: 'warning' },
    { label: 'エラー', value: 'error' }
  ];

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>通知</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>すべて既読</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* フィルター */}
      <View style={styles.filterContainer}>
        {filterButtons.map((button) => (
          <TouchableOpacity
            key={button.value || 'all'}
            onPress={() => setFilterType(button.value)}
            style={[
              styles.filterButton,
              filterType === button.value && styles.filterButtonActive
            ]}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterType === button.value && styles.filterButtonTextActive
              ]}
            >
              {button.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 通知リスト */}
      <NotificationList
        notifications={notifications}
        loading={loading}
        error={error}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onRefresh={refresh}
        onNotificationPress={handleNotificationPress}
        onMarkAsRead={handleMarkAsRead}
        emptyMessage={
          filterType
            ? `${filterButtons.find(b => b.value === filterType)?.label}の通知はありません`
            : '通知はありません'
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827'
  },
  markAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 6
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none'
      }
    })
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexWrap: 'wrap',
    gap: 8
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6'
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none'
      }
    })
  },
  filterButtonTextActive: {
    color: '#ffffff'
  }
});
