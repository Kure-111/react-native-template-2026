/**
 * 通知アイテムコンポーネント
 * 個別の通知を表示
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { getNotificationTypeConfig } from '../constants/notificationType';

export function NotificationItem({ notification, onPress, onMarkAsRead }) {
  const typeConfig = getNotificationTypeConfig(notification.type);
  const isUnread = !notification.isRead;

  const handlePress = () => {
    if (onPress) {
      onPress(notification);
    }
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.container,
        isUnread && styles.unreadContainer
      ]}
      accessibilityRole="button"
      accessibilityLabel={`通知: ${notification.title} ${notification.message}`}
    >
      <View style={styles.iconContainer}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: typeConfig.color + '20' }
          ]}
        >
          <Text style={styles.icon}>{typeConfig.icon}</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          {isUnread && <View style={styles.unreadDot} />}
        </View>

        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.timestamp}>
            {formatTimeAgo(notification.created_at)}
          </Text>
          <Text style={[styles.type, { color: typeConfig.color }]}>
            {typeConfig.displayName}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        ':hover': {
          backgroundColor: '#F9FAFB'
        }
      }
    })
  },
  unreadContainer: {
    backgroundColor: '#F0F9FF'
  },
  iconContainer: {
    marginRight: 12
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  icon: {
    fontSize: 20
  },
  contentContainer: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  type: {
    fontSize: 12,
    fontWeight: '500'
  }
});
