/**
 * 本部向け鍵管理パネル
 * 簡易貸出登録 / 返却 / 施錠確認依頼を扱う
 * 鍵選択は「棟選択 → 教室選択」の2段階UIを採用
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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

/**
 * フォールバック用カタログから鍵オプションを生成する
 * DBが空の場合に使用する
 * @returns {Array} 鍵オプション一覧
 */
const toFallbackKeyOptions = () => {
  return KEY_CATALOG.map((item) => ({
    id: item.id,
    keyCode: item.id,
    label: `${item.building} / ${item.name}`,
    location: item.location || `${item.building} / ${item.name}`,
    name: item.name,
    building: item.building || '',
    classroomName: item.name || '',
  }));
};

/**
 * @param {Object} props - プロパティ
 * @param {Object} props.theme - テーマ
 * @param {Object|null} props.user - ログインユーザー
 * @param {Function} [props.onLoanCreated] - 貸出登録後コールバック
 * @param {Function} [props.onLoanReturned] - 返却後コールバック
 * @returns {JSX.Element} 鍵管理パネル
 */
const HQKeyManagementPanel = ({ theme, user, onLoanCreated, onLoanReturned }) => {
  /** 選択中の棟名 */
  const [selectedBuilding, setSelectedBuilding] = useState('');
  /** 選択中の鍵コード */
  const [selectedKeyCode, setSelectedKeyCode] = useState('');
  /** 借受人名 */
  const [borrowerName, setBorrowerName] = useState('');
  /** 借受人連絡先 */
  const [borrowerContact, setBorrowerContact] = useState('');
  /** 企画名 */
  const [eventName, setEventName] = useState('');
  /** 企画場所 */
  const [eventLocation, setEventLocation] = useState('');
  /** 全鍵オプション一覧 */
  const [keyOptions, setKeyOptions] = useState([]);
  /** 貸出一覧 */
  const [keyLoans, setKeyLoans] = useState([]);
  /** 鍵予約一覧 */
  const [keyReservations, setKeyReservations] = useState([]);
  /** 鍵マスタ読み込み中フラグ */
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  /** 貸出一覧読み込み中フラグ */
  const [isLoadingLoans, setIsLoadingLoans] = useState(false);
  /** 鍵予約読み込み中フラグ */
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  /** 処理中フラグ */
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
   * 棟名一覧（ユニーク、ソート済み）
   */
  const buildingOptions = useMemo(() => {
    const seen = new Set();
    keyOptions.forEach((item) => {
      const b = normalizeText(item.building);
      if (b) {
        seen.add(b);
      }
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b, 'ja'));
  }, [keyOptions]);

  /**
   * 選択した棟の鍵一覧
   * 棟が未選択のときは全件を返す
   */
  const filteredKeyOptions = useMemo(() => {
    if (!selectedBuilding) {
      return keyOptions;
    }
    return keyOptions.filter((item) => item.building === selectedBuilding);
  }, [keyOptions, selectedBuilding]);

  /**
   * 選択中鍵情報
   */
  const selectedKey = useMemo(() => {
    return keyOptions.find((item) => item.keyCode === selectedKeyCode) || null;
  }, [keyOptions, selectedKeyCode]);

  /**
   * 貸出中一覧
   */
  const loanedKeyItems = useMemo(() => {
    return keyLoans.filter((loan) => loan.status === 'loaned');
  }, [keyLoans]);

  /**
   * 返却済一覧（最新20件）
   */
  const returnedKeyItems = useMemo(() => {
    return keyLoans.filter((loan) => loan.status === 'returned').slice(0, 20);
  }, [keyLoans]);

  /**
   * 承認待ち予約
   */
  const pendingReservations = useMemo(() => {
    return keyReservations.filter(
      (reservation) => reservation.status === KEY_RESERVATION_STATUSES.PENDING
    );
  }, [keyReservations]);

  /**
   * 最近の承認済/却下予約（最新20件）
   */
  const recentResolvedReservations = useMemo(() => {
    return keyReservations
      .filter((reservation) => reservation.status !== KEY_RESERVATION_STATUSES.PENDING)
      .slice(0, 20);
  }, [keyReservations]);

  /**
   * 鍵予約の鍵ラベルを表示用へ変換
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
   * building カラムと metadata.building の両方から棟名を抽出する
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
      /** building カラム優先、なければ metadata.building を使用 */
      const building = normalizeText(row.building || metadata.building);
      /** classroom_name カラム優先、なければ metadata.name を使用 */
      const classroomName = normalizeText(row.classroom_name || metadata.name) || normalizeText(row.display_name);
      const fallbackLabel = [building, classroomName].filter(Boolean).join(' / ');
      return {
        id: row.id,
        keyCode: normalizeText(row.key_code) || row.id,
        label: normalizeText(row.display_name) || fallbackLabel || normalizeText(row.key_code) || row.id,
        location: normalizeText(row.location_text) || fallbackLabel || normalizeText(row.display_name),
        name: classroomName,
        building,
        classroomName,
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
    setSelectedKeyCode('');
    await loadKeyLoans();
    onLoanCreated?.();
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
    onLoanReturned?.();
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
    showMessage(
      '更新完了',
      status === 'approved' ? '鍵予約を承認しました' : '鍵予約を却下しました'
    );
  };

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
        user={user}
        onLoanCreated={loadKeyLoans}
        onLoanReturned={loadKeyLoans}
      />

      {/* ── Step 1: 棟選択 ── */}
      <Text style={[styles.label, { color: theme.text }]}>Step 1 — 棟を選択</Text>
      {isLoadingKeys ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>鍵マスタを読み込み中...</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.buildingScrollContent}
          style={styles.buildingScroll}
        >
          {/* 全棟表示ボタン */}
          <TouchableOpacity
            style={[
              styles.buildingPill,
              {
                backgroundColor: !selectedBuilding ? theme.primary : theme.background,
                borderColor: !selectedBuilding ? theme.primary : theme.border,
              },
            ]}
            onPress={() => {
              setSelectedBuilding('');
              setSelectedKeyCode('');
            }}
          >
            <Text
              style={[
                styles.buildingPillText,
                { color: !selectedBuilding ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              すべて
            </Text>
          </TouchableOpacity>
          {buildingOptions.map((building) => {
            /** 選択中かどうか */
            const isSelected = selectedBuilding === building;
            return (
              <TouchableOpacity
                key={building}
                style={[
                  styles.buildingPill,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.background,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => {
                  /** 同じ棟を再タップで解除 */
                  setSelectedBuilding(isSelected ? '' : building);
                  setSelectedKeyCode('');
                }}
              >
                <Text
                  style={[
                    styles.buildingPillText,
                    { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  {building}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── Step 2: 教室（鍵）選択 ── */}
      {!isLoadingKeys && filteredKeyOptions.length > 0 ? (
        <>
          <Text style={[styles.label, { color: theme.text }]}>
            Step 2 — 教室を選択（{filteredKeyOptions.length}件）
          </Text>
          <View style={styles.keyGrid}>
            {filteredKeyOptions.map((item) => {
              /** 選択中かどうか */
              const isSelected = selectedKeyCode === item.keyCode;
              return (
                <TouchableOpacity
                  key={item.id || item.keyCode}
                  style={[
                    styles.keyCard,
                    {
                      backgroundColor: isSelected ? `${theme.primary}1A` : theme.background,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedKeyCode(isSelected ? '' : item.keyCode)}
                >
                  <Text
                    style={[styles.keyCardCode, { color: theme.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.keyCode}
                  </Text>
                  <Text
                    style={[
                      styles.keyCardName,
                      { color: isSelected ? theme.primary : theme.text },
                    ]}
                    numberOfLines={2}
                  >
                    {item.classroomName || item.name || item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedKey ? (
            <Text style={[styles.selectedKeyLabel, { color: theme.primary }]}>
              選択中: {selectedKey.label}
            </Text>
          ) : null}
        </>
      ) : null}

      {/* ── 貸出情報入力 ── */}
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
        style={[
          styles.mainActionButton,
          { backgroundColor: selectedKey ? theme.primary : theme.border },
        ]}
        onPress={handleCreateLoan}
        disabled={isSubmitting || !selectedKey}
      >
        <Text style={styles.mainActionButtonText}>
          {isSubmitting ? '登録中...' : selectedKey ? `「${selectedKey.label}」を貸出登録` : '鍵を選択してください'}
        </Text>
      </TouchableOpacity>

      {/* ── 貸出中一覧 ── */}
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

      {/* ── 返却済（施錠確認結果）── */}
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

      {/* ── 鍵予約（承認待ち）── */}
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

      {/* ── 鍵予約（対応済み）── */}
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
                {reservation.approved_at
                  ? new Date(reservation.approved_at).toLocaleString('ja-JP')
                  : '-'}
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
  /* 棟選択横スクロール */
  buildingScroll: {
    marginBottom: 2,
  },
  buildingScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  buildingPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  buildingPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  /* 鍵グリッド */
  keyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  keyCard: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 8,
    width: 100,
    minHeight: 64,
  },
  keyCardCode: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  keyCardName: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  selectedKeyLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 4,
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
