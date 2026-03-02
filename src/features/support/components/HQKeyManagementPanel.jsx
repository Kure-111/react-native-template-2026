/**
 * 本部向け鍵管理パネル
 * 貸出/返却は KeyLoanTerminalModal（全画面端末）で行う。
 * パネル自体は「端末を開く」ボタン、貸出中一覧、返却済一覧、予約管理を担当する。
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  listKeyLoans,
  returnKeyAndCreateLockTask,
} from '../../../services/supabase/keyLoanService';
import {
  KEY_RESERVATION_STATUSES,
  listKeyReservations,
  updateKeyReservationStatus,
} from '../../../services/supabase/keyReservationService';
import KeyStatusBoardModal from './KeyStatusBoardModal';
import KeyLoanTerminalModal from './KeyLoanTerminalModal';

/** 施錠確認結果の表示ラベル */
const LOCK_CHECK_STATUS_LABELS = {
  locked: '施錠済',
  unlocked: '未施錠',
  cannot_confirm: '確認不可',
};

/** 予約ステータスの表示ラベル */
const RESERVATION_STATUS_LABELS = {
  [KEY_RESERVATION_STATUSES.PENDING]: '承認待ち',
  [KEY_RESERVATION_STATUSES.APPROVED]: '承認済み',
  [KEY_RESERVATION_STATUSES.REJECTED]: '却下',
  [KEY_RESERVATION_STATUSES.CANCELED]: '取消',
};

const normalizeText = (value) => (value || '').trim();

/**
 * 鍵予約の鍵ラベルを表示用へ変換（コンポーネント外で定義して安定参照を確保）
 * @param {Object} reservation - 鍵予約オブジェクト
 * @returns {string} 表示用ラベル
 */
const getReservationKeyLabel = (reservation) => {
  const fromRelation = normalizeText(reservation?.keys?.display_name);
  if (fromRelation) return fromRelation;
  const fromMetadata = normalizeText(reservation?.metadata?.key_name);
  if (fromMetadata) return fromMetadata;
  return normalizeText(reservation?.key_code) || '鍵未設定';
};

/**
 * 検索バーコンポーネント
 * @param {Object} props
 * @param {string} props.value - 検索文字列
 * @param {(v: string) => void} props.onChange - 変更コールバック
 * @param {string} props.placeholder - プレースホルダーテキスト
 * @param {Object} props.theme - テーマオブジェクト
 * @returns {JSX.Element} 検索バー
 */
const SearchBar = ({ value, onChange, placeholder, theme }) => (
  <View
    style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.border }]}
  >
    <Text style={[styles.searchIcon, { color: theme.textSecondary }]}>🔍</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      style={[styles.searchInput, { color: theme.text }]}
      returnKeyType="search"
    />
    {value ? (
      <TouchableOpacity onPress={() => onChange('')}>
        <Text style={[styles.searchClearText, { color: theme.textSecondary }]}>✕</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

/**
 * @param {Object} props - プロパティ
 * @param {Object} props.theme - テーマ
 * @param {Object|null} props.user - ログインユーザー
 * @param {Function} [props.onLoanCreated] - 貸出登録後コールバック
 * @param {Function} [props.onLoanReturned] - 返却後コールバック
 * @returns {JSX.Element} 鍵管理パネル
 */
const HQKeyManagementPanel = ({ theme, user, onLoanCreated, onLoanReturned }) => {
  /** 貸出一覧（全ステータス含む） */
  const [keyLoans, setKeyLoans] = useState([]);
  /** 鍵予約一覧（全ステータス含む） */
  const [keyReservations, setKeyReservations] = useState([]);
  /** 貸出一覧読み込み中フラグ */
  const [isLoadingLoans, setIsLoadingLoans] = useState(false);
  /** 鍵予約読み込み中フラグ */
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  /** 処理中フラグ */
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** 全体表示ボードモーダルの表示フラグ */
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  /** 貸出/返却端末モーダルの表示フラグ */
  const [isTerminalVisible, setIsTerminalVisible] = useState(false);
  /** 貸出中一覧の検索文字列 */
  const [loanSearch, setLoanSearch] = useState('');
  /** 返却済一覧の検索文字列 */
  const [returnedSearch, setReturnedSearch] = useState('');
  /** 予約一覧の検索文字列（承認待ち・対応済み共通） */
  const [reservationSearch, setReservationSearch] = useState('');

  /**
   * メッセージ表示（Web/Native共通）
   * @param {string} title - タイトル
   * @param {string} message - 本文
   */
  const showMessage = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  /**
   * 貸出中一覧（検索フィルタ適用済み）
   * 鍵ラベル・借受人名・企画名で検索可能
   */
  const loanedKeyItems = useMemo(() => {
    const loaned = keyLoans.filter((loan) => loan.status === 'loaned');
    const query = normalizeText(loanSearch).toLowerCase();
    if (!query) return loaned;
    return loaned.filter(
      (loan) =>
        (loan.key_label || '').toLowerCase().includes(query) ||
        (loan.borrower_name || '').toLowerCase().includes(query) ||
        (loan.event_name || '').toLowerCase().includes(query)
    );
  }, [keyLoans, loanSearch]);

  /**
   * 返却済一覧（最新20件・検索フィルタ適用済み）
   * 鍵ラベル・借受人名・企画名で検索可能
   */
  const returnedKeyItems = useMemo(() => {
    const returned = keyLoans.filter((loan) => loan.status === 'returned').slice(0, 20);
    const query = normalizeText(returnedSearch).toLowerCase();
    if (!query) return returned;
    return returned.filter(
      (loan) =>
        (loan.key_label || '').toLowerCase().includes(query) ||
        (loan.borrower_name || '').toLowerCase().includes(query) ||
        (loan.event_name || '').toLowerCase().includes(query)
    );
  }, [keyLoans, returnedSearch]);

  /**
   * 承認待ち予約を申請者（event_name）単位でグループ化
   * 企画名・場所・鍵名で検索可能
   * @type {Array<{eventName: string, eventLocation: string, earliestCreatedAt: string, reservations: Array}>}
   */
  const groupedPendingReservations = useMemo(() => {
    const pending = keyReservations.filter(
      (r) => r.status === KEY_RESERVATION_STATUSES.PENDING
    );
    const query = normalizeText(reservationSearch).toLowerCase();
    /** 検索クエリで絞り込む */
    const filtered = query
      ? pending.filter(
          (r) =>
            (r.event_name || '').toLowerCase().includes(query) ||
            (r.event_location || '').toLowerCase().includes(query) ||
            getReservationKeyLabel(r).toLowerCase().includes(query)
        )
      : pending;

    /** event_name をキーとしてグループ化 */
    const groupMap = new Map();
    filtered.forEach((r) => {
      const groupKey = normalizeText(r.event_name) || '（企画名未設定）';
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          eventName: groupKey,
          eventLocation: normalizeText(r.event_location) || '-',
          earliestCreatedAt: r.created_at,
          reservations: [],
        });
      }
      const group = groupMap.get(groupKey);
      group.reservations.push(r);
      /** より古い申請日時をグループ代表日時とする */
      if (r.created_at < group.earliestCreatedAt) {
        group.earliestCreatedAt = r.created_at;
      }
    });
    return Array.from(groupMap.values());
  }, [keyReservations, reservationSearch]);

  /**
   * 対応済み予約（最新20件・予約検索バーと同一クエリ）
   */
  const recentResolvedReservations = useMemo(() => {
    const resolved = keyReservations
      .filter((r) => r.status !== KEY_RESERVATION_STATUSES.PENDING)
      .slice(0, 20);
    const query = normalizeText(reservationSearch).toLowerCase();
    if (!query) return resolved;
    return resolved.filter(
      (r) =>
        (r.event_name || '').toLowerCase().includes(query) ||
        getReservationKeyLabel(r).toLowerCase().includes(query)
    );
  }, [keyReservations, reservationSearch]);

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
   * 返却処理
   * - 'temporary'（一時返却）: 施錠確認依頼なしで即返却
   * - 'permanent'（もう借りない）: 返却後に施錠確認依頼の有無を選択可能
   * @param {string} loanId - 貸出ID
   * @param {'temporary'|'permanent'} returnType - 返却種別
   * @returns {Promise<void>} 実行処理
   */
  const handleReturnLoan = async (loanId, returnType) => {
    if (!user?.id) {
      showMessage('操作エラー', 'ログイン情報が取得できません');
      return;
    }

    /** 施錠確認タスクを作成するか（もう借りないの場合のみ選択可能） */
    let createLockTask = false;

    if (returnType === 'temporary') {
      /** 一時返却：施錠確認依頼なし（確認ダイアログのみ） */
      if (Platform.OS === 'web') {
        if (!window.confirm('一時返却を実行しますか？')) return;
      } else {
        const confirmed = await new Promise((resolve) => {
          Alert.alert('確認', '一時返却を実行しますか？', [
            { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
            { text: '実行', onPress: () => resolve(true) },
          ]);
        });
        if (!confirmed) return;
      }
      createLockTask = false;
    } else {
      /** もう借りない：施錠確認依頼の有無を選択 */
      if (Platform.OS === 'web') {
        /** Web: 2段階の confirm で選択 */
        if (!window.confirm('もう借りない（返却）を実行しますか？')) return;
        createLockTask = window.confirm('施錠確認タスクも作成しますか？');
      } else {
        /** Native: Alert の3択で選択 */
        const choice = await new Promise((resolve) => {
          Alert.alert('もう借りない（返却）', '返却方法を選んでください', [
            { text: 'キャンセル', style: 'cancel', onPress: () => resolve('cancel') },
            { text: '返却のみ', onPress: () => resolve('return') },
            { text: '返却+施錠確認', onPress: () => resolve('lockTask') },
          ]);
        });
        if (choice === 'cancel') return;
        createLockTask = choice === 'lockTask';
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
      createLockTask ? '返却を登録し、施錠確認タスクを作成しました' : '返却を登録しました'
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
    const actionLabel = status === 'approved' ? '承認' : '却下';
    if (Platform.OS === 'web') {
      if (!window.confirm(`鍵予約を「${actionLabel}」しますか？`)) return;
    } else {
      const confirmed = await new Promise((resolve) => {
        Alert.alert('確認', `鍵予約を「${actionLabel}」しますか？`, [
          { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
          { text: actionLabel, onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) return;
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
    loadKeyLoans();
    loadKeyReservations();
  }, []);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* ── ヘッダー ── */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>鍵貸出/返却（本部）</Text>
        <View style={styles.headerActions}>
          {/* 全体表示ボタン */}
          <TouchableOpacity
            style={[styles.boardButton, { backgroundColor: theme.primary }]}
            onPress={() => setIsBoardVisible(true)}
          >
            <Text style={styles.boardButtonText}>全体表示</Text>
          </TouchableOpacity>
          {/* 更新ボタン */}
          <TouchableOpacity
            style={[styles.refreshButton, { borderColor: theme.border }]}
            onPress={() => {
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

      {/* 鍵貸出/返却端末モーダル（全画面） */}
      <KeyLoanTerminalModal
        visible={isTerminalVisible}
        onClose={() => setIsTerminalVisible(false)}
        theme={theme}
        user={user}
        onLoanCreated={() => {
          loadKeyLoans();
          onLoanCreated?.();
        }}
        onLoanReturned={() => {
          loadKeyLoans();
          onLoanReturned?.();
        }}
      />

      {/* 端末を開くボタン */}
      <TouchableOpacity
        style={[styles.terminalButton, { backgroundColor: theme.primary }]}
        onPress={() => setIsTerminalVisible(true)}
      >
        <Text style={styles.terminalButtonText}>🔑 鍵貸出・返却端末を開く</Text>
      </TouchableOpacity>

      {/* ── 貸出中一覧 ── */}
      <Text style={[styles.subTitle, { color: theme.text }]}>
        貸出中（{keyLoans.filter((l) => l.status === 'loaned').length}件）
      </Text>
      <SearchBar
        value={loanSearch}
        onChange={setLoanSearch}
        placeholder="鍵・借受人・企画名で検索"
        theme={theme}
      />
      {isLoadingLoans ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
      ) : loanedKeyItems.length === 0 ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>
          {loanSearch ? '検索結果がありません' : '貸出中の鍵はありません'}
        </Text>
      ) : (
        <View style={styles.list}>
          {loanedKeyItems.map((loan) => (
            <View
              key={loan.id}
              style={[styles.listRow, { borderColor: theme.border, backgroundColor: theme.background }]}
            >
              <Text style={[styles.listTitle, { color: theme.text }]} numberOfLines={1}>
                {loan.key_label}
              </Text>
              <Text style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                {loan.borrower_name || '-'}
                {loan.event_name ? ` / ${loan.event_name}` : ''}
              </Text>
              <Text style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                貸出: {new Date(loan.loaned_at).toLocaleString('ja-JP')}
              </Text>
              {/* 返却ボタン：一時返却 / もう借りない（施錠確認を選択可） */}
              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={[styles.subActionButton, { borderColor: theme.border }]}
                  onPress={() => handleReturnLoan(loan.id, 'temporary')}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.subActionText, { color: theme.textSecondary }]}>
                    一時返却
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subActionButton, { borderColor: theme.border }]}
                  onPress={() => handleReturnLoan(loan.id, 'permanent')}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.subActionText, { color: theme.textSecondary }]}>
                    もう借りない
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── 返却済（施錠確認結果）── */}
      <Text style={[styles.subTitle, { color: theme.text }]}>
        返却済（{keyLoans.filter((l) => l.status === 'returned').length}件）
      </Text>
      <SearchBar
        value={returnedSearch}
        onChange={setReturnedSearch}
        placeholder="鍵・借受人・企画名で検索"
        theme={theme}
      />
      {returnedKeyItems.length === 0 ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>
          {returnedSearch ? '検索結果がありません' : '返却済データはまだありません'}
        </Text>
      ) : (
        <View style={styles.list}>
          {returnedKeyItems.map((loan) => (
            <View
              key={loan.id}
              style={[styles.listRow, { borderColor: theme.border, backgroundColor: theme.background }]}
            >
              <Text style={[styles.listTitle, { color: theme.text }]} numberOfLines={1}>
                {loan.key_label}
              </Text>
              <Text style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                {loan.borrower_name || '-'}
                {loan.event_name ? ` / ${loan.event_name}` : ''}
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
      <Text style={[styles.subTitle, { color: theme.text }]}>
        鍵予約（承認待ち）（{keyReservations.filter((r) => r.status === KEY_RESERVATION_STATUSES.PENDING).length}件）
      </Text>
      <SearchBar
        value={reservationSearch}
        onChange={setReservationSearch}
        placeholder="企画名・場所・鍵で検索"
        theme={theme}
      />
      {isLoadingReservations ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>読み込み中...</Text>
      ) : groupedPendingReservations.length === 0 ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>
          {reservationSearch ? '検索結果がありません' : '承認待ちの鍵予約はありません'}
        </Text>
      ) : (
        <View style={styles.list}>
          {groupedPendingReservations.map((group) => (
            <View
              key={group.eventName}
              style={[styles.groupRow, { borderColor: theme.border, backgroundColor: theme.background }]}
            >
              {/* グループヘッダー：企画/団体名 */}
              <Text style={[styles.listTitle, { color: theme.text }]} numberOfLines={1}>
                {group.eventName}
              </Text>
              <Text style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                場所: {group.eventLocation}
              </Text>
              <Text style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                申請日時: {new Date(group.earliestCreatedAt).toLocaleString('ja-JP')}
              </Text>
              {/* 鍵ごとのリスト（各鍵に承認・却下ボタン） */}
              <View style={[styles.groupKeyList, { borderTopColor: theme.border }]}>
                {group.reservations.map((reservation) => (
                  <View key={reservation.id} style={styles.groupKeyRow}>
                    <Text
                      style={[styles.groupKeyLabel, { color: theme.primary }]}
                      numberOfLines={1}
                    >
                      🔑 {getReservationKeyLabel(reservation)}
                    </Text>
                    <View style={styles.rowActions}>
                      <TouchableOpacity
                        style={[styles.subActionButton, { borderColor: theme.border }]}
                        onPress={() =>
                          handleReservationDecision(
                            reservation.id,
                            KEY_RESERVATION_STATUSES.APPROVED
                          )
                        }
                        disabled={isSubmitting}
                      >
                        <Text style={[styles.subActionText, { color: '#22A06B' }]}>承認</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.subActionButton, { borderColor: theme.border }]}
                        onPress={() =>
                          handleReservationDecision(
                            reservation.id,
                            KEY_RESERVATION_STATUSES.REJECTED
                          )
                        }
                        disabled={isSubmitting}
                      >
                        <Text style={[styles.subActionText, { color: '#D1242F' }]}>却下</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── 鍵予約（対応済み）── */}
      <Text style={[styles.subTitle, { color: theme.text }]}>鍵予約（対応済み）</Text>
      {recentResolvedReservations.length === 0 ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>
          {reservationSearch ? '検索結果がありません' : '対応済みデータはまだありません'}
        </Text>
      ) : (
        <View style={styles.list}>
          {recentResolvedReservations.map((reservation) => (
            <View
              key={reservation.id}
              style={[styles.listRow, { borderColor: theme.border, backgroundColor: theme.background }]}
            >
              <Text style={[styles.listTitle, { color: theme.text }]} numberOfLines={1}>
                {normalizeText(reservation.event_name) || '（企画名未設定）'}
              </Text>
              <Text style={[styles.listMeta, { color: theme.primary }]} numberOfLines={1}>
                申請鍵: {getReservationKeyLabel(reservation)}
              </Text>
              <Text style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                状態: {RESERVATION_STATUS_LABELS[reservation.status] || reservation.status}
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
  /** 端末を開くボタン（目立つ大きめデザイン） */
  terminalButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  terminalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  subTitle: {
    marginTop: 14,
    marginBottom: 4,
    fontSize: 14,
    fontWeight: '700',
  },
  /** 検索バー */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  searchClearText: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 4,
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
  /** グループ行（予約を申請者/企画単位でまとめる） */
  groupRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  groupKeyList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 10,
  },
  groupKeyRow: {
    gap: 4,
  },
  groupKeyLabel: {
    fontSize: 13,
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
