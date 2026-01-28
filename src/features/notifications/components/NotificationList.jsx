/**
 * 通知リストコンポーネント
 * 通知の一覧を表示
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Platform
} from 'react-native';
import { NotificationItem } from './NotificationItem';

export function NotificationList({
  notifications,
  loading,
  error,
  hasMore,
  onLoadMore,
  onRefresh,
  onNotificationPress,
  onMarkAsRead,
  emptyMessage = '通知はありません'
}) {
  const renderItem = ({ item }) => (
    <NotificationItem
      notification={item}
      onPress={onNotificationPress}
      onMarkAsRead={onMarkAsRead}
    />
  );

  const renderFooter = () => {
    if (!loading || notifications.length === 0) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading && notifications.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.emptyText}>読み込み中...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>通知の読み込みに失敗しました</Text>
          <Text style={styles.errorDetail}>{error}</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔔</Text>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  };

  const handleEndReached = () => {
    if (hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  };

  return (
    <FlatList
      data={notifications}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={loading && notifications.length > 0}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        ) : undefined
      }
      style={styles.list}
      contentContainerStyle={
        notifications.length === 0 ? styles.emptyListContent : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  emptyListContent: {
    flex: 1
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center'
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8
  },
  errorDetail: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center'
  },
  footer: {
    padding: 16,
    alignItems: 'center'
  }
});
