/**
 * 項目12画面
 * 巡回サポート（patrol_tasks ベース）
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ThemedHeader } from '../../../shared/components/ThemedHeader';
import { SCREEN_DESCRIPTION, SCREEN_NAME } from '../constants';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  acceptPatrolTask,
  completePatrolTask,
  listPatrolTaskResults,
  listPatrolTasks,
  PATROL_RESULT_CODES,
  PATROL_TASK_STATUSES,
  PATROL_TASK_TYPES,
} from '../../../services/supabase/patrolTaskService';
import { createTicketMessage, listTicketMessages } from '../../../services/supabase/supportTicketService';

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

/** 種別ごとの完了結果候補 */
const RESULT_OPTIONS_BY_TASK_TYPE = {
  [PATROL_TASK_TYPES.CONFIRM_START]: [
    { key: PATROL_RESULT_CODES.OK, label: RESULT_LABELS[PATROL_RESULT_CODES.OK] },
    { key: PATROL_RESULT_CODES.NOT_STARTED, label: RESULT_LABELS[PATROL_RESULT_CODES.NOT_STARTED] },
    { key: PATROL_RESULT_CODES.NEED_SUPPORT, label: RESULT_LABELS[PATROL_RESULT_CODES.NEED_SUPPORT] },
  ],
  [PATROL_TASK_TYPES.CONFIRM_END]: [
    { key: PATROL_RESULT_CODES.OK, label: RESULT_LABELS[PATROL_RESULT_CODES.OK] },
    { key: PATROL_RESULT_CODES.NOT_ENDED, label: RESULT_LABELS[PATROL_RESULT_CODES.NOT_ENDED] },
    { key: PATROL_RESULT_CODES.NEED_SUPPORT, label: RESULT_LABELS[PATROL_RESULT_CODES.NEED_SUPPORT] },
  ],
  [PATROL_TASK_TYPES.LOCK_CHECK]: [
    { key: PATROL_RESULT_CODES.LOCKED, label: RESULT_LABELS[PATROL_RESULT_CODES.LOCKED] },
    { key: PATROL_RESULT_CODES.UNLOCKED, label: RESULT_LABELS[PATROL_RESULT_CODES.UNLOCKED] },
    { key: PATROL_RESULT_CODES.CANNOT_CONFIRM, label: RESULT_LABELS[PATROL_RESULT_CODES.CANNOT_CONFIRM] },
  ],
};

const DEFAULT_RESULT_OPTIONS = [
  { key: PATROL_RESULT_CODES.OK, label: RESULT_LABELS[PATROL_RESULT_CODES.OK] },
  { key: PATROL_RESULT_CODES.NEED_SUPPORT, label: RESULT_LABELS[PATROL_RESULT_CODES.NEED_SUPPORT] },
];

const GO_MESSAGES = {
  [PATROL_TASK_TYPES.CONFIRM_START]: '巡回担当が企画開始確認のため現地へ向かいます。',
  [PATROL_TASK_TYPES.CONFIRM_END]: '巡回担当が企画終了確認のため現地へ向かいます。',
  [PATROL_TASK_TYPES.LOCK_CHECK]: '巡回担当が施錠確認のため現地へ向かいます。',
  [PATROL_TASK_TYPES.EMERGENCY_SUPPORT]: '巡回担当が緊急対応のため現地へ向かいます。',
  [PATROL_TASK_TYPES.ROUTINE_PATROL]: '巡回担当が定常巡回のため現地へ向かいます。',
  [PATROL_TASK_TYPES.OTHER]: '巡回担当が現地へ向かいます。',
};

const getResultOptionsByTaskType = (taskType) => {
  return RESULT_OPTIONS_BY_TASK_TYPE[taskType] || DEFAULT_RESULT_OPTIONS;
};

const getGoMessageByTaskType = (taskType) => {
  return GO_MESSAGES[taskType] || GO_MESSAGES[PATROL_TASK_TYPES.OTHER];
};

/**
 * 項目12画面コンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.navigation - React Navigationのnavigationオブジェクト
 * @returns {JSX.Element} 項目12画面
 */
const Item12Screen = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskResults, setTaskResults] = useState([]);
  const [isLoadingTaskResults, setIsLoadingTaskResults] = useState(false);
  const [sourceMessages, setSourceMessages] = useState([]);
  const [isLoadingSourceMessages, setIsLoadingSourceMessages] = useState(false);
  const [patrolMemo, setPatrolMemo] = useState('');
  const [resultCode, setResultCode] = useState(PATROL_RESULT_CODES.OK);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * メッセージ表示
   * @param {string} title - タイトル
   * @param {string} message - 本文
   * @returns {void}
   */
  const showMessage = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  /**
   * 選択中タスク
   */
  const selectedTask = useMemo(() => {
    return tasks.find((task) => task.id === selectedTaskId) || null;
  }, [selectedTaskId, tasks]);

  /**
   * 選択中タスクの結果候補
   */
  const resultOptions = useMemo(() => {
    return getResultOptionsByTaskType(selectedTask?.task_type);
  }, [selectedTask?.task_type]);

  /**
   * タスク一覧取得
   * @param {string|null} preferredTaskId - 優先選択ID
   * @returns {Promise<void>} 取得処理
   */
  const loadTasks = async (preferredTaskId = null) => {
    if (!user?.id) {
      setTasks([]);
      setSelectedTaskId(null);
      return;
    }

    setIsLoadingTasks(true);
    const { data, error } = await listPatrolTasks({
      assignedTo: user.id,
      includeUnassigned: true,
      limit: 120,
    });
    setIsLoadingTasks(false);

    if (error) {
      console.error('巡回タスク取得に失敗:', error);
      return;
    }

    const nextTasks = data || [];
    setTasks(nextTasks);

    if (nextTasks.length === 0) {
      setSelectedTaskId(null);
      return;
    }

    const candidateId = preferredTaskId || selectedTaskId;
    if (candidateId && nextTasks.some((task) => task.id === candidateId)) {
      setSelectedTaskId(candidateId);
      return;
    }

    setSelectedTaskId(nextTasks[0].id);
  };

  /**
   * タスク結果一覧取得
   * @param {string|null} taskId - タスクID
   * @returns {Promise<void>} 取得処理
   */
  const loadTaskResults = async (taskId) => {
    if (!taskId) {
      setTaskResults([]);
      return;
    }

    setIsLoadingTaskResults(true);
    const { data, error } = await listPatrolTaskResults({ taskId });
    setIsLoadingTaskResults(false);

    if (error) {
      console.error('巡回タスク結果取得に失敗:', error);
      return;
    }

    setTaskResults(data || []);
  };

  /**
   * 元連絡案件メッセージ一覧取得
   * @param {string|null} sourceTicketId - 元連絡案件ID
   * @returns {Promise<void>} 取得処理
   */
  const loadSourceMessages = async (sourceTicketId) => {
    if (!sourceTicketId) {
      setSourceMessages([]);
      return;
    }

    setIsLoadingSourceMessages(true);
    const { data, error } = await listTicketMessages({ ticketId: sourceTicketId });
    setIsLoadingSourceMessages(false);

    if (error) {
      console.error('元連絡案件メッセージ取得に失敗:', error);
      return;
    }

    setSourceMessages(data || []);
  };

  /**
   * 向かいます（受諾）処理
   * @returns {Promise<void>} 実行処理
   */
  const handleAcceptTask = async () => {
    if (!selectedTask || !user?.id) {
      showMessage('操作エラー', 'タスクまたはログイン情報が不足しています');
      return;
    }

    setIsSubmitting(true);
    const { error } = await acceptPatrolTask({
      taskId: selectedTask.id,
      patrolUserId: user.id,
    });

    if (!error && selectedTask.source_ticket_id) {
      await createTicketMessage({
        ticketId: selectedTask.source_ticket_id,
        authorId: user.id,
        body: getGoMessageByTaskType(selectedTask.task_type),
      });
    }

    setIsSubmitting(false);

    if (error) {
      showMessage('更新エラー', error.message || '受諾処理に失敗しました');
      return;
    }

    await Promise.all([
      loadTasks(selectedTask.id),
      loadTaskResults(selectedTask.id),
      loadSourceMessages(selectedTask.source_ticket_id || null),
    ]);
    showMessage('更新完了', '「向かいます」を登録しました');
  };

  /**
   * 完了処理
   * @returns {Promise<void>} 実行処理
   */
  const handleCompleteTask = async () => {
    if (!selectedTask || !user?.id) {
      showMessage('操作エラー', 'タスクまたはログイン情報が不足しています');
      return;
    }
    if (!resultCode) {
      showMessage('入力不足', '結果を選択してください');
      return;
    }

    setIsSubmitting(true);
    const { error } = await completePatrolTask({
      taskId: selectedTask.id,
      patrolUserId: user.id,
      resultCode,
      memo: patrolMemo,
      taskType: selectedTask.task_type,
      sourceTicketId: selectedTask.source_ticket_id,
      sourceKeyLoanId: selectedTask.source_key_loan_id,
    });
    setIsSubmitting(false);

    if (error) {
      showMessage('完了エラー', error.message || '完了処理に失敗しました');
      return;
    }

    setPatrolMemo('');
    await Promise.all([
      loadTasks(selectedTask.id),
      loadTaskResults(selectedTask.id),
      loadSourceMessages(selectedTask.source_ticket_id || null),
    ]);
    showMessage('完了', '巡回タスクを完了として登録しました');
  };

  /**
   * メモのみ共有（元連絡案件がある場合）
   * @returns {Promise<void>} 実行処理
   */
  const handleSendMemoOnly = async () => {
    if (!selectedTask?.source_ticket_id) {
      showMessage('送信不可', 'このタスクは元連絡案件がないためメモのみ共有できません');
      return;
    }
    if (!user?.id) {
      showMessage('送信不可', 'ログイン情報が取得できません');
      return;
    }
    if (!patrolMemo.trim()) {
      showMessage('入力不足', '巡回メモを入力してください');
      return;
    }

    setIsSubmitting(true);
    const { error } = await createTicketMessage({
      ticketId: selectedTask.source_ticket_id,
      authorId: user.id,
      body: patrolMemo.trim(),
    });
    setIsSubmitting(false);

    if (error) {
      showMessage('送信エラー', error.message || 'メモ送信に失敗しました');
      return;
    }

    setPatrolMemo('');
    await loadSourceMessages(selectedTask.source_ticket_id);
    showMessage('送信完了', 'メモを共有しました');
  };

  const isMineOrUnassigned =
    selectedTask &&
    (!selectedTask.assigned_to || selectedTask.assigned_to === user?.id);

  const canAccept =
    selectedTask &&
    isMineOrUnassigned &&
    [PATROL_TASK_STATUSES.OPEN, PATROL_TASK_STATUSES.ACCEPTED, PATROL_TASK_STATUSES.EN_ROUTE].includes(
      selectedTask.task_status
    );

  const canComplete =
    selectedTask &&
    isMineOrUnassigned &&
    [PATROL_TASK_STATUSES.OPEN, PATROL_TASK_STATUSES.ACCEPTED, PATROL_TASK_STATUSES.EN_ROUTE].includes(
      selectedTask.task_status
    );

  useEffect(() => {
    loadTasks();
  }, [user?.id]);

  useEffect(() => {
    loadTaskResults(selectedTaskId);
  }, [selectedTaskId]);

  useEffect(() => {
    loadSourceMessages(selectedTask?.source_ticket_id || null);
  }, [selectedTask?.source_ticket_id]);

  useEffect(() => {
    if (resultOptions.length === 0) {
      setResultCode(PATROL_RESULT_CODES.OK);
      return;
    }

    if (!resultOptions.some((option) => option.key === resultCode)) {
      setResultCode(resultOptions[0].key);
    }
  }, [resultOptions, resultCode]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{SCREEN_DESCRIPTION}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>巡回タスク一覧</Text>
            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: theme.border }]}
              onPress={() => loadTasks(selectedTaskId)}
            >
              <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
            </TouchableOpacity>
          </View>

          {isLoadingTasks ? (
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
          ) : tasks.length === 0 ? (
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>巡回タスクはありません</Text>
          ) : (
            <View style={styles.ticketList}>
              {tasks.map((task) => {
                const isActive = task.id === selectedTaskId;
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
                    onPress={() => setSelectedTaskId(task.id)}
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

        {selectedTask ? (
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
                    onPress={() => setResultCode(option.key)}
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
              onChangeText={setPatrolMemo}
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
                onPress={handleAcceptTask}
              >
                <Text style={styles.actionButtonText}>向かいます</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: canComplete ? '#22A06B' : theme.border },
                ]}
                disabled={!canComplete || isSubmitting}
                onPress={handleCompleteTask}
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
              onPress={handleSendMemoOnly}
              disabled={!selectedTask.source_ticket_id || isSubmitting}
            >
              <Text style={[styles.memoButtonText, { color: theme.textSecondary }]}>メモのみ共有</Text>
            </TouchableOpacity>

            <View style={styles.sectionHeader}>
              <Text style={[styles.label, { color: theme.text }]}>タスク結果履歴</Text>
              <TouchableOpacity
                style={[styles.refreshButton, { borderColor: theme.border }]}
                onPress={() => loadTaskResults(selectedTask.id)}
              >
                <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
              </TouchableOpacity>
            </View>

            {isLoadingTaskResults ? (
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
            ) : taskResults.length === 0 ? (
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>結果履歴はまだありません</Text>
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

            {selectedTask.source_ticket_id ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.label, { color: theme.text }]}>元連絡案件メッセージ</Text>
                  <TouchableOpacity
                    style={[styles.refreshButton, { borderColor: theme.border }]}
                    onPress={() => loadSourceMessages(selectedTask.source_ticket_id)}
                  >
                    <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
                  </TouchableOpacity>
                </View>

                {isLoadingSourceMessages ? (
                  <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
                ) : sourceMessages.length === 0 ? (
                  <Text style={[styles.helpText, { color: theme.textSecondary }]}>メッセージはまだありません</Text>
                ) : (
                  <View style={styles.messageList}>
                    {sourceMessages.map((message) => {
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
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
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
  description: {
    fontSize: 14,
    lineHeight: 20,
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
  ticketDetailTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
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
});

export default Item12Screen;
