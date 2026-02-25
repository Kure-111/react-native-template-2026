/**
 * シフト変更申請一覧画面（事務部向け）
 * 全ての申請をリスト表示し、対応モーダルから承認・却下を行います
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  selectAllShiftChangeRequests,
  completeShiftChangeRequest,
  rejectShiftChangeRequest,
} from '../services/shiftChangeService';
import ShiftChangeResponseModal from '../components/ShiftChangeResponseModal';

/**
 * ステータスラベル・色の設定を返す
 * @param {string} status - 申請ステータス
 * @returns {{ label: string, backgroundColor: string }} 表示設定
 */
const getStatusConfig = (status) => {
  switch (status) {
    case 'completed':
      return { label: '完了', backgroundColor: '#4CAF50' };
    case 'rejected':
      return { label: '却下', backgroundColor: '#F44336' };
    default:
      return { label: '未対応', backgroundColor: '#FF9800' };
  }
};

/**
 * シフト変更申請一覧画面コンポーネント（事務部向け）
 * @param {Object} props - コンポーネントプロパティ
 * @param {Function} [props.onRequestProcessed] - 承認・却下後に呼ばれるコールバック
 * @param {number} [props.refreshTrigger] - 親からの強制リロードトリガー（値が変わるたびにリロード）
 * @returns {JSX.Element} 申請一覧
 */
const ShiftChangeRequestListScreen = ({ onRequestProcessed, refreshTrigger }) => {
  /** テーマ */
  const { theme } = useTheme();
  /** 認証コンテキスト */
  const { user } = useAuth();
  /** 申請一覧 */
  const [requests, setRequests] = useState([]);
  /** ローディング状態 */
  const [isLoading, setIsLoading] = useState(false);
  /** エラーメッセージ */
  const [errorMessage, setErrorMessage] = useState('');
  /** 対応モーダルに表示する申請 */
  const [selectedRequest, setSelectedRequest] = useState(null);
  /** 対応モーダルの表示状態 */
  const [isResponseModalVisible, setIsResponseModalVisible] = useState(false);
  /** 対応処理のエラーメッセージ */
  const [processErrorMessage, setProcessErrorMessage] = useState('');
  /** 対応処理中かどうか */
  const [isProcessing, setIsProcessing] = useState(false);
  /** フィルター（'all' | 'pending' | 'responded'） */
  const [filter, setFilter] = useState('pending');

  /**
   * 申請一覧を読み込む
   */
  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    const { requests: fetchedRequests, error } = await selectAllShiftChangeRequests();

    if (error) {
      setErrorMessage('申請一覧の取得に失敗しました');
      setIsLoading(false);
      return;
    }

    setRequests(fetchedRequests);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  /**
   * 親からのリロードトリガーが変化したら申請一覧を再取得する
   * 通知画面から「申請を見る」で遷移してきた時などに使用
   */
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadRequests();
    }
  }, [refreshTrigger, loadRequests]);

  /**
   * 申請カードをタップした時の処理（対応モーダルを開く）
   * @param {Object} request - 申請データ
   */
  const handlePressRequest = useCallback((request) => {
    setSelectedRequest(request);
    setIsResponseModalVisible(true);
  }, []);

  /**
   * 対応モーダルを閉じる
   */
  const handleCloseModal = useCallback(() => {
    setIsResponseModalVisible(false);
    setSelectedRequest(null);
    setProcessErrorMessage('');
  }, []);

  /**
   * 承認処理
   * @param {string} responderNote - 対応備考
   */
  const handleComplete = useCallback(async (responderNote) => {
    if (!selectedRequest || !user?.id) {
      return;
    }

    setIsProcessing(true);
    setProcessErrorMessage('');

    const { success, error } = await completeShiftChangeRequest(
      selectedRequest.id,
      user.id,
      responderNote,
    );

    setIsProcessing(false);

    if (error) {
      setProcessErrorMessage(error.message || '承認処理に失敗しました');
      return;
    }

    if (success) {
      handleCloseModal();
      loadRequests();
      onRequestProcessed?.();
    }
  }, [selectedRequest, user?.id, handleCloseModal, loadRequests, onRequestProcessed]);

  /**
   * 却下処理
   * @param {string} responderNote - 却下理由・備考
   */
  const handleReject = useCallback(async (responderNote) => {
    if (!selectedRequest || !user?.id) {
      return;
    }

    setIsProcessing(true);
    setProcessErrorMessage('');

    const { success, error } = await rejectShiftChangeRequest(
      selectedRequest.id,
      user.id,
      responderNote,
    );

    setIsProcessing(false);

    if (error) {
      setProcessErrorMessage(error.message || '却下処理に失敗しました');
      return;
    }

    if (success) {
      handleCloseModal();
      loadRequests();
      onRequestProcessed?.();
    }
  }, [selectedRequest, user?.id, handleCloseModal, loadRequests, onRequestProcessed]);

  /**
   * フィルター適用済み申請一覧
   */
  const filteredRequests = requests.filter((req) => {
    if (filter === 'pending') {
      return req.status === 'pending';
    }
    if (filter === 'responded') {
      return req.status !== 'pending';
    }
    return true;
  });

  /**
   * 申請カードを描画
   * @param {Object} param - FlatListのrenderItem引数
   * @returns {JSX.Element} 申請カード
   */
  const renderItem = ({ item }) => {
    /** ステータス表示設定 */
    const statusConfig = getStatusConfig(item.status);
    /** 救援申請かどうかの判定（交代先メンバーなし） */
    const isRescue = !item.destination_member_name;
    /** 交換かどうかの判定（救援申請は常にfalse） */
    const isSwap = !isRescue && !!item.destination_area_name;
    /** 日付の表示用文字列 */
    const displayDate = item.shift_date
      ? new Date(item.shift_date + 'T00:00:00').toLocaleDateString('ja-JP', {
          month: 'short',
          day: 'numeric',
          weekday: 'short',
        })
      : '';
    /** 申請日時の表示用文字列 */
    const createdText = item.created_at
      ? new Date(item.created_at).toLocaleString('ja-JP', {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: isRescue ? '#FF9800' : (item.status === 'pending' ? theme.primary : theme.border),
            borderWidth: isRescue ? 2 : 1.5,
          },
        ]}
        onPress={() => handlePressRequest(item)}
        activeOpacity={0.8}
      >
        {/* カードヘッダー */}
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.backgroundColor }]}>
            <Text style={styles.statusText}>{statusConfig.label}</Text>
          </View>
          <Text style={[styles.orgName, { color: theme.text }]}>{item.organization_name}</Text>
          <Text style={[styles.shiftDate, { color: theme.textSecondary }]}>{displayDate}</Text>
        </View>

        {/* 申請内容プレビュー */}
        <View style={styles.changePreview}>
          {isRescue ? (
            <View style={styles.rescueTypeBadge}>
              <Text style={styles.rescueTypeBadgeText}>救援要請</Text>
            </View>
          ) : (
            <Text style={[styles.changeTypeLabel, { color: theme.textSecondary }]}>
              {isSwap ? '交換' : '移動'}
            </Text>
          )}
          <Text
            style={[styles.changeDetail, isRescue ? styles.rescueDetailText : { color: theme.text }]}
            numberOfLines={2}
          >
            {item.source_member_name}（{item.source_time_slot} {item.source_area_name}）
            {isRescue
              ? ' → 交代者なし'
              : isSwap
                ? ` ↔ ${item.destination_member_name}（${item.destination_time_slot} ${item.destination_area_name}）`
                : ` → ${item.destination_member_name}（${item.destination_time_slot} シフトなし）`}
          </Text>
        </View>

        {/* 申請者備考 */}
        {item.requester_note ? (
          <Text style={[styles.requesterNote, { color: theme.textSecondary }]} numberOfLines={1}>
            備考: {item.requester_note}
          </Text>
        ) : null}

        {/* 申請日時 */}
        <Text style={[styles.createdAt, { color: theme.textSecondary }]}>
          申請: {createdText}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* フィルタータブ */}
      <View style={[styles.filterBar, { borderBottomColor: theme.border }]}>
        {[
          { key: 'pending', label: '未対応' },
          { key: 'responded', label: '対応済み' },
          { key: 'all', label: '全て' },
        ].map((option) => {
          /** 選択中かどうか */
          const isActive = filter === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterTab,
                isActive && [styles.filterTabActive, { borderBottomColor: theme.primary }],
              ]}
              onPress={() => setFilter(option.key)}
            >
              <Text style={[
                styles.filterTabText,
                { color: isActive ? theme.primary : theme.textSecondary },
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* エラーメッセージ */}
      {errorMessage !== '' && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.error }]}>{errorMessage}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={loadRequests}
          >
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 申請一覧 */}
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={filteredRequests.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          isLoading ? null : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {filter === 'pending' ? '未対応の申請はありません' : '申請はありません'}
            </Text>
          )
        }
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadRequests} />
        }
      />

      {/* 対応モーダル */}
      <ShiftChangeResponseModal
        visible={isResponseModalVisible}
        request={selectedRequest}
        isProcessing={isProcessing}
        processError={processErrorMessage}
        onComplete={handleComplete}
        onReject={handleReject}
        onClose={handleCloseModal}
        theme={theme}
      />
    </View>
  );
};

/**
 * スタイル定義
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  /* フィルタータブ */
  filterBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomWidth: 2,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  /* エラー */
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  /* 申請カード */
  card: {
    marginHorizontal: 12,
    marginTop: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  orgName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  shiftDate: {
    fontSize: 13,
  },
  /* 変更プレビュー */
  changePreview: {
    marginBottom: 6,
  },
  changeTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  changeDetail: {
    fontSize: 13,
    lineHeight: 18,
  },
  /* 救援要請バッジ */
  rescueTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D32F2F',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  rescueTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  /* 救援要請の詳細テキスト（通常の文字色） */
  rescueDetailText: {
    fontWeight: '500',
  },
  /* 申請者備考 */
  requesterNote: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  /* 申請日時 */
  createdAt: {
    fontSize: 11,
    marginTop: 6,
  },
  /* 空リスト */
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
  },
});

export default ShiftChangeRequestListScreen;
