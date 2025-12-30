/**
 * カスタムDrawerコンテンツ
 * サイドバーのUI・スタイルをカスタマイズ
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * ドロワーアイテムコンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {string} props.label - 表示ラベル
 * @param {boolean} props.isActive - アクティブ状態かどうか
 * @param {Function} props.onPress - タップ時のコールバック
 * @returns {JSX.Element} ドロワーアイテム
 */
const DrawerItem = ({ label, isActive, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.drawerItem, isActive && styles.drawerItemActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.drawerItemText, isActive && styles.drawerItemTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

/**
 * カスタムDrawerコンテンツコンポーネント
 * @param {Object} props - React Navigationから渡されるprops
 * @returns {JSX.Element} カスタムDrawer
 */
const CustomDrawerContent = (props) => {
  /** 画面サイズを取得 */
  const { width } = useWindowDimensions();
  /** SafeAreaのInsets */
  const insets = useSafeAreaInsets();
  /** 現在のルート名 */
  const currentRouteName = props.state.routeNames[props.state.index];

  /**
   * 画面遷移処理
   * @param {string} screenName - 遷移先画面名
   */
  const navigateTo = (screenName) => {
    props.navigation.navigate(screenName);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>生駒祭 ERP</Text>
        <Text style={styles.headerSubtitle}>2026</Text>
      </View>

      {/* メニューアイテム */}
      <ScrollView
        style={styles.menuContainer}
        contentContainerStyle={styles.menuContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 項目1〜11 */}
        {Array.from({ length: 11 }, (_, index) => (
          <DrawerItem
            key={`Item${index + 1}`}
            label={`項目${index + 1}`}
            isActive={currentRouteName === `Item${index + 1}`}
            onPress={() => navigateTo(`Item${index + 1}`)}
          />
        ))}
      </ScrollView>

      {/* フッター */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.footerText}>v1.0.0</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888899',
    marginTop: 4,
  },
  menuContainer: {
    flex: 1,
  },
  menuContent: {
    paddingVertical: 12,
  },
  drawerItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
  },
  drawerItemActive: {
    backgroundColor: '#4a4a6a',
  },
  drawerItemText: {
    fontSize: 16,
    color: '#CCCCDD',
  },
  drawerItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  footerText: {
    fontSize: 12,
    color: '#666677',
  },
});

export default CustomDrawerContent;
