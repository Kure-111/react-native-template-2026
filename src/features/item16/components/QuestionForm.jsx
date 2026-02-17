/**
 * 質問フォームコンポーネント
 * 質問種別選択、FAQヒント、詳細入力を提供する
 */

import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { QUESTION_TYPES } from '../constants';

/** 質問種別ごとのFAQヒント */
const FAQ_HINTS_BY_QUESTION_TYPE = {
  rule_change: [
    '案内資料との差分（何を、どの時間帯で変えるか）を先に整理すると回答が早くなります。',
    '安全導線・音量・火気など運用制約に触れる変更は優先して明記してください。',
  ],
  layout_change: [
    '変更前/変更後の動線（人・物の流れ）を文章で添えると確認がスムーズです。',
    '通路幅・避難経路への影響がある場合は必ず詳細欄に記載してください。',
  ],
  distribution_change: [
    '配布開始時刻と対象者の範囲を明記すると会計側の確認が早くなります。',
    '既存ルールとの差分を先に書くと再確認が減ります。',
  ],
  damage_report: [
    '破損物品名、現状、保管場所を先に書くと物品対応が早くなります。',
    '写真添付（任意）をつけると状況判断がしやすくなります。',
  ],
};

/**
 * 質問フォームコンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.theme - テーマオブジェクト
 * @param {string} props.questionType - 選択中の質問種別キー
 * @param {(value: string) => void} props.onChangeQuestionType - 質問種別変更コールバック
 * @param {string} props.questionDetail - 詳細入力値
 * @param {(value: string) => void} props.onChangeQuestionDetail - 詳細入力変更コールバック
 * @param {(options: Array, selectedValue: string, onSelect: Function, renderSubLabel?: Function) => JSX.Element} props.renderOptionButtons - 選択ボタン群描画関数
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
  /** 選択中の質問種別オブジェクト */
  const selectedQuestion = QUESTION_TYPES.find((item) => item.key === questionType) || QUESTION_TYPES[0];

  /** 現在の質問種別に対応するFAQヒント */
  const faqHints = FAQ_HINTS_BY_QUESTION_TYPE[selectedQuestion.key] || [];

  return (
    <View style={styles.formSection}>
      <Text style={[styles.label, { color: theme.text }]}>質問種別</Text>
      {renderOptionButtons(QUESTION_TYPES, questionType, onChangeQuestionType, (option) => {
        return `対応: ${option.targetLabel}`;
      })}
      <Text style={[styles.questionTargetHint, { color: theme.textSecondary }]}>
        現在の対応先: {selectedQuestion.targetLabel}
      </Text>
      {faqHints.length > 0 ? (
        <View
          style={[
            styles.faqHintBox,
            { borderColor: theme.border, backgroundColor: theme.background },
          ]}
        >
          <Text style={[styles.faqHintTitle, { color: theme.text }]}>FAQ/入力ヒント</Text>
          {faqHints.map((hint) => (
            <Text key={hint} style={[styles.faqHintItem, { color: theme.textSecondary }]}>
              ・{hint}
            </Text>
          ))}
        </View>
      ) : null}

      <Text style={[styles.label, { color: theme.text }]}>詳細</Text>
      <TextInput
        value={questionDetail}
        onChangeText={onChangeQuestionDetail}
        multiline
        placeholder="内容を入力してください"
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
  questionTargetHint: {
    fontSize: 12,
    marginTop: -2,
  },
  faqHintBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  faqHintTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  faqHintItem: {
    fontSize: 12,
    lineHeight: 18,
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
