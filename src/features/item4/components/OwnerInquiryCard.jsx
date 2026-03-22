/**
 * 落とし主問い合わせカードコンポーネント
 * 紛失物の問い合わせ情報を表示する
 * 個人情報（連絡先・学籍番号・紛失者名）は表示しない
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Ionicons } from '../../../shared/components/icons';

/**
 * 落とし主問い合わせカードコンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.item - 落とし主データ
 * @param {string} props.item.id - 識別番号
 * @param {string} props.item.lostItemName - 紛失物の名前
 * @param {string} props.item.location - 落とした可能性のある場所
 * @param {string} props.item.noticedTime - 気づいた時間
 * @param {string} props.item.returnDate - 返却日（空文字 = 未対応）
 * @param {boolean} props.item.isResolved - 対応済みフラグ
 * @returns {JSX.Element} 落とし主カードUI
 */
const OwnerInquiryCard = ({ item }) => {
  /** テーマオブジェクト */
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* 1行目: 識別番号 + ステータスバッジ */}
      <View style={styles.headerRow}>
        <Text style={[styles.id, { color: theme.textSecondary }]}>
          No.{item.id}
        </Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: item.isResolved
                ? theme.success + '20'
                : theme.primary + '20',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: item.isResolved ? theme.success : theme.primary,
              },
            ]}
          >
            {item.isResolved ? '対応済み' : '未対応'}
          </Text>
        </View>
      </View>

      {/* 2行目: 紛失物の名前 */}
      <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={2}>
        {item.lostItemName}
      </Text>

      {/* 3行目: 紛失場所 */}
      <View style={styles.detailRow}>
        <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
        <Text style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
          紛失場所: {item.location}
        </Text>
      </View>

      {/* 4行目: 気づいた時刻 */}
      <View style={styles.detailRow}>
        <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
        <Text style={[styles.detailText, { color: theme.textSecondary }]}>
          気づいた時刻: {item.noticedTime}
        </Text>
      </View>

      {/* 対応済みの場合は対応日を表示 */}
      {item.isResolved && (
        <View style={styles.detailRow}>
          <Ionicons name="checkmark-circle-outline" size={14} color={theme.success} />
          <Text style={[styles.detailText, { color: theme.success }]}>
            対応日: {item.returnDate}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  /** カード全体 */
  card: {
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
  },
  /** ヘッダー行（識別番号 + バッジ） */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  /** 識別番号テキスト */
  id: {
    fontSize: 12,
    fontWeight: '600',
  },
  /** ステータスバッジ */
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  /** ステータスバッジテキスト */
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  /** 紛失物名テキスト */
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  /** 詳細行（アイコン + テキスト） */
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  /** 詳細テキスト */
  detailText: {
    fontSize: 12,
    flex: 1,
  },
});

export default OwnerInquiryCard;
