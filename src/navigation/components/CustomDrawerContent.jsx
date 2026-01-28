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
import { useAuth } from '../../shared/contexts/AuthContext';
import { canAccessScreen } from '../../services/supabase/permissionService';

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
  /** 認証コンテキスト */
  const { userInfo, logout } = useAuth();

  /**
   * 画面遷移処理
   * @param {string} screenName - 遷移先画面名
   */
  const navigateTo = (screenName) => {
    props.navigation.navigate(screenName);
  };

  /**
   * ログアウト処理
   */
  const handleLogout = async () => {
    // Web版での確認ダイアログ
    const confirmed = window.confirm('ログアウトしますか？');

    if (!confirmed) {
      return;
    }

    const { success, error } = await logout();
    if (!success) {
      window.alert('ログアウトに失敗しました');
    }
  };

  /**
   * アクセス可能な項目をフィルタリング
   */
  const accessibleItems = Array.from({ length: 11 }, (_, index) => {
    const itemNumber = index + 1;
    const screenName = `item${itemNumber}`;
    const isAccessible = canAccessScreen(userInfo?.roles || [], screenName);

    return {
      number: itemNumber,
      label: `項目${itemNumber}`,
      screenName: `Item${itemNumber}`,
      isAccessible,
    };
  }).filter((item) => item.isAccessible);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>生駒祭 ERP</Text>
        <Text style={styles.headerSubtitle}>2026</Text>
        {userInfo && (
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userInfo.name}</Text>
            {userInfo.organization && (
              <Text style={styles.userOrganization}>{userInfo.organization}</Text>
            )}
          </View>
        )}
      </View>

      {/* メニューアイテム */}
      <ScrollView
        style={styles.menuContainer}
        contentContainerStyle={styles.menuContent}
        showsVerticalScrollIndicator={false}
      >
        {/* アクセス可能な項目のみ表示 */}
        {accessibleItems.length > 0 ? (
          accessibleItems.map((item) => (
            <DrawerItem
              key={item.screenName}
              label={item.label}
              isActive={currentRouteName === item.screenName}
              onPress={() => navigateTo(item.screenName)}
            />
          ))
        ) : (
          <View style={styles.noAccessContainer}>
            <Text style={styles.noAccessText}>
              アクセス可能な項目がありません
            </Text>
          </View>
        )}

        {/* 開発用: 通知テスト画面 */}
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>開発用</Text>
        <DrawerItem
          label="通知テスト"
          isActive={currentRouteName === 'NotificationTest'}
          onPress={() => navigateTo('NotificationTest')}
        />
        <DrawerItem
          label="通知履歴"
          isActive={currentRouteName === 'Notifications'}
          onPress={() => navigateTo('Notifications')}
        />
      </ScrollView>

      {/* フッター */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {/* ログアウトボタン */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>ログアウト</Text>
        </TouchableOpacity>
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
  userInfo: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userOrganization: {
    fontSize: 12,
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
  divider: {
    height: 1,
    backgroundColor: '#2d2d44',
    marginVertical: 12,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888899',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  noAccessContainer: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  noAccessText: {
    fontSize: 14,
    color: '#888899',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    color: '#666677',
  },
});

export default CustomDrawerContent;
