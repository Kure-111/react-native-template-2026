/**
 * 迷子情報カードコンポーネント
 * 一覧表示用のカード。移動不可の場合は緊急表示スタイルを適用する
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import MissingChildStatusBadge from './MissingChildStatusBadge';
import UrgencyBadge from './UrgencyBadge';
import {
  UNABLE_TO_MOVE,
  GENDER_LABELS,
  SHELTER_TENT_LABELS,
  URGENCY_CARD_BORDER_COLOR,
  URGENCY_CARD_BACKGROUND_COLOR,
} from '../constants';

/**
 * 発見時刻を「HH:MM」形式にフォーマットする
 * @param {string} isoString - ISO日時文字列
 * @returns {string} フォーマット済み時刻
 */
const formatTime = (isoString) => {
  const date = new Date(isoString);
  /** 時 */
  const hours = date.getHours().toString().padStart(2, '0');
  /** 分 */
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * 発見時刻を「MM/DD HH:MM」形式にフォーマットする
 * @param {string} isoString - ISO日時文字列
 * @returns {string} フォーマット済み日時
 */
const formatDateTime = (isoString) => {
  const date = new Date(isoString);
  /** 月 */
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  /** 日 */
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}/${day} ${formatTime(isoString)}`;
};

/**
 * 迷子情報カード
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.child - 迷子情報オブジェクト
 * @param {boolean} [props.showReporterName] - 登録者名を表示するか（管理タブ用）
 * @param {boolean} [props.showActionButton] - アクションボタンを表示するか（管理タブ用）
 * @param {Function} [props.onPressAction] - アクションボタン押下時のコールバック
 * @returns {JSX.Element} 迷子情報カード
 */
const MissingChildCard = ({ child, showReporterName = false, showActionButton = false, onPressAction }) => {
  const { theme } = useTheme();

  /** 移動不可の案件かどうか */
  const isUrgent = child.shelter_tent === UNABLE_TO_MOVE;

  /** カードのスタイル（移動不可の場合は赤系で強調） */
  const cardStyle = isUrgent
    ? [styles.card, styles.urgentCard]
    : [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }];

  return (
    <View style={cardStyle}>
      {/* ヘッダー行: 名前（管理タブのみ）+ 年齢・性別 + バッジ */}
      <View style={styles.headerRow}>
        <View style={styles.nameContainer}>
          {/* 名前は管理ロールが登録するため showReporterName のタブでのみ表示 */}
          {showReporterName && child.name && (
            <Text style={[styles.name, { color: theme.text }]}>{child.name}</Text>
          )}
          <Text style={[styles.ageGender, { color: theme.textSecondary }]}>
            {child.age} / {GENDER_LABELS[child.gender] || child.gender}
          </Text>
        </View>
        <View style={styles.badgeContainer}>
          {isUrgent && <UrgencyBadge />}
          <MissingChildStatusBadge status={child.status} />
        </View>
      </View>

      {/* 特徴 */}
      <View style={styles.infoRow}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>特徴:</Text>
        <Text style={[styles.value, { color: theme.text }]}>{child.characteristics}</Text>
      </View>

      {/* 発見場所 */}
      <View style={styles.infoRow}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>発見場所:</Text>
        <Text style={[styles.value, { color: theme.text }]}>{child.discovery_location}</Text>
      </View>

      {/* 保護テント */}
      <View style={styles.infoRow}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>保護テント:</Text>
        <Text style={[styles.value, { color: isUrgent ? URGENCY_CARD_BORDER_COLOR : theme.text }]}>
          {SHELTER_TENT_LABELS[child.shelter_tent] || child.shelter_tent}
        </Text>
      </View>

      {/* 迎えに来て欲しい場所（移動不可の場合のみ） */}
      {isUrgent && child.pickup_location && (
        <View style={[styles.infoRow, styles.pickupRow]}>
          <Text style={[styles.label, styles.pickupLabel]}>迎え場所:</Text>
          <Text style={[styles.value, styles.pickupValue]}>{child.pickup_location}</Text>
        </View>
      )}

      {/* 発見時刻 */}
      <View style={styles.infoRow}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>発見時刻:</Text>
        <Text style={[styles.value, { color: theme.text }]}>{formatDateTime(child.discovered_at)}</Text>
      </View>

      {/* 登録者名（管理タブ用） */}
      {showReporterName && child.reporter && (
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>登録者:</Text>
          <Text style={[styles.value, { color: theme.text }]}>{child.reporter.name}</Text>
        </View>
      )}

      {/* 管理ロールコメント */}
      {child.admin_comment && (
        <View style={[styles.commentBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.commentLabel, { color: theme.textSecondary }]}>コメント:</Text>
          <Text style={[styles.commentText, { color: theme.text }]}>{child.admin_comment}</Text>
        </View>
      )}

      {/* アクションボタン（管理タブ用） */}
      {showActionButton && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
          onPress={() => onPressAction && onPressAction(child)}
          activeOpacity={0.7}
        >
          <Text style={styles.actionButtonText}>対応・編集</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  /** カード */
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  /** 緊急カード（移動不可時の赤系スタイル） */
  urgentCard: {
    borderColor: URGENCY_CARD_BORDER_COLOR,
    borderWidth: 2,
    backgroundColor: URGENCY_CARD_BACKGROUND_COLOR,
  },
  /** ヘッダー行 */
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  /** 名前コンテナ */
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  /** 迷子の名前 */
  name: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  /** 年齢・性別 */
  ageGender: {
    fontSize: 13,
    marginTop: 2,
  },
  /** バッジコンテナ */
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  /** 情報行 */
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  /** ラベル */
  label: {
    fontSize: 13,
    width: 80,
    fontWeight: '500',
  },
  /** 値 */
  value: {
    fontSize: 13,
    flex: 1,
  },
  /** 迎え場所行（強調表示） */
  pickupRow: {
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  /** 迎え場所ラベル */
  pickupLabel: {
    color: URGENCY_CARD_BORDER_COLOR,
    fontWeight: 'bold',
  },
  /** 迎え場所値 */
  pickupValue: {
    color: URGENCY_CARD_BORDER_COLOR,
    fontWeight: 'bold',
  },
  /** コメントボックス */
  commentBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  /** コメントラベル */
  commentLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  /** コメントテキスト */
  commentText: {
    fontSize: 13,
  },
  /** アクションボタン */
  actionButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  /** アクションボタンテキスト */
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MissingChildCard;
