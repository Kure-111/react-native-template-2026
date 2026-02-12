/**
 * 対応者向け共通画面
 * 本部/会計/物品の連絡案件対応UI
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
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
import { ThemedHeader } from '../../../shared/components/ThemedHeader';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  createTicketMessage,
  listTicketMessages,
  listTicketsForRole,
  SUPPORT_DESK_ROLE_TYPES,
  SUPPORT_TICKET_STATUSES,
  updateTicketStatus,
} from '../../../services/supabase/supportTicketService';
import HQKeyManagementPanel from './HQKeyManagementPanel';
import { createRadioLog, listRadioLogs } from '../../../services/supabase/radioLogService';
import {
  assignPatrolTask,
  listPatrolTasks,
  PATROL_TASK_STATUSES,
} from '../../../services/supabase/patrolTaskService';
import {
  EVALUATION_STATUSES,
  listEvaluationChecks,
  reviewEvaluationCheck,
} from '../../../services/supabase/evaluationService';
import { notifySupportTicketCreated } from '../../../shared/services/supportWorkflowNotificationService';
import {
  getRoles,
  getUserProfilesByIds,
  getUsersByRoles,
} from '../../../shared/services/notificationService';
import {
  createAttachmentSignedUrl,
  listTicketAttachments,
} from '../../../services/supabase/ticketAttachmentService';

/** ステータス表示名 */
const STATUS_LABELS = {
  [SUPPORT_TICKET_STATUSES.NEW]: '新規',
  [SUPPORT_TICKET_STATUSES.ACKNOWLEDGED]: '受領',
  [SUPPORT_TICKET_STATUSES.IN_PROGRESS]: '対応中',
  [SUPPORT_TICKET_STATUSES.WAITING_EXTERNAL]: '外部待ち',
  [SUPPORT_TICKET_STATUSES.RESOLVED]: '解決済み',
  [SUPPORT_TICKET_STATUSES.CLOSED]: 'クローズ',
};

/** 種別表示名 */
const TICKET_TYPE_LABELS = {
  rule_question: '企画ルール変更',
  layout_change: '配置図変更',
  distribution_change: '商品配布基準変更',
  damage_report: '物品破損報告',
  emergency: '緊急呼び出し',
  key_preapply: '鍵の事前申請',
  start_report: '企画開始報告',
  end_report: '企画終了報告',
};

/** 会計/物品向け状態フィルタ */
const TICKET_STATUS_FILTERS = [
  { key: 'all', label: 'すべて' },
  { key: 'todo', label: '未対応' },
  { key: 'working', label: '対応中' },
  { key: 'done', label: '完了' },
];

const PATROL_TASK_STATUS_LABELS = {
  open: '未対応',
  accepted: '受諾',
  en_route: '移動中',
  done: '完了',
  canceled: '取消',
};

const PATROL_TASK_TYPE_LABELS = {
  confirm_start: '企画開始確認',
  confirm_end: '企画終了確認',
  lock_check: '施錠確認',
  emergency_support: '緊急対応',
  routine_patrol: '定常巡回',
  other: 'その他',
};

const EVALUATION_STATUS_LABELS = {
  [EVALUATION_STATUSES.PENDING]: '承認待ち',
  [EVALUATION_STATUSES.APPROVED]: '承認済み',
  [EVALUATION_STATUSES.REJECTED]: '却下',
  [EVALUATION_STATUSES.REWORK]: '差戻し',
};

const PATROL_ROLE_NAMES = ['警備部', '企画管理部'];

const normalizeText = (value) => (value || '').trim();
const formatFileSize = (fileSizeBytes) => {
  const size = Number(fileSizeBytes);
  if (!Number.isFinite(size) || size < 0) {
    return '-';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

/**
 * 対応者向け共通画面コンポーネント
 * @param {Object} props - プロパティ
 * @param {Object} props.navigation - React Navigation navigation
 * @param {string} props.screenName - 画面名
 * @param {string} props.screenDescription - 画面説明
 * @param {'hq'|'accounting'|'property'} props.roleType - 担当種別
 * @returns {JSX.Element} 対応画面
 */
const SupportDeskScreen = ({ navigation, screenName, screenDescription, roleType }) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [ticketAttachments, setTicketAttachments] = useState([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState(TICKET_STATUS_FILTERS[0].key);

  const [radioLogs, setRadioLogs] = useState([]);
  const [isLoadingRadioLogs, setIsLoadingRadioLogs] = useState(false);
  const [isSubmittingRadioLog, setIsSubmittingRadioLog] = useState(false);
  const [radioChannel, setRadioChannel] = useState('main');
  const [radioLocation, setRadioLocation] = useState('');
  const [radioMessage, setRadioMessage] = useState('');

  const [hqPatrolTasks, setHqPatrolTasks] = useState([]);
  const [isLoadingHqPatrolTasks, setIsLoadingHqPatrolTasks] = useState(false);
  const [selectedPatrolTaskId, setSelectedPatrolTaskId] = useState(null);
  const [patrolAssignees, setPatrolAssignees] = useState([]);
  const [isLoadingPatrolAssignees, setIsLoadingPatrolAssignees] = useState(false);
  const [selectedPatrolAssigneeId, setSelectedPatrolAssigneeId] = useState('');
  const [isAssigningPatrolTask, setIsAssigningPatrolTask] = useState(false);

  const [pendingEvaluations, setPendingEvaluations] = useState([]);
  const [isLoadingPendingEvaluations, setIsLoadingPendingEvaluations] = useState(false);
  const [isReviewingEvaluation, setIsReviewingEvaluation] = useState(false);
  const [isRenotifying, setIsRenotifying] = useState(false);

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

  const isHQRole = roleType === SUPPORT_DESK_ROLE_TYPES.HQ;
  const isDepartmentRole =
    roleType === SUPPORT_DESK_ROLE_TYPES.ACCOUNTING || roleType === SUPPORT_DESK_ROLE_TYPES.PROPERTY;

  const filteredTickets = useMemo(() => {
    if (!isDepartmentRole) {
      return tickets;
    }

    if (ticketStatusFilter === 'todo') {
      return tickets.filter((ticket) =>
        [SUPPORT_TICKET_STATUSES.NEW, SUPPORT_TICKET_STATUSES.ACKNOWLEDGED].includes(ticket.ticket_status)
      );
    }
    if (ticketStatusFilter === 'working') {
      return tickets.filter((ticket) =>
        [SUPPORT_TICKET_STATUSES.IN_PROGRESS, SUPPORT_TICKET_STATUSES.WAITING_EXTERNAL].includes(
          ticket.ticket_status
        )
      );
    }
    if (ticketStatusFilter === 'done') {
      return tickets.filter((ticket) =>
        [SUPPORT_TICKET_STATUSES.RESOLVED, SUPPORT_TICKET_STATUSES.CLOSED].includes(ticket.ticket_status)
      );
    }

    return tickets;
  }, [isDepartmentRole, ticketStatusFilter, tickets]);

  const selectedTicket = useMemo(() => {
    return filteredTickets.find((ticket) => ticket.id === selectedTicketId) || null;
  }, [filteredTickets, selectedTicketId]);

  const isEventStatusTicket =
    selectedTicket?.ticket_type === 'start_report' || selectedTicket?.ticket_type === 'end_report';

  const selectedPatrolTask = useMemo(() => {
    return hqPatrolTasks.find((task) => task.id === selectedPatrolTaskId) || null;
  }, [hqPatrolTasks, selectedPatrolTaskId]);

  const dashboardSummary = useMemo(() => {
    const now = Date.now();
    const delayedMinutes = 60;

    const newTickets = tickets.filter((ticket) => ticket.ticket_status === SUPPORT_TICKET_STATUSES.NEW).length;
    const delayedTickets = tickets.filter((ticket) => {
      if ([SUPPORT_TICKET_STATUSES.RESOLVED, SUPPORT_TICKET_STATUSES.CLOSED].includes(ticket.ticket_status)) {
        return false;
      }
      const createdAt = new Date(ticket.created_at).getTime();
      return Number.isFinite(createdAt) && now - createdAt >= delayedMinutes * 60 * 1000;
    }).length;

    const activePatrolTasks = hqPatrolTasks.filter((task) =>
      [PATROL_TASK_STATUSES.OPEN, PATROL_TASK_STATUSES.ACCEPTED, PATROL_TASK_STATUSES.EN_ROUTE].includes(
        task.task_status
      )
    ).length;

    const recentRadioLogs = radioLogs.filter((log) => {
      const createdAt = new Date(log.created_at).getTime();
      return Number.isFinite(createdAt) && now - createdAt <= 60 * 60 * 1000;
    }).length;

    return {
      newTickets,
      delayedTickets,
      activePatrolTasks,
      recentRadioLogs,
    };
  }, [hqPatrolTasks, radioLogs, tickets]);

  /**
   * 案件一覧を取得
   * @param {string|null} preferredTicketId - 優先選択する案件ID
   * @returns {Promise<void>} 取得処理
   */
  const loadTickets = async (preferredTicketId = null) => {
    setIsLoadingTickets(true);
    const { data, error } = await listTicketsForRole({ roleType, limit: 80 });
    setIsLoadingTickets(false);

    if (error) {
      console.error('連絡案件取得に失敗:', error);
      return;
    }

    const nextTickets = data || [];
    setTickets(nextTickets);

    if (nextTickets.length === 0) {
      setSelectedTicketId(null);
      return;
    }

    const candidateId = preferredTicketId || selectedTicketId;
    if (candidateId && nextTickets.some((ticket) => ticket.id === candidateId)) {
      setSelectedTicketId(candidateId);
      return;
    }

    setSelectedTicketId(nextTickets[0].id);
  };

  /**
   * 返信一覧を取得
   * @param {string|null} ticketId - 案件ID
   * @returns {Promise<void>} 取得処理
   */
  const loadMessages = async (ticketId) => {
    if (!ticketId) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    const { data, error } = await listTicketMessages({ ticketId });
    setIsLoadingMessages(false);

    if (error) {
      console.error('返信一覧取得に失敗:', error);
      return;
    }

    setMessages(data || []);
  };

  /**
   * 添付一覧を取得
   * @param {string|null} ticketId - 案件ID
   * @returns {Promise<void>} 取得処理
   */
  const loadTicketAttachedFiles = async (ticketId) => {
    if (!ticketId) {
      setTicketAttachments([]);
      return;
    }

    setIsLoadingAttachments(true);
    const { data, error } = await listTicketAttachments({ ticketId, limit: 12 });
    if (error) {
      setIsLoadingAttachments(false);
      console.error('添付一覧取得に失敗:', error);
      return;
    }

    const rows = data || [];
    const rowsWithSignedUrl = await Promise.all(
      rows.map(async (attachment) => {
        const { data: signedData, error: signedError } = await createAttachmentSignedUrl({
          storageBucket: attachment.storage_bucket,
          storagePath: attachment.storage_path,
          expiresIn: 3600,
        });
        if (signedError) {
          console.warn('添付URL生成に失敗:', signedError);
        }

        return {
          ...attachment,
          signedUrl: signedData?.signedUrl || '',
        };
      })
    );
    setIsLoadingAttachments(false);
    setTicketAttachments(rowsWithSignedUrl);
  };

  /**
   * 添付を開く
   * @param {Object} attachment - 添付情報
   * @returns {Promise<void>} 表示処理
   */
  const openAttachment = async (attachment) => {
    const signedUrl = normalizeText(attachment?.signedUrl);
    if (!signedUrl) {
      showMessage('添付表示エラー', '添付URLが取得できませんでした。再読み込みしてください。');
      return;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      await Linking.openURL(signedUrl);
    } catch (error) {
      console.error('添付表示に失敗:', error);
      showMessage('添付表示エラー', '添付を開けませんでした。');
    }
  };

  /**
   * 返信送信
   * @returns {Promise<void>} 送信処理
   */
  const handleReplySubmit = async () => {
    if (!selectedTicket) {
      showMessage('送信エラー', '連絡案件を選択してください');
      return;
    }
    if (!user?.id) {
      showMessage('送信エラー', 'ログイン情報が取得できません');
      return;
    }
    if (!replyBody.trim()) {
      showMessage('入力不足', '回答内容を入力してください');
      return;
    }

    setIsSendingReply(true);
    const result = await createTicketMessage({
      ticketId: selectedTicket.id,
      authorId: user.id,
      body: replyBody,
    });
    setIsSendingReply(false);

    if (result.error) {
      showMessage('送信エラー', result.error.message || '回答の送信に失敗しました');
      return;
    }

    if (
      selectedTicket.ticket_status === SUPPORT_TICKET_STATUSES.NEW ||
      selectedTicket.ticket_status === SUPPORT_TICKET_STATUSES.ACKNOWLEDGED
    ) {
      await updateTicketStatus({
        ticketId: selectedTicket.id,
        status: SUPPORT_TICKET_STATUSES.IN_PROGRESS,
      });
    }

    setReplyBody('');
    await Promise.all([loadMessages(selectedTicket.id), loadTickets(selectedTicket.id)]);
    showMessage('送信完了', '回答を送信しました');
  };

  /**
   * ステータス更新
   * @param {string} nextStatus - 更新後ステータス
   * @returns {Promise<void>} 更新処理
   */
  const handleStatusUpdate = async (nextStatus) => {
    if (!selectedTicket) {
      return;
    }

    setIsUpdatingStatus(true);
    const result = await updateTicketStatus({
      ticketId: selectedTicket.id,
      status: nextStatus,
    });
    setIsUpdatingStatus(false);

    if (result.error) {
      showMessage('更新エラー', result.error.message || 'ステータス更新に失敗しました');
      return;
    }

    await loadTickets(selectedTicket.id);
    showMessage('更新完了', 'ステータスを更新しました');
  };

  /**
   * 無線ログ一覧を取得
   * @returns {Promise<void>} 取得処理
   */
  const loadRadioLogs = async () => {
    if (!isHQRole) {
      return;
    }

    setIsLoadingRadioLogs(true);
    const { data, error } = await listRadioLogs({ limit: 40 });
    setIsLoadingRadioLogs(false);

    if (error) {
      console.error('無線ログ取得に失敗:', error);
      return;
    }
    setRadioLogs(data || []);
  };

  /**
   * 無線ログ送信
   * @returns {Promise<void>} 登録処理
   */
  const handleSubmitRadioLog = async () => {
    if (!user?.id) {
      showMessage('登録エラー', 'ログイン情報が取得できません');
      return;
    }
    if (!radioMessage.trim()) {
      showMessage('入力不足', '無線内容を入力してください');
      return;
    }

    setIsSubmittingRadioLog(true);
    const { error } = await createRadioLog({
      loggedBy: user.id,
      role: roleType,
      channel: radioChannel,
      locationText: radioLocation,
      message: radioMessage,
    });
    setIsSubmittingRadioLog(false);

    if (error) {
      showMessage('登録エラー', error.message || '無線ログの登録に失敗しました');
      return;
    }

    setRadioMessage('');
    await loadRadioLogs();
    showMessage('登録完了', '無線ログを記録しました');
  };

  /**
   * HQ向け巡回タスク一覧を取得
   * @returns {Promise<void>} 取得処理
   */
  const loadHqPatrolTasks = async () => {
    if (!isHQRole) {
      return;
    }

    setIsLoadingHqPatrolTasks(true);
    const { data, error } = await listPatrolTasks({ limit: 120 });
    setIsLoadingHqPatrolTasks(false);

    if (error) {
      console.error('巡回タスク取得に失敗:', error);
      return;
    }

    const nextTasks = data || [];
    setHqPatrolTasks(nextTasks);

    if (nextTasks.length === 0) {
      setSelectedPatrolTaskId(null);
      return;
    }

    if (selectedPatrolTaskId && nextTasks.some((task) => task.id === selectedPatrolTaskId)) {
      return;
    }

    setSelectedPatrolTaskId(nextTasks[0].id);
  };

  /**
   * 巡回割当候補ユーザーを取得
   * @returns {Promise<void>} 取得処理
   */
  const loadPatrolAssignees = async () => {
    if (!isHQRole) {
      return;
    }

    setIsLoadingPatrolAssignees(true);
    const { roles, error: rolesError } = await getRoles();
    if (rolesError) {
      setIsLoadingPatrolAssignees(false);
      console.error('ロール一覧取得に失敗:', rolesError);
      return;
    }

    const roleIds = (roles || [])
      .filter((role) => {
        const name = normalizeText(role.name);
        const displayName = normalizeText(role.display_name);
        return PATROL_ROLE_NAMES.includes(name) || PATROL_ROLE_NAMES.includes(displayName);
      })
      .map((role) => role.id);

    const { users, error: usersError } = await getUsersByRoles(roleIds);
    if (usersError) {
      setIsLoadingPatrolAssignees(false);
      console.error('ロールユーザー取得に失敗:', usersError);
      return;
    }

    const { profiles, error: profileError } = await getUserProfilesByIds(users || []);
    setIsLoadingPatrolAssignees(false);

    if (profileError) {
      console.error('ユーザープロフィール取得に失敗:', profileError);
      return;
    }

    const nextAssignees = (profiles || [])
      .map((profile) => ({
        userId: profile.user_id,
        name: profile.name || profile.user_id,
        organization: profile.organization || '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'));

    setPatrolAssignees(nextAssignees);
  };

  /**
   * 巡回タスク担当を更新
   * @returns {Promise<void>} 更新処理
   */
  const handleAssignPatrolTask = async () => {
    if (!selectedPatrolTask) {
      showMessage('更新エラー', '巡回タスクを選択してください');
      return;
    }

    setIsAssigningPatrolTask(true);
    const { error } = await assignPatrolTask({
      taskId: selectedPatrolTask.id,
      assignedTo: selectedPatrolAssigneeId || null,
    });
    setIsAssigningPatrolTask(false);

    if (error) {
      showMessage('更新エラー', error.message || '巡回タスク割当の更新に失敗しました');
      return;
    }

    await loadHqPatrolTasks();
    showMessage('更新完了', selectedPatrolAssigneeId ? '巡回担当を更新しました' : '未割当に戻しました');
  };

  /**
   * HQ向け評価承認一覧を取得
   * @returns {Promise<void>} 取得処理
   */
  const loadPendingEvaluations = async () => {
    if (!isHQRole) {
      return;
    }

    setIsLoadingPendingEvaluations(true);
    const { data, error } = await listEvaluationChecks({
      statuses: [EVALUATION_STATUSES.PENDING, EVALUATION_STATUSES.REWORK],
      limit: 60,
    });
    setIsLoadingPendingEvaluations(false);

    if (error) {
      console.error('評価承認一覧取得に失敗:', error);
      return;
    }

    setPendingEvaluations(data || []);
  };

  /**
   * 評価承認状態を更新
   * @param {string} evaluationId - 評価ID
   * @param {'approved'|'rejected'|'rework'} nextStatus - 更新状態
   * @returns {Promise<void>} 更新処理
   */
  const handleReviewEvaluation = async (evaluationId, nextStatus) => {
    if (!user?.id) {
      showMessage('更新エラー', 'ログイン情報が取得できません');
      return;
    }

    setIsReviewingEvaluation(true);
    const { error } = await reviewEvaluationCheck({
      evaluationId,
      status: nextStatus,
      reviewedBy: user.id,
    });
    setIsReviewingEvaluation(false);

    if (error) {
      showMessage('更新エラー', error.message || '評価承認の更新に失敗しました');
      return;
    }

    await loadPendingEvaluations();
    showMessage('更新完了', '評価承認状態を更新しました');
  };

  /**
   * 部署へ再通知
   * @returns {Promise<void>} 再通知処理
   */
  const handleRenotifyDepartment = async () => {
    if (!selectedTicket) {
      showMessage('通知エラー', '連絡案件を選択してください');
      return;
    }
    if (!['accounting', 'property'].includes(selectedTicket.notify_target)) {
      showMessage('通知エラー', '再通知対象の部署案件ではありません');
      return;
    }

    setIsRenotifying(true);
    const { error, data } = await notifySupportTicketCreated({
      ticket: selectedTicket,
      senderUserId: user?.id || null,
    });
    setIsRenotifying(false);

    if (error) {
      showMessage('通知エラー', error.message || '再通知に失敗しました');
      return;
    }

    const countText = Number.isFinite(data?.recipientsCount)
      ? `対象 ${data.recipientsCount} 人へ通知しました`
      : '再通知しました';
    showMessage('再通知完了', countText);
  };

  useEffect(() => {
    loadTickets();
    loadRadioLogs();
    loadHqPatrolTasks();
    loadPatrolAssignees();
    loadPendingEvaluations();
  }, [roleType, user?.id]);

  useEffect(() => {
    if (filteredTickets.length === 0) {
      setSelectedTicketId(null);
      return;
    }

    if (!selectedTicketId || !filteredTickets.some((ticket) => ticket.id === selectedTicketId)) {
      setSelectedTicketId(filteredTickets[0].id);
    }
  }, [filteredTickets, selectedTicketId]);

  useEffect(() => {
    loadMessages(selectedTicketId);
    loadTicketAttachedFiles(selectedTicketId);
  }, [selectedTicketId]);

  useEffect(() => {
    if (!selectedPatrolTask) {
      setSelectedPatrolAssigneeId('');
      return;
    }
    setSelectedPatrolAssigneeId(selectedPatrolTask.assigned_to || '');
  }, [selectedPatrolTask?.assigned_to, selectedPatrolTask?.id]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      <ThemedHeader title={screenName} navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.description, { color: theme.textSecondary }]}>{screenDescription}</Text>
          {roleType === SUPPORT_DESK_ROLE_TYPES.PROPERTY ? (
            <Text style={[styles.roleHint, { color: theme.textSecondary }]}> 
              物品破損連絡の添付写真は、案件詳細の「添付」から確認できます。
            </Text>
          ) : null}
        </View>

        {isHQRole ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>本部ダッシュボード</Text>
              <TouchableOpacity
                style={[styles.refreshButton, { borderColor: theme.border }]}
                onPress={() => {
                  loadTickets(selectedTicketId);
                  loadHqPatrolTasks();
                  loadRadioLogs();
                }}
              >
                <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dashboardGrid}>
              <View style={[styles.dashboardCard, { borderColor: theme.border, backgroundColor: theme.background }]}> 
                <Text style={[styles.dashboardLabel, { color: theme.textSecondary }]}>新着連絡</Text>
                <Text style={[styles.dashboardValue, { color: theme.text }]}>{dashboardSummary.newTickets}</Text>
              </View>
              <View style={[styles.dashboardCard, { borderColor: theme.border, backgroundColor: theme.background }]}> 
                <Text style={[styles.dashboardLabel, { color: theme.textSecondary }]}>遅延案件(60分+)</Text>
                <Text style={[styles.dashboardValue, { color: '#D1242F' }]}>{dashboardSummary.delayedTickets}</Text>
              </View>
              <View style={[styles.dashboardCard, { borderColor: theme.border, backgroundColor: theme.background }]}> 
                <Text style={[styles.dashboardLabel, { color: theme.textSecondary }]}>巡回対応中</Text>
                <Text style={[styles.dashboardValue, { color: theme.text }]}>{dashboardSummary.activePatrolTasks}</Text>
              </View>
              <View style={[styles.dashboardCard, { borderColor: theme.border, backgroundColor: theme.background }]}> 
                <Text style={[styles.dashboardLabel, { color: theme.textSecondary }]}>無線ログ(1h)</Text>
                <Text style={[styles.dashboardValue, { color: theme.text }]}>{dashboardSummary.recentRadioLogs}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {isHQRole ? <HQKeyManagementPanel theme={theme} user={user} /> : null}

        {isHQRole ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>巡回タスク割当</Text>
              <TouchableOpacity
                style={[styles.refreshButton, { borderColor: theme.border }]}
                onPress={() => {
                  loadHqPatrolTasks();
                  loadPatrolAssignees();
                }}
              >
                <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
              </TouchableOpacity>
            </View>

            {isLoadingHqPatrolTasks ? (
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
            ) : hqPatrolTasks.length === 0 ? (
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>巡回タスクはありません</Text>
            ) : (
              <View style={styles.ticketList}>
                {hqPatrolTasks.slice(0, 18).map((task) => {
                  const isActive = task.id === selectedPatrolTaskId;
                  const assigneeName = patrolAssignees.find((candidate) => candidate.userId === task.assigned_to)?.name;
                  return (
                    <Pressable
                      key={task.id}
                      style={[
                        styles.ticketItem,
                        {
                          borderColor: isActive ? theme.primary : theme.border,
                          backgroundColor: isActive ? `${theme.primary}18` : theme.background,
                        },
                      ]}
                      onPress={() => setSelectedPatrolTaskId(task.id)}
                    >
                      <Text style={[styles.ticketTitle, { color: theme.text }]} numberOfLines={1}>
                        {PATROL_TASK_TYPE_LABELS[task.task_type] || task.task_type}
                      </Text>
                      <Text style={[styles.ticketMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                        {task.event_name || '-'} / {task.event_location || task.location_text || '-'}
                      </Text>
                      <Text style={[styles.ticketMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                        {PATROL_TASK_STATUS_LABELS[task.task_status] || task.task_status} / 担当: {assigneeName || '未割当'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {selectedPatrolTask ? (
              <>
                <Text style={[styles.label, { color: theme.text }]}>担当者選択</Text>
                {isLoadingPatrolAssignees ? (
                  <Text style={[styles.helpText, { color: theme.textSecondary }]}>担当候補を読み込み中...</Text>
                ) : (
                  <View style={styles.filterRow}>
                    <Pressable
                      style={[
                        styles.filterChip,
                        {
                          borderColor: selectedPatrolAssigneeId ? theme.border : theme.primary,
                          backgroundColor: selectedPatrolAssigneeId ? theme.background : `${theme.primary}1A`,
                        },
                      ]}
                      onPress={() => setSelectedPatrolAssigneeId('')}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: selectedPatrolAssigneeId ? theme.textSecondary : theme.primary },
                        ]}
                      >
                        未割当
                      </Text>
                    </Pressable>
                    {patrolAssignees.map((candidate) => {
                      const isActive = candidate.userId === selectedPatrolAssigneeId;
                      return (
                        <Pressable
                          key={candidate.userId}
                          style={[
                            styles.filterChip,
                            {
                              borderColor: isActive ? theme.primary : theme.border,
                              backgroundColor: isActive ? `${theme.primary}1A` : theme.background,
                            },
                          ]}
                          onPress={() => setSelectedPatrolAssigneeId(candidate.userId)}
                        >
                          <Text style={[styles.filterChipText, { color: isActive ? theme.primary : theme.textSecondary }]}> 
                            {candidate.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.sendButton, { backgroundColor: theme.primary }]}
                  onPress={handleAssignPatrolTask}
                  disabled={isAssigningPatrolTask}
                >
                  <Text style={styles.sendButtonText}>
                    {isAssigningPatrolTask ? '更新中...' : '巡回担当を更新'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        ) : null}

        {isHQRole ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>評価承認</Text>
              <TouchableOpacity
                style={[styles.refreshButton, { borderColor: theme.border }]}
                onPress={loadPendingEvaluations}
              >
                <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
              </TouchableOpacity>
            </View>

            {isLoadingPendingEvaluations ? (
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
            ) : pendingEvaluations.length === 0 ? (
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>承認待ちの評価はありません</Text>
            ) : (
              <View style={styles.messageList}>
                {pendingEvaluations.map((evaluation) => (
                  <View
                    key={evaluation.id}
                    style={[styles.messageItem, { borderColor: theme.border, backgroundColor: theme.background }]}
                  >
                    <Text style={[styles.messageAuthor, { color: theme.textSecondary }]}> 
                      {EVALUATION_STATUS_LABELS[evaluation.evaluation_status] || evaluation.evaluation_status} / {evaluation.score || '-'}点
                    </Text>
                    <Text style={[styles.messageBody, { color: theme.text }]}>{evaluation.comment || 'コメントなし'}</Text>
                    <Text style={[styles.messageDate, { color: theme.textSecondary }]}> 
                      {evaluation.task?.task_no || evaluation.ticket?.ticket_no || evaluation.id}
                    </Text>
                    <View style={styles.statusActions}>
                      <TouchableOpacity
                        style={[styles.statusButton, { borderColor: theme.border, backgroundColor: theme.background }]}
                        onPress={() => handleReviewEvaluation(evaluation.id, EVALUATION_STATUSES.APPROVED)}
                        disabled={isReviewingEvaluation}
                      >
                        <Text style={[styles.statusButtonText, { color: '#22A06B' }]}>承認</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.statusButton, { borderColor: theme.border, backgroundColor: theme.background }]}
                        onPress={() => handleReviewEvaluation(evaluation.id, EVALUATION_STATUSES.REWORK)}
                        disabled={isReviewingEvaluation}
                      >
                        <Text style={[styles.statusButtonText, { color: '#9F6E00' }]}>差戻し</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.statusButton, { borderColor: theme.border, backgroundColor: theme.background }]}
                        onPress={() => handleReviewEvaluation(evaluation.id, EVALUATION_STATUSES.REJECTED)}
                        disabled={isReviewingEvaluation}
                      >
                        <Text style={[styles.statusButtonText, { color: '#D1242F' }]}>却下</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {isHQRole ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>無線ログ</Text>
              <TouchableOpacity
                style={[styles.refreshButton, { borderColor: theme.border }]}
                onPress={loadRadioLogs}
              >
                <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.helpText, { color: theme.textSecondary }]}> 
              写真なし運用で、無線連絡内容をテキスト記録します。
            </Text>

            <View style={styles.inputRow}>
              <TextInput
                value={radioChannel}
                onChangeText={setRadioChannel}
                placeholder="チャンネル"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.compactInput,
                  { borderColor: theme.border, backgroundColor: theme.background, color: theme.text },
                ]}
              />
              <TextInput
                value={radioLocation}
                onChangeText={setRadioLocation}
                placeholder="場所（任意）"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.compactInput,
                  { borderColor: theme.border, backgroundColor: theme.background, color: theme.text },
                ]}
              />
            </View>

            <TextInput
              value={radioMessage}
              onChangeText={setRadioMessage}
              multiline
              placeholder="無線内容を入力"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.replyInput,
                { borderColor: theme.border, backgroundColor: theme.background, color: theme.text },
              ]}
            />

            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: theme.primary }]}
              onPress={handleSubmitRadioLog}
              disabled={isSubmittingRadioLog}
            >
              <Text style={styles.sendButtonText}>{isSubmittingRadioLog ? '送信中...' : '無線ログを送信'}</Text>
            </TouchableOpacity>

            {isLoadingRadioLogs ? (
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
            ) : radioLogs.length === 0 ? (
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>無線ログはまだありません</Text>
            ) : (
              <View style={[styles.messageList, { marginTop: 10 }]}> 
                {radioLogs.map((log) => (
                  <View
                    key={log.id}
                    style={[styles.messageItem, { borderColor: theme.border, backgroundColor: theme.background }]}
                  >
                    <Text style={[styles.messageAuthor, { color: theme.textSecondary }]}> 
                      CH:{log.channel || '-'} / {log.location_text || '場所未設定'}
                    </Text>
                    <Text style={[styles.messageBody, { color: theme.text }]}>{log.message}</Text>
                    <Text style={[styles.messageDate, { color: theme.textSecondary }]}> 
                      {new Date(log.created_at).toLocaleString('ja-JP')}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>対象連絡案件</Text>
            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: theme.border }]}
              onPress={() => loadTickets(selectedTicketId)}
            >
              <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
            </TouchableOpacity>
          </View>

          {isDepartmentRole ? (
            <View style={styles.filterRow}>
              {TICKET_STATUS_FILTERS.map((filter) => {
                const isActive = filter.key === ticketStatusFilter;
                return (
                  <Pressable
                    key={filter.key}
                    style={[
                      styles.filterChip,
                      {
                        borderColor: isActive ? theme.primary : theme.border,
                        backgroundColor: isActive ? `${theme.primary}1A` : theme.background,
                      },
                    ]}
                    onPress={() => setTicketStatusFilter(filter.key)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isActive ? theme.primary : theme.textSecondary },
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {isLoadingTickets ? (
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
          ) : filteredTickets.length === 0 ? (
            <Text style={[styles.helpText, { color: theme.textSecondary }]}> 
              {isDepartmentRole ? 'この条件に一致する連絡案件はありません' : '対象の連絡案件はありません'}
            </Text>
          ) : (
            <View style={styles.ticketList}>
              {filteredTickets.map((ticket) => {
                const isActive = ticket.id === selectedTicketId;
                return (
                  <Pressable
                    key={ticket.id}
                    style={[
                      styles.ticketItem,
                      {
                        borderColor: isActive ? theme.primary : theme.border,
                        backgroundColor: isActive ? `${theme.primary}18` : theme.background,
                      },
                    ]}
                    onPress={() => setSelectedTicketId(ticket.id)}
                  >
                    <Text style={[styles.ticketTitle, { color: theme.text }]} numberOfLines={1}>
                      {ticket.title}
                    </Text>
                    <Text style={[styles.ticketMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                      {ticket.event_name} / {ticket.event_location}
                    </Text>
                    <Text style={[styles.ticketMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                      {TICKET_TYPE_LABELS[ticket.ticket_type] || ticket.ticket_type} /{' '}
                      {STATUS_LABELS[ticket.ticket_status] || ticket.ticket_status} /{' '}
                      {new Date(ticket.created_at).toLocaleString('ja-JP')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {selectedTicket ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <Text style={[styles.sectionTitle, { color: theme.text }]}>案件詳細</Text>
            <Text style={[styles.ticketDetailTitle, { color: theme.text }]}>{selectedTicket.title}</Text>
            <Text style={[styles.ticketMeta, { color: theme.textSecondary }]}>受付番号: {selectedTicket.ticket_no || '-'}</Text>
            <Text style={[styles.ticketMeta, { color: theme.textSecondary }]}> 
              種別: {TICKET_TYPE_LABELS[selectedTicket.ticket_type] || selectedTicket.ticket_type} / 状態:{' '}
              {STATUS_LABELS[selectedTicket.ticket_status] || selectedTicket.ticket_status}
            </Text>
            <Text style={[styles.ticketMeta, { color: theme.textSecondary }]}> 
              企画: {selectedTicket.event_name}（{selectedTicket.event_location}）
            </Text>
            {isEventStatusTicket ? (
              <Text style={[styles.ticketMeta, { color: theme.textSecondary }]}> 
                巡回の「確認に向かう/確認完了」はこの案件のメッセージに反映されます
              </Text>
            ) : null}

            <Text style={[styles.label, { color: theme.text }]}>依頼内容</Text>
            <Text
              style={[
                styles.requestBody,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
              ]}
            >
              {selectedTicket.description}
            </Text>

            <View style={styles.sectionHeader}>
              <Text style={[styles.label, { color: theme.text }]}>添付</Text>
              <TouchableOpacity
                style={[styles.refreshButton, { borderColor: theme.border }]}
                onPress={() => loadTicketAttachedFiles(selectedTicket.id)}
              >
                <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
              </TouchableOpacity>
            </View>

            {isLoadingAttachments ? (
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>添付を読み込み中...</Text>
            ) : ticketAttachments.length === 0 ? (
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>添付はありません</Text>
            ) : (
              <View style={styles.attachmentList}>
                {ticketAttachments.map((attachment) => {
                  const isImage = normalizeText(attachment.mime_type).startsWith('image/');
                  const fileName = normalizeText(attachment.storage_path).split('/').pop() || '添付ファイル';
                  return (
                    <View
                      key={attachment.id}
                      style={[
                        styles.attachmentItem,
                        { borderColor: theme.border, backgroundColor: theme.background },
                      ]}
                    >
                      <Text style={[styles.attachmentName, { color: theme.text }]} numberOfLines={1}>
                        {attachment.caption || fileName}
                      </Text>
                      <Text style={[styles.attachmentMeta, { color: theme.textSecondary }]}>
                        {fileName} / {formatFileSize(attachment.file_size_bytes)} /{' '}
                        {attachment.mime_type || 'application/octet-stream'}
                      </Text>
                      {isImage && attachment.signedUrl ? (
                        <Image
                          source={{ uri: attachment.signedUrl }}
                          style={styles.attachmentPreview}
                          resizeMode="cover"
                        />
                      ) : null}
                      <TouchableOpacity
                        style={[
                          styles.attachmentOpenButton,
                          {
                            borderColor: attachment.signedUrl ? theme.border : '#9CA3AF',
                            backgroundColor: theme.surface,
                          },
                        ]}
                        disabled={!attachment.signedUrl}
                        onPress={() => openAttachment(attachment)}
                      >
                        <Text
                          style={[
                            styles.attachmentOpenButtonText,
                            { color: attachment.signedUrl ? theme.textSecondary : '#9CA3AF' },
                          ]}
                        >
                          {attachment.signedUrl ? '添付を開く' : 'URL生成失敗'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {isHQRole && ['accounting', 'property'].includes(selectedTicket.notify_target) ? (
              <TouchableOpacity
                style={[styles.statusButton, { borderColor: theme.border, backgroundColor: theme.background }]}
                onPress={handleRenotifyDepartment}
                disabled={isRenotifying}
              >
                <Text style={[styles.statusButtonText, { color: theme.textSecondary }]}> 
                  {isRenotifying ? '再通知中...' : '部署へ再通知'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={[styles.label, { color: theme.text }]}>対応メッセージ</Text>
              <TouchableOpacity
                style={[styles.refreshButton, { borderColor: theme.border }]}
                onPress={() => loadMessages(selectedTicket.id)}
              >
                <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
              </TouchableOpacity>
            </View>

            {isLoadingMessages ? (
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
            ) : messages.length === 0 ? (
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>まだ対応メッセージはありません</Text>
            ) : (
              <View style={styles.messageList}>
                {messages.map((message) => {
                  const isMine = message.author_id === user?.id;
                  return (
                    <View
                      key={message.id}
                      style={[
                        styles.messageItem,
                        {
                          borderColor: isMine ? theme.primary : theme.border,
                          backgroundColor: isMine ? `${theme.primary}14` : theme.background,
                        },
                      ]}
                    >
                      <Text style={[styles.messageAuthor, { color: theme.textSecondary }]}> 
                        {isMine ? 'あなた' : '相手'}
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

            <Text style={[styles.label, { color: theme.text }]}>回答入力</Text>
            <TextInput
              value={replyBody}
              onChangeText={setReplyBody}
              multiline
              placeholder={isDepartmentRole ? '回答/対応メモを入力してください' : '回答内容を入力してください'}
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.replyInput,
                { borderColor: theme.border, backgroundColor: theme.background, color: theme.text },
              ]}
            />

            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: theme.primary }]}
              onPress={handleReplySubmit}
              disabled={isSendingReply}
            >
              <Text style={styles.sendButtonText}>{isSendingReply ? '送信中...' : '回答を送信'}</Text>
            </TouchableOpacity>

            <View style={styles.statusActions}>
              {isEventStatusTicket ? (
                <TouchableOpacity
                  style={[styles.statusButton, { borderColor: theme.border, backgroundColor: theme.background }]}
                  onPress={() => handleStatusUpdate(SUPPORT_TICKET_STATUSES.WAITING_EXTERNAL)}
                  disabled={isUpdatingStatus}
                >
                  <Text style={[styles.statusButtonText, { color: theme.textSecondary }]}>巡回確認待ちにする</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.statusButton, { borderColor: theme.border, backgroundColor: theme.background }]}
                onPress={() => handleStatusUpdate(SUPPORT_TICKET_STATUSES.IN_PROGRESS)}
                disabled={isUpdatingStatus}
              >
                <Text style={[styles.statusButtonText, { color: theme.textSecondary }]}>対応中にする</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusButton, { borderColor: theme.border, backgroundColor: theme.background }]}
                onPress={() => handleStatusUpdate(SUPPORT_TICKET_STATUSES.RESOLVED)}
                disabled={isUpdatingStatus}
              >
                <Text style={[styles.statusButtonText, { color: theme.textSecondary }]}>解決済みにする</Text>
              </TouchableOpacity>
            </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  roleHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 20,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dashboardCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  dashboardLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  dashboardValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  compactInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
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
  label: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  requestBody: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  attachmentList: {
    gap: 8,
    marginBottom: 10,
  },
  attachmentItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  attachmentName: {
    fontSize: 13,
    fontWeight: '600',
  },
  attachmentMeta: {
    fontSize: 11,
  },
  attachmentPreview: {
    width: '100%',
    height: 140,
    borderRadius: 8,
  },
  attachmentOpenButton: {
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
  attachmentOpenButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageList: {
    gap: 8,
    marginBottom: 10,
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
  replyInput: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 96,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  sendButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statusActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  statusButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default SupportDeskScreen;
