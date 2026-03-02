/**
 * 巡回タスク完了件数ランキングコンポーネント
 * patrol_task_results の完了数を人ごとに集計し、ランキング形式で表示する
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/** 順位ごとのメダルラベル */
const MEDAL_LABELS = ['🥇', '🥈', '🥉'];

/**
 * 巡回タスク完了件数ランキングコンポーネント
 * @param {Object} props - プロパティ
 * @param {Object} props.theme - テーマオブジェクト
 * @param {Array<{userId: string, name: string, organization: string, count: number}>} props.rankingData - ランキングデータ
 * @param {boolean} props.isLoading - 読み込み中フラグ
 * @param {Function} props.onRefresh - 更新ボタンコールバック
 * @returns {JSX.Element} ランキングカード
 */
const PatrolRankingCard = ({ theme, rankingData, isLoading, onRefresh }) => {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* ── ヘッダー ── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>🏆 完了件数ランキング</Text>
        <TouchableOpacity
          style={[styles.refreshButton, { borderColor: theme.border }]}
          onPress={onRefresh}
        >
          <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
      ) : rankingData.length === 0 ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>
          まだランキングデータがありません
        </Text>
      ) : (
        <View style={styles.rankingList}>
          {rankingData.map((entry, index) => {
            /** 順位 */
            const rank = index + 1;
            /** メダル表示（1〜3位のみ）または順位数字 */
            const rankLabel = MEDAL_LABELS[index] ?? `${rank}位`;
            /** 上位3位は背景色をうっすら付ける */
            const isTop3 = rank <= 3;

            return (
              <View
                key={entry.userId}
                style={[
                  styles.rankingRow,
                  {
                    borderColor: theme.border,
                    backgroundColor: isTop3
                      ? theme.primary + '12'
                      : theme.background,
                  },
                ]}
              >
                {/* 順位ラベル */}
                <Text style={[styles.rankLabel, isTop3 && styles.rankLabelTop]}>
                  {rankLabel}
                </Text>

                {/* 名前・団体 */}
                <View style={styles.rankInfo}>
                  <Text
                    style={[styles.rankName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {entry.name}
                  </Text>
                  {entry.organization ? (
                    <Text
                      style={[styles.rankOrg, { color: theme.textSecondary }]}
                      numberOfLines={1}
                    >
                      {entry.organization}
                    </Text>
                  ) : null}
                </View>

                {/* 完了件数 */}
                <View style={[styles.countBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.countBadgeText}>{entry.count}</Text>
                  <Text style={[styles.countBadgeUnit, { color: 'rgba(255,255,255,0.8)' }]}>件</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Text style={[styles.footerNote, { color: theme.textSecondary }]}>
        ※ 直近500件の完了記録を集計しています
      </Text>
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
  helpText: {
    fontSize: 13,
    lineHeight: 20,
  },
  rankingList: {
    gap: 6,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  rankLabel: {
    fontSize: 18,
    width: 34,
    textAlign: 'center',
  },
  /** 上位3位は少し大きめ */
  rankLabelTop: {
    fontSize: 22,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 14,
    fontWeight: '700',
  },
  rankOrg: {
    fontSize: 12,
    marginTop: 1,
  },
  /** 件数バッジ */
  countBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 2,
  },
  countBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  countBadgeUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerNote: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'right',
  },
});

export default PatrolRankingCard;
