/**
 * Item10 メイン画面（実長システム）
 * 来場者数、不審者情報、天気情報、緊急モードなどを統合表示
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Platform, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ThemedHeader } from '../../../shared/components/ThemedHeader';

// Components
import { VisitorCounter } from '../components/VisitorCounter';
import { CountHistoryChart } from '../components/CountHistoryChart';
import { VisitorTrendChart } from '../components/VisitorTrendChart';
import { SuspiciousPersonList } from '../components/SuspiciousPersonList';
import { DigitalClock } from '../components/DigitalClock';
import { WeatherInfo } from '../components/WeatherInfo';
import { EmergencyModeToggle } from '../components/EmergencyModeToggle';
import { EmergencyTypeSelector } from '../components/EmergencyTypeSelector';
import { EmergencyMessageInput } from '../components/EmergencyMessageInput';
import { NotificationPopup } from '../components/NotificationPopup';

// Hooks
import { useVisitorCount } from '../hooks/useVisitorCount';
import { useSuspiciousPersons } from '../hooks/useSuspiciousPersons';
import { useWeatherData } from '../hooks/useWeatherData';
import { useEmergencyMode } from '../hooks/useEmergencyMode';

// Constants
import { DEFAULT_LOCATION, DISASTER_TYPE_LABELS } from '../constants';

/** 画面名 */
const SCREEN_NAME = '実長機能';

/**
 * Item10 メイン画面コンポーネント
 */
const Item10Screen = ({ navigation }) => {
  const { theme } = useTheme();
  
  // Hooks
  const { count, history, loading: visitorLoading, fetchHistory } = useVisitorCount();
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
    setDisasterType,
    setMessage,
    activate,
    deactivate,
  } = useEmergencyMode();

  // Local state
  const [selectedDisasterType, setSelectedDisasterType] = useState('');
  const [emergencyMessage, setEmergencyMessage] = useState('');

  // 今日の日付で履歴を取得
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    fetchHistory(today);
  }, []);

  // 緊急モード切替ハンドラ
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
    } else {
      // 発動確認
      if (!selectedDisasterType) {
        if (Platform.OS === 'web') {
          alert('災害種別を選択してください');
        } else {
          const { Alert } = require('react-native');
          Alert.alert('エラー', '災害種別を選択してください');
        }
        return;
      }
      if (!emergencyMessage.trim()) {
        if (Platform.OS === 'web') {
          alert('詳細メッセージを入力してください');
        } else {
          const { Alert } = require('react-native');
          Alert.alert('エラー', '詳細メッセージを入力してください');
        }
        return;
      }

      const message = `${DISASTER_TYPE_LABELS[selectedDisasterType]}の緊急モードを発動しますか？\n\n${emergencyMessage}`;
      
      if (Platform.OS === 'web') {
        if (window.confirm(message)) {
          activate('current-user-id', selectedDisasterType, emergencyMessage);
        }
      } else {
        const { Alert } = require('react-native');
        Alert.alert(
          '緊急モード発動',
          message,
          [
            { text: 'いいえ', style: 'cancel' },
            {
              text: 'はい',
              onPress: () => {
                activate('current-user-id', selectedDisasterType, emergencyMessage);
              },
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
      
      <ScrollView 
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 上部: デジタル時計 */}
        <View style={styles.topRow}>
          <DigitalClock />
        </View>

        {/* メインコンテンツ: 2列グリッド */}
        <View style={styles.gridContainer}>
          {/* 左列 */}
          <View style={styles.column}>
            {/* 来場者カウンター */}
            <View style={styles.leftCard}>
              <VisitorCounter count={count} />
            </View>

            {/* 天気情報 */}
            <View style={styles.leftCard}>
              <WeatherInfo weather={weather} rainfall={rainfall} />
            </View>
          </View>

          {/* 右列 */}
          <View style={styles.column}>
            {/* 緊急モード */}
            <View style={styles.card}>
              <EmergencyModeToggle
                isEmergency={isEmergency}
                onToggle={handleEmergencyToggle}
                disabled={emergencyLoading}
              />
              
              {!isEmergency && (
                <View style={styles.emergencyControls}>
                  <EmergencyTypeSelector
                    value={selectedDisasterType}
                    onValueChange={setSelectedDisasterType}
                    disabled={isEmergency}
                  />
                  <EmergencyMessageInput
                    value={emergencyMessage}
                    onChangeText={setEmergencyMessage}
                    disabled={isEmergency}
                  />
                </View>
              )}

              {isEmergency && (
                <View style={[styles.emergencyInfo, { 
                  backgroundColor: theme.name === 'dark' ? '#4A1212' : '#FFEBEE',
                  borderLeftColor: theme.name === 'dark' ? '#FF5252' : '#F44336'
                }]}>
                  <Text style={[styles.emergencyInfoText, { color: theme.text }]}>
                    災害: {DISASTER_TYPE_LABELS[disasterType]}
                  </Text>
                  <Text style={[styles.emergencyInfoText, { color: theme.text }]}>
                    詳細: {message}
                  </Text>
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

        {/* グラフエリア */}
        <View style={styles.chartSection}>
          {/* 折れ線グラフ */}
          <VisitorTrendChart history={history} />
          
          {/* 棒グラフ */}
          <CountHistoryChart history={history} />
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
  contentContainer: {
    flex: 1,
    padding: 12,
  },
  topRow: {
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 400,
  },
  column: {
    flex: 1,
  },
  card: {
    marginBottom: 12,
  },
  leftCard: {
    marginBottom: 12,
  },
  emergencyControls: {
    marginTop: 12,
    gap: 8,
  },
  emergencyInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  emergencyInfoText: {
    fontSize: 12,
    color: '#F44336',
    marginBottom: 4,
    fontWeight: '600',
  },
  chartSection: {
    marginTop: 12,
    paddingBottom: 20,
  },
});

export default Item10Screen;
