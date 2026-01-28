/**
 * 通知センターコンポーネント
 * ヘッダーに表示される通知ドロップダウン
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions
} from 'react-native';
import { NotificationBell } from './NotificationBell';
import { NotificationList } from './NotificationList';
import { useNotifications } from '../hooks/useNotifications';
import { markNotificationAsRead } from '../../../shared/services/notificationService';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_MOBILE = SCREEN_WIDTH < 768;

export function NotificationCenter({ userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigation = useNavigation();

  const {
    notifications,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  } = useNotifications(userId, {
    limit: 10,
    autoRefresh: true
  });

  const handleBellPress = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleNotificationPress = async (notification) => {
    // 既読にする
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id, userId);
    }

    // モーダルを閉じる
    setIsOpen(false);

    // ディープリンクがあれば遷移
    if (notification.deep_link) {
      // deep_linkのパース（例: /item5/vendor/105）
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
    await markNotificationAsRead(notificationId, userId);
    refresh();
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigation.navigate('Notifications');
  };

  return (
    <>
      <NotificationBell userId={userId} onPress={handleBellPress} />

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <View
            style={[
              styles.dropdown,
              IS_MOBILE ? styles.dropdownMobile : styles.dropdownDesktop
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* ヘッダー */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>通知</Text>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 通知リスト */}
            <View style={styles.listContainer}>
              <NotificationList
                notifications={notifications.slice(0, 5)}
                loading={loading}
                error={error}
                hasMore={false}
                onNotificationPress={handleNotificationPress}
                onMarkAsRead={handleMarkAsRead}
                onRefresh={refresh}
                emptyMessage="新しい通知はありません"
              />
            </View>

            {/* フッター */}
            <View style={styles.footer}>
              <TouchableOpacity onPress={handleViewAll} style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>すべて表示</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'web' ? 60 : 50,
    paddingRight: Platform.OS === 'web' ? 16 : 0
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5
  },
  dropdownDesktop: {
    width: 400,
    maxHeight: 600,
    marginRight: 16
  },
  dropdownMobile: {
    width: '100%',
    height: '100%',
    borderRadius: 0
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827'
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
    paddingHorizontal: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none'
      }
    })
  },
  listContainer: {
    flex: 1,
    minHeight: 200
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center'
  },
  viewAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none'
      }
    })
  }
});
