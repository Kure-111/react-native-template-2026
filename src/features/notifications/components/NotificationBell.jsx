/**
 * 通知ベルアイコンコンポーネント
 * ヘッダーに表示される未読バッジ付きベルアイコン
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useUnreadCount } from '../hooks/useUnreadCount';

export function NotificationBell({ userId, onPress }) {
  const { unreadCount, loading } = useUnreadCount(userId);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      accessibilityLabel={`通知 ${unreadCount}件の未読があります`}
      accessibilityRole="button"
    >
      <View style={styles.bellContainer}>
        <Text style={styles.bellIcon}>🔔</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    marginRight: 8
  },
  bellContainer: {
    position: 'relative',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center'
  },
  bellIcon: {
    fontSize: 24,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none'
      }
    })
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center'
  }
});
