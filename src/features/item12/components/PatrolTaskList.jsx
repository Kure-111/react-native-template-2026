/**
 * 巡回タスク一覧コンポーネント
 * タスクを種別（task_type）ごとにグループ化して表示する
 */

import React, { useMemo } from 'react';
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

/** タスク種別表示アイコン */
const TASK_TYPE_ICONS = {
  [PATROL_TASK_TYPES.EMERGENCY_SUPPORT]: '🚨',
  [PATROL_TASK_TYPES.CONFIRM_START]: '▶️',
  [PATROL_TASK_TYPES.CONFIRM_END]: '⏹️',
  [PATROL_TASK_TYPES.LOCK_CHECK]: '🔒',
  [PATROL_TASK_TYPES.ROUTINE_PATROL]: '🚶',
  [PATROL_TASK_TYPES.OTHER]: '📋',
};

/**
 * 種別の表示優先順（上にあるほど優先度高）
 * 緊急対応を最上位にし、定常巡回・その他を末尾に配置
 */
const TASK_TYPE_ORDER = [
  PATROL_TASK_TYPES.EMERGENCY_SUPPORT,
  PATROL_TASK_TYPES.CONFIRM_START,
  PATROL_TASK_TYPES.CONFIRM_END,
  PATROL_TASK_TYPES.LOCK_CHECK,
  PATROL_TASK_TYPES.ROUTINE_PATROL,
  PATROL_TASK_TYPES.OTHER,
];

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
  /**
   * タスクを task_type ごとにグループ化し、優先順で並べた配列を生成
   * 優先順に定義されていない種別は末尾に追加される
   */
  const groupedTasks = useMemo(() => {
    /** task_type → タスク配列 のマップを構築 */
    const typeMap = new Map();
    tasks.forEach((task) => {
      const type = task.task_type || PATROL_TASK_TYPES.OTHER;
      if (!typeMap.has(type)) {
        typeMap.set(type, []);
      }
      typeMap.get(type).push(task);
    });

    /** 定義順でフィルタリングし、存在する種別のみ出力 */
    const orderedGroups = TASK_TYPE_ORDER
      .filter((type) => typeMap.has(type))
      .map((type) => ({ type, tasks: typeMap.get(type) }));

    /** 定義外の種別が存在する場合は末尾に追加 */
    typeMap.forEach((groupTasks, type) => {
      if (!TASK_TYPE_ORDER.includes(type)) {
        orderedGroups.push({ type, tasks: groupTasks });
      }
    });

    return orderedGroups;
  }, [tasks]);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* ── ヘッダー ── */}
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
        <View style={styles.groupList}>
          {groupedTasks.map(({ type, tasks: groupTasks }) => {
            /** 種別アイコン */
            const icon = TASK_TYPE_ICONS[type] || '📋';
            /** 種別表示ラベル */
            const label = TASK_TYPE_LABELS[type] || type;
            /** 緊急対応は強調表示 */
            const isEmergency = type === PATROL_TASK_TYPES.EMERGENCY_SUPPORT;

            return (
              <View key={type} style={styles.typeGroup}>
                {/* 種別セクションヘッダー */}
                <View
                  style={[
                    styles.typeHeader,
                    {
                      backgroundColor: isEmergency
                        ? theme.danger + '18'
                        : theme.primary + '10',
                      borderColor: isEmergency ? theme.danger + '50' : theme.border,
                    },
                  ]}
                >
                  <Text style={styles.typeHeaderIcon}>{icon}</Text>
                  <Text
                    style={[
                      styles.typeHeaderLabel,
                      { color: isEmergency ? theme.danger : theme.text },
                    ]}
                  >
                    {label}
                  </Text>
                  {/* 件数バッジ */}
                  <View
                    style={[
                      styles.countBadge,
                      { backgroundColor: isEmergency ? theme.danger : theme.primary },
                    ]}
                  >
                    <Text style={styles.countBadgeText}>{groupTasks.length}</Text>
                  </View>
                </View>

                {/* グループ内タスク一覧 */}
                <View style={styles.ticketList}>
                  {groupTasks.map((task) => {
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
                          {task.event_name || '企画名未設定'}
                        </Text>
                        <Text style={[styles.ticketMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                          {task.event_location || task.location_text || '場所未設定'}
                        </Text>
                        <Text style={[styles.ticketMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                          {TASK_STATUS_LABELS[task.task_status] || task.task_status} / 担当: {assigneeLabel} /{' '}
                          {new Date(task.created_at).toLocaleString('ja-JP')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
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
  /** グループ全体を縦に並べるコンテナ */
  groupList: {
    gap: 12,
  },
  /** 種別グループ */
  typeGroup: {
    gap: 6,
  },
  /** 種別セクションヘッダー */
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  typeHeaderIcon: {
    fontSize: 14,
  },
  typeHeaderLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  /** 件数バッジ */
  countBadge: {
    borderRadius: 999,
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ticketList: {
    gap: 6,
    paddingLeft: 8,
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
