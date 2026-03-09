/**
 * 人ごと移送確認モーダル
 * 選択した移送元メンバーの全シフトを移送先メンバーへ一括申請する確認画面を表示します
 */

import React from 'react';
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
 * 人ごと移送確認モーダル
 * @param {Object} props - コンポーネントプロパティ
 * @param {boolean} props.visible - 表示状態
 * @param {string} props.sourceMemberName - 移送元メンバー名
 * @param {string} props.destMemberName - 移送先メンバー名
 * @param {Array<Object>} props.transferList - 移送コマ一覧 [{ timeSlot, sourceAreaName, destAreaName }]
 * @param {string} props.displayDate - 表示用日付文字列
 * @param {boolean} props.isSubmitting - 送信中かどうか
 * @param {string} props.note - 備考テキスト（任意）
 * @param {Function} props.onNoteChange - 備考変更コールバック
 * @param {Function} props.onSubmit - 申請ボタン押下時のコールバック
 * @param {Function} props.onCancel - キャンセルボタン押下時のコールバック
 * @param {Object} props.theme - テーマオブジェクト
 * @returns {JSX.Element} 確認モーダル
 */
const ShiftBulkTransferModal = ({
  visible,
  sourceMemberName,
  destMemberName,
  transferList,
  displayDate,
  isSubmitting,
  note,
  onNoteChange,
  onSubmit,
  onCancel,
  theme,
}) => {
  if (!sourceMemberName || !destMemberName || !transferList || transferList.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
          {/* ヘッダー */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>人ごと移送の確認</Text>
          </View>

          {/* 変更内容 */}
          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content}>
            {/* 日付 */}
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>
              {displayDate}
            </Text>

            {/* 移送サマリ */}
            <View style={[styles.summaryContainer, { borderColor: theme.border }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryMember, { color: theme.text }]}>
                  {sourceMemberName}さん
                </Text>
                <Text style={[styles.summaryArrow, { color: theme.primary }]}>→</Text>
                <Text style={[styles.summaryMember, { color: theme.text }]}>
                  {destMemberName}さん
                </Text>
              </View>
              <Text style={[styles.summaryCount, { color: theme.textSecondary }]}>
                {transferList.length}コマを移送
              </Text>
            </View>

            {/* 移送コマ一覧 */}
            <View style={[styles.transferListContainer, { borderColor: theme.border }]}>
              <Text style={[styles.transferListLabel, { color: theme.textSecondary }]}>
                移送対象コマ
              </Text>
              {transferList.map((item, index) => (
                <View
                  key={`transfer-${index}`}
                  style={[styles.transferItem, { borderTopColor: theme.border }]}
                >
                  <Text style={[styles.transferTimeSlot, { color: theme.text }]}>
                    {item.timeSlot}
                  </Text>
                  <Text style={[styles.transferDetail, { color: theme.textSecondary }]}>
                    {item.sourceAreaName}
                  </Text>
                  <Text style={[styles.transferArrow, { color: theme.primary }]}>→</Text>
                  <Text style={[styles.transferDetail, { color: theme.textSecondary }]}>
                    {item.destAreaName ? item.destAreaName : 'シフトなし'}
                  </Text>
                  {/** 交換か移動かのラベル */}
                  <Text style={[styles.transferTypeLabel, { color: item.destAreaName ? '#2196F3' : '#FF9800' }]}>
                    {item.destAreaName ? '交換' : '移動'}
                  </Text>
                </View>
              ))}
            </View>

            {/* 備考欄（任意） */}
            <View style={styles.noteContainer}>
              <Text style={[styles.noteLabel, { color: theme.textSecondary }]}>
                備考（任意）
              </Text>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={note}
                onChangeText={onNoteChange}
                placeholder="特別な事情があれば記入してください"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                maxLength={200}
                editable={!isSubmitting}
              />
            </View>

            <Text style={[styles.confirmText, { color: theme.textSecondary }]}>
              {transferList.length}件のシフト変更申請を事務部に送信しますか？
            </Text>
          </ScrollView>

          {/* ボタン */}
          <View style={[styles.buttonContainer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.border }]}
              onPress={onCancel}
              disabled={isSubmitting}
            >
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.primary, opacity: isSubmitting ? 0.6 : 1 }]}
              onPress={onSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>一括申請</Text>
              )}
            </TouchableOpacity>
          </View>
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
    maxWidth: 440,
    maxHeight: '85%',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollArea: {
    maxHeight: 480,
  },
  content: {
    padding: 16,
  },
  dateText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  /* 移送サマリ */
  summaryContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  summaryMember: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryArrow: {
    fontSize: 18,
    fontWeight: '700',
  },
  summaryCount: {
    fontSize: 13,
  },
  /* 移送コマ一覧 */
  transferListContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  transferListLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  transferItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  transferTimeSlot: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 90,
  },
  transferDetail: {
    fontSize: 12,
    flex: 1,
  },
  transferArrow: {
    fontSize: 13,
  },
  transferTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  /* 備考欄 */
  noteContainer: {
    marginBottom: 12,
  },
  noteLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  confirmText: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ShiftBulkTransferModal;
