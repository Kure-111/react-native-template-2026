/**
 * タスク詳細・操作コンポーネント
 * 向かいます/完了ボタン、結果選択、メモ、結果履歴、元連絡案件メッセージを表示する
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
import {
  PATROL_RESULT_CODES,
  PATROL_TASK_STATUSES,
  PATROL_TASK_TYPES,
} from '../../../services/supabase/patrolTaskService';
import SkeletonLoader from '../../../shared/components/SkeletonLoader';
import EmptyState from '../../../shared/components/EmptyState';

/** タスク種別表示名 */
const TASK_TYPE_LABELS = {
  [PATROL_TASK_TYPES.CONFIRM_START]: '企画開始確認',
  [PATROL_TASK_TYPES.CONFIRM_END]: '企画終了確認',
  [PATROL_TASK_TYPES.LOCK_CHECK]: '施錠確認',
  [PATROL_TASK_TYPES.EMERGENCY_SUPPORT]: '緊急対応',
  [PATROL_TASK_TYPES.ROUTINE_PATROL]: '定常巡回',
  [PATROL_TASK_TYPES.OTHER]: 'その他',
};

/** タスク状態表示名 */
const TASK_STATUS_LABELS = {
  [PATROL_TASK_STATUSES.OPEN]: '未対応',
  [PATROL_TASK_STATUSES.ACCEPTED]: '受諾',
  [PATROL_TASK_STATUSES.EN_ROUTE]: '移動中',
  [PATROL_TASK_STATUSES.DONE]: '完了',
  [PATROL_TASK_STATUSES.CANCELED]: '取消',
};

/** 結果コードごとの表示名 */
const RESULT_LABELS = {
  [PATROL_RESULT_CODES.OK]: '問題なし',
  [PATROL_RESULT_CODES.NOT_STARTED]: '開始していない',
  [PATROL_RESULT_CODES.NOT_ENDED]: '終了していない',
  [PATROL_RESULT_CODES.NEED_SUPPORT]: '別対応必要',
  [PATROL_RESULT_CODES.LOCKED]: '施錠済',
  [PATROL_RESULT_CODES.UNLOCKED]: '未施錠',
  [PATROL_RESULT_CODES.CANNOT_CONFIRM]: '確認不可',
};

/**
 * タスク詳細・操作コンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.theme - テーマオブジェクト
 * @param {Object|null} props.user - ログインユーザー情報
 * @param {Object} props.selectedTask - 選択中タスク
 * @param {Array} props.resultOptions - 完了結果候補配列
 * @param {string} props.resultCode - 選択中結果コード
 * @param {Function} props.onChangeResultCode - 結果コード変更コールバック
 * @param {string} props.patrolMemo - 巡回メモ文字列
 * @param {Function} props.onChangePatrolMemo - メモ変更コールバック
 * @param {boolean} props.isSubmitting - 送信中フラグ
 * @param {boolean} props.canAccept - 受諾可能フラグ
 * @param {boolean} props.canComplete - 完了可能フラグ
 * @param {Function} props.onAcceptTask - 向かいますボタン押下コールバック
 * @param {Function} props.onCompleteTask - 完了ボタン押下コールバック
 * @param {Function} props.onSendMemoOnly - メモのみ共有ボタン押下コールバック
 * @param {Array} props.taskResults - タスク結果履歴配列
 * @param {boolean} props.isLoadingTaskResults - 結果読み込み中フラグ
 * @param {Function} props.onRefreshTaskResults - 結果履歴更新コールバック
 * @param {Array} props.sourceMessages - 元連絡案件メッセージ配列
 * @param {boolean} props.isLoadingSourceMessages - メッセージ読み込み中フラグ
 * @param {Function} props.onRefreshSourceMessages - メッセージ更新コールバック
 * @returns {JSX.Element} タスク詳細UI
 */
const PatrolTaskDetail = ({
  theme,
  user,
  selectedTask,
  resultOptions,
  resultCode,
  onChangeResultCode,
  patrolMemo,
  onChangePatrolMemo,
  isSubmitting,
  canAccept,
  canComplete,
  onAcceptTask,
  onCompleteTask,
  onSendMemoOnly,
  taskResults,
  isLoadingTaskResults,
  onRefreshTaskResults,
  sourceMessages,
  isLoadingSourceMessages,
  onRefreshSourceMessages,
}) => {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>タスク詳細</Text>
      <Text style={[styles.ticketDetailTitle, { color: theme.text }]}>
        {TASK_TYPE_LABELS[selectedTask.task_type] || selectedTask.task_type}
      </Text>
      <Text style={[styles.ticketMeta, { color: theme.textSecondary }]}>
        タスク番号: {selectedTask.task_no || '-'}
      </Text>
      <Text style={[styles.ticketMeta, { color: theme.textSecondary }]}>
        状態: {TASK_STATUS_LABELS[selectedTask.task_status] || selectedTask.task_status}
      </Text>
      <Text style={[styles.ticketMeta, { color: theme.textSecondary }]}>
        企画: {selectedTask.event_name || '-'}（{selectedTask.event_location || selectedTask.location_text || '-'}）
      </Text>
      <Text style={[styles.ticketMeta, { color: theme.textSecondary }]}>
        元連絡案件: {selectedTask.source_ticket_id || 'なし'} / 元鍵貸出: {selectedTask.source_key_loan_id || 'なし'}
      </Text>
      <Text
        style={[
          styles.requestBody,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
        ]}
      >
        {selectedTask.notes || '指示メモはありません'}
      </Text>

      <Text style={[styles.label, { color: theme.text }]}>完了結果</Text>
      <View style={styles.optionGroup}>
        {resultOptions.map((option) => {
          /** 選択中かどうか */
          const isActive = option.key === resultCode;
          return (
            <Pressable
              key={option.key}
              style={[
                styles.optionButton,
                {
                  borderColor: isActive ? theme.primary : theme.border,
                  backgroundColor: isActive ? `${theme.primary}1A` : theme.background,
                },
              ]}
              onPress={() => onChangeResultCode(option.key)}
            >
              <Text style={[styles.optionButtonText, { color: isActive ? theme.primary : theme.textSecondary }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: theme.text }]}>巡回メモ</Text>
      <TextInput
        value={patrolMemo}
        onChangeText={onChangePatrolMemo}
        multiline
        placeholder="現地状況・対応内容を入力してください"
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

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: canAccept ? theme.primary : theme.border },
          ]}
          disabled={!canAccept || isSubmitting}
          onPress={onAcceptTask}
        >
          <Text style={styles.actionButtonText}>向かいます</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: canComplete ? '#22A06B' : theme.border },
          ]}
          disabled={!canComplete || isSubmitting}
          onPress={onCompleteTask}
        >
          <Text style={styles.actionButtonText}>完了</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.memoButton,
          {
            borderColor: theme.border,
            backgroundColor: selectedTask.source_ticket_id ? theme.background : theme.border,
          },
        ]}
        onPress={onSendMemoOnly}
        disabled={!selectedTask.source_ticket_id || isSubmitting}
      >
        <Text style={[styles.memoButtonText, { color: theme.textSecondary }]}>メモのみ共有</Text>
      </TouchableOpacity>

      {/* タスク結果履歴 */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.label, { color: theme.text }]}>タスク結果履歴</Text>
        <TouchableOpacity
          style={[styles.refreshButton, { borderColor: theme.border }]}
          onPress={onRefreshTaskResults}
        >
          <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
        </TouchableOpacity>
      </View>

      {isLoadingTaskResults ? (
        <SkeletonLoader lines={3} baseColor={theme.border} />
      ) : taskResults.length === 0 ? (
        <EmptyState icon="📝" title="結果履歴はまだありません" description="タスク完了後に結果が表示されます" theme={theme} />
      ) : (
        <View style={styles.messageList}>
          {taskResults.map((result) => (
            <View
              key={result.id}
              style={[
                styles.messageItem,
                { borderColor: theme.border, backgroundColor: theme.background },
              ]}
            >
              <Text style={[styles.messageAuthor, { color: theme.textSecondary }]}>
                {RESULT_LABELS[result.result_code] || result.result_code}
              </Text>
              <Text style={[styles.messageBody, { color: theme.text }]}>
                {result.memo || 'メモなし'}
              </Text>
              <Text style={[styles.messageDate, { color: theme.textSecondary }]}>
                {new Date(result.created_at).toLocaleString('ja-JP')}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 元連絡案件メッセージ */}
      {selectedTask.source_ticket_id ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.label, { color: theme.text }]}>元連絡案件メッセージ</Text>
            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: theme.border }]}
              onPress={onRefreshSourceMessages}
            >
              <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
            </TouchableOpacity>
          </View>

          {isLoadingSourceMessages ? (
            <SkeletonLoader lines={3} baseColor={theme.border} />
          ) : sourceMessages.length === 0 ? (
            <EmptyState icon="📝" title="メッセージはまだありません" description="元連絡案件のメッセージが表示されます" theme={theme} />
          ) : (
            <View style={styles.messageList}>
              {sourceMessages.map((message) => {
                /** 自分のメッセージかどうか */
                const isMine = message.author_id === user?.id;
                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageItem,
                      {
                        borderColor: isMine ? theme.primary : theme.border,
                        backgroundColor: isMine ? `${theme.primary}12` : theme.background,
                      },
                    ]}
                  >
                    <Text style={[styles.messageAuthor, { color: theme.textSecondary }]}>
                      {isMine ? '巡回担当（あなた）' : '他担当/企画者'}
                    </Text>
                    <Text style={[styles.messageBody, { color: theme.text }]}>{message.body}</Text>
                    <Text style={[styles.messageDate, { color: theme.textSecondary }]}>
                      {new Date(message.created_at).toLocaleString('ja-JP')}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      ) : null}
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
  ticketDetailTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  ticketMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  requestBody: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 8,
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
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
  helpText: {
    fontSize: 13,
    lineHeight: 20,
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
  memoInput: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 96,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
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
  memoButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  memoButtonText: {
    fontSize: 13,
    fontWeight: '600',
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

export default PatrolTaskDetail;
