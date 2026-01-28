/**
 * 項目7画面
 * 項目7機能のメイン画面
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
import PlaceholderContent from '../../../shared/components/PlaceholderContent';

/** ブレークポイント（スマホ/PC切り替え） */
const MOBILE_BREAKPOINT = 768;

/** 画面名 */
const SCREEN_NAME = '項目7';

/**
 * 項目7画面コンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.navigation - React Navigationのnavigationオブジェクト
 * @returns {JSX.Element} 項目7画面
 */
const Item7Screen = ({ navigation }) => {
  /** 画面サイズ取得 */
  const { width } = useWindowDimensions();
  /** モバイル判定 */
  const isMobile = width < MOBILE_BREAKPOINT;

  /**
   * ドロワーを開く
   */
  const openDrawer = () => {
    navigation.openDrawer();
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
        <Text style={styles.headerTitle}>{SCREEN_NAME}</Text>
        {isMobile && <View style={styles.menuButton} />}
      </View>

      {/* コンテンツ */}
      <PlaceholderContent title={SCREEN_NAME} />
    </SafeAreaView>
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
});

export default Item7Screen;
