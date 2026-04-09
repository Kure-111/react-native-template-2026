/**
 * カードリストモード用スケジュール表示コンポーネント
 * ブックマーク単一選択で、イベントをカード形式で縦表示
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Ionicons } from '../../../shared/components/icons';
import DetailModal from '../../01_Events&Stalls_list/components/DetailModal';

/**
 * カードリストモード用スケジュール表示コンポーネント
 * @param {{
 *   events: Array<Object>,
 *   loading: boolean,
 *   error: Error|null,
 *   activeBookmarkId: string,
 *   allBookmarks: Array<Object>,
 *   onActiveBookmarkChange: Function,
 *   onRefresh: Function,
 *   selectedDate: string,
 *   showBookmarkSelector?: boolean
 * }} props
 */
export const CardListSchedule = ({
  events,
  loading,
  error,
  activeBookmarkId,
  allBookmarks,
  onActiveBookmarkChange,
  onRefresh,
  selectedDate,
  showBookmarkSelector = true,
}) => {
  const { theme } = useTheme();

  // ローカル状態
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBookmarkDropdown, setShowBookmarkDropdown] = useState(false);

  // アクティブなブックマーク
  const activeBookmark = useMemo(
    () =>
      allBookmarks?.find(
        (bm) => String(bm?.id || '') === String(activeBookmarkId || '')
      ),
    [activeBookmarkId, allBookmarks]
  );

  /**
   * ブックマーク選択変更時のハンドラー
   */
  const handleBookmarkSelect = useCallback(
    (bookmarkId) => {
      if (onActiveBookmarkChange) {
        onActiveBookmarkChange(bookmarkId);
      }
      setShowBookmarkDropdown(false);
    },
    [onActiveBookmarkChange]
  );

  /**
   * イベントカードタップ時のハンドラー
   */
  const handleEventCardPress = useCallback((eventItem) => {
    setSelectedEvent(eventItem);
    setShowDetailModal(true);
  }, []);

  /**
   * 詳細モーダル閉じる時のハンドラー
   */
  const handleDetailModalClose = useCallback(() => {
    setShowDetailModal(false);
    setSelectedEvent(null);
  }, []);

  /**
   * 時刻文字列をフォーマット（HH:mm）
   */
  const formatTimeLabel = useCallback((timeText) => {
    const parts = String(timeText || '').split(':');
    return `${parts[0]}:${parts[1] || '00'}`;
  }, []);

  /**
   * イベント時刻範囲をフォーマット
   */
  const formatTimeRange = useCallback((startTime, endTime) => {
    const start = formatTimeLabel(startTime);
    const end = formatTimeLabel(endTime);
    return start && end ? `${start} - ${end}` : start || end || '時間未設定';
  }, [formatTimeLabel]);

  /**
   * 場所名を生成（建物 + 場所）
   */
  const buildLocationLabel = useCallback((eventItem) => {
    const building = String(eventItem?.buildingLocationName || '').trim() || '場所未設定';
    const location = String(eventItem?.locationName || '').trim();
    return [building, location].filter(Boolean).join(' ');
  }, []);

  /**
   * 企画カテゴリ表示名を生成する
   */
  const buildCategoryLabel = useCallback((eventItem) => {
    return (
      String(eventItem?.categoryName || '').trim() ||
      String(eventItem?.categoryId || '').trim() ||
      '未設定'
    );
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ブックマーク選択ドロップダウン */}
      {showBookmarkSelector ? (
      <View style={[styles.bookmarkSelectorContainer, { borderColor: theme.border }]}> 
        <Text style={[styles.bookmarkLabel, { color: theme.textSecondary }]}>
          表示対象：
        </Text>
        <Pressable
          style={[
            styles.bookmarkButton,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
          onPress={() => setShowBookmarkDropdown(!showBookmarkDropdown)}
        >
          <Text style={[styles.bookmarkButtonText, { color: theme.text }]}>
            {activeBookmark?.name || 'ブックマークを選択'}
          </Text>
          <Ionicons
            name={showBookmarkDropdown ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>

        {/* ドロップダウンメニュー */}
        {showBookmarkDropdown && (
          <View
            style={[
              styles.dropdownMenu,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <ScrollView
              nestedScrollEnabled
              style={styles.dropdownScroll}
              showsVerticalScrollIndicator={true}
              scrollEventThrottle={16}
            >
              {allBookmarks?.map((bookmark) => (
                <Pressable
                  key={String(bookmark?.id || '')}
                  style={[
                    styles.dropdownItem,
                    {
                      backgroundColor:
                        String(bookmark?.id || '') ===
                        String(activeBookmarkId || '')
                          ? theme.primary + '20'
                          : 'transparent',
                    },
                  ]}
                  onPress={() => handleBookmarkSelect(bookmark?.id)}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      {
                        color:
                          String(bookmark?.id || '') ===
                          String(activeBookmarkId || '')
                            ? theme.primary
                            : theme.text,
                        fontWeight:
                          String(bookmark?.id || '') ===
                          String(activeBookmarkId || '')
                            ? '700'
                            : '600',
                      },
                    ]}
                  >
                    {bookmark?.name || 'ブックマーク'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
      ) : null}

      {/* エラー表示 */}
      {error && !loading && (
        <View style={[styles.errorContainer, { backgroundColor: theme.error + '20' }]}>
          <Text style={[styles.errorText, { color: theme.error }]}>
            イベント読み込みエラー
          </Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.error }]}
            onPress={onRefresh}
          >
            <Text style={[styles.retryButtonText, { color: '#fff' }]}>
              再取得
            </Text>
          </Pressable>
        </View>
      )}

      {/* ローディング表示 */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.primary}
          />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            読み込み中...
          </Text>
        </View>
      )}

      {/* イベントリスト */}
      {!loading && events && events.length > 0 ? (
        <ScrollView
          style={styles.eventListContainer}
          showsVerticalScrollIndicator={true}
          scrollEventThrottle={16}
        >
          {events.map((eventItem, index) => {
            const eventName =
              String(eventItem?.eventName || eventItem?.displayName || eventItem?.name || '').trim() ||
              '名称未設定';
            const startTime = eventItem?.startTime || eventItem?.start_time;
            const endTime = eventItem?.endTime || eventItem?.end_time;
            const locationLabel = buildLocationLabel(eventItem);
            const timeRange = formatTimeRange(startTime, endTime);
            const categoryLabel = buildCategoryLabel(eventItem);

            return (
              <Pressable
                key={`${eventName}-${index}`}
                style={[
                  styles.eventCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => handleEventCardPress(eventItem)}
              >
                {/* 時刻バッジ */}
                <View
                  style={[
                    styles.timeSection,
                    {
                      backgroundColor: theme.primary + '15',
                      borderColor: theme.primary,
                    },
                  ]}
                >
                  <Text style={[styles.timeText, { color: theme.primary }]}>
                    {formatTimeLabel(startTime)}
                  </Text>
                </View>

                {/* イベント情報 */}
                <View style={styles.infoSection}>
                  <Text style={[styles.metaHeading, { color: theme.textSecondary }]}>企画名</Text>
                  <Text
                    style={[styles.eventName, { color: theme.text }]}
                    numberOfLines={2}
                  >
                    {eventName}
                  </Text>

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="pricetag"
                      size={14}
                      color={theme.textSecondary}
                    />
                    <Text style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
                      {categoryLabel}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="time"
                      size={14}
                      color={theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.detailText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {timeRange}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="location"
                      size={14}
                      color={theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.detailText,
                        { color: theme.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {locationLabel}
                    </Text>
                  </View>
                </View>

                {/* 詳細ボタン */}
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            );
          })}
          <View style={styles.listFooter} />
        </ScrollView>
      ) : !loading && (!events || events.length === 0) ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="calendar-outline"
            size={48}
            color={theme.textSecondary}
          />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {selectedDate && activeBookmark
              ? 'このブックマークのイベントは\nまだ表示されていません'
              : 'ブックマークを選択してください'}
          </Text>
        </View>
      ) : null}

      {/* 詳細モーダル（時間表モードと同じコンポーネント呼び出し） */}
      <DetailModal
        visible={showDetailModal}
        item={selectedEvent}
        onClose={handleDetailModalClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
  },

  /* ブックマークセレクター */
  bookmarkSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
    gap: 8,
  },

  bookmarkLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  bookmarkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },

  bookmarkButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  dropdownMenu: {
    position: 'absolute',
    top: 50,
    left: 8,
    right: 8,
    maxHeight: 250,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },

  dropdownScroll: {
    maxHeight: 250,
  },

  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
  },

  dropdownItemText: {
    fontSize: 14,
  },

  /* ローディング・エラー表示 */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },

  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },

  errorContainer: {
    marginHorizontal: 8,
    marginVertical: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },

  errorText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },

  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* イベントリスト */
  eventListContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },

  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },

  timeSection: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 12,
    minWidth: 60,
    alignItems: 'center',
  },

  timeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  infoSection: {
    flex: 1,
    gap: 6,
  },

  eventName: {
    fontSize: 15,
    fontWeight: '700',
  },

  metaHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  detailText: {
    fontSize: 12,
    flexShrink: 1,
  },

  /* 空状態 */
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },

  emptyText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  listFooter: {
    height: 12,
  },
});
