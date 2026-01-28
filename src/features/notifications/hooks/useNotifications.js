/**
 * 通知一覧取得フック
 */

import { useState, useEffect, useCallback } from 'react';
import { getUserNotifications } from '../../../shared/services/notificationService';

/**
 * ユーザーの通知一覧を取得するフック
 * @param {string} userId - ユーザーID
 * @param {object} options - オプション
 * @returns {object} 通知一覧と操作関数
 */
export function useNotifications(userId, options = {}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  
  const {
    limit = 20,
    filterByType = null,
    autoRefresh = false,
    refreshInterval = 30000 // 30秒
  } = options;

  const [offset, setOffset] = useState(0);

  // 通知を取得
  const fetchNotifications = useCallback(async (isLoadMore = false) => {
    try {
      if (!userId) return;

      setLoading(true);
      setError(null);

      const currentOffset = isLoadMore ? offset : 0;
      const data = await getUserNotifications(userId, {
        limit,
        offset: currentOffset,
        filterByType
      });

      if (isLoadMore) {
        setNotifications(prev => [...prev, ...data]);
      } else {
        setNotifications(data);
        setOffset(0);
      }

      // これ以上データがない場合
      if (data.length < limit) {
        setHasMore(false);
      }

      setLoading(false);
    } catch (err) {
      console.error('通知取得エラー:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [userId, limit, offset, filterByType]);

  // さらに読み込む
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setOffset(prev => prev + limit);
      fetchNotifications(true);
    }
  }, [loading, hasMore, limit, fetchNotifications]);

  // 再読み込み
  const refresh = useCallback(() => {
    setOffset(0);
    setHasMore(true);
    fetchNotifications(false);
  }, [fetchNotifications]);

  // 初回読み込み
  useEffect(() => {
    fetchNotifications(false);
  }, [userId, filterByType]);

  // 自動更新
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, refresh]);

  return {
    notifications,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  };
}
