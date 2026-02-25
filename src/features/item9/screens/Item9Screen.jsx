/**
 * Item9 メイン画面（実長システム）
 * 来場者数、不審者情報、天気情報、緊急モードなどを統合表示
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Platform, TouchableOpacity, Text, Dimensions, useWindowDimensions } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ThemedHeader } from '../../../shared/components/ThemedHeader';

// Components
import { VisitorCounter } from '../components/VisitorCounter';
import { CountHistoryChart } from '../components/CountHistoryChart';
import { VisitorTrendChart } from '../components/VisitorTrendChart';
import { SuspiciousPersonList } from '../components/SuspiciousPersonList';
import { SecurityPlacement } from '../components/SecurityPlacement';
import { DigitalClock } from '../components/DigitalClock';
import { NextSchedule } from '../components/NextSchedule';
import { WeatherInfo } from '../components/WeatherInfo';
import { EmergencyModeToggle } from '../components/EmergencyModeToggle';
import { NotificationPopup } from '../components/NotificationPopup';

// Hooks
import { useVisitorCount } from '../hooks/useVisitorCount';
import { useSuspiciousPersons } from '../hooks/useSuspiciousPersons';
import { useWeatherData } from '../hooks/useWeatherData';
import { useEmergencyMode } from '../hooks/useEmergencyMode';

// Constants
import { DEFAULT_LOCATION, DISASTER_TYPE_LABELS } from '../constants';

/** 画面名 */
const SCREEN_NAME = '本部';

/**
 * Item9 メイン画面コンポーネント
 */
const Item9Screen = ({ navigation }) => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768; // タブレット以下
  const isMobile = width < 480; // スマホ
  
  // Hooks
  const { count, history, loading: visitorLoading, fetchHistory, useMockData } = useVisitorCount();
  const { persons, loading: personsLoading } = useSuspiciousPersons();
  const { weather, rainfall, loading: weatherLoading } = useWeatherData(
    DEFAULT_LOCATION.latitude,
    DEFAULT_LOCATION.longitude
  );
  const {
    isEmergency,
    disasterType,
    message,
    loading: emergencyLoading,
    showNotificationPopup,
    notificationData,
    setShowNotificationPopup,
    deactivate,
  } = useEmergencyMode();

  // Local state - 削除
  // const [selectedDisasterType, setSelectedDisasterType] = useState('');
  // const [emergencyMessage, setEmergencyMessage] = useState('');

  // 今日の日付で履歴を取得
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    console.log('Fetching visitor history for date:', today);
    fetchHistory(today);
  }, []);

  // 緊急モード切替ハンドラ（解除のみ）
  const handleEmergencyToggle = () => {
    if (isEmergency) {
      // 解除確認
      if (Platform.OS === 'web') {
        if (window.confirm('緊急モードを解除しますか？')) {
          deactivate('current-user-id');
        }
      } else {
        const { Alert } = require('react-native');
        Alert.alert(
          '緊急モード解除',
          '緊急モードを解除しますか？',
          [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: '解除',
              onPress: () => deactivate('current-user-id'),
              style: 'destructive',
            },
          ]
        );
      }
    }
  };

  // 通知送信ハンドラ
  const handleNotificationSend = () => {
    setShowNotificationPopup(false);
    if (Platform.OS === 'web') {
      alert('通知が送信されました（未実装）');
    } else {
      const { Alert } = require('react-native');
      Alert.alert('通知送信', '通知が送信されました（未実装）');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />
      
      <ScrollView style={styles.scrollView}>
        <View style={[styles.contentContainer, isMobile && styles.contentContainerMobile]}>
          {/* 上部: デジタル時計と次の予定 */}
          <View style={[
            styles.topRow, 
            isSmallScreen && styles.topRowSmall,
            isMobile && styles.topRowMobile
          ]}>
            <DigitalClock />
            {!isMobile && <NextSchedule />}
          </View>

          {/* スマホでは次の予定を別行に */}
          {isMobile && (
            <View style={styles.mobileScheduleRow}>
              <NextSchedule />
            </View>
          )}

          {/* メインコンテンツ: レスポンシブグリッド */}
          <View style={[
            styles.gridContainer,
            isSmallScreen && styles.gridContainerSmall
          ]}>
            {/* 左列 */}
            <View style={[styles.column, isSmallScreen && styles.columnSmall]}>
              {/* 天気情報 */}
              <View style={styles.leftCard}>
                <WeatherInfo weather={weather} rainfall={rainfall} />
              </View>

              {/* 警備配置図 */}
              <View style={styles.leftCard}>
                <SecurityPlacement />
              </View>
            </View>

            {/* 右列 */}
            <View style={[styles.column, isSmallScreen && styles.columnSmall]}>
              {/* 来場者カウンター */}
              <View style={styles.card}>
                <VisitorCounter count={count} />
              </View>

              {/* 緊急モード */}
              <View style={styles.card}>
                <EmergencyModeToggle
                  isEmergency={isEmergency}
                  onToggle={handleEmergencyToggle}
                  disabled={emergencyLoading || !isEmergency}
                />

              {isEmergency && (
                <View style={[styles.emergencyInfoCard, { 
                  backgroundColor: theme.name === 'dark' ? '#1A1A1A' : '#FFFFFF',
                  borderColor: theme.name === 'dark' ? '#333' : '#E0E0E0'
                }]}>
                  <View style={styles.emergencyInfoHeader}>
                    <MaterialCommunityIcons 
                      name="information" 
                      size={20} 
                      color={theme.name === 'dark' ? '#FF5252' : '#F44336'} 
                    />
                    <Text style={[styles.emergencyInfoTitle, { color: theme.text }]}>
                      災害情報
                    </Text>
                  </View>
                  
                  <View style={styles.emergencyInfoContent}>
                    <View style={styles.emergencyInfoRow}>
                      <View style={[styles.emergencyInfoLabel, { 
                        backgroundColor: theme.name === 'dark' ? '#2C2C2C' : '#F5F5F5' 
                      }]}>
                        <Text style={[styles.emergencyInfoLabelText, { color: theme.textSecondary }]}>
                          種類
                        </Text>
                      </View>
                      <Text style={[styles.emergencyInfoValue, { color: theme.text }]}>
                        {DISASTER_TYPE_LABELS[disasterType] || disasterType}
                      </Text>
                    </View>
                    
                    <View style={styles.emergencyInfoRow}>
                      <View style={[styles.emergencyInfoLabel, { 
                        backgroundColor: theme.name === 'dark' ? '#2C2C2C' : '#F5F5F5' 
                      }]}>
                        <Text style={[styles.emergencyInfoLabelText, { color: theme.textSecondary }]}>
                          詳細
                        </Text>
                      </View>
                      <Text style={[styles.emergencyInfoValue, { color: theme.text }]}>
                        {message}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[styles.emergencyInfoFooter, { 
                    backgroundColor: theme.name === 'dark' ? '#2C2C2C' : '#FFF3E0' 
                  }]}>
                    <MaterialCommunityIcons 
                      name="shield-alert" 
                      size={16} 
                      color={theme.name === 'dark' ? '#FFB74D' : '#F57C00'} 
                    />
                    <Text style={[styles.emergencyInfoFooterText, { 
                      color: theme.name === 'dark' ? '#FFB74D' : '#F57C00' 
                    }]}>
                      全スタッフに避難指示が通知されています
                    </Text>
                  </View>
                </View>
              )}
            </View>

              {/* 不審者情報 */}
              <View style={styles.card}>
                <SuspiciousPersonList 
                  persons={persons} 
                  onPersonPress={(person) => {
                    if (Platform.OS === 'web') {
                      alert(`詳細\n${person.location}の情報`);
                    } else {
                      const { Alert } = require('react-native');
                      Alert.alert('詳細', `${person.location}の情報`);
                    }
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 通知ポップアップ */}
      <NotificationPopup
        visible={showNotificationPopup}
        data={notificationData}
        onClose={() => setShowNotificationPopup(false)}
        onSend={handleNotificationSend}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
  },
  contentContainerMobile: {
    padding: 8,
  },
  topRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  topRowSmall: {
    gap: 8,
  },
  topRowMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  mobileScheduleRow: {
    marginBottom: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  gridContainerSmall: {
    flexDirection: 'column',
    gap: 20,
  },
  column: {
    flex: 1,
  },
  columnSmall: {
    width: '100%',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  leftCard: {
    marginBottom: 16,
  },
  emergencyInfoCard: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emergencyInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  emergencyInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emergencyInfoContent: {
    padding: 16,
  },
  emergencyInfoRow: {
    marginBottom: 12,
  },
  emergencyInfoLabel: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  emergencyInfoLabelText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emergencyInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  emergencyInfoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  emergencyInfoFooterText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  chartSection: {
    marginTop: 12,
    paddingBottom: 20,
  },
  mockDataNotice: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  mockDataText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default Item9Screen;
