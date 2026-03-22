/**
 * 汎用プルダウン（ドロップダウン）コンポーネント
 * 選択肢をモーダルで表示し、タップで値を選択する
 * フィルタが有効な場合はボタンをプライマリカラーでハイライトする
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Ionicons } from '../../../shared/components/icons';

/**
 * 汎用プルダウンコンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {string} props.value - 現在の選択値
 * @param {Array<{value: string, label: string}>} props.options - 選択肢の配列（先頭が「すべて」想定）
 * @param {Function} props.onChange - 値変更時のコールバック
 * @returns {JSX.Element} プルダウンUI
 */
const FilterDropdown = ({ value, options, onChange }) => {
  /** テーマオブジェクト */
  const { theme } = useTheme();
  /** 選択肢リストの表示状態 */
  const [isOpen, setIsOpen] = useState(false);

  /** 先頭選択肢（すべて）以外が選択されているかどうか（フィルタ有効状態） */
  const isFiltered = options.length > 0 && value !== options[0].value;
  /** 現在選択されている選択肢のラベル */
  const selectedLabel = options.find((o) => o.value === value)?.label ?? options[0]?.label ?? '';

  return (
    <>
      {/* プルダウンボタン */}
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isFiltered ? theme.primary + '18' : theme.surface,
            borderColor: isFiltered ? theme.primary : theme.border,
          },
        ]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.buttonText, { color: isFiltered ? theme.primary : theme.textSecondary }]}
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>
        <Ionicons
          name="chevron-down"
          size={12}
          color={isFiltered ? theme.primary : theme.textSecondary}
        />
      </TouchableOpacity>

      {/* 選択肢モーダル（背景タップで閉じる） */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          {/* 選択肢リスト（タップが外に伝播しないよう stopPropagation 相当の処理） */}
          <TouchableOpacity activeOpacity={1}>
            <View
              style={[
                styles.menu,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                {options.map((option, index) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      { borderBottomColor: theme.border },
                      index === options.length - 1 && styles.optionLast,
                    ]}
                    onPress={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: option.value === value ? theme.primary : theme.text,
                          fontWeight: option.value === value ? '600' : 'normal',
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {option.value === value && (
                      <Ionicons name="checkmark" size={14} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  /** プルダウンボタン */
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  /** ボタンのラベルテキスト */
  buttonText: {
    flex: 1,
    fontSize: 12,
  },
  /** モーダルの背景オーバーレイ */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  /** 選択肢リストのメニュー枠 */
  menu: {
    width: 240,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: 320,
  },
  /** 各選択肢の行 */
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  /** 最後の選択肢は下線なし */
  optionLast: {
    borderBottomWidth: 0,
  },
  /** 選択肢のテキスト */
  optionText: {
    fontSize: 14,
    flex: 1,
  },
});

export default FilterDropdown;
