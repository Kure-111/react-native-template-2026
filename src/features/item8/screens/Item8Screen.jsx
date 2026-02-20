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

const MANAGER_TAB_OPTIONS = [
  { key: MANAGER_TABS.CREATE, label: '募集作成' },
  { key: MANAGER_TABS.LIST, label: '募集一覧' },
  { key: MANAGER_TABS.HISTORY, label: '募集履歴' },
];
const SUCCESS_MESSAGE_DURATION_MS = 4000;
const SUCCESS_TOAST_BACKGROUND = '#63E57B';
const SUCCESS_TOAST_TEXT = '#FFFFFF';

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
    handleCreate,
    handleUpdate,
    handleClose,
    handleReopen,
    handleApply,
    refresh,
  } = useRinjiHelp();

  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(MANAGER_TABS.CREATE);
  const [successMessage, setSuccessMessage] = useState('');
  const scrollViewRef = useRef(null);
  const successMessageTimerRef = useRef(null);

  useEffect(() => () => {
    if (successMessageTimerRef.current) {
      clearTimeout(successMessageTimerRef.current);
    }
  }, []);

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
    }
  };

  /**
   * 成功メッセージをトースト表示する。
   *
   * @param {string} message
   */
  const showSuccessToast = (message) => {
    if (successMessageTimerRef.current) {
      clearTimeout(successMessageTimerRef.current);
    }
    setSuccessMessage(message);
    successMessageTimerRef.current = setTimeout(() => {
      setSuccessMessage('');
      successMessageTimerRef.current = null;
    }, SUCCESS_MESSAGE_DURATION_MS);
  };

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
    }
  };

  /**
   * 募集を再開し、成功時はトーストを表示する。
   *
   * @param {string} recruitId
   * @returns {Promise<void>}
   */
  const onReopenRecruit = async (recruitId) => {
    const ok = await handleReopen(recruitId);
    if (ok) {
      showSuccessToast('募集を再開しました');
    }
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
        <Button title="再読み込み" onPress={refresh} color={theme.primary} />
      </View>
      <RecruitList
        data={recruits}
        isManager={manager}
        onApply={handleApply}
        onEdit={manager ? handleStartEdit : undefined}
        onClose={manager ? onCloseRecruit : undefined}
        onReopen={manager ? onReopenRecruit : undefined}
        refreshing={loading}
        onRefresh={refresh}
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
        <Button title="再読み込み" onPress={refresh} color={theme.primary} />
      </View>
      <RecruitList
        data={historyRecruits}
        isManager
        onApply={handleApply}
        onEdit={handleStartEdit}
        onClose={onCloseRecruit}
        onReopen={onReopenRecruit}
        refreshing={loading}
        onRefresh={refresh}
        emptyText="履歴はありません"
        showStatus
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />
      {(authLoading || loading) && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
      {!authLoading && (
        <LocalErrorBoundary onReload={refresh} theme={theme}>
          <View style={styles.body}>
            <ScrollView ref={scrollViewRef} style={styles.scroll} contentContainerStyle={styles.content}>
              {renderError()}
              {manager ? renderManagerTabContent() : renderListSection()}
            </ScrollView>

            {manager && (
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
            )}
            {successMessage ? (
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
                      backgroundColor: SUCCESS_TOAST_BACKGROUND,
                      borderColor: SUCCESS_TOAST_BACKGROUND,
                      borderRadius: theme.borderRadius,
                    },
                  ]}
                >
                  <Text style={[styles.toastText, { color: SUCCESS_TOAST_TEXT, fontWeight: '700' }]}>
                    {successMessage}
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
