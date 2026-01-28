/**
 * 未読通知数取得フック
 */

import { useState, useEffect, useCallback } from 'react';
import { getUnreadNotificationCount } from '../../../shared/services/notificationService';

/**
 * 未読通知数を取得するフック
 * @param {string} userId - ユーザーID
 * @param {object} options - オプション
 * @returns {object} 未読数と更新関数
 */
export function useUnreadCount(userId, options = {}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    autoRefresh = true,
    refreshInterval = 10000 // 10秒
  } = options;

  // 未読数を取得
  const fetchUnreadCount = useCallback(async () => {
    try {
      if (!userId) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const count = await getUnreadNotificationCount(userId);
      setUnreadCount(count);
      setLoading(false);
    } catch (err) {
      console.error('未読数取得エラー:', err);
      setError(err.message);
      setUnreadCount(0);
      setLoading(false);
    }
  }, [userId]);

  // 未読数を更新
  const refresh = useCallback(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // 未読数を減らす（既読にした時）
  const decrementCount = useCallback((amount = 1) => {
    setUnreadCount(prev => Math.max(0, prev - amount));
  }, []);

  // 未読数を増やす（新規通知受信時）
  const incrementCount = useCallback((amount = 1) => {
    setUnreadCount(prev => prev + amount);
  }, []);

  // 初回読み込み
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // 自動更新
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      fetchUnreadCount();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchUnreadCount]);

  return {
    unreadCount,
    loading,
    error,
    refresh,
    decrementCount,
    incrementCount
  };
}
