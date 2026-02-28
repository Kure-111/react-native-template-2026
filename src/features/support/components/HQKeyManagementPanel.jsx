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
import { ensureKeysSeededFromCatalog, listKeys } from '../../../services/supabase/keyMasterService';
import {
  KEY_RESERVATION_STATUSES,
  listKeyReservations,
  updateKeyReservationStatus,
} from '../../../services/supabase/keyReservationService';
import KeyStatusBoardModal from './KeyStatusBoardModal';

const LOCK_CHECK_STATUS_LABELS = {
  locked: '施錠済',
  unlocked: '未施錠',
  cannot_confirm: '確認不可',
};

const RESERVATION_STATUS_LABELS = {
  [KEY_RESERVATION_STATUSES.PENDING]: '承認待ち',
  [KEY_RESERVATION_STATUSES.APPROVED]: '承認済み',
  [KEY_RESERVATION_STATUSES.REJECTED]: '却下',
  [KEY_RESERVATION_STATUSES.CANCELED]: '取消',
};

const normalizeText = (value) => (value || '').trim();

const toFallbackKeyOptions = () => {
  return KEY_CATALOG.map((item) => ({
    id: item.id,
    keyCode: item.id,
    label: `${item.building} / ${item.name}`,
    location: item.location || `${item.building} / ${item.name}`,
    name: item.name,
    building: item.building,
  }));
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
  const [keyOptions, setKeyOptions] = useState([]);
  const [keyLoans, setKeyLoans] = useState([]);
  const [keyReservations, setKeyReservations] = useState([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isLoadingLoans, setIsLoadingLoans] = useState(false);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** 全体表示ボードモーダルの表示フラグ */
  const [isBoardVisible, setIsBoardVisible] = useState(false);

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
    return keyOptions.find((item) => item.keyCode === selectedKeyId) || null;
  }, [keyOptions, selectedKeyId]);

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
   * 承認待ち予約
   */
  const pendingReservations = useMemo(() => {
    return keyReservations.filter((reservation) => reservation.status === KEY_RESERVATION_STATUSES.PENDING);
  }, [keyReservations]);

  /**
   * 最近の承認済/却下予約
   */
  const recentResolvedReservations = useMemo(() => {
    return keyReservations
      .filter((reservation) => reservation.status !== KEY_RESERVATION_STATUSES.PENDING)
      .slice(0, 20);
  }, [keyReservations]);

  /**
   * 鍵ラベルを表示用へ変換
   * @param {Object} reservation - 鍵予約
   * @returns {string} 表示名
   */
  const getReservationKeyLabel = (reservation) => {
    const fromRelation = normalizeText(reservation?.keys?.display_name);
    if (fromRelation) {
      return fromRelation;
    }
    const fromMetadata = normalizeText(reservation?.metadata?.key_name);
    if (fromMetadata) {
      return fromMetadata;
    }
    return normalizeText(reservation?.key_code) || '鍵未設定';
  };

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
   * 鍵マスタを読み込む
   * @returns {Promise<void>} 読み込み処理
   */
  const loadKeys = async () => {
    setIsLoadingKeys(true);
    let { data, error } = await listKeys({ activeOnly: true, limit: 500 });

    if (!error && (data || []).length === 0) {
      const seeded = await ensureKeysSeededFromCatalog(KEY_CATALOG);
      data = seeded.data || [];
      error = seeded.error;
    }
    setIsLoadingKeys(false);

    if (error) {
      console.error('鍵マスタ取得に失敗:', error);
      setKeyOptions(toFallbackKeyOptions());
      return;
    }

    const rows = (data || []).map((row) => {
      const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
      const building = normalizeText(metadata.building);
      const name = normalizeText(metadata.name) || normalizeText(row.display_name);
      const fallbackLabel = [building, name].filter(Boolean).join(' / ');
      return {
        id: row.id,
        keyCode: normalizeText(row.key_code) || row.id,
        label: normalizeText(row.display_name) || fallbackLabel || normalizeText(row.key_code) || row.id,
        location: normalizeText(row.location_text) || fallbackLabel || normalizeText(row.display_name),
        name,
        building,
      };
    });

    setKeyOptions(rows.length > 0 ? rows : toFallbackKeyOptions());
  };

  /**
   * 鍵予約一覧を読み込む
   * @returns {Promise<void>} 読み込み処理
   */
  const loadKeyReservations = async () => {
    setIsLoadingReservations(true);
    const { data, error } = await listKeyReservations({ limit: 120 });
    setIsLoadingReservations(false);

    if (error) {
      console.error('鍵予約一覧取得に失敗:', error);
      return;
    }

    setKeyReservations(data || []);
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

    /** 確認ダイアログを表示 */
    const confirmMessage = `「${selectedKey.label}」の鍵貸出を登録しますか？`;
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) {
        return;
      }
    } else {
      const confirmed = await new Promise((resolve) => {
        Alert.alert('確認', confirmMessage, [
          { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
          { text: '登録', onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) {
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await createKeyLoan({
      keyCode: selectedKey.keyCode,
      keyLabel: selectedKey.location || selectedKey.label,
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

    /** 確認ダイアログを表示 */
    const actionLabel = createLockTask ? '返却＋施錠確認依頼' : '返却のみ';
    const confirmMessage = `鍵の${actionLabel}を実行しますか？`;
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) {
        return;
      }
    } else {
      const confirmed = await new Promise((resolve) => {
        Alert.alert('確認', confirmMessage, [
          { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
          { text: '実行', onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) {
        return;
      }
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

  /**
   * 鍵予約を承認/却下
   * @param {string} reservationId - 予約ID
   * @param {'approved'|'rejected'} status - 更新ステータス
   * @returns {Promise<void>} 更新処理
   */
  const handleReservationDecision = async (reservationId, status) => {
    if (!user?.id) {
      showMessage('操作エラー', 'ログイン情報が取得できません');
      return;
    }

    /** 確認ダイアログを表示 */
    const actionLabel = status === 'approved' ? '承認' : '却下';
    const confirmMessage = `鍵予約を「${actionLabel}」しますか？`;
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) {
        return;
      }
    } else {
      const confirmed = await new Promise((resolve) => {
        Alert.alert('確認', confirmMessage, [
          { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
          { text: actionLabel, onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) {
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await updateKeyReservationStatus({
      reservationId,
      status,
      approvedBy: user.id,
    });
    setIsSubmitting(false);

    if (error) {
      showMessage('更新エラー', error.message || '鍵予約の更新に失敗しました');
      return;
    }

    await loadKeyReservations();
    showMessage('更新完了', status === 'approved' ? '鍵予約を承認しました' : '鍵予約を却下しました');
  };

  useEffect(() => {
    if (keyOptions.length > 0 && !selectedKeyId) {
      setSelectedKeyId(keyOptions[0].keyCode);
    }
  }, [keyOptions, selectedKeyId]);

  useEffect(() => {
    loadKeys();
    loadKeyLoans();
    loadKeyReservations();
  }, []);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>鍵貸出/返却（本部）</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.boardButton, { backgroundColor: theme.primary }]}
            onPress={() => setIsBoardVisible(true)}
          >
            <Text style={styles.boardButtonText}>全体表示</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.refreshButton, { borderColor: theme.border }]}
            onPress={() => {
              loadKeys();
              loadKeyLoans();
              loadKeyReservations();
            }}
            disabled={isSubmitting}
          >
            <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 全体表示ボードモーダル */}
      <KeyStatusBoardModal
        visible={isBoardVisible}
        onClose={() => setIsBoardVisible(false)}
        theme={theme}
      />

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
          {keyOptions.map((item) => (
            <Picker.Item
              key={item.id || item.keyCode}
              label={item.label}
              value={item.keyCode}
              color={theme.text}
            />
          ))}
        </Picker>
      </View>
      {isLoadingKeys ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>鍵マスタを読み込み中...</Text>
      ) : null}

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

      <Text style={[styles.subTitle, { color: theme.text }]}>鍵予約（承認待ち）</Text>
      {isLoadingReservations ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
      ) : pendingReservations.length === 0 ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>承認待ちの鍵予約はありません</Text>
      ) : (
        <View style={styles.list}>
          {pendingReservations.map((reservation) => (
            <View
              key={reservation.id}
              style={[
                styles.listRow,
                { borderColor: theme.border, backgroundColor: theme.background },
              ]}
            >
              <Text style={[styles.listTitle, { color: theme.text }]} numberOfLines={1}>
                {getReservationKeyLabel(reservation)}
              </Text>
              <Text style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                予約番号: {reservation.reservation_no || '-'}
              </Text>
              <Text style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                希望時刻: {reservation.requested_at_text}
              </Text>
              <Text style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={2}>
                理由: {reservation.reason}
              </Text>
              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={[styles.subActionButton, { borderColor: theme.border }]}
                  onPress={() =>
                    handleReservationDecision(reservation.id, KEY_RESERVATION_STATUSES.APPROVED)
                  }
                  disabled={isSubmitting}
                >
                  <Text style={[styles.subActionText, { color: '#22A06B' }]}>承認</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subActionButton, { borderColor: theme.border }]}
                  onPress={() =>
                    handleReservationDecision(reservation.id, KEY_RESERVATION_STATUSES.REJECTED)
                  }
                  disabled={isSubmitting}
                >
                  <Text style={[styles.subActionText, { color: '#D1242F' }]}>却下</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.subTitle, { color: theme.text }]}>鍵予約（対応済み）</Text>
      {recentResolvedReservations.length === 0 ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>対応済みデータはまだありません</Text>
      ) : (
        <View style={styles.list}>
          {recentResolvedReservations.map((reservation) => (
            <View
              key={reservation.id}
              style={[
                styles.listRow,
                { borderColor: theme.border, backgroundColor: theme.background },
              ]}
            >
              <Text style={[styles.listTitle, { color: theme.text }]} numberOfLines={1}>
                {getReservationKeyLabel(reservation)}
              </Text>
              <Text style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                状態: {RESERVATION_STATUS_LABELS[reservation.status] || reservation.status}
              </Text>
              <Text style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                希望時刻: {reservation.requested_at_text}
              </Text>
              <Text style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                対応日時:{' '}
                {reservation.approved_at ? new Date(reservation.approved_at).toLocaleString('ja-JP') : '-'}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boardButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  boardButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
