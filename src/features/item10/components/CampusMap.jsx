/**
 * キャンパスマップコンポーネント
 * Google Mapsを使用して近畿大学東大阪キャンパスを表示
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions, useWindowDimensions } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// 近畿大学東大阪キャンパスの座標
// 所在地: 〒577-8502 大阪府東大阪市小若江3-4-1
const KINDAI_CAMPUS = {
  latitude: 34.651251510533875,
  longitude: 135.58943350065954,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export const CampusMap = () => {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const isMobile = width < 480;
  const isSmallScreen = width < 768;
  const [mapError, setMapError] = useState(false);

  // レスポンシブな地図の高さを計算
  const mapHeight = isMobile ? 300 : isSmallScreen ? 400 : 500;

  // Web版: Google Maps iframe
  if (Platform.OS === 'web') {
    const mapUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3282.7976!2d135.6031!3d34.6707!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6000dd8b8d1b1b1b%3A0x1b1b1b1b1b1b1b1b!2z6L-R55WO5aSn5a2m5p2x5aSn6Ziq44Kt44Oj44Oz44OR44K5!5e0!3m2!1sja!2sjp!4v1234567890`;
    
    return (
      <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="map-marker" size={20} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }, isMobile && styles.titleMobile]}>
            キャンパス全体マップ
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.textSecondary }, isMobile && styles.subtitleMobile]}>
          近畿大学 東大阪キャンパス
        </Text>

        <View style={styles.mapContainer}>
          {!mapError ? (
            <iframe
              src={`https://www.google.com/maps?q=34.651251510533875,135.58943350065954&hl=ja&z=16&output=embed`}
              style={{
                width: '100%',
                height: mapHeight,
                border: 0,
                borderRadius: 8,
              }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              onError={() => setMapError(true)}
            />
          ) : (
            <View style={[styles.errorContainer, { backgroundColor: theme.background, height: mapHeight }]}>
              <MaterialCommunityIcons name="map-marker-off" size={isMobile ? 36 : 48} color={theme.textSecondary} />
              <Text style={[styles.errorText, { color: theme.textSecondary }, isMobile && styles.errorTextMobile]}>
                地図を読み込めませんでした
              </Text>
            </View>
          )}
        </View>

        {/* 位置情報 */}
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color={theme.primary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              〒577-8502 大阪府東大阪市小若江3-4-1
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="train" size={16} color={theme.primary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              近鉄大阪線「長瀬駅」徒歩約10分
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // モバイル版: react-native-mapsを使用（別途実装が必要）
  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="map-marker" size={20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>キャンパス全体マップ</Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        近畿大学 東大阪キャンパス
      </Text>

      <View style={[styles.mapPlaceholder, { backgroundColor: theme.background }]}>
        <MaterialCommunityIcons name="map" size={48} color={theme.textSecondary} />
        <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
          モバイルマップは準備中です
        </Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          〒577-8502 大阪府東大阪市小若江3-4-1
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 0,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  titleMobile: {
    fontSize: 14,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  subtitleMobile: {
    fontSize: 12,
    marginBottom: 8,
  },
  mapContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorTextMobile: {
    fontSize: 12,
  },
  mapPlaceholder: {
    height: 300,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 14,
  },
  infoContainer: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
  },
});
