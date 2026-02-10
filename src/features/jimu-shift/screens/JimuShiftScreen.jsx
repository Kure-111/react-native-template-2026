/**
 * 当日部員シフト確認画面
 * ログインユーザーのシフトをパーソナライズして表示します
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import { useAuth } from '../../../shared/contexts/AuthContext.js';
import { useTheme } from '../../../shared/hooks/useTheme';
import { getSupabaseClient } from '../../../services/supabase/client.js';
import { getUnreadCount, subscribeNotificationUpdates } from '../../../shared/services/notificationService';
import { fetchShiftData } from '../../../services/gas/gasApi.js';
import {
  getUserShifts,
  formatDateToSheetName,
  hexToRgba,
} from '../services/shiftService.js';
import {
  getFestivalStartDate,
  getFestivalEndDate,
  AREA_IMAGE_MAP,
} from '../constants.js';

/** ブレークポイント（スマホ/PC切り替え） */
const MOBILE_BREAKPOINT = 768;

/** 画面名 */
const SCREEN_NAME = '当日部員';

/**
 * 事務シフト確認画面コンポーネント（当日部員）
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.navigation - React Navigationのnavigationオブジェクト
 * @returns {JSX.Element} シフト確認画面
 */
const JimuShiftScreen = ({ navigation }) => {
  /** 画面サイズ取得 */
  const { width } = useWindowDimensions();
  /** モバイル判定 */
  const isMobile = width < MOBILE_BREAKPOINT;
  /** 認証コンテキストからユーザー情報を取得 */
  const { userInfo } = useAuth();
  /** テーマを取得 */
  const { theme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const previousUnreadCountRef = useRef(0);
  const subscriptionRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioUnlockedRef = useRef(false);

  /** 祭り開催期間 */
  const festivalStartDate = useMemo(() => getFestivalStartDate(), []);
  const festivalEndDate = useMemo(() => getFestivalEndDate(), []);

  /**
   * 今日が祭り期間内なら今日、そうでなければ開始日を初期値にする
   * @returns {Date} 初期選択日
   */
  const getInitialDate = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today >= festivalStartDate && today <= festivalEndDate) {
      return today;
    }
    return new Date(festivalStartDate);
  }, [festivalStartDate, festivalEndDate]);

  /** 選択中の日付 */
  const [selectedDate, setSelectedDate] = useState(getInitialDate);
  /** シフトデータ */
  const [shifts, setShifts] = useState([]);
  /** ローディング状態 */
  const [isLoading, setIsLoading] = useState(false);
  /** エラーメッセージ */
  const [errorMessage, setErrorMessage] = useState('');
  /** 画像モーダルの表示状態 */
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  /** 選択されたエリア名 */
  const [selectedAreaName, setSelectedAreaName] = useState('');

  /**
   * ユーザーの所属団体リストを取得
   * rolesからロール名を団体名として使用する
   * @returns {Array<string>} 所属団体名リスト
   */
  const getUserOrganizations = useCallback(() => {
    if (!userInfo || !userInfo.roles) {
      return [];
    }

    // ロール名を団体名として返す
    return userInfo.roles.map((role) => role.name);
  }, [userInfo]);

  /**
   * シフトデータを読み込む
   */
  const loadShifts = useCallback(async () => {
    if (!userInfo) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // 日付をシート名形式に変換
      const sheetName = formatDateToSheetName(selectedDate);

      // GAS APIからシフトデータを取得
      const shiftData = await fetchShiftData(sheetName);

      // ユーザーの所属団体を取得
      const organizations = getUserOrganizations();

      // ユーザー名を取得
      const userName = userInfo.name || '';

      // シフトを抽出
      const userShifts = getUserShifts(shiftData, userName, organizations);
      setShifts(userShifts);
    } catch (error) {
      console.error('シフトデータの取得に失敗:', error);
      setErrorMessage('シフトデータの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, userInfo, getUserOrganizations]);

  /**
   * 日付またはユーザー情報が変更されたらシフトを再読み込み
   */
  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  /**
   * ドロワーを開く
   */
  const openDrawer = () => {
    navigation.openDrawer();
  };

  const goToNotifications = () => {
    navigation.navigate('Notifications');
  };

  const ensureAudioUnlocked = useCallback(() => {
    if (audioUnlockedRef.current) {
      return;
    }
    const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }
    if (!(navigator?.userActivation && navigator.userActivation.isActive)) {
      return;
    }
    const context = new AudioCtx();
    try {
      if (context.state === 'suspended') {
        context.resume().catch(() => {});
      }
      audioContextRef.current = context;
      audioUnlockedRef.current = true;
    } catch (error) {
      // keep locked if resume fails
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    const context = audioContextRef.current;
    if (!context) {
      return;
    }
    if (context.state === 'suspended') {
      context.resume();
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.15;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
    }, 150);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      previousUnreadCountRef.current = 0;
      return;
    }
    const { count } = await getUnreadCount(user.id);
    setUnreadCount(count);
    if (audioUnlockedRef.current && count > previousUnreadCountRef.current) {
      playNotificationSound();
    }
    previousUnreadCountRef.current = count;
  }, [user?.id, playNotificationSound]);

  useEffect(() => {
    const unlockAudio = (event) => {
      if (event && event.isTrusted) {
        ensureAudioUnlocked();
      }
    };

    const options = { once: true, capture: true };
    window.addEventListener('pointerdown', unlockAudio, options);
    window.addEventListener('keydown', unlockAudio, options);

    return () => {
      window.removeEventListener('pointerdown', unlockAudio, options);
      window.removeEventListener('keydown', unlockAudio, options);
    };
  }, [ensureAudioUnlocked]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!user?.id) {
      return () => {};
    }
    const supabase = getSupabaseClient();
    const channel = supabase.channel(`notification_recipients_${user.id}`);
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notification_recipients',
        filter: `user_id=eq.${user.id}`,
      },
      () => {
        refreshUnreadCount();
        if (audioUnlockedRef.current) {
          playNotificationSound();
        }
      }
    );
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notification_recipients',
        filter: `user_id=eq.${user.id}`,
      },
      () => {
        refreshUnreadCount();
      }
    );
    channel.subscribe();
    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user?.id, playNotificationSound, refreshUnreadCount]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshUnreadCount();
    });
    return unsubscribe;
  }, [navigation, refreshUnreadCount]);

  useEffect(() => {
    const handler = () => {
      refreshUnreadCount();
    };
    const unsubscribe = subscribeNotificationUpdates(handler);
    return unsubscribe;
  }, [refreshUnreadCount]);

  /**
   * 開始日かどうかを判定
   * @returns {boolean} 開始日の場合true
   */
  const isFirstDay = selectedDate.getTime() <= festivalStartDate.getTime();

  /**
   * 最終日かどうかを判定
   * @returns {boolean} 最終日の場合true
   */
  const isLastDay = selectedDate.getTime() >= festivalEndDate.getTime();

  /**
   * 日付を1日進める（最終日以降は無効）
   */
  const goToNextDay = () => {
    if (isLastDay) return;
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    setSelectedDate(nextDate);
  };

  /**
   * 日付を1日戻す（開始日以前は無効）
   */
  const goToPreviousDay = () => {
    if (isFirstDay) return;
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    setSelectedDate(prevDate);
  };

  /**
   * 日付の表示用文字列を生成
   * @returns {string} 表示用の日付文字列（例: "11月3日（月）"）
   */
  const getDisplayDate = () => {
    /** 曜日の配列 */
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    /** 月（1始まり） */
    const month = selectedDate.getMonth() + 1;
    /** 日 */
    const day = selectedDate.getDate();
    /** 曜日 */
    const dayOfWeek = dayNames[selectedDate.getDay()];

    return `${month}月${day}日（${dayOfWeek}）`;
  };

  /**
   * シフトカードをタップした時の処理
   * エリアの場所を示す画像をモーダルで表示
   * @param {string} areaName - エリア名
   */
  const handleShiftCardPress = (areaName) => {
    setSelectedAreaName(areaName);
    setIsImageModalVisible(true);
  };

  /**
   * 画像モーダルを閉じる
   * モーダルのアニメーションが完了するまで、エリア名はクリアしない
   */
  const closeImageModal = () => {
    setIsImageModalVisible(false);
  };

  /**
   * モーダルの表示状態が変わったら、閉じた後にエリア名をクリア
   */
  useEffect(() => {
    if (!isImageModalVisible && selectedAreaName) {
      // フェードアニメーション完了を待つ（300ms）
      const timer = setTimeout(() => {
        setSelectedAreaName('');
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isImageModalVisible, selectedAreaName]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ヘッダー */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {isMobile ? (
          <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
            <Text style={[styles.menuButtonText, { color: theme.text }]}>☰</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.menuButton} />
        )}
        <Text style={[styles.headerTitle, { color: theme.text }]}>{SCREEN_NAME}</Text>
        <TouchableOpacity style={styles.menuButton} onPress={goToNotifications}>
          <Image
            source={require('../../../../assets/icons/bell.png')}
            style={styles.bellIcon}
            resizeMode="contain"
          />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* コンテンツ */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* 日付選択（祭り期間内のみ移動可能） */}
        <View style={[styles.dateSelector, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.dateArrowButton, isFirstDay && styles.dateArrowButtonDisabled]}
            onPress={goToPreviousDay}
            disabled={isFirstDay}
          >
            <Text style={[styles.dateArrowText, { color: isFirstDay ? theme.textSecondary : theme.primary }]}>◀</Text>
          </TouchableOpacity>

          <View style={styles.dateDisplay}>
            <Text style={[styles.dateText, { color: theme.text }]}>{getDisplayDate()}</Text>
          </View>

          <TouchableOpacity
            style={[styles.dateArrowButton, isLastDay && styles.dateArrowButtonDisabled]}
            onPress={goToNextDay}
            disabled={isLastDay}
          >
            <Text style={[styles.dateArrowText, { color: isLastDay ? theme.textSecondary : theme.primary }]}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* シフト表示エリア */}
        <View style={styles.shiftArea}>
          <Text style={[styles.shiftAreaTitle, { color: theme.text }]}>あなたのシフト</Text>

          {/* ローディング中 */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>読み込み中...</Text>
            </View>
          )}

          {/* エラーメッセージ */}
          {!isLoading && errorMessage !== '' && (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: theme.error }]}>{errorMessage}</Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: theme.primary }]}
                onPress={loadShifts}
              >
                <Text style={styles.retryButtonText}>再試行</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* シフトなし */}
          {!isLoading && errorMessage === '' && shifts.length === 0 && (
            <View style={styles.noShiftContainer}>
              <Text style={[styles.noShiftText, { color: theme.textSecondary }]}>
                この日はシフトがありません
              </Text>
            </View>
          )}

          {/* シフト一覧 */}
          {!isLoading &&
            errorMessage === '' &&
            shifts.map((shift, index) => (
              <TouchableOpacity
                key={`${shift.timeSlot}-${shift.areaName}-${index}`}
                style={[
                  styles.shiftCard,
                  {
                    backgroundColor: hexToRgba(shift.backgroundColor, 0.2),
                    borderLeftColor: shift.backgroundColor,
                  },
                ]}
                onPress={() => handleShiftCardPress(shift.areaName)}
                activeOpacity={0.7}
              >
                {/* 時間帯 */}
                <Text style={[styles.shiftTime, { color: theme.text }]}>{shift.timeSlot}</Text>
                {/* エリア名 */}
                <Text style={[styles.shiftAreaName, { color: theme.text }]}>{shift.areaName}</Text>
              </TouchableOpacity>
            ))}
        </View>
      </ScrollView>

      {/* エリア画像表示モーダル */}
      <Modal
        visible={isImageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { maxWidth: isMobile ? 600 : 800, backgroundColor: theme.surface },
            ]}
          >
            {/* モーダルヘッダー */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{selectedAreaName}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeImageModal}
              >
                <Text style={[styles.modalCloseButtonText, { color: theme.text }]}>×</Text>
              </TouchableOpacity>
            </View>

            {/* 画像表示エリア */}
            <View style={styles.modalImageContainer}>
              {AREA_IMAGE_MAP[selectedAreaName] ? (
                <Image
                  source={AREA_IMAGE_MAP[selectedAreaName]}
                  style={[
                    styles.modalImage,
                    { height: isMobile ? 400 : 600 },
                  ]}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.noImageContainer}>
                  <Text style={styles.noImageText}>📷</Text>
                  <Text style={[styles.noImageDescription, { color: theme.textSecondary }]}>
                    エリア場所の画像が登録されていないか、
                  </Text>
                  <Text style={[styles.noImageDescription, { color: theme.textSecondary }]}>
                    正常に読み込めませんでした。
                  </Text>
                  <Text style={[styles.noImageHint, { color: theme.textSecondary }]}>
                    リロードしても改善されない場合は、
                  </Text>
                  <Text style={[styles.noImageHint, { color: theme.textSecondary }]}>
                    システム部または事務部までお問い合わせください。
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/**
 * スタイル定義
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  bellIcon: {
    width: 22,
    height: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
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
    color: '#007AFF',
  },
  dateArrowButtonDisabled: {
    opacity: 0.3,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginHorizontal: 12,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
  },
  /* シフト表示エリア */
  shiftArea: {
    marginTop: 8,
  },
  shiftAreaTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
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
  /* エラー */
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: 8,
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
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  /* シフトなし */
  noShiftContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    borderRadius: 8,
  },
  noShiftText: {
    fontSize: 14,
  },
  /* シフトカード */
  shiftCard: {
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
  },
  shiftTime: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  shiftAreaName: {
    fontSize: 15,
  },
  /* モーダル */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    borderRadius: 12,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  modalCloseButtonText: {
    fontSize: 28,
    lineHeight: 32,
  },
  modalImageContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  modalImage: {
    width: '100%',
    height: 400,
  },
  noImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  noImageText: {
    fontSize: 64,
    marginBottom: 16,
  },
  noImageDescription: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  noImageHint: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
});

export default JimuShiftScreen;
