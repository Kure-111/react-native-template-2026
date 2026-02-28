/**
 * 落とし物検索画面
 * スプレッドシートから落とし物データを取得し、
 * タブ切替・テキスト検索・ステータスフィルタで閲覧する読み取り専用画面
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ThemedHeader } from '../../../shared/components/ThemedHeader';
import { Ionicons } from '../../../shared/components/icons';
import TabSelector from '../components/TabSelector';
import FilterBar from '../components/FilterBar';
import LostItemCard from '../components/LostItemCard';
import OwnerInquiryCard from '../components/OwnerInquiryCard';
import { useLostItems } from '../hooks/useLostItems';
import { SEARCH_PLACEHOLDER } from '../constants';

/** 画面名 */
const SCREEN_NAME = '落とし物検索';

/**
 * 落とし物検索メイン画面コンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.navigation - React Navigationのnavigationオブジェクト
 * @returns {JSX.Element} 落とし物検索画面
 */
const Item4Screen = ({ navigation }) => {
  /** テーマオブジェクト */
  const { theme } = useTheme();

  /** 更新ボタンが押せる状態かどうか（5秒クールダウン制御） */
  const [canRefresh, setCanRefresh] = useState(true);
  /** クールダウンタイマーのref */
  const cooldownTimer = useRef(null);

  /** 落とし物データ・検索・フィルタの状態管理 */
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    locationFilter,
    setLocationFilter,
    dateFilter,
    setDateFilter,
    availableLocations,
    availableDates,
    filteredItems,
    loading,
    refreshing,
    error,
    refresh,
  } = useLostItems();

  /**
   * 更新ボタンのハンドラ
   * 連打防止のため5秒間クールダウンを設ける
   */
  const handleRefreshPress = () => {
    if (!canRefresh) return;
    setCanRefresh(false);
    refresh();
    cooldownTimer.current = setTimeout(() => setCanRefresh(true), 5000);
  };

  /**
   * 各アイテムのレンダリング関数
   * タブに応じてLostItemCardまたはOwnerInquiryCardを描画する
   * @param {Object} params - FlatListのrenderItem引数
   * @param {Object} params.item - レンダリング対象のデータ
   * @returns {JSX.Element} カードコンポーネント
   */
  const renderItem = ({ item }) => {
    if (activeTab === 'owner') {
      return <OwnerInquiryCard item={item} />;
    }
    return <LostItemCard item={item} />;
  };

  /**
   * FlatListの各アイテムのキーを生成する
   * @param {Object} item - データアイテム
   * @param {number} index - インデックス
   * @returns {string} ユニークキー
   */
  const keyExtractor = (item, index) => {
    if (activeTab === 'owner') {
      return `owner-${item.id}-${index}`;
    }
    return `item-${item.tag}-${index}`;
  };

  /**
   * リストが空の場合の表示コンポーネント
   * @returns {JSX.Element} 空状態の表示
   */
  const renderEmpty = () => {
    if (loading) {
      return null;
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={48} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          該当するデータがありません
        </Text>
      </View>
    );
  };

  /**
   * エラー表示コンポーネント
   * @returns {JSX.Element} エラー画面
   */
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={theme.error} />
      <Text style={[styles.errorText, { color: theme.error }]}>
        {error}
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: theme.primary }]}
        onPress={refresh}
        activeOpacity={0.7}
      >
        <Text style={styles.retryButtonText}>再試行</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * ローディング表示コンポーネント
   * @returns {JSX.Element} ローディング画面
   */
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
        データを読み込み中...
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />

      {/* 検索バー + 更新ボタン */}
      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={SEARCH_PLACEHOLDER}
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        {/* 更新ボタン（5秒クールダウン中はグレーアウト） */}
        <TouchableOpacity
          style={[
            styles.refreshButton,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: canRefresh ? 1 : 0.4,
            },
          ]}
          onPress={handleRefreshPress}
          disabled={!canRefresh}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* フィルタバー（ステータス・場所・日付の3つのプルダウン） */}
      <FilterBar
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        locationFilter={locationFilter}
        onLocationChange={setLocationFilter}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        availableLocations={availableLocations}
        availableDates={availableDates}
        activeTab={activeTab}
      />

      {/* タブ切り替え */}
      <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />

      {/* コンテンツエリア */}
      {loading ? (
        renderLoading()
      ) : error ? (
        renderError()
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  /** 画面全体のコンテナ */
  container: {
    flex: 1,
  },
  /** 検索バーと更新ボタンの横並びコンテナ */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  /** 検索バーのコンテナ */
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  /** 更新ボタン */
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** 検索入力フィールド */
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },
  /** FlatListのコンテンツコンテナ */
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  /** ローディングコンテナ */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  /** ローディングテキスト */
  loadingText: {
    fontSize: 14,
  },
  /** エラーコンテナ */
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  /** エラーメッセージテキスト */
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  /** リトライボタン */
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  /** リトライボタンテキスト */
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  /** 空状態のコンテナ */
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  /** 空状態のテキスト */
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default Item4Screen;
