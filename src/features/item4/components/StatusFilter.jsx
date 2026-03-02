/**
 * ステータスフィルタコンポーネント
 * 「すべて」「保管中」「返却済み」のセグメントボタンを表示する
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { STATUS_FILTERS, STATUS_FILTER_LABELS } from '../constants';

/** フィルタボタンのキー配列（表示順） */
const FILTER_KEYS = [
  STATUS_FILTERS.ALL,
  STATUS_FILTERS.HOLDING,
  STATUS_FILTERS.RETURNED,
];

/**
 * ステータスフィルタコンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {string} props.activeFilter - 現在のアクティブフィルタキー
 * @param {Function} props.onFilterChange - フィルタ変更時のコールバック
 * @param {string} props.activeTab - 現在のアクティブタブキー（落とし主タブ時にラベルを変更する）
 * @returns {JSX.Element} ステータスフィルタUI
 */
const StatusFilter = ({ activeFilter, onFilterChange, activeTab }) => {
  /** テーマオブジェクト */
  const { theme } = useTheme();

  /**
   * タブに応じたフィルタラベルを返す
   * 落とし主タブでは「保管中」→「未対応」、「返却済み」→「対応済み」に変更
   * @param {string} filterKey - フィルタキー
   * @returns {string} 表示ラベル
   */
  const getFilterLabel = (filterKey) => {
    if (activeTab === 'owner') {
      if (filterKey === STATUS_FILTERS.HOLDING) return '未対応';
      if (filterKey === STATUS_FILTERS.RETURNED) return '対応済み';
    }
    return STATUS_FILTER_LABELS[filterKey];
  };

  return (
    <View style={styles.container}>
      {FILTER_KEYS.map((filterKey) => {
        /** このフィルタがアクティブかどうか */
        const isActive = activeFilter === filterKey;

        return (
          <TouchableOpacity
            key={filterKey}
            style={[
              styles.filterButton,
              {
                backgroundColor: isActive ? theme.primary : theme.surface,
                borderColor: isActive ? theme.primary : theme.border,
              },
            ]}
            onPress={() => onFilterChange(filterKey)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: isActive ? '#FFFFFF' : theme.textSecondary,
                  fontWeight: isActive ? '600' : 'normal',
                },
              ]}
            >
              {getFilterLabel(filterKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  /** フィルタボタン群のコンテナ */
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  /** 各フィルタボタン */
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  /** フィルタラベルテキスト */
  filterText: {
    fontSize: 13,
  },
});

export default StatusFilter;
