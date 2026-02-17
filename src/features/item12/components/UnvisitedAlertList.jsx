/**
 * 未巡回アラート一覧コンポーネント
 * 閾値選択と未巡回場所リストを表示する
 */

import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SkeletonLoader from '../../../shared/components/SkeletonLoader';
import EmptyState from '../../../shared/components/EmptyState';

/** 未巡回アラート閾値の選択肢（分） */
const UNVISITED_ALERT_OPTIONS = [30, 60, 90, 120];

/**
 * 未巡回アラート一覧コンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.theme - テーマオブジェクト
 * @param {Array} props.unvisitedLocations - 未巡回場所配列
 * @param {boolean} props.isLoadingUnvisitedLocations - 読み込み中フラグ
 * @param {number} props.unvisitedAlertMinutes - 選択中閾値（分）
 * @param {Function} props.onChangeAlertMinutes - 閾値変更コールバック
 * @param {Function} props.onRefresh - 更新ボタン押下コールバック
 * @returns {JSX.Element} 未巡回アラート一覧UI
 */
const UnvisitedAlertList = ({
  theme,
  unvisitedLocations,
  isLoadingUnvisitedLocations,
  unvisitedAlertMinutes,
  onChangeAlertMinutes,
  onRefresh,
}) => {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>未巡回アラート</Text>
        <TouchableOpacity
          style={[styles.refreshButton, { borderColor: theme.border }]}
          onPress={onRefresh}
        >
          <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.helpText, { color: theme.textSecondary }]}>
        設定した閾値以上巡回記録がない場所を先頭に表示します。
      </Text>
      <Text style={[styles.label, { color: theme.text }]}>アラート閾値</Text>
      <View style={styles.optionGroup}>
        {UNVISITED_ALERT_OPTIONS.map((minutes) => {
          /** 選択中かどうか */
          const isActive = minutes === unvisitedAlertMinutes;
          return (
            <Pressable
              key={String(minutes)}
              style={[
                styles.optionButton,
                {
                  borderColor: isActive ? theme.primary : theme.border,
                  backgroundColor: isActive ? `${theme.primary}1A` : theme.background,
                },
              ]}
              onPress={() => onChangeAlertMinutes(minutes)}
            >
              <Text style={[styles.optionButtonText, { color: isActive ? theme.primary : theme.textSecondary }]}>
                {minutes}分
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoadingUnvisitedLocations ? (
        <SkeletonLoader lines={3} baseColor={theme.border} />
      ) : unvisitedLocations.length === 0 ? (
        <EmptyState icon="🚨" title="未巡回アラートはありません" description="すべての場所が閾値内に巡回されています" theme={theme} />
      ) : (
        <View style={styles.ticketList}>
          {unvisitedLocations.slice(0, 24).map((row) => (
            <View
              key={row.location_id}
              style={[
                styles.ticketItem,
                {
                  borderColor: row.is_alert ? '#D1242F' : theme.border,
                  backgroundColor: row.is_alert ? '#D1242F14' : theme.background,
                },
              ]}
            >
              <Text style={[styles.ticketTitle, { color: theme.text }]} numberOfLines={1}>
                {row.location_label}
              </Text>
              <Text style={[styles.ticketMeta, { color: theme.textSecondary }]}>
                最終巡回:{' '}
                {row.last_checked_at
                  ? new Date(row.last_checked_at).toLocaleString('ja-JP')
                  : '巡回記録なし'}
              </Text>
              <Text style={[styles.ticketMeta, { color: theme.textSecondary }]}>
                経過時間:{' '}
                {row.elapsed_minutes === null ? '-' : `${Math.floor(row.elapsed_minutes / 60)}時間${row.elapsed_minutes % 60}分`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  helpText: {
    fontSize: 13,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  refreshButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  optionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  optionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ticketList: {
    gap: 8,
  },
  ticketItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ticketTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  ticketMeta: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default UnvisitedAlertList;
