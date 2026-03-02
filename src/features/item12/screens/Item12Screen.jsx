/**
 * 項目12画面
 * 巡回サポート（patrol_tasks ベース）
 * state管理とAPI呼び出しを集約するコンテナコンポーネント
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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
  selectPatrolRankingData,
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
  listEvaluationChecks,
} from '../../../services/supabase/evaluationService';
import PatrolTaskList from '../components/PatrolTaskList';
import PatrolTaskDetail from '../components/PatrolTaskDetail';
import PatrolCheckForm from '../components/PatrolCheckForm';
import UnvisitedAlertList from '../components/UnvisitedAlertList';
import PatrolEvaluationForm from '../components/PatrolEvaluationForm';
import PatrolRankingCard from '../components/PatrolRankingCard';
import OfflineBanner from '../../../shared/components/OfflineBanner';

/** 種別ごとの完了結果候補 */
const RESULT_OPTIONS_BY_TASK_TYPE = {
  [PATROL_TASK_TYPES.CONFIRM_START]: [
    { key: PATROL_RESULT_CODES.OK, label: '問題なし' },
    { key: PATROL_RESULT_CODES.NOT_STARTED, label: '開始していない' },
    { key: PATROL_RESULT_CODES.NEED_SUPPORT, label: '別対応必要' },
  ],
  [PATROL_TASK_TYPES.CONFIRM_END]: [
    { key: PATROL_RESULT_CODES.OK, label: '問題なし' },
    { key: PATROL_RESULT_CODES.NOT_ENDED, label: '終了していない' },
    { key: PATROL_RESULT_CODES.NEED_SUPPORT, label: '別対応必要' },
  ],
  [PATROL_TASK_TYPES.LOCK_CHECK]: [
    { key: PATROL_RESULT_CODES.LOCKED, label: '施錠済' },
    { key: PATROL_RESULT_CODES.UNLOCKED, label: '未施錠' },
    { key: PATROL_RESULT_CODES.CANNOT_CONFIRM, label: '確認不可' },
  ],
};

/** デフォルトの完了結果候補 */
const DEFAULT_RESULT_OPTIONS = [
  { key: PATROL_RESULT_CODES.OK, label: '問題なし' },
  { key: PATROL_RESULT_CODES.NEED_SUPPORT, label: '別対応必要' },
];

/** 種別ごとの「向かいます」メッセージ */
const GO_MESSAGES = {
  [PATROL_TASK_TYPES.CONFIRM_START]: '巡回担当が企画開始確認のため現地へ向かいます。',
  [PATROL_TASK_TYPES.CONFIRM_END]: '巡回担当が企画終了確認のため現地へ向かいます。',
  [PATROL_TASK_TYPES.LOCK_CHECK]: '巡回担当が施錠確認のため現地へ向かいます。',
  [PATROL_TASK_TYPES.EMERGENCY_SUPPORT]: '巡回担当が緊急対応のため現地へ向かいます。',
  [PATROL_TASK_TYPES.ROUTINE_PATROL]: '巡回担当が定常巡回のため現地へ向かいます。',
  [PATROL_TASK_TYPES.OTHER]: '巡回担当が現地へ向かいます。',
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

/** タスク種別表示名 */
const TASK_TYPE_LABELS = {
  [PATROL_TASK_TYPES.CONFIRM_START]: '企画開始確認',
  [PATROL_TASK_TYPES.CONFIRM_END]: '企画終了確認',
  [PATROL_TASK_TYPES.LOCK_CHECK]: '施錠確認',
  [PATROL_TASK_TYPES.EMERGENCY_SUPPORT]: '緊急対応',
  [PATROL_TASK_TYPES.ROUTINE_PATROL]: '定常巡回',
  [PATROL_TASK_TYPES.OTHER]: 'その他',
};

/** 未巡回アラートのデフォルト閾値（分） */
const DEFAULT_UNVISITED_ALERT_MINUTES = 90;

/**
 * タスク種別に応じた結果候補を取得
 * @param {string} taskType - タスク種別
 * @returns {Array} 結果候補配列
 */
const getResultOptionsByTaskType = (taskType) => {
  return RESULT_OPTIONS_BY_TASK_TYPE[taskType] || DEFAULT_RESULT_OPTIONS;
};

/**
 * タスク種別に応じた「向かいます」メッセージを取得
 * @param {string} taskType - タスク種別
 * @returns {string} メッセージ文字列
 */
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

  /* ---- タスク一覧関連 ---- */
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  /* ---- タスク詳細関連 ---- */
  const [taskResults, setTaskResults] = useState([]);
  const [isLoadingTaskResults, setIsLoadingTaskResults] = useState(false);
  const [sourceMessages, setSourceMessages] = useState([]);
  const [isLoadingSourceMessages, setIsLoadingSourceMessages] = useState(false);
  const [patrolMemo, setPatrolMemo] = useState('');
  const [resultCode, setResultCode] = useState(PATROL_RESULT_CODES.OK);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ---- 巡回チェック関連 ---- */
  const [patrolLocations, setPatrolLocations] = useState([]);
  const [selectedPatrolLocationId, setSelectedPatrolLocationId] = useState('');
  const [patrolLocationText, setPatrolLocationText] = useState('');
  const [patrolCheckItems, setPatrolCheckItems] = useState([]);
  const [patrolCheckMemo, setPatrolCheckMemo] = useState('');
  const [isSubmittingPatrolCheck, setIsSubmittingPatrolCheck] = useState(false);
  const [recentPatrolChecks, setRecentPatrolChecks] = useState([]);
  const [isLoadingRecentPatrolChecks, setIsLoadingRecentPatrolChecks] = useState(false);

  /* ---- 未巡回アラート関連 ---- */
  const [unvisitedLocations, setUnvisitedLocations] = useState([]);
  const [isLoadingUnvisitedLocations, setIsLoadingUnvisitedLocations] = useState(false);
  const [unvisitedAlertMinutes, setUnvisitedAlertMinutes] = useState(DEFAULT_UNVISITED_ALERT_MINUTES);

  /* ---- 評価関連 ---- */
  const [evaluationScore, setEvaluationScore] = useState(3);
  const [evaluationComment, setEvaluationComment] = useState('');
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);
  const [myEvaluationChecks, setMyEvaluationChecks] = useState([]);
  const [isLoadingMyEvaluationChecks, setIsLoadingMyEvaluationChecks] = useState(false);

  /* ---- ランキング関連 ---- */
  /** 完了件数ランキングデータ */
  const [rankingData, setRankingData] = useState([]);
  /** ランキング読み込み中フラグ */
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);

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

  /** 選択中タスク */
  const selectedTask = useMemo(() => {
    return tasks.find((task) => task.id === selectedTaskId) || null;
  }, [selectedTaskId, tasks]);

  /** 選択中タスクの結果候補 */
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
   * 完了件数ランキングを取得
   * @returns {Promise<void>} 取得処理
   */
  const loadRanking = async () => {
    setIsLoadingRanking(true);
    const { data, error } = await selectPatrolRankingData({ limit: 500 });
    setIsLoadingRanking(false);

    if (error) {
      console.error('ランキング取得に失敗:', error);
      return;
    }

    setRankingData(data || []);
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
   * 巡回場所選択ハンドラ
   * @param {Object} location - 選択された場所オブジェクト
   * @returns {void}
   */
  const handleSelectLocation = (location) => {
    setSelectedPatrolLocationId(location.id);
    setPatrolLocationText(location.label || location.name || '');
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

    /** 確認ダイアログを表示 */
    const confirmMessage = `「${locationText}」の巡回チェックを記録しますか？`;
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) {
        return;
      }
    } else {
      const confirmed = await new Promise((resolve) => {
        Alert.alert('確認', confirmMessage, [
          { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
          { text: '記録', onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) {
        return;
      }
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

    /** 確認ダイアログを表示 */
    const confirmMessage = `${evaluationScore}点の評価を承認待ちとして登録しますか？`;
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) {
        return;
      }
    } else {
      const confirmed = await new Promise((resolve) => {
        Alert.alert('確認', confirmMessage, [
          { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
          { text: '登録', onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) {
        return;
      }
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

    /** 確認ダイアログを表示 */
    const taskLabel = TASK_TYPE_LABELS[selectedTask.task_type] || selectedTask.task_type;
    const confirmMessage = `「${taskLabel}」の受諾（向かいます）を実行しますか？`;
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) {
        return;
      }
    } else {
      const confirmed = await new Promise((resolve) => {
        Alert.alert('確認', confirmMessage, [
          { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
          { text: '実行', onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) {
        return;
      }
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

    /** 確認ダイアログを表示 */
    const taskLabel = TASK_TYPE_LABELS[selectedTask.task_type] || selectedTask.task_type;
    const resultLabel = RESULT_LABELS[resultCode] || resultCode;
    const confirmMessage = `「${taskLabel}」を「${resultLabel}」で完了しますか？`;
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) {
        return;
      }
    } else {
      const confirmed = await new Promise((resolve) => {
        Alert.alert('確認', confirmMessage, [
          { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
          { text: '完了', onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) {
        return;
      }
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

  /** 自分のタスクまたは未割当かどうか */
  const isMineOrUnassigned = useMemo(
    () =>
      selectedTask != null &&
      (!selectedTask.assigned_to || selectedTask.assigned_to === user?.id),
    [selectedTask, user?.id]
  );

  /**
   * 自分が現在受諾中/移動中の同種別タスクが存在するか
   * 未割当タスクへの「行きます」可否判定に使用する
   */
  const hasSameTypeActiveTask = useMemo(() => {
    if (!selectedTask || !user?.id) {
      return false;
    }
    return tasks.some(
      (task) =>
        task.id !== selectedTask.id &&
        task.task_type === selectedTask.task_type &&
        task.assigned_to === user.id &&
        [PATROL_TASK_STATUSES.ACCEPTED, PATROL_TASK_STATUSES.EN_ROUTE].includes(task.task_status)
    );
  }, [tasks, selectedTask, user?.id]);

  /**
   * 受諾可能かどうか
   * - 自分に割り当て済み: ステータスが open/accepted/en_route であれば受諾可
   * - 未割当: 同種別のアクティブタスクを持っていなければ受諾可
   * - 他者に割り当て済み: 受諾不可
   */
  const canAccept = useMemo(() => {
    if (!selectedTask) {
      return false;
    }
    const isActiveStatus = [
      PATROL_TASK_STATUSES.OPEN,
      PATROL_TASK_STATUSES.ACCEPTED,
      PATROL_TASK_STATUSES.EN_ROUTE,
    ].includes(selectedTask.task_status);
    if (!isActiveStatus) {
      return false;
    }
    /** 自分が担当者の場合はそのまま受諾可 */
    if (selectedTask.assigned_to === user?.id) {
      return true;
    }
    /** 未割当の場合は同種別アクティブタスクがなければ受諾可 */
    if (!selectedTask.assigned_to) {
      return !hasSameTypeActiveTask;
    }
    /** 他者が担当者の場合は受諾不可 */
    return false;
  }, [selectedTask, user?.id, hasSameTypeActiveTask]);

  /** 完了可能かどうか（自分担当または未割当のアクティブタスクのみ） */
  const canComplete = useMemo(
    () =>
      selectedTask != null &&
      isMineOrUnassigned &&
      [PATROL_TASK_STATUSES.OPEN, PATROL_TASK_STATUSES.ACCEPTED, PATROL_TASK_STATUSES.EN_ROUTE].includes(
        selectedTask.task_status
      ),
    [selectedTask, isMineOrUnassigned]
  );

  useEffect(() => {
    loadTasks();
    refreshPatrolCheckData();
    loadRanking();
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
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{SCREEN_DESCRIPTION}</Text>
        </View>

        <PatrolTaskList
          theme={theme}
          user={user}
          tasks={tasks}
          isLoadingTasks={isLoadingTasks}
          selectedTaskId={selectedTaskId}
          onSelectTask={setSelectedTaskId}
          onRefresh={() => loadTasks(selectedTaskId)}
        />

        <PatrolCheckForm
          theme={theme}
          patrolLocations={patrolLocations}
          selectedPatrolLocationId={selectedPatrolLocationId}
          onSelectLocation={handleSelectLocation}
          patrolLocationText={patrolLocationText}
          onChangeLocationText={setPatrolLocationText}
          patrolCheckItems={patrolCheckItems}
          onToggleCheckItem={togglePatrolCheckItem}
          patrolCheckMemo={patrolCheckMemo}
          onChangeCheckMemo={setPatrolCheckMemo}
          isSubmittingPatrolCheck={isSubmittingPatrolCheck}
          onSubmitPatrolCheck={handleSubmitPatrolCheck}
          recentPatrolChecks={recentPatrolChecks}
          isLoadingRecentPatrolChecks={isLoadingRecentPatrolChecks}
          onRefresh={refreshPatrolCheckData}
        />

        <UnvisitedAlertList
          theme={theme}
          unvisitedLocations={unvisitedLocations}
          isLoadingUnvisitedLocations={isLoadingUnvisitedLocations}
          unvisitedAlertMinutes={unvisitedAlertMinutes}
          onChangeAlertMinutes={setUnvisitedAlertMinutes}
          onRefresh={loadUnvisitedAlerts}
        />

        <PatrolEvaluationForm
          theme={theme}
          selectedTask={selectedTask}
          evaluationScore={evaluationScore}
          onChangeScore={setEvaluationScore}
          evaluationComment={evaluationComment}
          onChangeComment={setEvaluationComment}
          isSubmittingEvaluation={isSubmittingEvaluation}
          onSubmitEvaluation={handleSubmitEvaluation}
          myEvaluationChecks={myEvaluationChecks}
          isLoadingMyEvaluationChecks={isLoadingMyEvaluationChecks}
          onRefresh={loadMyEvaluationChecks}
        />

        {/* ── 完了件数ランキング ── */}
        <PatrolRankingCard
          theme={theme}
          rankingData={rankingData}
          isLoading={isLoadingRanking}
          onRefresh={loadRanking}
        />

        {selectedTask ? (
          <PatrolTaskDetail
            theme={theme}
            user={user}
            selectedTask={selectedTask}
            resultOptions={resultOptions}
            resultCode={resultCode}
            onChangeResultCode={setResultCode}
            patrolMemo={patrolMemo}
            onChangePatrolMemo={setPatrolMemo}
            isSubmitting={isSubmitting}
            canAccept={canAccept}
            canComplete={canComplete}
            onAcceptTask={handleAcceptTask}
            onCompleteTask={handleCompleteTask}
            onSendMemoOnly={handleSendMemoOnly}
            taskResults={taskResults}
            isLoadingTaskResults={isLoadingTaskResults}
            onRefreshTaskResults={() => loadTaskResults(selectedTask.id)}
            sourceMessages={sourceMessages}
            isLoadingSourceMessages={isLoadingSourceMessages}
            onRefreshSourceMessages={() => loadSourceMessages(selectedTask.source_ticket_id)}
          />
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
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default Item12Screen;
