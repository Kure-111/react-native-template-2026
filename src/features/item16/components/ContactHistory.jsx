/**
 * 連絡案件履歴・詳細コンポーネント
 * 案件リスト（種別グループ・折りたたみ）、詳細表示、添付、メッセージスレッド、追記投稿、添付追加を提供する
 */

import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SUPPORT_TICKET_STATUSES } from '../../../services/supabase/supportTicketService';
import SkeletonLoader from '../../../shared/components/SkeletonLoader';
import EmptyState from '../../../shared/components/EmptyState';

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
 * 種別ごとのグループ表示情報
 * アイコン・ラベルを一元管理する
 */
const TICKET_TYPE_GROUP_INFO = {
  emergency:           { icon: '🚨', label: '緊急連絡' },
  key_preapply:        { icon: '🔑', label: '鍵の事前申請' },
  start_report:        { icon: '▶️', label: '企画開始報告' },
  end_report:          { icon: '⏹️', label: '企画終了報告' },
  rule_question:       { icon: '❓', label: 'ルール問い合わせ' },
  layout_change:       { icon: '📐', label: '配置図変更' },
  distribution_change: { icon: '📦', label: '配布ルール変更' },
  damage_report:       { icon: '🛠️', label: '物品破損報告' },
};

/**
 * 種別グループの表示順
 * 緊急を最上位、鍵申請・報告類・相談類の順で並べる
 */
const TICKET_TYPE_ORDER = [
  'emergency',
  'key_preapply',
  'start_report',
  'end_report',
  'rule_question',
  'layout_change',
  'distribution_change',
  'damage_report',
];

/**
 * テキストを正規化（トリム）
 * @param {string|null|undefined} value - 入力値
 * @returns {string} 正規化後の値
 */
const normalizeText = (value) => (value || '').trim();

/**
 * ファイルサイズを表示文字列へ変換
 * @param {number|null|undefined} fileSizeBytes - バイト数
 * @returns {string} 表示文字列
 */
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
 * 連絡案件履歴・詳細コンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.theme - テーマオブジェクト
 * @param {Object|null} props.user - ログインユーザー
 * @param {boolean} props.isLoadingContacts - 案件一覧ロード中フラグ
 * @param {Array} props.myContacts - 案件一覧
 * @param {string|null} props.selectedContactId - 選択中の案件ID
 * @param {(id: string) => void} props.onSelectContact - 案件選択コールバック
 * @param {Object|null} props.selectedContact - 選択中の案件オブジェクト
 * @param {() => void} props.onRefreshContacts - 案件一覧更新コールバック
 * @param {boolean} props.isLoadingContactMessages - メッセージロード中フラグ
 * @param {Array} props.contactMessages - メッセージ一覧
 * @param {boolean} props.isLoadingContactAttachments - 添付ロード中フラグ
 * @param {Array} props.contactAttachments - 添付一覧
 * @param {(attachment: Object) => void} props.onOpenAttachment - 添付開くコールバック
 * @param {() => void} props.onRefreshDetail - 詳細更新コールバック
 * @param {string} props.contactReplyBody - 追記入力値
 * @param {(value: string) => void} props.onChangeContactReplyBody - 追記入力変更コールバック
 * @param {() => void} props.onSubmitContactReply - 追記送信コールバック
 * @param {boolean} props.isSubmittingContactReply - 追記送信中フラグ
 * @param {Object|null} props.followupAttachmentFile - 追記用添付ファイル
 * @param {() => void} props.onPickFollowupAttachment - 追記用添付をファイルから選択するコールバック
 * @param {() => void} props.onClearFollowupAttachment - 追記用添付解除コールバック
 * @param {string} props.followupAttachmentCaption - 追記用添付メモ
 * @param {(value: string) => void} props.onChangeFollowupAttachmentCaption - 追記用添付メモ変更コールバック
 * @param {() => void} props.onSubmitFollowupAttachment - 追記用添付登録コールバック
 * @param {boolean} props.isSubmittingFollowupAttachment - 追記用添付登録中フラグ
 * @returns {JSX.Element} 連絡案件履歴・詳細
 */
const ContactHistory = ({
  theme,
  user,
  isLoadingContacts,
  myContacts,
  selectedContactId,
  onSelectContact,
  selectedContact,
  onRefreshContacts,
  isLoadingContactMessages,
  contactMessages,
  isLoadingContactAttachments,
  contactAttachments,
  onOpenAttachment,
  onRefreshDetail,
  contactReplyBody,
  onChangeContactReplyBody,
  onSubmitContactReply,
  isSubmittingContactReply,
  followupAttachmentFile,
  onPickFollowupAttachment,
  onClearFollowupAttachment,
  followupAttachmentCaption,
  onChangeFollowupAttachmentCaption,
  onSubmitFollowupAttachment,
  isSubmittingFollowupAttachment,
}) => {
  /**
   * 折りたたみ中の種別キーセット
   * 初期値は空（全グループ展開）
   */
  const [collapsedTypes, setCollapsedTypes] = useState(new Set());

  /**
   * 種別グループのトグル処理
   * @param {string} typeKey - 種別キー
   */
  const toggleType = (typeKey) => {
    setCollapsedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeKey)) {
        next.delete(typeKey);
      } else {
        next.add(typeKey);
      }
      return next;
    });
  };

  /**
   * myContacts を ticket_type でグループ化する
   * TICKET_TYPE_ORDER に沿った順で並べ、未知の種別は末尾にまとめる
   */
  const groupedContacts = useMemo(() => {
    /** ticket_type → 案件配列 のマップ */
    const map = {};
    (myContacts || []).forEach((contact) => {
      const typeKey = contact.ticket_type || 'other';
      if (!map[typeKey]) {
        map[typeKey] = [];
      }
      map[typeKey].push(contact);
    });

    /** TICKET_TYPE_ORDER の順でグループ配列を構築する */
    const ordered = TICKET_TYPE_ORDER.filter((key) => map[key]).map((key) => ({
      typeKey: key,
      items: map[key],
    }));

    /** 既知の種別以外（'other' など）を末尾に追加 */
    const knownKeys = new Set(TICKET_TYPE_ORDER);
    Object.keys(map)
      .filter((key) => !knownKeys.has(key))
      .forEach((key) => {
        ordered.push({ typeKey: key, items: map[key] });
      });

    return ordered;
  }, [myContacts]);

  return (
    <>
      {/* 案件リスト */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.historyHeader}>
          <Text style={[styles.sectionTitle, styles.historyTitle, { color: theme.text }]}>
            最近の連絡案件
          </Text>
          <TouchableOpacity
            style={[styles.refreshButton, { borderColor: theme.border }]}
            onPress={onRefreshContacts}
          >
            <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
          </TouchableOpacity>
        </View>

        {isLoadingContacts ? (
          <SkeletonLoader lines={3} baseColor={theme.border} />
        ) : myContacts.length === 0 ? (
          <EmptyState icon="📭" title="連絡履歴がありません" theme={theme} />
        ) : (
          <View style={styles.groupList}>
            {groupedContacts.map(({ typeKey, items }) => {
              /** このグループの表示情報（未知の種別はデフォルト） */
              const groupInfo = TICKET_TYPE_GROUP_INFO[typeKey] || { icon: '📋', label: typeKey };
              /** このグループが折りたたみ中かどうか */
              const isCollapsed = collapsedTypes.has(typeKey);

              return (
                <View
                  key={typeKey}
                  style={[styles.groupSection, { borderColor: theme.border, backgroundColor: theme.background }]}
                >
                  {/* グループヘッダー（タップで折りたたみトグル） */}
                  <Pressable
                    style={[styles.groupHeader, { borderBottomColor: isCollapsed ? 'transparent' : theme.border }]}
                    onPress={() => toggleType(typeKey)}
                  >
                    <View style={styles.groupHeaderLeft}>
                      <Text style={styles.groupIcon}>{groupInfo.icon}</Text>
                      <Text style={[styles.groupLabel, { color: theme.text }]}>{groupInfo.label}</Text>
                      {/* 件数バッジ */}
                      <View style={[styles.groupBadge, { backgroundColor: `${theme.primary}22` }]}>
                        <Text style={[styles.groupCount, { color: theme.primary }]}>{items.length}</Text>
                      </View>
                    </View>
                    {/* 折りたたみ矢印 */}
                    <Text style={[styles.collapseArrow, { color: theme.textSecondary }]}>
                      {isCollapsed ? '▶' : '▼'}
                    </Text>
                  </Pressable>

                  {/* 案件アイテム一覧（折りたたみ時は非表示） */}
                  {!isCollapsed ? (
                    <View style={styles.groupItemList}>
                      {items.map((contact) => (
                        <Pressable
                          key={contact.id}
                          style={[
                            styles.historyItem,
                            {
                              borderColor:
                                contact.id === selectedContactId ? theme.primary : theme.border,
                              backgroundColor:
                                contact.id === selectedContactId
                                  ? `${theme.primary}14`
                                  : theme.surface,
                            },
                          ]}
                          onPress={() => onSelectContact(contact.id)}
                        >
                          <Text style={[styles.historyItemTitle, { color: theme.text }]} numberOfLines={1}>
                            {contact.title}
                          </Text>
                          <Text style={[styles.historyItemMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                            {(STATUS_LABELS[contact.ticket_status] || contact.ticket_status) +
                              ' / ' +
                              new Date(contact.created_at).toLocaleString('ja-JP')}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* 案件詳細 */}
      {selectedContact ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.historyHeader}>
            <Text style={[styles.sectionTitle, styles.historyTitle, { color: theme.text }]}>
              連絡詳細・回答
            </Text>
            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: theme.border }]}
              onPress={onRefreshDetail}
            >
              <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.historyItemTitle, { color: theme.text }]}>{selectedContact.title}</Text>
          <Text style={[styles.historyItemMeta, { color: theme.textSecondary }]}>
            状態: {STATUS_LABELS[selectedContact.ticket_status] || selectedContact.ticket_status}
          </Text>
          <Text
            style={[
              styles.requestText,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
          >
            {selectedContact.description}
          </Text>

          {/* 添付一覧 */}
          <Text style={[styles.label, { color: theme.text }]}>添付</Text>
          {isLoadingContactAttachments ? (
            <SkeletonLoader lines={3} baseColor={theme.border} />
          ) : contactAttachments.length === 0 ? (
            <Text style={[styles.historyEmptyText, { color: theme.textSecondary }]}>
              添付はありません
            </Text>
          ) : (
            <View style={styles.messageList}>
              {contactAttachments.map((attachment) => {
                /** 画像かどうかを判定 */
                const isImage = normalizeText(attachment.mime_type).startsWith('image/');
                /** 添付ファイル名を取得 */
                const fileName = normalizeText(attachment.storage_path).split('/').pop() || '添付ファイル';
                return (
                  <View
                    key={attachment.id}
                    style={[
                      styles.messageItem,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.background,
                      },
                    ]}
                  >
                    <Text style={[styles.messageBody, { color: theme.text }]}>
                      {attachment.caption || fileName}
                    </Text>
                    <Text style={[styles.messageDate, { color: theme.textSecondary }]}>
                      {fileName} / {formatFileSize(attachment.file_size_bytes)} /{' '}
                      {attachment.mime_type || 'application/octet-stream'}
                    </Text>
                    {isImage && attachment.signedUrl ? (
                      <Image
                        source={{ uri: attachment.signedUrl }}
                        style={styles.inlineAttachmentPreview}
                        resizeMode="cover"
                      />
                    ) : null}
                    <TouchableOpacity
                      style={[styles.attachPickerButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
                      onPress={() => onOpenAttachment(attachment)}
                      disabled={!attachment.signedUrl}
                    >
                      <Text style={[styles.attachPickerButtonText, { color: theme.textSecondary }]}>
                        {attachment.signedUrl ? '添付を開く' : 'URL生成失敗'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* メッセージスレッド */}
          <Text style={[styles.label, { color: theme.text }]}>対応メッセージ</Text>
          {isLoadingContactMessages ? (
            <SkeletonLoader lines={3} baseColor={theme.border} />
          ) : contactMessages.length === 0 ? (
            <EmptyState icon="💬" title="メッセージがありません" theme={theme} />
          ) : (
            <View style={styles.messageList}>
              {contactMessages.map((message) => {
                /** 自分のメッセージかどうかを判定 */
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
                      {isMine ? 'あなた' : '担当者'}
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

          {/* 追記投稿 */}
          <Text style={[styles.label, { color: theme.text }]}>追記投稿</Text>
          <TextInput
            value={contactReplyBody}
            onChangeText={onChangeContactReplyBody}
            multiline
            placeholder="担当者への追記内容を入力してください"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.multilineInput,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
                minHeight: 88,
              },
            ]}
          />
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.primary }]}
            onPress={onSubmitContactReply}
            disabled={isSubmittingContactReply}
          >
            <Text style={styles.submitButtonText}>
              {isSubmittingContactReply ? '送信中...' : '追記を送信'}
            </Text>
          </TouchableOpacity>

          {/* 添付追加 */}
          <Text style={[styles.label, { color: theme.text }]}>添付追加（必要時）</Text>
          <Text style={[styles.attachHint, { color: theme.textSecondary }]}>
            ファイルが大きい場合はDiscordで送ってください。
          </Text>
          <TouchableOpacity
            style={[
              styles.attachPickerButton,
              { borderColor: theme.border, backgroundColor: theme.background },
            ]}
            onPress={onPickFollowupAttachment}
          >
            <Text style={[styles.attachPickerButtonText, { color: theme.textSecondary }]}>
              {followupAttachmentFile ? '別のファイルを選択' : 'ファイルから選択'}
            </Text>
          </TouchableOpacity>

          {followupAttachmentFile ? (
            <View
              style={[
                styles.attachmentSummary,
                { borderColor: theme.border, backgroundColor: theme.background },
              ]}
            >
              <Text style={[styles.attachmentSummaryName, { color: theme.text }]} numberOfLines={1}>
                {followupAttachmentFile.name || 'attachment.bin'}
              </Text>
              <Text style={[styles.attachmentSummaryMeta, { color: theme.textSecondary }]}>
                {formatFileSize(followupAttachmentFile.size)} /{' '}
                {followupAttachmentFile.type || 'application/octet-stream'}
              </Text>
              <TouchableOpacity
                style={[styles.removeKeyButton, { borderColor: theme.border }]}
                onPress={onClearFollowupAttachment}
              >
                <Text style={[styles.removeKeyButtonText, { color: theme.textSecondary }]}>添付解除</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[styles.historyEmptyText, { color: theme.textSecondary }]}>
              添付未選択（任意）
            </Text>
          )}

          <TextInput
            value={followupAttachmentCaption}
            onChangeText={onChangeFollowupAttachmentCaption}
            placeholder="添付メモ（任意）"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
          />
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.primary }]}
            onPress={onSubmitFollowupAttachment}
            disabled={isSubmittingFollowupAttachment}
          >
            <Text style={styles.submitButtonText}>
              {isSubmittingFollowupAttachment ? '登録中...' : '添付を追加'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multilineInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyTitle: {
    marginBottom: 0,
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
  /** グループ一覧コンテナ */
  groupList: {
    gap: 8,
  },
  /** 種別グループ全体（ヘッダー + アイテム） */
  groupSection: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  /** グループヘッダー行（タップで折りたたみトグル） */
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  /** グループヘッダー左側（アイコン + ラベル + バッジ） */
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  /** 種別アイコン */
  groupIcon: {
    fontSize: 15,
  },
  /** 種別ラベル */
  groupLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  /** 件数バッジ */
  groupBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  /** 件数テキスト */
  groupCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  /** 折りたたみ矢印 */
  collapseArrow: {
    fontSize: 11,
    fontWeight: '600',
  },
  /** グループ内アイテムコンテナ */
  groupItemList: {
    padding: 8,
    gap: 6,
  },
  historyItem: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyItemMeta: {
    fontSize: 12,
  },
  historyEmptyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  requestText: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 10,
  },
  messageList: {
    gap: 8,
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
  inlineAttachmentPreview: {
    width: '100%',
    height: 132,
    borderRadius: 8,
    marginTop: 6,
  },
  /** 添付注意文（Discordへの誘導など） */
  attachHint: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  attachPickerButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  attachPickerButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  attachmentSummary: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  attachmentSummaryName: {
    fontSize: 13,
    fontWeight: '600',
  },
  attachmentSummaryMeta: {
    fontSize: 12,
  },
  removeKeyButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  removeKeyButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ContactHistory;
