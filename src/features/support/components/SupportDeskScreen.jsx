/**
 * 対応者向け共通画面
 * 本部/会計/物品の連絡案件対応UI
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
import { ThemedHeader } from '../../../shared/components/ThemedHeader';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  createTicketMessage,
  listTicketMessages,
  SUPPORT_DESK_ROLE_TYPES,
  listTicketsForRole,
  SUPPORT_TICKET_STATUSES,
  updateTicketStatus,
} from '../../../services/supabase/supportTicketService';
import HQKeyManagementPanel from './HQKeyManagementPanel';

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
  const [replyBody, setReplyBody] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState(TICKET_STATUS_FILTERS[0].key);

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
   * 選択中案件
   */
  const isHQRole = roleType === SUPPORT_DESK_ROLE_TYPES.HQ;
  const isDepartmentRole =
    roleType === SUPPORT_DESK_ROLE_TYPES.ACCOUNTING || roleType === SUPPORT_DESK_ROLE_TYPES.PROPERTY;

  /**
   * 状態フィルタ適用後案件
   */
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

  /**
   * 選択中案件
   */
  const selectedTicket = useMemo(() => {
    return filteredTickets.find((ticket) => ticket.id === selectedTicketId) || null;
  }, [selectedTicketId, filteredTickets]);
  const isEventStatusTicket =
    selectedTicket?.ticket_type === 'start_report' || selectedTicket?.ticket_type === 'end_report';

  /**
   * 案件一覧を取得
   * @param {string|null} preferredTicketId - 優先選択する案件ID
   * @returns {Promise<void>} 取得処理
   */
  const loadTickets = async (preferredTicketId = null) => {
    setIsLoadingTickets(true);
    const { data, error } = await listTicketsForRole({ roleType, limit: 60 });
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

    // 初期状態案件は回答送信時に対応中へ進める
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

  useEffect(() => {
    loadTickets();
  }, [roleType]);

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
  }, [selectedTicketId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={screenName} navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{screenDescription}</Text>
          {roleType === SUPPORT_DESK_ROLE_TYPES.PROPERTY ? (
            <Text style={[styles.roleHint, { color: theme.textSecondary }]}>
              物品対応は写真添付なし運用です（テキスト対応のみ）。
            </Text>
          ) : null}
        </View>

        {isHQRole ? <HQKeyManagementPanel theme={theme} user={user} /> : null}

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
            <Text style={[styles.ticketMeta, { color: theme.textSecondary }]}>
              受付番号: {selectedTicket.ticket_no || '-'}
            </Text>
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
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                まだ対応メッセージはありません
              </Text>
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
                  <Text style={[styles.statusButtonText, { color: theme.textSecondary }]}>
                    巡回確認待ちにする
                  </Text>
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
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

