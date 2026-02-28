/**
 * 落とし物データの取得・検索・フィルタを管理するカスタムフック
 * 3シート（一般・緊急・落とし主）のデータを取得し、
 * テキスト検索・ステータス・場所・日付フィルタを適用した結果を返す
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchAllLostItemData } from '../services/lostItemService';
import {
  DEFAULT_TAB,
  STATUS_FILTERS,
  LOCATION_FILTER_ALL,
  DATE_FILTER_ALL,
} from '../constants';

/**
 * 落とし物データの取得・検索・フィルタを管理するカスタムフック
 * @returns {Object} 落とし物データと操作関数
 */
export const useLostItems = () => {
  /** 一般落とし物リスト */
  const [normalItems, setNormalItems] = useState([]);
  /** 緊急落とし物リスト */
  const [urgentItems, setUrgentItems] = useState([]);
  /** 落とし主問い合わせリスト */
  const [ownerInquiries, setOwnerInquiries] = useState([]);
  /** 現在のアクティブタブキー */
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);
  /** 検索キーワード */
  const [searchQuery, setSearchQuery] = useState('');
  /** ステータスフィルタ */
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTERS.ALL);
  /** 場所フィルタ（LOCATION_FILTER_ALL = すべて） */
  const [locationFilter, setLocationFilter] = useState(LOCATION_FILTER_ALL);
  /** 日付フィルタ（DATE_FILTER_ALL = すべて、それ以外は "YYYY/MM/DD" 形式） */
  const [dateFilter, setDateFilter] = useState(DATE_FILTER_ALL);
  /** ローディング状態 */
  const [loading, setLoading] = useState(true);
  /** エラー状態 */
  const [error, setError] = useState(null);
  /** リフレッシュ中フラグ（プルリフレッシュ用） */
  const [refreshing, setRefreshing] = useState(false);

  /**
   * 3シートのデータを一括取得してstateに保持する
   * @param {boolean} isRefresh - プルリフレッシュかどうか
   */
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      /** 3シート分のパース済みデータ */
      const data = await fetchAllLostItemData();

      setNormalItems(data.normal);
      setUrgentItems(data.urgent);
      setOwnerInquiries(data.owner);
    } catch (err) {
      console.error('落とし物データ取得エラー:', err);
      setError(err.message || 'データの取得に失敗しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 画面表示時にデータ取得
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * プルリフレッシュ用のデータ再取得関数
   */
  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // タブ切り替え時に場所・日付フィルタをリセット
  useEffect(() => {
    setLocationFilter(LOCATION_FILTER_ALL);
    setDateFilter(DATE_FILTER_ALL);
  }, [activeTab]);

  /**
   * 現在のアクティブタブに対応する生データを返す
   */
  const currentTabData = useMemo(() => {
    switch (activeTab) {
      case 'normal':
        return normalItems;
      case 'urgent':
        return urgentItems;
      case 'owner':
        return ownerInquiries;
      default:
        return normalItems;
    }
  }, [activeTab, normalItems, urgentItems, ownerInquiries]);

  /**
   * 現在のタブデータから重複なしの場所一覧を抽出する
   * 場所フィルタのプルダウン選択肢として使用する
   */
  const availableLocations = useMemo(() => {
    const locs = currentTabData
      .map((item) => item.location)
      .filter(Boolean);
    return [...new Set(locs)].sort();
  }, [currentTabData]);

  /**
   * 現在のタブデータから重複なしの日付一覧を抽出する（新しい順）
   * 一般・緊急タブは foundTime、落とし主タブは noticedTime から "YYYY/MM/DD" を取得する
   */
  const availableDates = useMemo(() => {
    /** タブに応じた時刻フィールド名 */
    const timeKey = activeTab === 'owner' ? 'noticedTime' : 'foundTime';
    const dates = currentTabData
      .map((item) => {
        /** 時刻文字列から日付部分（YYYY/MM/DD）を抽出 */
        const t = item[timeKey] || '';
        return t.split(' ')[0];
      })
      .filter((d) => d && d.length > 0);
    return [...new Set(dates)].sort().reverse(); // 新しい日付順
  }, [currentTabData, activeTab]);

  /**
   * テキスト検索・ステータス・場所・日付フィルタを適用した表示用データ
   * タブ種別に応じて検索対象フィールドとステータス判定を切り替える
   */
  const filteredItems = useMemo(() => {
    /** 小文字に変換した検索キーワード */
    const query = searchQuery.toLowerCase().trim();
    /** タブに応じた時刻フィールド名（日付フィルタで使用） */
    const timeKey = activeTab === 'owner' ? 'noticedTime' : 'foundTime';

    return currentTabData.filter((item) => {
      // ステータスフィルタの適用
      if (statusFilter !== STATUS_FILTERS.ALL) {
        /** 落とし主タブかどうか */
        const isOwnerTab = activeTab === 'owner';
        /** アイテムが返却/対応済みかどうか */
        const isCompleted = isOwnerTab ? item.isResolved : item.isReturned;

        if (statusFilter === STATUS_FILTERS.HOLDING && isCompleted) {
          return false;
        }
        if (statusFilter === STATUS_FILTERS.RETURNED && !isCompleted) {
          return false;
        }
      }

      // 場所フィルタの適用
      if (locationFilter !== LOCATION_FILTER_ALL) {
        if (item.location !== locationFilter) {
          return false;
        }
      }

      // 日付フィルタの適用（時刻文字列の日付部分と比較）
      if (dateFilter !== DATE_FILTER_ALL) {
        /** アイテムの日付部分（YYYY/MM/DD） */
        const itemDate = (item[timeKey] || '').split(' ')[0];
        if (itemDate !== dateFilter) {
          return false;
        }
      }

      // テキスト検索の適用（キーワードが空なら全件通過）
      if (!query) {
        return true;
      }

      // タブ種別に応じた検索対象フィールド
      if (activeTab === 'owner') {
        // 落とし主タブ: 識別番号、紛失物名、場所
        return (
          item.id.toLowerCase().includes(query) ||
          item.lostItemName.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query)
        );
      }

      // 一般・緊急タブ: 識別タグ、拾得物名、拾得場所
      return (
        item.tag.toLowerCase().includes(query) ||
        item.itemName.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query)
      );
    });
  }, [currentTabData, searchQuery, statusFilter, locationFilter, dateFilter, activeTab]);

  return {
    /** 一般落とし物リスト（フィルタ前） */
    normalItems,
    /** 緊急落とし物リスト（フィルタ前） */
    urgentItems,
    /** 落とし主リスト（フィルタ前） */
    ownerInquiries,
    /** 現在のアクティブタブキー */
    activeTab,
    /** タブ切り替え関数 */
    setActiveTab,
    /** 検索キーワード */
    searchQuery,
    /** 検索キーワード更新関数 */
    setSearchQuery,
    /** ステータスフィルタ値 */
    statusFilter,
    /** ステータスフィルタ更新関数 */
    setStatusFilter,
    /** 場所フィルタ値 */
    locationFilter,
    /** 場所フィルタ更新関数 */
    setLocationFilter,
    /** 日付フィルタ値 */
    dateFilter,
    /** 日付フィルタ更新関数 */
    setDateFilter,
    /** 現在のタブで選択できる場所一覧 */
    availableLocations,
    /** 現在のタブで選択できる日付一覧（新しい順） */
    availableDates,
    /** フィルタ適用済みの表示データ */
    filteredItems,
    /** 初回ローディング中フラグ */
    loading,
    /** プルリフレッシュ中フラグ */
    refreshing,
    /** エラーメッセージ（null = エラーなし） */
    error,
    /** プルリフレッシュ用データ再取得関数 */
    refresh,
  };
};
