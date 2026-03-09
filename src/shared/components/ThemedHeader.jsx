/**
 * テーマ対応ヘッダーコンポーネント
 * 全画面で共通利用できるヘッダー
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Image } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient } from '../../services/supabase/client';
import { getUnreadCount, subscribeNotificationUpdates } from '../services/notificationService';

const MOBILE_BREAKPOINT = 768;

/**
 * テーマ対応ヘッダー
 * @param {Object} props - コンポーネントプロパティ
 * @param {string} props.title - ヘッダータイトル
 * @param {Object} props.navigation - React Navigation
 * @returns {JSX.Element} ヘッダー
 */
export const ThemedHeader = ({ title, navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const [unreadCount, setUnreadCount] = useState(0);
  const previousUnreadCountRef = useRef(0);
  const subscriptionRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioUnlockedRef = useRef(false);

  const openDrawer = () => {
    navigation.openDrawer();
  };

  const goToNotifications = () => {
    // バッジをすぐ消す（楽観的更新）。既読DB更新は通知一覧画面の離脱時に行う
    if (unreadCount > 0) {
      setUnreadCount(0);
      previousUnreadCountRef.current = 0;
    }
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

  return (
    <View style={[
      styles.header,
      {
        backgroundColor: theme.surface,
        borderBottomColor: theme.border,
        shadowOpacity: theme.shadowOpacity,
      }
    ]}>
      {isMobile ? (
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <Text style={[styles.menuButtonText, { color: theme.text }]}>☰</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.menuButton} />
      )}
      <Text style={[
        styles.headerTitle,
        {
          color: theme.text,
          fontSize: theme.fontSize.large,
          fontWeight: theme.fontWeight,
        }
      ]}>
        {title}
      </Text>
      <TouchableOpacity style={styles.menuButton} onPress={goToNotifications}>
        <Image
          source={require('../../../assets/icons/bell.png')}
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
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
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
  },
});
