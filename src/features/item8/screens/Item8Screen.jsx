
import React, { useRef, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Button, ActivityIndicator, Pressable } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ThemedHeader } from '../../../shared/components/ThemedHeader';
import { useRinjiHelp } from '../hooks/useRinjiHelp.js';
import RecruitForm from '../components/RecruitForm.jsx';
import RecruitList from '../components/RecruitList.jsx';

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
      return (
        <View style={styles.localErrorBox}>
          <Text style={styles.localErrorTitle}>項目8 内部エラー</Text>
          <Text style={styles.localErrorMessage}>{this.state.error.message}</Text>
          <Button title="再読み込み" onPress={this.props.onReload} />
        </View>
      );
    }
    return this.props.children;
  }
}

const SCREEN_NAME = '臨時ヘルプ';

const Item8Screen = ({ navigation }) => {
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
  const [showHistory, setShowHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const scrollViewRef = useRef(null);

  const handleStartEdit = (recruit) => {
    setEditing(recruit);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo?.({ y: 0, animated: true });
    }, 0);
  };

  const onSubmit = async (payload) => {
    setSubmitting(true);
    const ok = editing ? await handleUpdate(editing.id, payload) : await handleCreate(payload);
    setSubmitting(false);
    if (ok) setEditing(null);
  };

  const renderError = () => (error ? <Text style={styles.error}>{error}</Text> : null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />
      {(authLoading || loading) && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
        </View>
      )}
      {!authLoading && (
        <LocalErrorBoundary onReload={refresh}>
          <ScrollView ref={scrollViewRef} contentContainerStyle={styles.content}>
            {manager && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{editing ? '募集を編集' : '募集を作成'}</Text>
                <RecruitForm
                  initialValues={editing || {}}
                  submitLabel={editing ? '更新する' : '募集を作成'}
                  onSubmit={onSubmit}
                  disabled={submitting}
                />
                {editing && <Button title="編集をやめる" onPress={() => setEditing(null)} />}
              </View>
            )}

            {renderError()}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>募集一覧</Text>
                <Button title="再読み込み" onPress={refresh} />
              </View>
              <RecruitList
                data={recruits}
                isManager={manager}
                onApply={handleApply}
                onEdit={manager ? handleStartEdit : undefined}
                onClose={manager ? handleClose : undefined}
                onReopen={manager ? handleReopen : undefined}
                refreshing={loading}
                onRefresh={refresh}
              />
            </View>

            {manager && (
              <View style={styles.section}>
                <Pressable
                  style={[styles.sectionHeader, styles.historyTab]}
                  onPress={() => setShowHistory((v) => !v)}
                >
                  <Text style={styles.sectionTitle}>募集履歴（open/closed）</Text>
                  <Text style={styles.historyTabAction}>
                    {showHistory ? 'タップで閉じる' : 'タップで表示'}
                  </Text>
                </Pressable>
                {showHistory ? (
                  <RecruitList
                    data={historyRecruits}
                    isManager
                    onApply={handleApply}
                    onEdit={handleStartEdit}
                    onClose={handleClose}
                    onReopen={handleReopen}
                    refreshing={loading}
                    onRefresh={refresh}
                    emptyText="履歴はありません"
                  />
                ) : null}
              </View>
            )}
          </ScrollView>
        </LocalErrorBoundary>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 12,
  },
  section: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTab: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  historyTabAction: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: '#d00',
    padding: 8,
  },
  loading: {
    padding: 24,
    alignItems: 'center',
  },
});

export default Item8Screen;
