/**
 * シフト変更申請対応モーダル（事務部向け）
 * 申請内容を確認し、承認（完了）または却下の対応を行います
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';

/**
 * ステータスラベルの設定
 * @param {string} status - 申請ステータス
 * @returns {{ label: string, color: string }} ラベルと色
 */
const getStatusConfig = (status) => {
  switch (status) {
    case 'completed':
      return { label: '完了', color: '#4CAF50' };
    case 'rejected':
      return { label: '却下', color: '#F44336' };
    default:
      return { label: '未対応', color: '#FF9800' };
  }
};

/**
 * シフト変更申請対応モーダル
 * @param {Object} props - コンポーネントプロパティ
 * @param {boolean} props.visible - 表示状態
 * @param {Object|null} props.request - 申請データ
 * @param {boolean} props.isProcessing - 処理中かどうか
 * @param {string} props.processError - 処理エラーメッセージ（空文字で非表示）
 * @param {Function} props.onComplete - 承認ボタン押下時のコールバック（responderNote）
 * @param {Function} props.onReject - 却下ボタン押下時のコールバック（responderNote）
 * @param {Function} props.onClose - 閉じるボタン押下時のコールバック
 * @param {Object} props.theme - テーマオブジェクト
 * @returns {JSX.Element|null} 対応モーダル
 */
const ShiftChangeResponseModal = ({
  visible,
  request,
  isProcessing,
  processError,
  onComplete,
  onReject,
  onClose,
  theme,
}) => {
  /** 対応備考テキスト（必須） */
  const [responderNote, setResponderNote] = useState('');
  /** 備考未入力エラー */
  const [noteError, setNoteError] = useState('');
  /**
   * 確認待ちアクション
   * null | 'complete' | 'reject'
   */
  const [pendingAction, setPendingAction] = useState(null);

  if (!request) {
    return null;
  }

  /** 救援申請かどうかの判定（交代先メンバーなし） */
  const isRescue = !request.destination_member_name;
  /** 交換かどうかの判定（救援申請は常にfalse） */
  const isSwap = !isRescue && !!request.destination_area_name;
  /** ステータス表示設定 */
  const statusConfig = getStatusConfig(request.status);
  /** 既に対応済みかどうか */
  const isAlreadyResponded = request.status !== 'pending';

  /**
   * 備考のバリデーション
   * @returns {boolean} バリデーション通過でtrue
   */
  const validateNote = () => {
    if (!responderNote.trim()) {
      setNoteError('対応内容を入力してください');
      return false;
    }
    setNoteError('');
    return true;
  };

  /**
   * 承認ボタン押下時の処理（確認待ち状態へ）
   */
  const handleComplete = () => {
    if (!validateNote()) {
      return;
    }
    setPendingAction('complete');
  };

  /**
   * 却下ボタン押下時の処理（確認待ち状態へ）
   */
  const handleReject = () => {
    if (!validateNote()) {
      return;
    }
    setPendingAction('reject');
  };

  /**
   * 確認後の実行
   */
  const handleConfirm = () => {
    const note = responderNote.trim();
    if (pendingAction === 'complete') {
      onComplete(note);
    } else if (pendingAction === 'reject') {
      onReject(note);
    }
    setResponderNote('');
    setNoteError('');
    setPendingAction(null);
  };

  /**
   * 確認キャンセル（確認待ち状態を解除）
   */
  const handleCancelConfirm = () => {
    setPendingAction(null);
  };

  /**
   * モーダルを閉じる
   */
  const handleClose = () => {
    setResponderNote('');
    setNoteError('');
    setPendingAction(null);
    onClose();
  };

  /** 日付の表示用文字列 */
  const displayDate = request.shift_date
    ? new Date(request.shift_date + 'T00:00:00').toLocaleDateString('ja-JP', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      })
    : '';

  /** 確認メッセージ */
  const confirmMessage = pendingAction === 'complete'
    ? 'この申請を完了にします。申請者に完了通知が送信されます。'
    : 'この申請を却下します。申請者に却下通知が送信されます。';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
          {/* ヘッダー */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>申請内容の確認</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose} disabled={isProcessing}>
              <Text style={[styles.closeButtonText, { color: theme.text }]}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* ステータス */}
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
                <Text style={styles.statusText}>{statusConfig.label}</Text>
              </View>
              <Text style={[styles.dateText, { color: theme.textSecondary }]}>{displayDate}</Text>
            </View>

            {/* 申請内容プレビュー */}
            <View style={[
              styles.previewContainer,
              { borderColor: isRescue ? '#D32F2F' : theme.border },
              isRescue && styles.rescuePreviewContainer,
            ]}>
              {isRescue ? (
                <View style={styles.rescueTypeBadge}>
                  <Text style={styles.rescueTypeBadgeText}>救援要請</Text>
                </View>
              ) : (
                <Text style={[styles.previewTypeLabel, { color: theme.textSecondary }]}>
                  {isSwap ? '交換' : '移動'}
                </Text>
              )}
              {/* 移動元 */}
              <View style={styles.memberRow}>
                <Text style={[styles.memberName, { color: theme.text }]}>
                  {request.source_member_name}さん
                </Text>
                <Text style={[styles.memberDetail, { color: theme.textSecondary }]}>
                  {request.source_time_slot}　{request.source_area_name}
                </Text>
              </View>
              {/* 矢印 */}
              <Text style={[styles.arrowText, { color: isRescue ? '#D32F2F' : theme.primary }]}>
                {isSwap ? '↕' : '↓'}
              </Text>
              {/* 移動先 */}
              <View style={styles.memberRow}>
                {isRescue ? (
                  <View style={styles.rescueDestinationBox}>
                    <Text style={[styles.rescueDestinationText, { color: theme.text }]}>交代者なし</Text>
                    <Text style={[styles.rescueDestinationSubText, { color: theme.textSecondary }]}>事務部が交代要員を手配します</Text>
                  </View>
                ) : isSwap ? (
                  <>
                    <Text style={[styles.memberName, { color: theme.text }]}>
                      {request.destination_member_name}さん
                    </Text>
                    <Text style={[styles.memberDetail, { color: theme.textSecondary }]}>
                      {request.destination_time_slot}　{request.destination_area_name}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.memberName, { color: theme.text }]}>
                      {request.destination_member_name}さん
                    </Text>
                    <Text style={[styles.memberDetail, { color: theme.textSecondary }]}>
                      {request.destination_time_slot}（シフトなし）
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* 申請者の備考 */}
            {request.requester_note ? (
              <View style={[styles.requesterNoteContainer, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <Text style={[styles.requesterNoteLabel, { color: theme.textSecondary }]}>
                  申請者の備考
                </Text>
                <Text style={[styles.requesterNoteText, { color: theme.text }]}>
                  {request.requester_note}
                </Text>
              </View>
            ) : null}

            {/* 既に対応済みの場合は対応備考を表示 */}
            {isAlreadyResponded && request.responder_note ? (
              <View style={[styles.responderNoteContainer, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <Text style={[styles.responderNoteLabel, { color: theme.textSecondary }]}>
                  対応内容
                </Text>
                <Text style={[styles.responderNoteText, { color: theme.text }]}>
                  {request.responder_note}
                </Text>
              </View>
            ) : null}

            {/* 未対応の場合は対応入力欄を表示 */}
            {!isAlreadyResponded && (
              <View style={styles.noteInputContainer}>
                <Text style={[styles.noteInputLabel, { color: theme.text }]}>
                  対応内容
                  <Text style={{ color: theme.error }}> *必須</Text>
                </Text>
                <TextInput
                  style={[
                    styles.noteInput,
                    {
                      backgroundColor: theme.background,
                      borderColor: noteError ? theme.error : theme.border,
                      color: theme.text,
                    },
                  ]}
                  value={responderNote}
                  onChangeText={(text) => {
                    setResponderNote(text);
                    if (text.trim()) {
                      setNoteError('');
                    }
                  }}
                  placeholder="対応内容を記入してください（例：シフトを変更しました）"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={4}
                  maxLength={300}
                  editable={!isProcessing && !pendingAction}
                />
                {noteError !== '' && (
                  <Text style={[styles.noteErrorText, { color: theme.error }]}>{noteError}</Text>
                )}
              </View>
            )}

            {/* インライン確認エリア */}
            {pendingAction && (
              <View style={[
                styles.confirmArea,
                {
                  backgroundColor: pendingAction === 'complete' ? '#E8F5E9' : '#FFEBEE',
                  borderColor: pendingAction === 'complete' ? '#4CAF50' : '#F44336',
                },
              ]}>
                <Text style={[
                  styles.confirmAreaText,
                  { color: pendingAction === 'complete' ? '#2E7D32' : '#C62828' },
                ]}>
                  {confirmMessage}
                </Text>
                <View style={styles.confirmAreaButtons}>
                  <TouchableOpacity
                    style={[styles.confirmCancelButton, { borderColor: theme.border }]}
                    onPress={handleCancelConfirm}
                    disabled={isProcessing}
                  >
                    <Text style={styles.confirmCancelButtonText}>
                      戻る
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.confirmOkButton,
                      {
                        backgroundColor: pendingAction === 'complete' ? '#4CAF50' : '#F44336',
                        opacity: isProcessing ? 0.6 : 1,
                      },
                    ]}
                    onPress={handleConfirm}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmOkButtonText}>
                        {pendingAction === 'complete' ? '完了にする' : '却下する'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {/* 処理エラーメッセージ */}
            {processError ? (
              <View style={[styles.processErrorContainer, { borderColor: theme.error }]}>
                <Text style={[styles.processErrorText, { color: theme.error }]}>{processError}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* 未対応かつ確認待ちでない場合のみ対応ボタンを表示 */}
          {!isAlreadyResponded && !pendingAction && (
            <View style={[styles.buttonContainer, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[
                  styles.rejectButton,
                  { borderColor: theme.error, opacity: isProcessing ? 0.6 : 1 },
                ]}
                onPress={handleReject}
                disabled={isProcessing}
              >
                <Text style={[styles.rejectButtonText, { color: theme.error }]}>却下</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.completeButton,
                  { backgroundColor: theme.primary, opacity: isProcessing ? 0.6 : 1 },
                ]}
                onPress={handleComplete}
                disabled={isProcessing}
              >
                <Text style={styles.completeButtonText}>承認</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

/**
 * スタイル定義
 */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    borderRadius: 12,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 28,
    lineHeight: 32,
  },
  scrollContent: {
    padding: 16,
  },
  /* ステータス行 */
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 14,
  },
  /* 申請内容プレビュー */
  previewContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  /* 救援要請時のプレビューコンテナ（赤枠を太く） */
  rescuePreviewContainer: {
    borderWidth: 2,
  },
  /* 救援要請バッジ */
  rescueTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D32F2F',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  rescueTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  /* 救援要請の移動先ボックス */
  rescueDestinationBox: {
    backgroundColor: 'rgba(211, 47, 47, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  },
  rescueDestinationText: {
    fontSize: 15,
    fontWeight: '700',
  },
  rescueDestinationSubText: {
    fontSize: 12,
    marginTop: 2,
  },
  previewTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberDetail: {
    fontSize: 13,
  },
  arrowText: {
    fontSize: 20,
    textAlign: 'center',
    marginVertical: 4,
  },
  /* 申請者備考 */
  requesterNoteContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  requesterNoteLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  requesterNoteText: {
    fontSize: 14,
    lineHeight: 20,
  },
  /* 対応者備考（既対応の表示） */
  responderNoteContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  responderNoteLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  responderNoteText: {
    fontSize: 14,
    lineHeight: 20,
  },
  /* 対応入力欄 */
  noteInputContainer: {
    marginBottom: 8,
  },
  noteInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  noteErrorText: {
    fontSize: 12,
    marginTop: 4,
  },
  /* インライン確認エリア */
  confirmArea: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  confirmAreaText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    lineHeight: 20,
  },
  confirmAreaButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmCancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  confirmOkButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmOkButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  /* 処理エラー */
  processErrorContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#FFEBEE',
  },
  processErrorText: {
    fontSize: 13,
    lineHeight: 18,
  },
  /* ボタン */
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  rejectButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  completeButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ShiftChangeResponseModal;
