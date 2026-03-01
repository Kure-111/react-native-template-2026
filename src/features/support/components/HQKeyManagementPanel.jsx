/**
 * 本部向け鍵管理パネル
 * 貸出/返却は KeyLoanTerminalModal（全画面端末）で行う。
 * パネル自体は「端末を開く」ボタン、貸出中一覧、返却済一覧、予約管理を担当する。
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
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
 * @param {Object} props - プロパティ
 * @param {Object} props.theme - テーマ
 * @param {Object|null} props.user - ログインユーザー
 * @param {Function} [props.onLoanCreated] - 貸出登録後コールバック
 * @param {Function} [props.onLoanReturned] - 返却後コールバック
 * @returns {JSX.Element} 鍵管理パネル
 */
const HQKeyManagementPanel = ({ theme, user, onLoanCreated, onLoanReturned }) => {
  /** 貸出一覧 */
  const [keyLoans, setKeyLoans] = useState([]);
  /** 鍵予約一覧 */
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
    marginBottom: 6,
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
