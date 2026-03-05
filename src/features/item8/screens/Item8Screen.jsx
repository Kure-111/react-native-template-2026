/**
 * 臨時ヘルプ機能のメイン画面。
 * 管理者/一般ユーザーの表示切り替えと、管理者向けフッタータブ制御を行う。
 */
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Button, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ThemedHeader } from '../../../shared/components/ThemedHeader';
import { useRinjiHelp } from '../hooks/useRinjiHelp.js';
import RecruitForm from '../components/RecruitForm.jsx';
import RecruitList from '../components/RecruitList.jsx';

const MANAGER_TABS = {
  CREATE: 'create',
  LIST: 'list',
  HISTORY: 'history',
};
const USER_TABS = {
  LIST: 'user_list',
  APPLIED: 'user_applied',
};

const MANAGER_TAB_OPTIONS = [
  { key: MANAGER_TABS.CREATE, label: '募集作成' },
  { key: MANAGER_TABS.LIST, label: '募集一覧' },
  { key: MANAGER_TABS.HISTORY, label: '募集履歴' },
];
const USER_TAB_OPTIONS = [
  { key: USER_TABS.LIST, label: '募集一覧' },
  { key: USER_TABS.APPLIED, label: '応募済み' },
];
const SUCCESS_MESSAGE_DURATION_MS = 4000;
const SUCCESS_TOAST_BACKGROUND = '#63E57B';
const SUCCESS_TOAST_TEXT = '#FFFFFF';
const ERROR_TOAST_BACKGROUND = '#D93B3B';
const ERROR_TOAST_TEXT = '#FFFFFF';

/**
 * カラーを少し暗くする。
 *
 * @param {string} hexColor
 * @param {number} ratio
 * @returns {string}
 */
const darkenHex = (hexColor, ratio = 0.04) => {
  if (typeof hexColor !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
    return hexColor;
  }
  const value = hexColor.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const lower = (v) => Math.max(0, Math.round(v * (1 - ratio)));
  const toHex = (v) => v.toString(16).padStart(2, '0');
  return `#${toHex(lower(r))}${toHex(lower(g))}${toHex(lower(b))}`;
};

/**
 * item8 画面内で発生する描画エラーを閉じ込めるローカル境界。
 */
class LocalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Item8 local error boundary:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      const { theme, onReload } = this.props;
      return (
        <View
          style={[
            styles.localErrorBox,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderRadius: theme.borderRadius,
            },
          ]}
        >
          <Text style={[styles.localErrorTitle, { color: theme.error }]}>項目8 内部エラー</Text>
          <Text style={[styles.localErrorMessage, { color: theme.text }]}>{this.state.error.message}</Text>
          <Button title="再読み込み" onPress={onReload} color={theme.primary} />
        </View>
      );
    }
    return this.props.children;
  }
}

const SCREEN_NAME = '臨時ヘルプ';

/**
 * item8 画面コンポーネント。
 *
 * @param {{navigation: any}} props
 * @returns {JSX.Element}
 */
const Item8Screen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const {
    manager,
    loading,
    authLoading,
    error,
    recruits,
    historyRecruits,
    appliedRecruits,
    applications,
    handleCreate,
    handleUpdate,
    handleClose,
    handleReopen,
    handleApply,
    handleCancelApply,
    loadApplications,
    refresh,
  } = useRinjiHelp();

  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(MANAGER_TABS.CREATE);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [openApplicantsByRecruitId, setOpenApplicantsByRecruitId] = useState({});
  const [loadingApplicantsByRecruitId, setLoadingApplicantsByRecruitId] = useState({});
  const scrollViewRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
  }, []);

  useEffect(() => {
    setActiveTab(manager ? MANAGER_TABS.CREATE : USER_TABS.LIST);
    setOpenApplicantsByRecruitId({});
    setLoadingApplicantsByRecruitId({});
  }, [manager]);

  /**
   * 募集編集開始時に作成タブへ遷移し、先頭へスクロールする。
   *
   * @param {Record<string, any>} recruit
   */
  const handleStartEdit = (recruit) => {
    setEditing(recruit);
    setActiveTab(MANAGER_TABS.CREATE);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo?.({ y: 0, animated: true });
    }, 0);
  };

  /**
   * 新規作成/更新送信を実行し、成功時は一覧タブへ戻す。
   *
   * @param {Record<string, any>} payload
   * @returns {Promise<void>}
   */
  const onSubmit = async (payload) => {
    const isEditing = Boolean(editing);
    setSubmitting(true);
    const ok = isEditing ? await handleUpdate(editing.id, payload) : await handleCreate(payload);
    setSubmitting(false);
    if (ok) {
      setEditing(null);
      setActiveTab(MANAGER_TABS.LIST);
      showSuccessToast(isEditing ? '募集を更新しました' : '募集を作成しました');
    } else {
      showErrorToast(
        isEditing
          ? '募集の更新に失敗しました。入力内容を確認して再度お試しください。'
          : '募集の作成に失敗しました。入力内容を確認して再度お試しください。'
      );
    }
  };

  /**
   * トーストメッセージを表示する。
   *
   * @param {string} message
   * @param {'success' | 'error'} type
   */
  const showToast = (message, type = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast({ message: '', type: 'success' });
      toastTimerRef.current = null;
    }, SUCCESS_MESSAGE_DURATION_MS);
  };

  /**
   * 成功メッセージをトースト表示する。
   *
   * @param {string} message
   */
  const showSuccessToast = (message) => showToast(message, 'success');

  /**
   * 失敗メッセージをトースト表示する。
   *
   * @param {string} message
   */
  const showErrorToast = (message) => showToast(message, 'error');

  /**
   * 募集を終了し、成功時はトーストを表示する。
   *
   * @param {string} recruitId
   * @returns {Promise<void>}
   */
  const onCloseRecruit = async (recruitId) => {
    const ok = await handleClose(recruitId);
    if (ok) {
      showSuccessToast('募集を終了しました');
    } else {
      showErrorToast('募集の終了に失敗しました。通信状況を確認して再度お試しください。');
    }
  };

  /**
   * 募集人数到達で自動クローズ中の案件を、本クローズ（手動終了）へ確定する。
   *
   * @param {string} recruitId
   * @returns {Promise<void>}
   */
  const onFinalizeAutoClosedRecruit = async (recruitId) => {
    const ok = await handleClose(recruitId);
    if (ok) {
      showSuccessToast('募集を終了しました');
    } else {
      showErrorToast('募集の終了に失敗しました。通信状況を確認して再度お試しください。');
    }
  };

  /**
   * 募集を再開し、成功時はトーストを表示する。
   *
   * @param {string} recruitId
   * @returns {Promise<void>}
   */
  const onReopenRecruit = async (recruitId) => {
    const result = await handleReopen(recruitId);
    if (result.ok) {
      showSuccessToast('募集を再開しました');
    } else {
      showErrorToast(result.message || '募集の再開に失敗しました。通信状況を確認して再度お試しください。');
    }
  };

  /**
   * 一般ユーザーの応募を実行し、結果をトースト表示する。
   *
   * @param {string} recruitId
   * @returns {Promise<void>}
   */
  const onApplyRecruit = async (recruitId) => {
    const ok = await handleApply(recruitId);
    if (ok) {
      showSuccessToast('応募しました');
    } else {
      showErrorToast('応募に失敗しました。すでに応募済みの場合は応募済みタブをご確認ください。');
    }
  };

  /**
   * 一般ユーザーの応募を取り消し、成功時はトーストを表示する。
   *
   * @param {string} recruitId
   * @returns {Promise<void>}
   */
  const onCancelApplyRecruit = async (recruitId) => {
    const ok = await handleCancelApply(recruitId);
    if (ok) {
      showSuccessToast('応募を取り消しました');
    } else {
      showErrorToast('応募の取り消しに失敗しました。通信状況を確認して再度お試しください。');
    }
  };

  /**
   * 一覧を再読み込みし、応募者一覧の開閉状態も初期化する。
   *
   * @returns {Promise<void>}
   */
  const handleRefresh = async () => {
    await refresh();
    setOpenApplicantsByRecruitId({});
    setLoadingApplicantsByRecruitId({});
  };

  /**
   * 管理者向けに募集単位の応募者一覧を開閉する。
   * 初回オープン時のみ応募者データを取得する。
   *
   * @param {string} recruitId
   * @returns {Promise<void>}
   */
  const onToggleApplicants = async (recruitId) => {
    const isOpen = Boolean(openApplicantsByRecruitId[recruitId]);
    if (isOpen) {
      setOpenApplicantsByRecruitId((prev) => ({ ...prev, [recruitId]: false }));
      return;
    }

    setOpenApplicantsByRecruitId((prev) => ({ ...prev, [recruitId]: true }));
    if (applications[recruitId]) {
      return;
    }

    setLoadingApplicantsByRecruitId((prev) => ({ ...prev, [recruitId]: true }));
    await loadApplications(recruitId);
    setLoadingApplicantsByRecruitId((prev) => ({ ...prev, [recruitId]: false }));
  };

  /**
   * エラーメッセージ表示要素を返す。
   *
   * @returns {JSX.Element | null}
   */
  const renderError = () => (error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null);
  const listAndHistorySectionBackground = darkenHex(theme.surface, 0.04);

  /**
   * 募集作成/編集セクションを描画する。
   *
   * @returns {JSX.Element}
   */
  const renderCreateSection = () => (
    <View
      style={[
        styles.section,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderRadius: theme.borderRadius,
        },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: theme.text, fontWeight: theme.fontWeight }]}>
        {editing ? '募集を編集' : '募集を作成'}
      </Text>
      <RecruitForm
        initialValues={editing || {}}
        submitLabel={editing ? '更新する' : '募集を作成'}
        onSubmit={onSubmit}
        disabled={submitting}
      />
      {editing && (
        <Button title="編集をやめる" onPress={() => setEditing(null)} color={theme.textSecondary} />
      )}
    </View>
  );

  /**
   * 募集一覧セクションを描画する。
   *
   * @returns {JSX.Element}
   */
  const renderListSection = () => (
    <View
      style={[
        styles.section,
        {
          backgroundColor: listAndHistorySectionBackground,
          borderColor: theme.border,
          borderRadius: theme.borderRadius,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontWeight: theme.fontWeight }]}>募集一覧</Text>
        <Button title="再読み込み" onPress={handleRefresh} color={theme.primary} />
      </View>
      <RecruitList
        data={recruits}
        isManager={manager}
        onApply={onApplyRecruit}
        onEdit={manager ? handleStartEdit : undefined}
        onClose={manager ? onCloseRecruit : undefined}
        onReopen={manager ? onReopenRecruit : undefined}
        onFinalizeAutoClose={manager ? onFinalizeAutoClosedRecruit : undefined}
        refreshing={loading}
        onRefresh={handleRefresh}
        appliedRecruitIds={appliedRecruits.map((recruit) => recruit.id)}
        onToggleApplicants={manager ? onToggleApplicants : undefined}
        applicationsByRecruitId={applications}
        openApplicantsByRecruitId={openApplicantsByRecruitId}
        loadingApplicantsByRecruitId={loadingApplicantsByRecruitId}
        showApplicantsToggle={manager}
        showAutoClosedBadge={manager}
      />
    </View>
  );

  /**
   * 募集履歴セクションを描画する。
   *
   * @returns {JSX.Element}
   */
  const renderHistorySection = () => (
    <View
      style={[
        styles.section,
        {
          backgroundColor: listAndHistorySectionBackground,
          borderColor: theme.border,
          borderRadius: theme.borderRadius,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontWeight: theme.fontWeight }]}>募集履歴</Text>
        <Button title="再読み込み" onPress={handleRefresh} color={theme.primary} />
      </View>
      <RecruitList
        data={historyRecruits}
        isManager
        onApply={handleApply}
        onEdit={handleStartEdit}
        onClose={onCloseRecruit}
        onReopen={onReopenRecruit}
        onToggleApplicants={onToggleApplicants}
        refreshing={loading}
        onRefresh={handleRefresh}
        emptyText="履歴はありません"
        showStatus
        applicationsByRecruitId={applications}
        openApplicantsByRecruitId={openApplicantsByRecruitId}
        loadingApplicantsByRecruitId={loadingApplicantsByRecruitId}
        showApplicantsToggle
      />
    </View>
  );

  /**
   * 一般ユーザー向けの応募済みセクションを描画する。
   *
   * @returns {JSX.Element}
   */
  const renderAppliedSection = () => (
    <View
      style={[
        styles.section,
        {
          backgroundColor: listAndHistorySectionBackground,
          borderColor: theme.border,
          borderRadius: theme.borderRadius,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontWeight: theme.fontWeight }]}>応募済み</Text>
        <Button title="再読み込み" onPress={handleRefresh} color={theme.primary} />
      </View>
      <RecruitList
        data={appliedRecruits}
        refreshing={loading}
        onRefresh={handleRefresh}
        emptyText="応募済みの案件はありません。"
        showStatus
        showApplyButton={false}
        showCancelButton
        onCancelApply={onCancelApplyRecruit}
      />
    </View>
  );

  /**
   * 管理者向けタブ状態に応じて表示セクションを切り替える。
   *
   * @returns {JSX.Element}
   */
  const renderManagerTabContent = () => {
    if (activeTab === MANAGER_TABS.CREATE) return renderCreateSection();
    if (activeTab === MANAGER_TABS.HISTORY) return renderHistorySection();
    return renderListSection();
  };

  /**
   * 一般ユーザー向けタブ状態に応じて表示セクションを切り替える。
   *
   * @returns {JSX.Element}
   */
  const renderUserTabContent = () => {
    if (activeTab === USER_TABS.APPLIED) return renderAppliedSection();
    return renderListSection();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />
      {(authLoading || loading) && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
      {!authLoading && (
        <LocalErrorBoundary onReload={handleRefresh} theme={theme}>
          <View style={styles.body}>
            <ScrollView ref={scrollViewRef} style={styles.scroll} contentContainerStyle={styles.content}>
              {renderError()}
              {manager ? renderManagerTabContent() : renderUserTabContent()}
            </ScrollView>

            {manager ? (
              <View
                style={[
                  styles.footer,
                  {
                    backgroundColor: theme.surface,
                    borderTopColor: theme.border,
                    paddingBottom: insets.bottom + 18,
                  },
                ]}
              >
                {MANAGER_TAB_OPTIONS.map((tab) => {
                  const active = activeTab === tab.key;
                  return (
                    <Pressable
                      key={tab.key}
                      style={[
                        styles.footerTab,
                        {
                          borderColor: active ? theme.primary : theme.border,
                          backgroundColor: active ? theme.primary : theme.background,
                          borderRadius: theme.borderRadius,
                        },
                      ]}
                      onPress={() => setActiveTab(tab.key)}
                    >
                      <Text
                        style={[
                          styles.footerTabLabel,
                          {
                            color: active ? '#FFFFFF' : theme.textSecondary,
                            fontWeight: active ? '700' : theme.fontWeight,
                          },
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                  })}
              </View>
            ) : (
              <View
                style={[
                  styles.footer,
                  {
                    backgroundColor: theme.surface,
                    borderTopColor: theme.border,
                    paddingBottom: insets.bottom + 18,
                  },
                ]}
              >
                {USER_TAB_OPTIONS.map((tab) => {
                  const active = activeTab === tab.key;
                  return (
                    <Pressable
                      key={tab.key}
                      style={[
                        styles.footerTab,
                        {
                          borderColor: active ? theme.primary : theme.border,
                          backgroundColor: active ? theme.primary : theme.background,
                          borderRadius: theme.borderRadius,
                        },
                      ]}
                      onPress={() => setActiveTab(tab.key)}
                    >
                      <Text
                        style={[
                          styles.footerTabLabel,
                          {
                            color: active ? '#FFFFFF' : theme.textSecondary,
                            fontWeight: active ? '700' : theme.fontWeight,
                          },
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {toast.message ? (
              <View
                pointerEvents="none"
                style={[
                  styles.toastContainer,
                  {
                    top: 8,
                  },
                ]}
              >
                <View
                  style={[
                    styles.toastBox,
                    {
                      backgroundColor: toast.type === 'error' ? ERROR_TOAST_BACKGROUND : SUCCESS_TOAST_BACKGROUND,
                      borderColor: toast.type === 'error' ? ERROR_TOAST_BACKGROUND : SUCCESS_TOAST_BACKGROUND,
                      borderRadius: theme.borderRadius,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.toastText,
                      {
                        color: toast.type === 'error' ? ERROR_TOAST_TEXT : SUCCESS_TOAST_TEXT,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {toast.message}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </LocalErrorBoundary>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 12,
  },
  section: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
  },
  error: {
    padding: 8,
  },
  loading: {
    padding: 24,
    alignItems: 'center',
  },
  footer: {
    marginTop: 10,
    borderTopWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 10,
  },
  footerTab: {
    flex: 1,
    borderWidth: 1,
    minHeight: 56,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerTabLabel: {
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  toastContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5000,
  },
  toastBox: {
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 19,
    minWidth: 264,
    maxWidth: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
  },
  toastText: {
    fontSize: 18,
    textAlign: 'center',
  },
  localErrorBox: {
    margin: 12,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  localErrorTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  localErrorMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default Item8Screen;
