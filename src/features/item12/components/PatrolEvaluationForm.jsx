/**
 * 企画評価入力フォームコンポーネント
 * 点数、コメント入力、評価履歴を表示する
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
import { PATROL_TASK_TYPES } from '../../../services/supabase/patrolTaskService';
import { EVALUATION_STATUSES } from '../../../services/supabase/evaluationService';
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

/** 評価ステータス表示名 */
const EVALUATION_STATUS_LABELS = {
  [EVALUATION_STATUSES.PENDING]: '承認待ち',
  [EVALUATION_STATUSES.APPROVED]: '承認済み',
  [EVALUATION_STATUSES.REJECTED]: '却下',
  [EVALUATION_STATUSES.REWORK]: '差戻し',
};

/**
 * 企画評価入力フォームコンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.theme - テーマオブジェクト
 * @param {Object|null} props.selectedTask - 選択中タスク（評価対象）
 * @param {number} props.evaluationScore - 評価点数
 * @param {Function} props.onChangeScore - 点数変更コールバック
 * @param {string} props.evaluationComment - 評価コメント
 * @param {Function} props.onChangeComment - コメント変更コールバック
 * @param {boolean} props.isSubmittingEvaluation - 登録中フラグ
 * @param {Function} props.onSubmitEvaluation - 登録ボタン押下コールバック
 * @param {Array} props.myEvaluationChecks - 評価入力履歴配列
 * @param {boolean} props.isLoadingMyEvaluationChecks - 履歴読み込み中フラグ
 * @param {Function} props.onRefresh - 更新ボタン押下コールバック
 * @returns {JSX.Element} 企画評価入力フォームUI
 */
const PatrolEvaluationForm = ({
  theme,
  selectedTask,
  evaluationScore,
  onChangeScore,
  evaluationComment,
  onChangeComment,
  isSubmittingEvaluation,
  onSubmitEvaluation,
  myEvaluationChecks,
  isLoadingMyEvaluationChecks,
  onRefresh,
}) => {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>企画評価入力（承認待ち）</Text>
        <TouchableOpacity
          style={[styles.refreshButton, { borderColor: theme.border }]}
          onPress={onRefresh}
        >
          <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.helpText, { color: theme.textSecondary }]}>
        完了済みタスクを選択して評価を入力し、本部承認を待ちます。
      </Text>

      <Text style={[styles.label, { color: theme.text }]}>評価対象タスク</Text>
      <Text style={[styles.ticketMeta, { color: theme.textSecondary }]}>
        {selectedTask
          ? `${TASK_TYPE_LABELS[selectedTask.task_type] || selectedTask.task_type} / ${selectedTask.event_name || '-'}`
          : '未選択'}
      </Text>

      <Text style={[styles.label, { color: theme.text }]}>点数</Text>
      <View style={styles.optionGroup}>
        {[1, 2, 3, 4, 5].map((score) => {
          /** 選択中かどうか */
          const isActive = score === evaluationScore;
          return (
            <Pressable
              key={String(score)}
              style={[
                styles.optionButton,
                {
                  borderColor: isActive ? theme.primary : theme.border,
                  backgroundColor: isActive ? `${theme.primary}1A` : theme.background,
                },
              ]}
              onPress={() => onChangeScore(score)}
            >
              <Text style={[styles.optionButtonText, { color: isActive ? theme.primary : theme.textSecondary }]}>
                {score}点
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: theme.text }]}>コメント</Text>
      <TextInput
        value={evaluationComment}
        onChangeText={onChangeComment}
        multiline
        placeholder="評価理由・現地状況を入力してください"
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
        onPress={onSubmitEvaluation}
        disabled={isSubmittingEvaluation}
      >
        <Text style={styles.actionButtonText}>
          {isSubmittingEvaluation ? '登録中...' : '評価を承認待ちで登録'}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.label, { color: theme.text }]}>最近の評価入力</Text>
      {isLoadingMyEvaluationChecks ? (
        <SkeletonLoader lines={3} baseColor={theme.border} />
      ) : myEvaluationChecks.length === 0 ? (
        <EmptyState icon="⭐" title="評価入力履歴はまだありません" description="評価を登録すると履歴が表示されます" theme={theme} />
      ) : (
        <View style={styles.messageList}>
          {myEvaluationChecks.map((evaluation) => (
            <View
              key={evaluation.id}
              style={[
                styles.messageItem,
                { borderColor: theme.border, backgroundColor: theme.background },
              ]}
            >
              <Text style={[styles.messageAuthor, { color: theme.textSecondary }]}>
                {EVALUATION_STATUS_LABELS[evaluation.evaluation_status] || evaluation.evaluation_status} /{' '}
                {evaluation.score || '-'}点
              </Text>
              <Text style={[styles.messageBody, { color: theme.text }]}>{evaluation.comment || 'コメントなし'}</Text>
              <Text style={[styles.messageDate, { color: theme.textSecondary }]}>
                {new Date(evaluation.created_at).toLocaleString('ja-JP')}
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
  ticketMeta: {
    fontSize: 12,
    marginTop: 2,
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

export default PatrolEvaluationForm;
