/**
 * 本部向け鍵管理パネル
 * 貸出/返却は KeyLoanTerminalModal（全画面端末）で行う。
 * パネル自体は「端末を開く」ボタン、貸出中一覧、返却済一覧、予約管理を担当する。
 *
 * ## デザイン方針（Design Skills）
 * 1. セクションヘッダーに件数バッジを付与し、一目で状況がわかるようにする
 * 2. 各セクションに検索バーを設け、即時フィルタリングを提供する
 * 3. カードは「鍵名（大）→ 借受人/企画（中）→ メタ情報（小）」の明確な情報階層を持つ
 * 4. 予約は「申請者/企画単位」でグループ化し、複数鍵の一括把握を可能にする
 * 5. アクションボタンは色分け：緑=承認/施錠確認、赤=却下、グレー=返却のみ
 * 6. バッジで状態を視覚化（施錠確認結果・予約ステータス）
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

/** 施錠確認結果のバッジ色 */
const LOCK_CHECK_STATUS_COLORS = {
  locked: '#22A06B',
  unlocked: '#D1242F',
  cannot_confirm: '#F59E0B',
};

/** 予約ステータスの表示ラベル */
const RESERVATION_STATUS_LABELS = {
  [KEY_RESERVATION_STATUSES.PENDING]: '承認待ち',
  [KEY_RESERVATION_STATUSES.APPROVED]: '承認済み',
  [KEY_RESERVATION_STATUSES.REJECTED]: '却下',
  [KEY_RESERVATION_STATUSES.CANCELED]: '取消',
};

/** 予約ステータスのバッジ色 */
const RESERVATION_STATUS_COLORS = {
  [KEY_RESERVATION_STATUSES.APPROVED]: '#22A06B',
  [KEY_RESERVATION_STATUSES.REJECTED]: '#D1242F',
  [KEY_RESERVATION_STATUSES.CANCELED]: '#888888',
};

/** テキスト正規化 */
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
 * 統一検索バーコンポーネント
 * @param {Object} props
 * @param {string} props.value - 検索文字列
 * @param {(v: string) => void} props.onChange - 変更コールバック
 * @param {string} props.placeholder - プレースホルダーテキスト
 * @param {Object} props.theme - テーマオブジェクト
 * @returns {JSX.Element} 検索バー
 */
const SearchBar = ({ value, onChange, placeholder, theme }) => (
  <View
    style={[
      styles.searchBar,
      { backgroundColor: theme.background, borderColor: theme.border },
    ]}
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
      <TouchableOpacity onPress={() => onChange('')} style={styles.searchClearButton}>
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
  /** 返却/承認処理中フラグ */
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
   * アラート表示（Web/Native共通）
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
   * 返却済一覧（最新50件・検索フィルタ適用済み）
   * 鍵ラベル・借受人名・企画名で検索可能
   */
  const returnedKeyItems = useMemo(() => {
    const returned = keyLoans.filter((loan) => loan.status === 'returned').slice(0, 50);
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
   * 対応済み予約（最新30件・予約検索バーと共通クエリ）
   */
  const resolvedReservations = useMemo(() => {
    const resolved = keyReservations
      .filter((r) => r.status !== KEY_RESERVATION_STATUSES.PENDING)
      .slice(0, 30);
    const query = normalizeText(reservationSearch).toLowerCase();
    if (!query) return resolved;
    return resolved.filter(
      (r) =>
        (r.event_name || '').toLowerCase().includes(query) ||
        getReservationKeyLabel(r).toLowerCase().includes(query)
    );
  }, [keyReservations, reservationSearch]);

  /** 承認待ち件数（ヘッダーバッジ用） */
  const pendingCount = useMemo(() => {
    return keyReservations.filter((r) => r.status === KEY_RESERVATION_STATUSES.PENDING).length;
  }, [keyReservations]);

  /** 貸出中の実件数（バッジ表示用） */
  const loanedCount = useMemo(() => {
    return keyLoans.filter((l) => l.status === 'loaned').length;
  }, [keyLoans]);

  /** 返却済みの実件数（バッジ表示用） */
  const returnedCount = useMemo(() => {
    return keyLoans.filter((l) => l.status === 'returned').length;
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
   * @param {string} loanId - 貸出ID
   * @param {boolean} createLockTask - 施錠確認タスクを作るか
   * @returns {Promise<void>} 実行処理
   */
  const handleReturnLoan = async (loanId, createLockTask) => {
    if (!user?.id) {
      showMessage('操作エラー', 'ログイン情報が取得できません');
      return;
    }
    const actionLabel = createLockTask ? '返却＋施錠確認依頼' : '返却のみ';
    if (Platform.OS === 'web') {
      if (!window.confirm(`鍵の${actionLabel}を実行しますか？`)) return;
    } else {
      const confirmed = await new Promise((resolve) => {
        Alert.alert('確認', `鍵の${actionLabel}を実行しますか？`, [
          { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
          { text: '実行', onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) return;
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
          <TouchableOpacity
            style={[styles.boardButton, { backgroundColor: theme.primary }]}
            onPress={() => setIsBoardVisible(true)}
          >
            <Text style={styles.boardButtonText}>全体表示</Text>
          </TouchableOpacity>
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

      {/* ══════════════════════════════════════════
          貸出中セクション
      ══════════════════════════════════════════ */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={[styles.subTitle, { color: theme.text }]}>貸出中</Text>
          <View
            style={[
              styles.countBadge,
              { backgroundColor: loanedCount > 0 ? theme.primary : theme.border },
            ]}
          >
            <Text
              style={[
                styles.countBadgeText,
                { color: loanedCount > 0 ? '#FFF' : theme.textSecondary },
              ]}
            >
              {loanedCount}
            </Text>
          </View>
        </View>
      </View>
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
              style={[styles.loanCard, { borderColor: theme.border, backgroundColor: theme.background }]}
            >
              {/* 鍵名を大きく表示 */}
              <Text style={[styles.keyLabel, { color: theme.text }]} numberOfLines={1}>
                🔑 {loan.key_label || '鍵未設定'}
              </Text>
              {/* 借受人・企画名を横並びに */}
              <View style={styles.infoRow}>
                <Text style={[styles.borrowerName, { color: theme.text }]} numberOfLines={1}>
                  {loan.borrower_name || '-'}
                </Text>
                {loan.event_name ? (
                  <Text style={[styles.orgName, { color: theme.textSecondary }]} numberOfLines={1}>
                    ／ {loan.event_name}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                貸出: {new Date(loan.loaned_at).toLocaleString('ja-JP')}
              </Text>
              {/* 返却アクション */}
              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={[styles.returnOnlyButton, { borderColor: theme.border }]}
                  onPress={() => handleReturnLoan(loan.id, false)}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.returnOnlyButtonText, { color: theme.textSecondary }]}>
                    返却のみ
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.returnLockButton}
                  onPress={() => handleReturnLoan(loan.id, true)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.returnLockButtonText}>返却+施錠確認</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ══════════════════════════════════════════
          返却済みセクション
      ══════════════════════════════════════════ */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={[styles.subTitle, { color: theme.text }]}>返却済み</Text>
          <View style={[styles.countBadge, { backgroundColor: theme.border }]}>
            <Text style={[styles.countBadgeText, { color: theme.textSecondary }]}>
              {returnedCount}
            </Text>
          </View>
        </View>
      </View>
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
          {returnedKeyItems.map((loan) => {
            /** 施錠確認ステータスに対応した色とラベルを決定 */
            const lockColor =
              LOCK_CHECK_STATUS_COLORS[loan.lock_check_status] || theme.textSecondary;
            const lockLabel =
              LOCK_CHECK_STATUS_LABELS[loan.lock_check_status] || '未確認';
            return (
              <View
                key={loan.id}
                style={[
                  styles.returnedCard,
                  { borderColor: theme.border, backgroundColor: theme.background },
                ]}
              >
                <View style={styles.returnedCardHeader}>
                  <Text style={[styles.keyLabel, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                    🔑 {loan.key_label || '鍵未設定'}
                  </Text>
                  {/* 施錠確認結果バッジ */}
                  <View style={[styles.lockBadge, { borderColor: lockColor }]}>
                    <Text style={[styles.lockBadgeText, { color: lockColor }]}>{lockLabel}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.borrowerName, { color: theme.text }]} numberOfLines={1}>
                    {loan.borrower_name || '-'}
                  </Text>
                  {loan.event_name ? (
                    <Text style={[styles.orgName, { color: theme.textSecondary }]} numberOfLines={1}>
                      ／ {loan.event_name}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                  返却: {loan.returned_at ? new Date(loan.returned_at).toLocaleString('ja-JP') : '-'}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ══════════════════════════════════════════
          鍵予約（承認待ち）セクション
          → 申請者/企画単位にグループ化して表示
      ══════════════════════════════════════════ */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={[styles.subTitle, { color: theme.text }]}>鍵予約（承認待ち）</Text>
          {pendingCount > 0 ? (
            <View style={[styles.countBadge, { backgroundColor: '#D1242F' }]}>
              <Text style={styles.countBadgeText}>{pendingCount}</Text>
            </View>
          ) : (
            <View style={[styles.countBadge, { backgroundColor: theme.border }]}>
              <Text style={[styles.countBadgeText, { color: theme.textSecondary }]}>0</Text>
            </View>
          )}
        </View>
      </View>
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
              style={[
                styles.groupCard,
                { borderColor: theme.primary + '66', backgroundColor: theme.background },
              ]}
            >
              {/* グループヘッダー：企画/団体名と件数バッジ */}
              <View style={styles.groupCardHeader}>
                <Text style={[styles.groupEventName, { color: theme.text }]} numberOfLines={2}>
                  📋 {group.eventName}
                </Text>
                <View style={[styles.countBadge, { backgroundColor: theme.primary + '33' }]}>
                  <Text style={[styles.countBadgeText, { color: theme.primary }]}>
                    {group.reservations.length}件
                  </Text>
                </View>
              </View>
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                📍 {group.eventLocation}
              </Text>
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                申請日時: {new Date(group.earliestCreatedAt).toLocaleString('ja-JP')}
              </Text>

              {/* 区切り線 */}
              <View style={[styles.groupDivider, { borderColor: theme.border }]} />

              {/* 鍵ごとのリスト（各鍵に承認・却下ボタン） */}
              <View style={styles.groupKeyList}>
                {group.reservations.map((reservation) => (
                  <View key={reservation.id} style={styles.groupKeyRow}>
                    <Text
                      style={[styles.groupKeyLabel, { color: theme.primary }]}
                      numberOfLines={1}
                    >
                      🔑 {getReservationKeyLabel(reservation)}
                    </Text>
                    <View style={styles.groupKeyActions}>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() =>
                          handleReservationDecision(
                            reservation.id,
                            KEY_RESERVATION_STATUSES.APPROVED
                          )
                        }
                        disabled={isSubmitting}
                      >
                        <Text style={styles.approveButtonText}>承認</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() =>
                          handleReservationDecision(
                            reservation.id,
                            KEY_RESERVATION_STATUSES.REJECTED
                          )
                        }
                        disabled={isSubmitting}
                      >
                        <Text style={styles.rejectButtonText}>却下</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ══════════════════════════════════════════
          鍵予約（対応済み）セクション
          → 予約検索バーと同じクエリでフィルタリング
      ══════════════════════════════════════════ */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={[styles.subTitle, { color: theme.text }]}>鍵予約（対応済み）</Text>
        </View>
      </View>
      {resolvedReservations.length === 0 ? (
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>
          {reservationSearch ? '検索結果がありません' : '対応済みデータはまだありません'}
        </Text>
      ) : (
        <View style={styles.list}>
          {resolvedReservations.map((reservation) => {
            /** ステータスに応じたバッジ色 */
            const statusColor =
              RESERVATION_STATUS_COLORS[reservation.status] || theme.textSecondary;
            return (
              <View
                key={reservation.id}
                style={[
                  styles.resolvedCard,
                  { borderColor: theme.border, backgroundColor: theme.background },
                ]}
              >
                <View style={styles.resolvedCardHeader}>
                  <Text
                    style={[styles.resolvedEventName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {normalizeText(reservation.event_name) || '（企画名未設定）'}
                  </Text>
                  {/* ステータスバッジ */}
                  <View style={[styles.statusBadge, { borderColor: statusColor }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                      {RESERVATION_STATUS_LABELS[reservation.status] || reservation.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.resolvedKeyLabel, { color: theme.primary }]} numberOfLines={1}>
                  🔑 {getReservationKeyLabel(reservation)}
                </Text>
                <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                  対応:{' '}
                  {reservation.approved_at
                    ? new Date(reservation.approved_at).toLocaleString('ja-JP')
                    : '-'}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  /** 外枠カード */
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  /** ヘッダー行 */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  /** 端末を開くボタン（大型・目立つデザイン） */
  terminalButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 4,
  },
  terminalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  /** セクションヘッダー行（サブタイトル + 件数バッジ） */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  /** 件数バッジ（ピル型） */
  countBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  searchClearButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  searchClearText: {
    fontSize: 12,
    fontWeight: '700',
  },
  /** 一覧コンテナ */
  list: {
    gap: 8,
  },
  /** 共通：鍵名ラベル（大きめ） */
  keyLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  /** 共通：借受人名+企画名を横並び */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  borrowerName: {
    fontSize: 13,
    fontWeight: '600',
  },
  orgName: {
    fontSize: 13,
    flexShrink: 1,
  },
  /** 共通：メタ情報テキスト（小） */
  metaText: {
    fontSize: 11,
    lineHeight: 16,
  },
  /** 共通：アクションボタン行 */
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  /** 貸出中カード */
  loanCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  returnOnlyButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  returnOnlyButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  /** 返却+施錠確認ボタン（緑枠・緑テキストで強調） */
  returnLockButton: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderColor: '#22A06B',
  },
  returnLockButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22A06B',
  },
  /** 返却済みカード */
  returnedCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  returnedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  /** 施錠確認結果バッジ（色が動的に変わる） */
  lockBadge: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  /** グループカード（予約を申請者/企画単位でまとめる） */
  groupCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  groupCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  groupEventName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    lineHeight: 20,
  },
  /** グループ内の区切り線 */
  groupDivider: {
    borderTopWidth: 1,
    marginTop: 4,
    marginBottom: 2,
  },
  groupKeyList: {
    gap: 8,
  },
  groupKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  groupKeyLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  groupKeyActions: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  /** 承認ボタン（緑塗りつぶし） */
  approveButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#22A06B',
  },
  approveButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  /** 却下ボタン（赤塗りつぶし） */
  rejectButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#D1242F',
  },
  rejectButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  /** 対応済みカード */
  resolvedCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  resolvedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resolvedEventName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  resolvedKeyLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  /** ステータスバッジ（対応済み・色が動的に変わる） */
  statusBadge: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
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
