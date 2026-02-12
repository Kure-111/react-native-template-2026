/**
 * 本部向け鍵管理パネル
 * 簡易貸出登録 / 返却 / 施錠確認依頼を扱う
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { KEY_CATALOG } from '../../item16/data/keyCatalog';
import {
  createKeyLoan,
  listKeyLoans,
  returnKeyAndCreateLockTask,
} from '../../../services/supabase/keyLoanService';

const LOCK_CHECK_STATUS_LABELS = {
  locked: '施錠済',
  unlocked: '未施錠',
  cannot_confirm: '確認不可',
};

/**
 * @param {Object} props - プロパティ
 * @param {Object} props.theme - テーマ
 * @param {Object|null} props.user - ログインユーザー
 * @returns {JSX.Element} 鍵管理パネル
 */
const HQKeyManagementPanel = ({ theme, user }) => {
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerContact, setBorrowerContact] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [keyLoans, setKeyLoans] = useState([]);
  const [isLoadingLoans, setIsLoadingLoans] = useState(false);
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
   * 選択中鍵情報
   */
  const selectedKey = useMemo(() => {
    return KEY_CATALOG.find((item) => item.id === selectedKeyId) || null;
  }, [selectedKeyId]);

  /**
   * 貸出中一覧
   */
  const loanedKeyItems = useMemo(() => {
    return keyLoans.filter((loan) => loan.status === 'loaned');
  }, [keyLoans]);

  /**
   * 返却済一覧
   */
  const returnedKeyItems = useMemo(() => {
    return keyLoans.filter((loan) => loan.status === 'returned').slice(0, 20);
  }, [keyLoans]);

  /**
   * 貸出一覧を読み込む
   * @returns {Promise<void>} 読み込み処理
   */
  const loadKeyLoans = async () => {
    setIsLoadingLoans(true);
    const { data, error } = await listKeyLoans({ limit: 120 });
    setIsLoadingLoans(false);

    if (error) {
      console.error('鍵貸出一覧取得に失敗:', error);
      return;
    }

    setKeyLoans(data || []);
  };

  /**
   * 鍵貸出を登録
   * @returns {Promise<void>} 登録処理
   */
  const handleCreateLoan = async () => {
    if (!selectedKey) {
      showMessage('入力不足', '鍵を選択してください');
      return;
    }

    setIsSubmitting(true);
    const { error } = await createKeyLoan({
      keyCode: selectedKey.id,
      keyLabel: selectedKey.location || `${selectedKey.building} / ${selectedKey.name}`,
      eventName: eventName.trim(),
      eventLocation: eventLocation.trim(),
      borrowerName: borrowerName.trim(),
      borrowerContact: borrowerContact.trim(),
    });
    setIsSubmitting(false);

    if (error) {
      showMessage('登録エラー', error.message || '鍵貸出登録に失敗しました');
      return;
    }

    setBorrowerName('');
    setBorrowerContact('');
    setEventName('');
    setEventLocation('');
    await loadKeyLoans();
    showMessage('登録完了', '鍵貸出を登録しました');
  };

  /**
   * 返却処理
   * @param {string} loanId - 貸出ID
   * @param {boolean} createLockTask - 施錠確認タスクを作るか
   * @returns {Promise<void>} 実行処理
   */
  const handleReturnLoan = async (loanId, createLockTask) => {
    if (!user?.id) {
      showMessage('操作エラー', 'ログイン情報が取得できません');
      return;
    }

    setIsSubmitting(true);
    const { error } = await returnKeyAndCreateLockTask({
      loanId,
      createLockTask,
      returnUserId: user.id,
      optionalAssignee: null,
    });
    setIsSubmitting(false);

    if (error) {
      showMessage('返却エラー', error.message || '返却処理に失敗しました');
      return;
    }

    await loadKeyLoans();
    showMessage(
      '返却完了',
      createLockTask
        ? '返却を登録し、施錠確認タスクを作成しました'
        : '返却を登録しました'
    );
  };

  useEffect(() => {
    if (KEY_CATALOG.length > 0 && !selectedKeyId) {
      setSelectedKeyId(KEY_CATALOG[0].id);
    }
  }, [selectedKeyId]);

  useEffect(() => {
    loadKeyLoans();
  }, []);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>鍵貸出/返却（本部）</Text>
        <TouchableOpacity
          style={[styles.refreshButton, { borderColor: theme.border }]}
          onPress={loadKeyLoans}
          disabled={isSubmitting}
        >
          <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { color: theme.text }]}>鍵を選択</Text>
      <View
        style={[
          styles.pickerContainer,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <Picker
          selectedValue={selectedKeyId}
          onValueChange={(value) => setSelectedKeyId(value)}
          style={[styles.picker, { color: theme.text, backgroundColor: theme.surface }]}
          itemStyle={{ color: theme.text }}
          dropdownIconColor={theme.text}
        >
          {KEY_CATALOG.map((item) => (
            <Picker.Item
              key={item.id}
              label={`${item.building} / ${item.name}`}
              value={item.id}
              color={theme.text}
            />
          ))}
        </Picker>
      </View>

      <Text style={[styles.label, { color: theme.text }]}>借受人（任意）</Text>
      <TextInput
        value={borrowerName}
        onChangeText={setBorrowerName}
        placeholder="借受人名"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.text }]}>借受人連絡先（任意）</Text>
      <TextInput
        value={borrowerContact}
        onChangeText={setBorrowerContact}
        placeholder="連絡先"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.text }]}>企画名（任意）</Text>
      <TextInput
        value={eventName}
        onChangeText={setEventName}
        placeholder="企画名"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.text }]}>企画場所（任意）</Text>
      <TextInput
        value={eventLocation}
        onChangeText={setEventLocation}
        placeholder="企画場所"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
      />

      <TouchableOpacity
        style={[styles.mainActionButton, { backgroundColor: theme.primary }]}
        onPress={handleCreateLoan}
        disabled={isSubmitting}
      >
        <Text style={styles.mainActionButtonText}>貸出登録</Text>
      </TouchableOpacity>

      <Text style={[styles.subTitle, { color: theme.text }]}>貸出中</Text>
      {isLoadingLoans ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
      ) : loanedKeyItems.length === 0 ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>貸出中の鍵はありません</Text>
      ) : (
        <View style={styles.list}>
          {loanedKeyItems.map((loan) => (
            <View
              key={loan.id}
              style={[
                styles.listRow,
                { borderColor: theme.border, backgroundColor: theme.background },
              ]}
            >
              <Text style={[styles.listTitle, { color: theme.text }]} numberOfLines={1}>
                {loan.key_label}
              </Text>
              <Text style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                {loan.event_name || '-'} / {loan.event_location || '-'}
              </Text>
              <Text style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                貸出: {new Date(loan.loaned_at).toLocaleString('ja-JP')}
              </Text>
              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={[styles.subActionButton, { borderColor: theme.border }]}
                  onPress={() => handleReturnLoan(loan.id, false)}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.subActionText, { color: theme.textSecondary }]}>返却のみ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subActionButton, { borderColor: theme.border }]}
                  onPress={() => handleReturnLoan(loan.id, true)}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.subActionText, { color: theme.textSecondary }]}>
                    返却+施錠確認依頼
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.subTitle, { color: theme.text }]}>返却済（施錠確認結果）</Text>
      {returnedKeyItems.length === 0 ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>返却済データはまだありません</Text>
      ) : (
        <View style={styles.list}>
          {returnedKeyItems.map((loan) => (
            <View
              key={loan.id}
              style={[
                styles.listRow,
                { borderColor: theme.border, backgroundColor: theme.background },
              ]}
            >
              <Text style={[styles.listTitle, { color: theme.text }]} numberOfLines={1}>
                {loan.key_label}
              </Text>
              <Text style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                返却: {loan.returned_at ? new Date(loan.returned_at).toLocaleString('ja-JP') : '-'}
              </Text>
              <Text style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                施錠確認: {LOCK_CHECK_STATUS_LABELS[loan.lock_check_status] || '未確認'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  subTitle: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '700',
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 52,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  mainActionButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  mainActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    gap: 8,
  },
  listRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  listMeta: {
    marginTop: 2,
    fontSize: 12,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  subActionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  subActionText: {
    fontSize: 12,
    fontWeight: '600',
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
  helpText: {
    fontSize: 13,
    lineHeight: 20,
  },
});

export default HQKeyManagementPanel;
