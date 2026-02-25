/**
 * シフト変更申請確認モーダル
 * 変更内容のプレビューを表示し、申請の確定・キャンセルを行います
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
} from 'react-native';

/**
 * シフト変更申請確認モーダル
 * @param {Object} props - コンポーネントプロパティ
 * @param {boolean} props.visible - 表示状態
 * @param {Object|null} props.source - 移動元データ { memberName, timeSlot, areaName }
 * @param {Object|null} props.destination - 移動先データ { memberName, timeSlot, areaName }（救援申請時はnull）
 * @param {string} props.displayDate - 表示用日付文字列
 * @param {boolean} props.isSubmitting - 送信中かどうか
 * @param {string} props.note - 備考テキスト（任意）
 * @param {Function} props.onNoteChange - 備考変更コールバック
 * @param {Function} props.onSubmit - 申請ボタン押下時のコールバック
 * @param {Function} props.onCancel - キャンセルボタン押下時のコールバック
 * @param {boolean} [props.isRescue=false] - 救援申請モードかどうか
 * @param {Object} props.theme - テーマオブジェクト
 * @returns {JSX.Element} 確認モーダル
 */
const ShiftChangeRequestModal = ({
  visible,
  source,
  destination,
  displayDate,
  isSubmitting,
  note,
  onNoteChange,
  onSubmit,
  onCancel,
  isRescue = false,
  theme,
}) => {
  if (!source || (!destination && !isRescue)) {
    return null;
  }

  /** 交換かどうかの判定（救援申請の場合は常にfalse） */
  const isSwap = !isRescue && !!destination?.areaName;

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
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {isRescue ? '救援申請の確認' : 'シフト変更申請の確認'}
            </Text>
          </View>

          {/* 変更内容 */}
          <View style={styles.content}>
            {/* 日付 */}
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>
              {displayDate}
            </Text>

            {/* 変更プレビュー */}
            <View style={[styles.previewContainer, { borderColor: theme.border }]}>
              {isRescue ? (
                <>
                  {/* 救援申請パターン */}
                  <View style={styles.previewRow}>
                    <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>救援申請</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={[styles.previewMember, { color: theme.text }]}>
                      {source.memberName}さん
                    </Text>
                    <Text style={[styles.previewDetail, { color: theme.textSecondary }]}>
                      {source.timeSlot} {source.areaName}
                    </Text>
                  </View>
                  <Text style={[styles.swapArrow, { color: theme.primary }]}>↓</Text>
                  <View style={styles.previewRow}>
                    <Text style={[styles.previewDetail, { color: theme.textSecondary }]}>
                      交代者なし（事務部に救援を要請します）
                    </Text>
                  </View>
                </>
              ) : isSwap ? (
                <>
                  {/* 交換パターン */}
                  <View style={styles.previewRow}>
                    <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>交換</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={[styles.previewMember, { color: theme.text }]}>
                      {source.memberName}さん
                    </Text>
                    <Text style={[styles.previewDetail, { color: theme.textSecondary }]}>
                      {source.timeSlot} {source.areaName}
                    </Text>
                  </View>
                  <Text style={[styles.swapArrow, { color: theme.primary }]}>↕</Text>
                  <View style={styles.previewRow}>
                    <Text style={[styles.previewMember, { color: theme.text }]}>
                      {destination.memberName}さん
                    </Text>
                    <Text style={[styles.previewDetail, { color: theme.textSecondary }]}>
                      {destination.timeSlot} {destination.areaName}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  {/* 移動パターン */}
                  <View style={styles.previewRow}>
                    <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>移動</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={[styles.previewMember, { color: theme.text }]}>
                      {source.memberName}さん
                    </Text>
                    <Text style={[styles.previewDetail, { color: theme.textSecondary }]}>
                      {source.timeSlot} {source.areaName}
                    </Text>
                  </View>
                  <Text style={[styles.swapArrow, { color: theme.primary }]}>↓</Text>
                  <View style={styles.previewRow}>
                    <Text style={[styles.previewMember, { color: theme.text }]}>
                      {destination.memberName}さん
                    </Text>
                    <Text style={[styles.previewDetail, { color: theme.textSecondary }]}>
                      {destination.timeSlot} シフトなし
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* 備考欄（救援申請時は必須、通常申請時は任意） */}
            <View style={styles.noteContainer}>
              {isRescue ? (
                <View style={styles.noteLabelRow}>
                  <Text style={[styles.noteLabel, { color: theme.textSecondary }]}>備考</Text>
                  <Text style={styles.noteLabelRequired}>（必須）</Text>
                </View>
              ) : (
                <Text style={[styles.noteLabel, { color: theme.textSecondary }]}>備考（任意）</Text>
              )}
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: theme.background,
                    borderColor: isRescue && !note.trim() ? '#FF9800' : theme.border,
                    color: theme.text,
                  },
                ]}
                value={note}
                onChangeText={onNoteChange}
                placeholder={isRescue ? '交代が必要な理由を記入してください' : '特別な事情があれば記入してください'}
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                maxLength={200}
                editable={!isSubmitting}
              />
            </View>

            <Text style={[styles.confirmText, { color: theme.textSecondary }]}>
              {isRescue ? 'この救援申請を事務部に送信しますか？' : 'この変更を事務部に申請しますか？'}
            </Text>
          </View>

          {/* ボタン */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.border }]}
              onPress={onCancel}
              disabled={isSubmitting}
            >
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.primary, opacity: (isSubmitting || (isRescue && !note.trim())) ? 0.6 : 1 }]}
              onPress={onSubmit}
              disabled={isSubmitting || (isRescue && !note.trim())}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>{isRescue ? '救援申請' : '申請'}</Text>
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
    maxWidth: 400,
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
  content: {
    padding: 16,
  },
  dateText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  previewContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewMember: {
    fontSize: 15,
    fontWeight: '600',
  },
  previewDetail: {
    fontSize: 13,
  },
  swapArrow: {
    fontSize: 20,
    textAlign: 'center',
    marginVertical: 4,
  },
  /* 備考欄 */
  noteContainer: {
    marginBottom: 16,
  },
  noteLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  noteLabelRequired: {
    fontSize: 13,
    fontWeight: '500',
    color: '#D32F2F',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 72,
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

export default ShiftChangeRequestModal;
