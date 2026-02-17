/**
 * 企画開始/終了報告フォームコンポーネント
 * 報告種別選択とメモ入力を提供する
 */

import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { EVENT_STATUS_OPTIONS } from '../constants';

/**
 * 企画開始/終了報告フォームコンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.theme - テーマオブジェクト
 * @param {string} props.eventStatus - 選択中の報告種別キー
 * @param {(value: string) => void} props.onChangeEventStatus - 報告種別変更コールバック
 * @param {string} props.eventMemo - メモ入力値
 * @param {(value: string) => void} props.onChangeEventMemo - メモ変更コールバック
 * @param {(options: Array, selectedValue: string, onSelect: Function, renderSubLabel?: Function) => JSX.Element} props.renderOptionButtons - 選択ボタン群描画関数
 * @returns {JSX.Element} 企画開始/終了報告フォーム
 */
const EventStatusForm = ({
  theme,
  eventStatus,
  onChangeEventStatus,
  eventMemo,
  onChangeEventMemo,
  renderOptionButtons,
}) => {
  return (
    <View style={styles.formSection}>
      <Text style={[styles.label, { color: theme.text }]}>報告種別</Text>
      {renderOptionButtons(EVENT_STATUS_OPTIONS, eventStatus, onChangeEventStatus)}

      <Text style={[styles.label, { color: theme.text }]}>メモ（任意）</Text>
      <TextInput
        value={eventMemo}
        onChangeText={onChangeEventMemo}
        multiline
        placeholder="補足事項があれば入力してください"
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.multilineInput,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  formSection: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
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
});

export default EventStatusForm;
