/**
 * 項目12画面
 * 巡回サポート（緊急呼び出し対応）
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
  createTicketMessage,
  listEmergencyTicketsForPatrol,
  listTicketMessages,
  SUPPORT_TICKET_STATUSES,
  updateTicketStatus,
} from '../../../services/supabase/supportTicketService';

/** 連絡案件ステータス表示名 */
const STATUS_LABELS = {
  [SUPPORT_TICKET_STATUSES.NEW]: '新規',
  [SUPPORT_TICKET_STATUSES.ACKNOWLEDGED]: '受領',
  [SUPPORT_TICKET_STATUSES.IN_PROGRESS]: '対応中',
  [SUPPORT_TICKET_STATUSES.WAITING_EXTERNAL]: '外部待ち',
  [SUPPORT_TICKET_STATUSES.RESOLVED]: '解決済み',
  [SUPPORT_TICKET_STATUSES.CLOSED]: 'クローズ',
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
  const [tickets, setTickets] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [patrolMemo, setPatrolMemo] = useState('');
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
   * 選択中案件
   */
  const selectedTicket = useMemo(() => {
    return tickets.find((ticket) => ticket.id === selectedTicketId) || null;
  }, [selectedTicketId, tickets]);

  /**
   * 緊急案件一覧取得
   * @param {string|null} preferredTicketId - 優先選択ID
   * @returns {Promise<void>} 取得処理
   */
  const loadEmergencyTickets = async (preferredTicketId = null) => {
    setIsLoadingTickets(true);
    const { data, error } = await listEmergencyTicketsForPatrol({ limit: 80 });
    setIsLoadingTickets(false);

    if (error) {
      console.error('緊急案件取得に失敗:', error);
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
   * 返信一覧取得
   * @param {string|null} ticketId - 連絡案件ID
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
   * 巡回メモ送信
   * @returns {Promise<boolean>} 成功可否
   */
  const sendPatrolMemo = async () => {
    if (!selectedTicket) {
      showMessage('送信エラー', '緊急案件を選択してください');
      return false;
    }
    if (!user?.id) {
      showMessage('送信エラー', 'ログイン情報が取得できません');
      return false;
    }

    const memo = patrolMemo.trim();
    if (!memo) {
      showMessage('入力不足', '巡回メモを入力してください');
      return false;
    }

    const result = await createTicketMessage({
      ticketId: selectedTicket.id,
      authorId: user.id,
      body: memo,
    });

    if (result.error) {
      showMessage('送信エラー', result.error.message || 'メモ送信に失敗しました');
      return false;
    }

    setPatrolMemo('');
    await loadMessages(selectedTicket.id);
    return true;
  };

  /**
   * 向かいます処理
   * @returns {Promise<void>} 実行処理
   */
  const handleGoToSite = async () => {
    if (!selectedTicket || !user?.id) {
      showMessage('操作エラー', '案件またはログイン情報が不足しています');
      return;
    }

    setIsSubmitting(true);

    const messageResult = await createTicketMessage({
      ticketId: selectedTicket.id,
      authorId: user.id,
      body: '巡回担当が現地へ向かいます。',
    });

    if (messageResult.error) {
      setIsSubmitting(false);
      showMessage('更新エラー', messageResult.error.message || '進捗更新に失敗しました');
      return;
    }

    const statusResult = await updateTicketStatus({
      ticketId: selectedTicket.id,
      status: SUPPORT_TICKET_STATUSES.IN_PROGRESS,
    });
    setIsSubmitting(false);

    if (statusResult.error) {
      showMessage('更新エラー', statusResult.error.message || 'ステータス更新に失敗しました');
      return;
    }

    await Promise.all([
      loadEmergencyTickets(selectedTicket.id),
      loadMessages(selectedTicket.id),
    ]);
    showMessage('更新完了', '「向かいます」を登録しました');
  };

  /**
   * 完了処理
   * @returns {Promise<void>} 実行処理
   */
  const handleCompletePatrol = async () => {
    if (!selectedTicket || !user?.id) {
      showMessage('操作エラー', '案件またはログイン情報が不足しています');
      return;
    }

    setIsSubmitting(true);
    const trimmedMemo = patrolMemo.trim();
    const completionBody = trimmedMemo
      ? `巡回対応を完了しました。結果: ${trimmedMemo}`
      : '巡回対応を完了しました。';

    const messageResult = await createTicketMessage({
      ticketId: selectedTicket.id,
      authorId: user.id,
      body: completionBody,
    });

    if (messageResult.error) {
      setIsSubmitting(false);
      showMessage('完了エラー', messageResult.error.message || '完了メッセージ送信に失敗しました');
      return;
    }

    const statusResult = await updateTicketStatus({
      ticketId: selectedTicket.id,
      status: SUPPORT_TICKET_STATUSES.RESOLVED,
    });
    setIsSubmitting(false);

    if (statusResult.error) {
      showMessage('完了エラー', statusResult.error.message || 'ステータス更新に失敗しました');
      return;
    }

    setPatrolMemo('');
    await Promise.all([
      loadEmergencyTickets(selectedTicket.id),
      loadMessages(selectedTicket.id),
    ]);
    showMessage('完了', '巡回対応を完了として登録しました');
  };

  /**
   * メモ送信のみ
   * @returns {Promise<void>} 実行処理
   */
  const handleSendMemoOnly = async () => {
    setIsSubmitting(true);
    const success = await sendPatrolMemo();
    setIsSubmitting(false);
    if (success) {
      showMessage('送信完了', '巡回メモを送信しました');
    }
  };

  const canGoToSite =
    selectedTicket &&
    selectedTicket.ticket_status !== SUPPORT_TICKET_STATUSES.CLOSED;
  const canComplete =
    selectedTicket &&
    [SUPPORT_TICKET_STATUSES.IN_PROGRESS, SUPPORT_TICKET_STATUSES.WAITING_EXTERNAL].includes(
      selectedTicket.ticket_status
    );

  useEffect(() => {
    loadEmergencyTickets();
  }, []);

  useEffect(() => {
    loadMessages(selectedTicketId);
  }, [selectedTicketId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{SCREEN_DESCRIPTION}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>緊急呼び出し案件</Text>
            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: theme.border }]}
              onPress={() => loadEmergencyTickets(selectedTicketId)}
            >
              <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
            </TouchableOpacity>
          </View>

          {isLoadingTickets ? (
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
          ) : tickets.length === 0 ? (
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>
              現在、緊急呼び出し案件はありません
            </Text>
          ) : (
            <View style={styles.ticketList}>
              {tickets.map((ticket) => {
                const isActive = ticket.id === selectedTicketId;
                return (
                  <Pressable
                    key={ticket.id}
                    style={[
                      styles.ticketItem,
                      {
                        borderColor: isActive ? theme.primary : theme.border,
                        backgroundColor: isActive ? `${theme.primary}16` : theme.background,
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
              状態: {STATUS_LABELS[selectedTicket.ticket_status] || selectedTicket.ticket_status}
            </Text>
            <Text
              style={[
                styles.requestBody,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
              ]}
            >
              {selectedTicket.description}
            </Text>

            <Text style={[styles.label, { color: theme.text }]}>巡回メッセージ</Text>
            {isLoadingMessages ? (
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
            ) : messages.length === 0 ? (
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                まだメッセージはありません
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

            <Text style={[styles.label, { color: theme.text }]}>巡回メモ</Text>
            <TextInput
              value={patrolMemo}
              onChangeText={setPatrolMemo}
              multiline
              placeholder="現地状況や対応内容を入力してください"
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
                  {
                    backgroundColor: canGoToSite ? theme.primary : theme.border,
                  },
                ]}
                disabled={!canGoToSite || isSubmitting}
                onPress={handleGoToSite}
              >
                <Text style={styles.actionButtonText}>向かいます</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: canComplete ? '#22A06B' : theme.border,
                  },
                ]}
                disabled={!canComplete || isSubmitting}
                onPress={handleCompletePatrol}
              >
                <Text style={styles.actionButtonText}>完了</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.memoButton,
                { borderColor: theme.border, backgroundColor: theme.background },
              ]}
              onPress={handleSendMemoOnly}
              disabled={isSubmitting}
            >
              <Text style={[styles.memoButtonText, { color: theme.textSecondary }]}>
                メモのみ送信
              </Text>
            </TouchableOpacity>
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

