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

/**
 * 巡回チェック項目の選択肢
 * チェック = 問題なし、未チェック = 問題あり（詳細はメモへ）
 * DB の patrol_checks.check_items (jsonb) に文字列配列として保存する
 */
const PATROL_CHECK_ITEM_OPTIONS = [
  '企画書通り進行中',
  '体調問題なし',
  '困りごとなし',
  '迷惑来場者なし',
  '無人・未施錠教室なし',
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
        企画を訪問した際の状況をチェックします。問題があった項目はチェックせずメモに詳細を記録してください。
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

      <Text style={[styles.label, { color: theme.text }]}>チェック項目（問題なし＝タップして選択）</Text>
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

      <Text style={[styles.label, { color: theme.text }]}>メモ（問題あり項目の詳細・気づきなど）</Text>
      <TextInput
        value={patrolCheckMemo}
        onChangeText={onChangeCheckMemo}
        multiline
        placeholder="例：体調不良者1名あり・311教室が無人で未施錠など"
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
          {recentPatrolChecks.map((check) => {
            /** チェック済み項目（配列） */
            const checkedItems = Array.isArray(check.check_items) ? check.check_items : [];
            /** 未チェックの項目（問題があったもの） */
            const uncheckedItems = PATROL_CHECK_ITEM_OPTIONS.filter(
              (item) => !checkedItems.includes(item)
            );
            return (
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
                {checkedItems.length > 0 && (
                  <Text style={[styles.checkOkText, { color: theme.primary }]}>
                    ✓ {checkedItems.join('  ✓ ')}
                  </Text>
                )}
                {uncheckedItems.length > 0 && (
                  <Text style={[styles.checkNgText, { color: theme.error ?? '#e53e3e' }]}>
                    ✗ {uncheckedItems.join('  ✗ ')}
                  </Text>
                )}
                {check.memo ? (
                  <Text style={[styles.messageBody, { color: theme.text }]}>{check.memo}</Text>
                ) : null}
                <Text style={[styles.messageDate, { color: theme.textSecondary }]}>
                  {new Date(check.checked_at || check.created_at).toLocaleString('ja-JP')}
                </Text>
              </View>
            );
          })}
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
  checkOkText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 18,
  },
  checkNgText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 18,
  },
  messageBody: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  messageDate: {
    fontSize: 11,
    marginTop: 4,
  },
});

export default PatrolCheckForm;
