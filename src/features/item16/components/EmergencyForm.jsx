/**
 * 緊急連絡フォームコンポーネント
 * 優先度選択と緊急内容入力を提供する
 */

import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { EMERGENCY_PRIORITIES } from '../constants';

/**
 * 緊急連絡フォームコンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.theme - テーマオブジェクト
 * @param {string} props.emergencyPriority - 選択中の優先度キー
 * @param {(value: string) => void} props.onChangePriority - 優先度変更コールバック
 * @param {string} props.emergencyDetail - 緊急内容入力値
 * @param {(value: string) => void} props.onChangeDetail - 緊急内容変更コールバック
 * @param {(options: Array, selectedValue: string, onSelect: Function, renderSubLabel?: Function) => JSX.Element} props.renderOptionButtons - 選択ボタン群描画関数
 * @returns {JSX.Element} 緊急連絡フォーム
 */
const EmergencyForm = ({
  theme,
  emergencyPriority,
  onChangePriority,
  emergencyDetail,
  onChangeDetail,
  renderOptionButtons,
}) => {
  return (
    <View style={styles.formSection}>
      <Text style={[styles.label, { color: theme.text }]}>優先度</Text>
      {renderOptionButtons(EMERGENCY_PRIORITIES, emergencyPriority, onChangePriority)}

      <Text style={[styles.label, { color: theme.text }]}>緊急内容</Text>
      <TextInput
        value={emergencyDetail}
        onChangeText={onChangeDetail}
        multiline
        placeholder="緊急内容を入力してください"
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

export default EmergencyForm;
