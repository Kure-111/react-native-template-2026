/**
 * タブ切り替えコンポーネント
 * 一般・緊急・落とし主の3タブを表示し、選択状態を管理する
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { TABS } from '../constants';

/**
 * タブ切り替えコンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {string} props.activeTab - 現在のアクティブタブキー
 * @param {Function} props.onTabChange - タブ変更時のコールバック
 * @returns {JSX.Element} タブ切り替えUI
 */
const TabSelector = ({ activeTab, onTabChange }) => {
  /** テーマオブジェクト */
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }]}>
      {TABS.map((tab) => {
        /** このタブがアクティブかどうか */
        const isActive = activeTab === tab.key;

        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              {
                borderBottomColor: isActive ? theme.primary : 'transparent',
              },
            ]}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: isActive ? theme.primary : theme.textSecondary,
                  fontWeight: isActive ? '600' : 'normal',
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  /** タブバーのコンテナ */
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  /** 各タブボタン */
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  /** タブラベルテキスト */
  tabText: {
    fontSize: 14,
  },
});

export default TabSelector;
