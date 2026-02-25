import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '../../../shared/components/icons';
import { Ionicons } from '../../../shared/components/icons';
import { useTheme } from '../../../shared/hooks/useTheme';

// 天気アイコンを取得
const getWeatherIcon = (description) => {
  const desc = description.toLowerCase();
  if (desc.includes('晴') || desc.includes('clear')) return { name: 'weather-sunny', color: '#FFA000' };
  if (desc.includes('曇') || desc.includes('cloud')) return { name: 'weather-cloudy', color: '#757575' };
  if (desc.includes('雨') || desc.includes('rain')) return { name: 'weather-rainy', color: '#2196F3' };
  if (desc.includes('雪') || desc.includes('snow')) return { name: 'weather-snowy', color: '#81D4FA' };
  if (desc.includes('雷') || desc.includes('thunder')) return { name: 'weather-lightning', color: '#FBC02D' };
  return { name: 'weather-partly-cloudy', color: '#FFB74D' };
};

// 天気情報表示（降水量mm/h含む）
export const WeatherInfo = ({ weather, rainfall }) => {
  const { theme } = useTheme();
  
  if (!weather) {
    return (
      <View style={[styles.container, { 
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>天気データ取得中...</Text>
      </View>
    );
  }

  const weatherDescription = weather.weather?.[0]?.description || '情報なし';
  const temp = weather.main?.temp?.toFixed(1) || '--';
  const humidity = weather.main?.humidity || '--';
  const weatherIcon = getWeatherIcon(weatherDescription);

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.surface,
      borderColor: theme.border,
    }]}>
      <View style={styles.mainRow}>
        <View style={[styles.iconBox, { backgroundColor: theme.name === 'dark' ? 'rgba(255, 193, 7, 0.1)' : '#FFF8E1' }]}>
          <MaterialCommunityIcons name={weatherIcon.name} size={56} color={weatherIcon.color} />
        </View>
        <View style={styles.tempBox}>
          <Text style={[styles.temp, { color: theme.name === 'dark' ? '#FFB74D' : '#FF6F00' }]}>{temp}</Text>
          <Text style={[styles.tempUnit, { color: theme.name === 'dark' ? '#FFB74D' : '#FF6F00' }]}>°C</Text>
        </View>
        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Ionicons name="water" size={20} color="#2196F3" />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>{humidity}%</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="weather-pouring" size={20} color={rainfall > 0 ? "#F44336" : theme.textSecondary} />
            <Text style={[styles.detailText, { color: theme.textSecondary }, rainfall > 0 && styles.rainfallAlert]}>
              {rainfall.toFixed(1)}mm
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 20,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tempBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  temp: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  tempUnit: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 6,
  },
  detailsBox: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 16,
    fontWeight: '600',
  },
  rainfallAlert: {
    color: '#F44336',
  },
});
