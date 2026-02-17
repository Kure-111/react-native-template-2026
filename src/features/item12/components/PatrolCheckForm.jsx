/**
 * 定常巡回チェックフォームコンポーネント
 * 場所選択、チェック項目、メモ入力、直近履歴を表示する
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import SkeletonLoader from '../../../shared/components/SkeletonLoader';
import EmptyState from '../../../shared/components/EmptyState';

/** 巡回チェック項目の選択肢 */
const PATROL_CHECK_ITEM_OPTIONS = [
  '導線安全',
  '混雑状況確認',
  '火気・危険物なし',
  '設備異常なし',
  '清掃・衛生確認',
];

/**
 * 定常巡回チェックフォームコンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.theme - テーマオブジェクト
 * @param {Array} props.patrolLocations - 巡回場所候補配列
 * @param {string} props.selectedPatrolLocationId - 選択中場所ID
 * @param {Function} props.onSelectLocation - 場所選択コールバック
 * @param {string} props.patrolLocationText - 巡回場所テキスト
 * @param {Function} props.onChangeLocationText - 場所テキスト変更コールバック
 * @param {Array} props.patrolCheckItems - 選択済みチェック項目配列
 * @param {Function} props.onToggleCheckItem - チェック項目切替コールバック
 * @param {string} props.patrolCheckMemo - メモ文字列
 * @param {Function} props.onChangeCheckMemo - メモ変更コールバック
 * @param {boolean} props.isSubmittingPatrolCheck - 登録中フラグ
 * @param {Function} props.onSubmitPatrolCheck - 登録ボタン押下コールバック
 * @param {Array} props.recentPatrolChecks - 直近巡回チェック履歴配列
 * @param {boolean} props.isLoadingRecentPatrolChecks - 履歴読み込み中フラグ
 * @param {Function} props.onRefresh - 更新ボタン押下コールバック
 * @returns {JSX.Element} 定常巡回チェックフォームUI
 */
const PatrolCheckForm = ({
  theme,
  patrolLocations,
  selectedPatrolLocationId,
  onSelectLocation,
  patrolLocationText,
  onChangeLocationText,
  patrolCheckItems,
  onToggleCheckItem,
  patrolCheckMemo,
  onChangeCheckMemo,
  isSubmittingPatrolCheck,
  onSubmitPatrolCheck,
  recentPatrolChecks,
  isLoadingRecentPatrolChecks,
  onRefresh,
}) => {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>定常巡回チェック</Text>
        <TouchableOpacity
          style={[styles.refreshButton, { borderColor: theme.border }]}
          onPress={onRefresh}
        >
          <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.helpText, { color: theme.textSecondary }]}>
        写真添付は使わず、テキストのみで巡回ログを記録します。
      </Text>

      <Text style={[styles.label, { color: theme.text }]}>巡回場所</Text>
      <TextInput
        value={patrolLocationText}
        onChangeText={onChangeLocationText}
        placeholder="例: A棟 3F 301教室"
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.memoInput,
          {
            borderColor: theme.border,
            backgroundColor: theme.background,
            color: theme.text,
            minHeight: 52,
          },
        ]}
      />

      {patrolLocations.length > 0 ? (
        <View style={styles.optionGroup}>
          {patrolLocations.slice(0, 18).map((location) => {
            /** 選択中かどうか */
            const isActive = location.id === selectedPatrolLocationId;
            return (
              <Pressable
                key={location.id}
                style={[
                  styles.optionButton,
                  {
                    borderColor: isActive ? theme.primary : theme.border,
                    backgroundColor: isActive ? `${theme.primary}1A` : theme.background,
                  },
                ]}
                onPress={() => onSelectLocation(location)}
              >
                <Text style={[styles.optionButtonText, { color: isActive ? theme.primary : theme.textSecondary }]}>
                  {location.label || location.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Text style={[styles.label, { color: theme.text }]}>チェック項目</Text>
      <View style={styles.optionGroup}>
        {PATROL_CHECK_ITEM_OPTIONS.map((item) => {
          /** 選択中かどうか */
          const isActive = patrolCheckItems.includes(item);
          return (
            <Pressable
              key={item}
              style={[
                styles.optionButton,
                {
                  borderColor: isActive ? theme.primary : theme.border,
                  backgroundColor: isActive ? `${theme.primary}1A` : theme.background,
                },
              ]}
              onPress={() => onToggleCheckItem(item)}
            >
              <Text style={[styles.optionButtonText, { color: isActive ? theme.primary : theme.textSecondary }]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: theme.text }]}>メモ（任意）</Text>
      <TextInput
        value={patrolCheckMemo}
        onChangeText={onChangeCheckMemo}
        multiline
        placeholder="巡回時の気づきや状況を記録"
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.memoInput,
          {
            borderColor: theme.border,
            backgroundColor: theme.background,
            color: theme.text,
          },
        ]}
      />
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.primary, marginTop: 10 }]}
        onPress={onSubmitPatrolCheck}
        disabled={isSubmittingPatrolCheck}
      >
        <Text style={styles.actionButtonText}>
          {isSubmittingPatrolCheck ? '登録中...' : '巡回チェックを記録'}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.label, { color: theme.text }]}>直近の巡回チェック</Text>
      {isLoadingRecentPatrolChecks ? (
        <SkeletonLoader lines={3} baseColor={theme.border} />
      ) : recentPatrolChecks.length === 0 ? (
        <EmptyState icon="🔍" title="まだ巡回チェックはありません" description="巡回チェックを記録すると履歴が表示されます" theme={theme} />
      ) : (
        <View style={styles.messageList}>
          {recentPatrolChecks.map((check) => (
            <View
              key={check.id}
              style={[
                styles.messageItem,
                { borderColor: theme.border, backgroundColor: theme.background },
              ]}
            >
              <Text style={[styles.messageAuthor, { color: theme.textSecondary }]}>
                {check.location_text}
              </Text>
              <Text style={[styles.messageBody, { color: theme.text }]}>
                {check.memo || 'メモなし'}
              </Text>
              <Text style={[styles.messageDate, { color: theme.textSecondary }]}>
                {new Date(check.checked_at || check.created_at).toLocaleString('ja-JP')}
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
  memoInput: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 96,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  messageList: {
    gap: 8,
    marginBottom: 12,
  },
  messageItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  messageAuthor: {
    fontSize: 11,
    marginBottom: 2,
  },
  messageBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageDate: {
    fontSize: 11,
    marginTop: 4,
  },
});

export default PatrolCheckForm;
