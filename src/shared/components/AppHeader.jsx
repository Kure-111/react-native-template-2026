/**
 * アプリケーションヘッダーコンポーネント
 * 通知ベルアイコンとメニュー切り替えを含むヘッダー
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions
} from 'react-native';
import { NotificationCenter } from '../../features/notifications/components/NotificationCenter';
import { supabase } from '../../services/supabase/client';
import { useNotificationSubscription } from '../../shared/hooks/useNotificationSubscription';

const MOBILE_BREAKPOINT = 768;

export function AppHeader({ navigation, title = '生駒祭 ERP' }) {
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const [userId, setUserId] = useState(null);

  // ユーザーIDを取得
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  // リアルタイム通知購読
  useNotificationSubscription(userId, (notification) => {
    console.log('新規通知:', notification);
  }, {
    enabled: !!userId,
    showBrowserNotification: true
  });

  const handleMenuPress = () => {
    if (navigation && navigation.toggleDrawer) {
      navigation.toggleDrawer();
    }
  };

  return (
    <View style={styles.container}>
      {/* ハンバーガーメニュー（モバイルのみ） */}
      {isMobile && (
        <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      )}

      {/* タイトル */}
      <Text style={styles.title}>{title}</Text>

      {/* 通知ベル */}
      <View style={styles.rightContainer}>
        {userId && <NotificationCenter userId={userId} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 0,
        zIndex: 100
      }
    })
  },
  menuButton: {
    padding: 8,
    marginRight: 12
  },
  menuIcon: {
    fontSize: 24,
    color: '#111827',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none'
      }
    })
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  }
});
