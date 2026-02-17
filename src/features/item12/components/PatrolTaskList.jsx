/**
 * 巡回タスク一覧コンポーネント
 * タスクの一覧表示と選択を担当する
 */

import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PATROL_TASK_STATUSES, PATROL_TASK_TYPES } from '../../../services/supabase/patrolTaskService';
import SkeletonLoader from '../../../shared/components/SkeletonLoader';
import EmptyState from '../../../shared/components/EmptyState';

/** タスク状態表示名 */
const TASK_STATUS_LABELS = {
  [PATROL_TASK_STATUSES.OPEN]: '未対応',
  [PATROL_TASK_STATUSES.ACCEPTED]: '受諾',
  [PATROL_TASK_STATUSES.EN_ROUTE]: '移動中',
  [PATROL_TASK_STATUSES.DONE]: '完了',
  [PATROL_TASK_STATUSES.CANCELED]: '取消',
};

/** タスク種別表示名 */
const TASK_TYPE_LABELS = {
  [PATROL_TASK_TYPES.CONFIRM_START]: '企画開始確認',
  [PATROL_TASK_TYPES.CONFIRM_END]: '企画終了確認',
  [PATROL_TASK_TYPES.LOCK_CHECK]: '施錠確認',
  [PATROL_TASK_TYPES.EMERGENCY_SUPPORT]: '緊急対応',
  [PATROL_TASK_TYPES.ROUTINE_PATROL]: '定常巡回',
  [PATROL_TASK_TYPES.OTHER]: 'その他',
};

/**
 * 巡回タスク一覧コンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.theme - テーマオブジェクト
 * @param {Object|null} props.user - ログインユーザー情報
 * @param {Array} props.tasks - タスク一覧
 * @param {boolean} props.isLoadingTasks - タスク読み込み中フラグ
 * @param {string|null} props.selectedTaskId - 選択中タスクID
 * @param {Function} props.onSelectTask - タスク選択時コールバック
 * @param {Function} props.onRefresh - 更新ボタン押下時コールバック
 * @returns {JSX.Element} 巡回タスク一覧UI
 */
const PatrolTaskList = ({
  theme,
  user,
  tasks,
  isLoadingTasks,
  selectedTaskId,
  onSelectTask,
  onRefresh,
}) => {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>巡回タスク一覧</Text>
        <TouchableOpacity
          style={[styles.refreshButton, { borderColor: theme.border }]}
          onPress={onRefresh}
        >
          <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
        </TouchableOpacity>
      </View>

      {isLoadingTasks ? (
        <SkeletonLoader lines={3} baseColor={theme.border} />
      ) : tasks.length === 0 ? (
        <EmptyState icon="📋" title="巡回タスクはありません" description="現在対応が必要なタスクはありません" theme={theme} />
      ) : (
        <View style={styles.ticketList}>
          {tasks.map((task) => {
            /** 選択中かどうか */
            const isActive = task.id === selectedTaskId;
            /** 担当者ラベル */
            const assigneeLabel = !task.assigned_to
              ? '未割当'
              : task.assigned_to === user?.id
                ? 'あなた'
                : '他担当';
            return (
              <Pressable
                key={task.id}
                style={[
                  styles.ticketItem,
                  {
                    borderColor: isActive ? theme.primary : theme.border,
                    backgroundColor: isActive ? `${theme.primary}16` : theme.background,
                  },
                ]}
                onPress={() => onSelectTask(task.id)}
              >
                <Text style={[styles.ticketTitle, { color: theme.text }]} numberOfLines={1}>
                  {TASK_TYPE_LABELS[task.task_type] || task.task_type}
                </Text>
                <Text style={[styles.ticketMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                  {task.event_name || '企画名未設定'} / {task.event_location || task.location_text || '場所未設定'}
                </Text>
                <Text style={[styles.ticketMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                  {TASK_STATUS_LABELS[task.task_status] || task.task_status} / 担当: {assigneeLabel} /{' '}
                  {new Date(task.created_at).toLocaleString('ja-JP')}
                </Text>
              </Pressable>
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

export default PatrolTaskList;
