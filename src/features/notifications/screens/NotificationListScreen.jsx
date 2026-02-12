/**
 * 通知一覧画面
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ThemedHeader } from '../../../shared/components/ThemedHeader';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  getNotificationsForUser,
  markNotificationRead,
} from '../../../shared/services/notificationService';

const SCREEN_NAME = '通知一覧';

const NotificationListScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [filter, setFilter] = useState('all');

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    const { items: fetchedItems, error } = await getNotificationsForUser(user.id);
    if (error) {
      setErrorMessage('通知の取得に失敗しました');
      setIsLoading(false);
      return;
    }
    setItems(fetchedItems);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handlePressItem = async (item) => {
    if (!item.readAt) {
      await markNotificationRead(item.recipientId);
      setItems((prev) =>
        prev.map((row) =>
          row.recipientId === item.recipientId
            ? { ...row, readAt: new Date().toISOString() }
            : row
        )
      );
    }
  };

  const renderItem = ({ item }) => {
    const isUnread = !item.readAt;
    const title = item.notification?.title ?? '（タイトルなし）';
    const body = item.notification?.body ?? '';
    const createdAt = item.notification?.created_at ?? item.createdAt;
    const createdText = createdAt ? new Date(createdAt).toLocaleString() : '';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: isUnread ? theme.primary : theme.border,
          },
        ]}
        onPress={() => handlePressItem(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
          {isUnread && <Text style={[styles.unreadBadge, { color: theme.primary }]}>未読</Text>}
        </View>
        <Text style={[styles.cardBody, { color: theme.textSecondary }]} numberOfLines={2}>
          {body}
        </Text>
        <Text style={[styles.cardDate, { color: theme.textSecondary }]}>{createdText}</Text>
      </TouchableOpacity>
    );
  };

  const filteredItems = items.filter((item) => {
    if (filter === 'unread') {
      return !item.readAt;
    }
    if (filter === 'read') {
      return !!item.readAt;
    }
    return true;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.refreshButton, { borderColor: theme.border }]}
          onPress={loadNotifications}
        >
          <Text style={{ color: theme.text }}>更新</Text>
        </TouchableOpacity>
        <View style={styles.filterGroup}>
          {[
            { key: 'all', label: '全て' },
            { key: 'unread', label: '未読のみ' },
            { key: 'read', label: '既読のみ' },
          ].map((option) => {
            const isActive = filter === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: isActive ? theme.primary : theme.surface,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setFilter(option.key)}
              >
                <Text style={{ color: isActive ? '#fff' : theme.text }}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {errorMessage !== '' && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.error }]}>{errorMessage}</Text>
        </View>
      )}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.recipientId}
        renderItem={renderItem}
        contentContainerStyle={filteredItems.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            通知はまだありません
          </Text>
        }
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadNotifications} />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  filterGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  errorText: {
    fontSize: 14,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    paddingRight: 8,
  },
  unreadBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    marginTop: 8,
    fontSize: 14,
  },
  cardDate: {
    marginTop: 8,
    fontSize: 12,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
  },
});

export default NotificationListScreen;
