/**
 * カウンターカスタムフック
 * カウンターのロジックを管理します
 */

import { useState, useCallback } from 'react';
import {
  INITIAL_COUNT,
  MIN_COUNT,
  MAX_COUNT,
  INCREMENT_VALUE,
  DECREMENT_VALUE,
} from '../constants';

/**
 * カウンター機能を提供するカスタムフック
 * @returns {Object} カウンター機能のオブジェクト
 */
export const useCounter = () => {
  /** 現在のカウント値 */
  const [count, setCount] = useState(INITIAL_COUNT);

  /**
   * カウントアップ処理
   * 最大値を超えないようにガード
   */
  const increment = useCallback(() => {
    setCount((prevCount) => {
      if (prevCount >= MAX_COUNT) {
        return prevCount;
      }
      return prevCount + INCREMENT_VALUE;
    });
  }, []);

  /**
   * カウントダウン処理
   * 最小値を下回らないようにガード
   */
  const decrement = useCallback(() => {
    setCount((prevCount) => {
      if (prevCount <= MIN_COUNT) {
        return prevCount;
      }
      return prevCount - DECREMENT_VALUE;
    });
  }, []);

  /**
   * リセット処理
   * カウントを初期値に戻す
   */
  const reset = useCallback(() => {
    setCount(INITIAL_COUNT);
  }, []);

  /**
   * カウントを特定の値に設定
   * @param {number} value - 設定する値
   */
  const setCountValue = useCallback((value) => {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return;
    }
    // 最小値と最大値の範囲内に制限
    const clampedValue = Math.max(MIN_COUNT, Math.min(MAX_COUNT, numValue));
    setCount(clampedValue);
  }, []);

  /** カウントが最大値かどうか */
  const isMaxCount = count >= MAX_COUNT;

  /** カウントが最小値かどうか */
  const isMinCount = count <= MIN_COUNT;

  return {
    count,
    increment,
    decrement,
    reset,
    setCountValue,
    isMaxCount,
    isMinCount,
  };
};
