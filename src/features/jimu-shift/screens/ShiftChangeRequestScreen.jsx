/**
 * シフト変更申請画面
 * 祭実長・部長が自団体のシフトをグリッド表示し、
 * セル操作でシフト変更を事務部に申請します
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../../shared/contexts/AuthContext.js';
import { useTheme } from '../../../shared/hooks/useTheme';
import { fetchShiftData } from '../../../services/gas/gasApi.js';
import {
  formatDateToSheetName,
  getOrganizationGridData,
} from '../services/shiftService.js';
import { getFestivalStartDate } from '../constants.js';
import ShiftGrid from '../components/ShiftGrid.jsx';
import ShiftChangeRequestModal from '../components/ShiftChangeRequestModal.jsx';
import useShiftChangeRequest from '../hooks/useShiftChangeRequest.js';

/** 団体判定から除外する職位ロール名（部名ロールは含めない） */
const SPECIAL_ROLE_NAMES = ['祭実長', '部長', '管理者', '実長', '副実', '企画者'];

/**
 * シフト変更申請画面コンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Date} props.selectedDate - 選択中の日付（親コンポーネントで保持）
 * @param {Function} props.onDateChange - 日付変更コールバック
 * @param {number} props.refreshTrigger - リロードトリガー（インクリメントで再取得を実行）
 * @returns {JSX.Element} シフト変更申請画面
 */
const ShiftChangeRequestScreen = ({ selectedDate, onDateChange, refreshTrigger }) => {
  /** 認証コンテキストからユーザー情報を取得 */
  const { userInfo, user } = useAuth();
  /** テーマを取得 */
  const { theme } = useTheme();

  /** 祭り開催期間 */
  const festivalStartDate = useMemo(() => getFestivalStartDate(), []);
  /** グリッドデータ */
  const [gridDataList, setGridDataList] = useState([]);
  /** ローディング状態 */
  const [isLoading, setIsLoading] = useState(false);
  /** エラーメッセージ */
  const [loadErrorMessage, setLoadErrorMessage] = useState('');

  /** シフト変更申請フック */
  const {
    selectedSource,
    selectedDestination,
    isModalVisible,
    isSubmitting,
    guideMessage,
    note,
    setNote,
    successMessage,
    errorMessage,
    handleCellPress,
    resetSelection,
    submitRequest,
    cancelModal,
  } = useShiftChangeRequest();

  /**
   * ユーザーの団体ロール名リストを取得
   * 祭実長・部長等の特別ロール以外のロール名を団体名として扱う
   * @returns {Array<string>} 団体名リスト
   */
  const getUserOrganizations = useCallback(() => {
    if (!userInfo || !userInfo.roles) {
      return [];
    }

    return userInfo.roles
      .map((role) => role.name)
      .filter((name) => !SPECIAL_ROLE_NAMES.includes(name));
  }, [userInfo]);

  /**
   * グリッドデータを読み込む
   */
  const loadGridData = useCallback(async () => {
    if (!userInfo) {
      return;
    }

    setIsLoading(true);
    setLoadErrorMessage('');
    resetSelection();

    try {
      /** シート名形式の日付 */
      const sheetName = formatDateToSheetName(selectedDate);
      /** GAS APIからシフトデータを取得 */
      const shiftData = await fetchShiftData(sheetName);
      /** ユーザーの所属団体名リスト */
      const organizations = getUserOrganizations();
      /** グリッドデータを生成 */
      const data = getOrganizationGridData(shiftData, organizations);
      setGridDataList(data);
    } catch (error) {
      console.error('シフトデータの取得に失敗:', error);
      setLoadErrorMessage('シフトデータの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, userInfo, getUserOrganizations, resetSelection, refreshTrigger]);

  /**
   * 日付またはユーザー情報が変更されたらデータを再読み込み
   */
  useEffect(() => {
    loadGridData();
  }, [loadGridData]);

  /**
   * 日付を1日進める
   */
  const goToNextDay = () => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    onDateChange(nextDate);
  };

  /**
   * 日付を1日戻す
   */
  const goToPreviousDay = () => {
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    onDateChange(prevDate);
  };

  /**
   * 今日の日付にジャンプ
   */
  const goToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    onDateChange(today);
  };

  /**
   * 祭り期間（開始日）にジャンプ
   */
  const goToFestival = () => {
    onDateChange(new Date(festivalStartDate));
  };

  /**
   * 表示用日付文字列を生成
   * @returns {string} 日付文字列（例: "11月3日（月）"）
   */
  const getDisplayDate = () => {
    /** 曜日の配列 */
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    /** 年 */
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    const day = selectedDate.getDate();
    const dayOfWeek = dayNames[selectedDate.getDay()];
    return `${year}年${month}月${day}日（${dayOfWeek}）`;
  };

  /**
   * 申請送信処理
   */
  const handleSubmit = useCallback(async () => {
    if (!user?.id || gridDataList.length === 0) {
      return;
    }

    /** 最初のグリッドデータの団体名を使用 */
    const organizationName = gridDataList[0].organizationName;
    await submitRequest(user.id, organizationName, selectedDate);
  }, [user?.id, gridDataList, selectedDate, submitRequest]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* 日付選択 */}
      <View style={[styles.dateSelector, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TouchableOpacity
          style={styles.dateArrowButton}
          onPress={goToPreviousDay}
        >
          <Text style={[styles.dateArrowText, { color: theme.primary }]}>◀</Text>
        </TouchableOpacity>

        <View style={styles.dateDisplay}>
          <Text style={[styles.dateText, { color: theme.text }]}>{getDisplayDate()}</Text>
        </View>

        <TouchableOpacity
          style={styles.dateArrowButton}
          onPress={goToNextDay}
        >
          <Text style={[styles.dateArrowText, { color: theme.primary }]}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* ジャンプボタン */}
      <View style={styles.jumpButtonRow}>
        <TouchableOpacity
          style={[styles.jumpButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={goToToday}
        >
          <Text style={[styles.jumpButtonText, { color: theme.primary }]}>今日にジャンプ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.jumpButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={goToFestival}
        >
          <Text style={[styles.jumpButtonText, { color: theme.primary }]}>祭期間にジャンプ</Text>
        </TouchableOpacity>
      </View>

      {/* 操作ガイド */}
      <View style={[styles.guideContainer, { backgroundColor: theme.surface, borderLeftColor: theme.primary }]}>
        <Text style={[styles.guideIcon, { color: theme.primary }]}>ℹ</Text>
        <Text style={[styles.guideText, { color: theme.text }]}>{guideMessage}</Text>
        {selectedSource && (
          <TouchableOpacity onPress={resetSelection} style={styles.resetButton}>
            <Text style={[styles.resetButtonText, { color: theme.error }]}>リセット</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 成功メッセージ */}
      {successMessage !== '' && (
        <View style={[styles.messageContainer, styles.successContainer]}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}

      {/* エラーメッセージ */}
      {errorMessage !== '' && (
        <View style={[styles.messageContainer, styles.errorContainer]}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* ローディング */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>読み込み中...</Text>
        </View>
      )}

      {/* データ取得エラー */}
      {!isLoading && loadErrorMessage !== '' && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.error }]}>{loadErrorMessage}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={loadGridData}
          >
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* データなし */}
      {!isLoading && loadErrorMessage === '' && gridDataList.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            この日のシフトデータが見つかりません
          </Text>
        </View>
      )}

      {/* シフトグリッド */}
      {!isLoading && gridDataList.map((gridData) => (
        <ShiftGrid
          key={gridData.organizationName}
          gridData={gridData}
          selectedSource={selectedSource}
          selectedDestination={selectedDestination}
          onCellPress={handleCellPress}
          theme={theme}
        />
      ))}

      {/* 確認モーダル */}
      <ShiftChangeRequestModal
        visible={isModalVisible}
        source={selectedSource}
        destination={selectedDestination}
        displayDate={getDisplayDate()}
        isSubmitting={isSubmitting}
        note={note}
        onNoteChange={setNote}
        onSubmit={handleSubmit}
        onCancel={cancelModal}
        theme={theme}
      />
    </ScrollView>
  );
};

/**
 * スタイル定義
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  /* 日付選択 */
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateArrowButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  dateArrowText: {
    fontSize: 16,
  },
  dateDisplay: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginHorizontal: 12,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
  },
  /* 操作ガイド */
  guideContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderRadius: 4,
    marginBottom: 12,
    gap: 8,
  },
  guideIcon: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },
  guideText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  resetButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(198, 40, 40, 0.1)',
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  /* メッセージ */
  messageContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  successContainer: {
    backgroundColor: '#E8F5E9',
  },
  successText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
  },
  /* ローディング */
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  /* データなし */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
  },
  /* ジャンプボタン */
  jumpButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  jumpButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  jumpButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  /* 再試行 */
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default ShiftChangeRequestScreen;
