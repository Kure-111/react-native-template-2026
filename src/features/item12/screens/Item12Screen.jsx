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
import {
  createPatrolCheck,
  listPatrolChecks,
  listPatrolLocations,
  listUnvisitedLocations,
} from '../../../services/supabase/patrolCheckService';
import {
  createEvaluationCheck,
  EVALUATION_STATUSES,
  listEvaluationChecks,
} from '../../../services/supabase/evaluationService';

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

const PATROL_CHECK_ITEM_OPTIONS = [
  '導線安全',
  '混雑状況確認',
  '火気・危険物なし',
  '設備異常なし',
  '清掃・衛生確認',
];

const DEFAULT_UNVISITED_ALERT_MINUTES = 90;
const UNVISITED_ALERT_OPTIONS = [30, 60, 90, 120];
const EVALUATION_STATUS_LABELS = {
  [EVALUATION_STATUSES.PENDING]: '承認待ち',
  [EVALUATION_STATUSES.APPROVED]: '承認済み',
  [EVALUATION_STATUSES.REJECTED]: '却下',
  [EVALUATION_STATUSES.REWORK]: '差戻し',
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
  const [patrolLocations, setPatrolLocations] = useState([]);
  const [selectedPatrolLocationId, setSelectedPatrolLocationId] = useState('');
  const [patrolLocationText, setPatrolLocationText] = useState('');
  const [patrolCheckItems, setPatrolCheckItems] = useState([]);
  const [patrolCheckMemo, setPatrolCheckMemo] = useState('');
  const [isSubmittingPatrolCheck, setIsSubmittingPatrolCheck] = useState(false);
  const [recentPatrolChecks, setRecentPatrolChecks] = useState([]);
  const [isLoadingRecentPatrolChecks, setIsLoadingRecentPatrolChecks] = useState(false);
  const [unvisitedLocations, setUnvisitedLocations] = useState([]);
  const [isLoadingUnvisitedLocations, setIsLoadingUnvisitedLocations] = useState(false);
  const [unvisitedAlertMinutes, setUnvisitedAlertMinutes] = useState(DEFAULT_UNVISITED_ALERT_MINUTES);
  const [evaluationScore, setEvaluationScore] = useState(3);
  const [evaluationComment, setEvaluationComment] = useState('');
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);
  const [myEvaluationChecks, setMyEvaluationChecks] = useState([]);
  const [isLoadingMyEvaluationChecks, setIsLoadingMyEvaluationChecks] = useState(false);

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
   * 巡回場所候補を取得
   * @returns {Promise<void>} 取得処理
   */
  const loadPatrolLocations = async () => {
    const { data, error } = await listPatrolLocations({ limit: 240 });
    if (error) {
      console.error('巡回場所候補の取得に失敗:', error);
      return;
    }

    const nextLocations = data || [];
    setPatrolLocations(nextLocations);

    if (nextLocations.length === 0) {
      return;
    }

    if (
      selectedPatrolLocationId &&
      nextLocations.some((location) => location.id === selectedPatrolLocationId)
    ) {
      return;
    }

    setSelectedPatrolLocationId(nextLocations[0].id);
    setPatrolLocationText(nextLocations[0].label || nextLocations[0].name || '');
  };

  /**
   * 直近巡回チェック履歴を取得
   * @returns {Promise<void>} 取得処理
   */
  const loadRecentPatrolChecks = async () => {
    setIsLoadingRecentPatrolChecks(true);
    const { data, error } = await listPatrolChecks({ limit: 12 });
    setIsLoadingRecentPatrolChecks(false);

    if (error) {
      console.error('巡回チェック履歴の取得に失敗:', error);
      return;
    }

    setRecentPatrolChecks(data || []);
  };

  /**
   * 未巡回アラート一覧を取得
   * @returns {Promise<void>} 取得処理
   */
  const loadUnvisitedAlerts = async () => {
    setIsLoadingUnvisitedLocations(true);
    const { data, error } = await listUnvisitedLocations({
      alertMinutes: unvisitedAlertMinutes,
      limit: 240,
    });
    setIsLoadingUnvisitedLocations(false);

    if (error) {
      console.error('未巡回アラートの取得に失敗:', error);
      return;
    }

    setUnvisitedLocations(data || []);
  };

  /**
   * 自分の評価入力履歴を取得
   * @returns {Promise<void>} 取得処理
   */
  const loadMyEvaluationChecks = async () => {
    if (!user?.id) {
      setMyEvaluationChecks([]);
      return;
    }

    setIsLoadingMyEvaluationChecks(true);
    const { data, error } = await listEvaluationChecks({
      evaluatorId: user.id,
      limit: 20,
    });
    setIsLoadingMyEvaluationChecks(false);

    if (error) {
      console.error('評価入力履歴の取得に失敗:', error);
      return;
    }

    setMyEvaluationChecks(data || []);
  };

  /**
   * 巡回チェック関連情報を更新
   * @returns {Promise<void>} 更新処理
   */
  const refreshPatrolCheckData = async () => {
    await Promise.all([
      loadPatrolLocations(),
      loadRecentPatrolChecks(),
      loadUnvisitedAlerts(),
      loadMyEvaluationChecks(),
    ]);
  };

  /**
   * 巡回チェック項目を切替
   * @param {string} item - 項目名
   * @returns {void}
   */
  const togglePatrolCheckItem = (item) => {
    setPatrolCheckItems((prev) =>
      prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item]
    );
  };

  /**
   * 巡回チェックを登録
   * @returns {Promise<void>} 登録処理
   */
  const handleSubmitPatrolCheck = async () => {
    if (!user?.id) {
      showMessage('登録エラー', 'ログイン情報が取得できません');
      return;
    }

    const selectedLocation = patrolLocations.find((location) => location.id === selectedPatrolLocationId) || null;
    const locationText = patrolLocationText.trim() || selectedLocation?.label || selectedLocation?.name || '';

    if (!locationText) {
      showMessage('入力不足', '巡回場所を入力してください');
      return;
    }

    setIsSubmittingPatrolCheck(true);
    const { error } = await createPatrolCheck({
      patrolUserId: user.id,
      locationId: selectedLocation?.id || null,
      locationText,
      checkItems: patrolCheckItems,
      memo: patrolCheckMemo,
    });
    setIsSubmittingPatrolCheck(false);

    if (error) {
      showMessage('登録エラー', error.message || '巡回チェックの登録に失敗しました');
      return;
    }

    setPatrolCheckMemo('');
    setPatrolCheckItems([]);
    await Promise.all([loadRecentPatrolChecks(), loadUnvisitedAlerts()]);
    showMessage('登録完了', '巡回チェックを記録しました');
  };

  /**
   * 企画評価を登録（承認待ち）
   * @returns {Promise<void>} 登録処理
   */
  const handleSubmitEvaluation = async () => {
    if (!user?.id) {
      showMessage('登録エラー', 'ログイン情報が取得できません');
      return;
    }
    if (!selectedTask) {
      showMessage('入力不足', '評価対象のタスクを選択してください');
      return;
    }
    if (selectedTask.task_status !== PATROL_TASK_STATUSES.DONE) {
      showMessage('入力不足', '評価はタスク完了後に入力してください');
      return;
    }
    if (evaluationComment.trim().length < 4) {
      showMessage('入力不足', '評価コメントを4文字以上で入力してください');
      return;
    }

    const sourceTicket = Array.isArray(selectedTask.source_ticket)
      ? selectedTask.source_ticket[0] || null
      : selectedTask.source_ticket || null;

    setIsSubmittingEvaluation(true);
    const { error } = await createEvaluationCheck({
      eventId: sourceTicket?.event_id || null,
      ticketId: selectedTask.source_ticket_id || null,
      taskId: selectedTask.id,
      evaluatorId: user.id,
      score: evaluationScore,
      comment: evaluationComment,
    });
    setIsSubmittingEvaluation(false);

    if (error) {
      showMessage('登録エラー', error.message || '評価入力に失敗しました');
      return;
    }

    setEvaluationComment('');
    await loadMyEvaluationChecks();
    showMessage('登録完了', '評価を承認待ちとして登録しました');
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
    refreshPatrolCheckData();
  }, [user?.id]);

  useEffect(() => {
    loadTaskResults(selectedTaskId);
  }, [selectedTaskId]);

  useEffect(() => {
    loadSourceMessages(selectedTask?.source_ticket_id || null);
  }, [selectedTask?.source_ticket_id]);

  useEffect(() => {
    loadUnvisitedAlerts();
  }, [unvisitedAlertMinutes]);

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

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>定常巡回チェック</Text>
            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: theme.border }]}
              onPress={refreshPatrolCheckData}
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
            onChangeText={setPatrolLocationText}
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
                    onPress={() => {
                      setSelectedPatrolLocationId(location.id);
                      setPatrolLocationText(location.label || location.name || '');
                    }}
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
                  onPress={() => togglePatrolCheckItem(item)}
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
            onChangeText={setPatrolCheckMemo}
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
            onPress={handleSubmitPatrolCheck}
            disabled={isSubmittingPatrolCheck}
          >
            <Text style={styles.actionButtonText}>
              {isSubmittingPatrolCheck ? '登録中...' : '巡回チェックを記録'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.label, { color: theme.text }]}>直近の巡回チェック</Text>
          {isLoadingRecentPatrolChecks ? (
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
          ) : recentPatrolChecks.length === 0 ? (
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>まだ巡回チェックはありません</Text>
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

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>未巡回アラート</Text>
            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: theme.border }]}
              onPress={loadUnvisitedAlerts}
            >
              <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.helpText, { color: theme.textSecondary }]}>
            設定した閾値以上巡回記録がない場所を先頭に表示します。
          </Text>
          <Text style={[styles.label, { color: theme.text }]}>アラート閾値</Text>
          <View style={styles.optionGroup}>
            {UNVISITED_ALERT_OPTIONS.map((minutes) => {
              const isActive = minutes === unvisitedAlertMinutes;
              return (
                <Pressable
                  key={String(minutes)}
                  style={[
                    styles.optionButton,
                    {
                      borderColor: isActive ? theme.primary : theme.border,
                      backgroundColor: isActive ? `${theme.primary}1A` : theme.background,
                    },
                  ]}
                  onPress={() => setUnvisitedAlertMinutes(minutes)}
                >
                  <Text style={[styles.optionButtonText, { color: isActive ? theme.primary : theme.textSecondary }]}>
                    {minutes}分
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isLoadingUnvisitedLocations ? (
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
          ) : unvisitedLocations.length === 0 ? (
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>未巡回アラートはありません</Text>
          ) : (
            <View style={styles.ticketList}>
              {unvisitedLocations.slice(0, 24).map((row) => (
                <View
                  key={row.location_id}
                  style={[
                    styles.ticketItem,
                    {
                      borderColor: row.is_alert ? '#D1242F' : theme.border,
                      backgroundColor: row.is_alert ? '#D1242F14' : theme.background,
                    },
                  ]}
                >
                  <Text style={[styles.ticketTitle, { color: theme.text }]} numberOfLines={1}>
                    {row.location_label}
                  </Text>
                  <Text style={[styles.ticketMeta, { color: theme.textSecondary }]}>
                    最終巡回:{' '}
                    {row.last_checked_at
                      ? new Date(row.last_checked_at).toLocaleString('ja-JP')
                      : '巡回記録なし'}
                  </Text>
                  <Text style={[styles.ticketMeta, { color: theme.textSecondary }]}>
                    経過時間:{' '}
                    {row.elapsed_minutes === null ? '-' : `${Math.floor(row.elapsed_minutes / 60)}時間${row.elapsed_minutes % 60}分`}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>企画評価入力（承認待ち）</Text>
            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: theme.border }]}
              onPress={loadMyEvaluationChecks}
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
                  onPress={() => setEvaluationScore(score)}
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
            onChangeText={setEvaluationComment}
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
            onPress={handleSubmitEvaluation}
            disabled={isSubmittingEvaluation}
          >
            <Text style={styles.actionButtonText}>
              {isSubmittingEvaluation ? '登録中...' : '評価を承認待ちで登録'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.label, { color: theme.text }]}>最近の評価入力</Text>
          {isLoadingMyEvaluationChecks ? (
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
          ) : myEvaluationChecks.length === 0 ? (
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>評価入力履歴はまだありません</Text>
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
