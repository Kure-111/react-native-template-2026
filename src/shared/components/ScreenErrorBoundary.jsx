/**
 * 画面用Error Boundary
 * 各画面でエラーが発生した際にフォールバック表示を行う
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import PlaceholderContent from './PlaceholderContent';

/** ブレークポイント（スマホ/PC切り替え） */
const MOBILE_BREAKPOINT = 768;

/**
 * Error Boundary クラスコンポーネント
 * React の Error Boundary は クラスコンポーネントでのみ実装可能
 */
class ScreenErrorBoundaryClass extends React.Component {
  /**
   * コンストラクタ
   * @param {Object} props - コンポーネントプロパティ
   */
  constructor(props) {
    super(props);
    /** エラー状態 */
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * エラー発生時に呼ばれる静的メソッド
   * @param {Error} error - 発生したエラー
   * @returns {Object} 新しい state
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * エラー情報をキャッチするライフサイクルメソッド
   * @param {Error} error - 発生したエラー
   * @param {Object} errorInfo - エラー情報（コンポーネントスタック等）
   */
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    /* エラーログを記録（将来的にはログサービスに送信） */
    console.error('ScreenErrorBoundary caught an error:', {
      screenName: this.props.screenName,
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * エラー状態をリセット
   */
  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  /**
   * レンダリング
   * @returns {JSX.Element} コンポーネント
   */
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackScreen
          screenName={this.props.screenName}
          navigation={this.props.navigation}
          onRetry={this.resetError}
          isMobile={this.props.isMobile}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * エラー時のフォールバック画面（関数コンポーネント）
 * @param {Object} props - コンポーネントプロパティ
 * @param {string} props.screenName - 画面名
 * @param {Object} props.navigation - React Navigationのnavigationオブジェクト
 * @param {Function} props.onRetry - リトライ時のコールバック
 * @param {boolean} props.isMobile - モバイル判定
 * @returns {JSX.Element} エラーフォールバック画面
 */
const ErrorFallbackScreen = ({ screenName, navigation, onRetry, isMobile }) => {
  /**
   * ドロワーを開く
   */
  const openDrawer = () => {
    navigation?.openDrawer?.();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        {isMobile && (
          <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
            <Text style={styles.menuButtonText}>☰</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{screenName}</Text>
        {isMobile && <View style={styles.menuButton} />}
      </View>

      {/* エラーコンテンツ */}
      <PlaceholderContent
        title={screenName}
        isError={true}
      />

      {/* リトライボタン */}
      <View style={styles.retryContainer}>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>再読み込み</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

/**
 * Error Boundary ラッパーコンポーネント（関数コンポーネント）
 * useWindowDimensions を使うためのラッパー
 * @param {Object} props - コンポーネントプロパティ
 * @param {string} props.screenName - 画面名
 * @param {Object} props.navigation - React Navigationのnavigationオブジェクト
 * @param {React.ReactNode} props.children - 子コンポーネント
 * @returns {JSX.Element} Error Boundary
 */
const ScreenErrorBoundary = ({ screenName, navigation, children }) => {
  /** 画面サイズ取得 */
  const { width } = useWindowDimensions();
  /** モバイル判定 */
  const isMobile = width < MOBILE_BREAKPOINT;

  return (
    <ScreenErrorBoundaryClass
      screenName={screenName}
      navigation={navigation}
      isMobile={isMobile}
    >
      {children}
    </ScreenErrorBoundaryClass>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    fontSize: 24,
    color: '#333333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  retryContainer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ScreenErrorBoundary;
