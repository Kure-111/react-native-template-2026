/**
 * 質問フォームコンポーネント
 * 質問種別を選び、本文を入力する
 */

import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { QUESTION_TYPES } from '../constants';

/**
 * 質問フォームコンポーネント
 * @param {Object} props - コンポーネント引数
 * @param {Object} props.theme - テーマオブジェクト
 * @param {string} props.questionType - 選択中の質問種別キー
 * @param {(value: string) => void} props.onChangeQuestionType - 質問種別変更コールバック
 * @param {string} props.questionDetail - 質問詳細本文
 * @param {(value: string) => void} props.onChangeQuestionDetail - 質問本文変更コールバック
 * @param {(options: Array, selectedValue: string, onSelect: Function, renderSubLabel?: Function) => JSX.Element} props.renderOptionButtons - 選択肢描画関数
 * @returns {JSX.Element} 質問フォーム
 */
const QuestionForm = ({
  theme,
  questionType,
  onChangeQuestionType,
  questionDetail,
  onChangeQuestionDetail,
  renderOptionButtons,
}) => {
  return (
    <View style={styles.formSection}>
      <Text style={[styles.label, { color: theme.text }]}>質問種別</Text>
      {renderOptionButtons(QUESTION_TYPES, questionType, onChangeQuestionType, (option) => {
        return `対応先: ${option.targetLabel}`;
      })}

      <Text style={[styles.label, { color: theme.text }]}>詳細</Text>
      <TextInput
        value={questionDetail}
        onChangeText={onChangeQuestionDetail}
        multiline
        placeholder="相談内容を入力してください"
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

export default QuestionForm;
