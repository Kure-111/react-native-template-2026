import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 天気情報表示（降水量mm/h含む）
export const WeatherInfo = ({ weather, rainfall }) => {
  if (!weather) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>天気情報</Text>
        <Text style={styles.noData}>データ取得中...</Text>
      </View>
    );
  }

  const weatherDescription = weather.weather?.[0]?.description || '情報なし';
  const temp = weather.main?.temp?.toFixed(1) || '--';
  const humidity = weather.main?.humidity || '--';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>天気情報</Text>
      <View style={styles.infoRow}>
        <Text style={styles.label}>天気:</Text>
        <Text style={styles.value}>{weatherDescription}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>気温:</Text>
        <Text style={styles.value}>{temp}°C</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>湿度:</Text>
        <Text style={styles.value}>{humidity}%</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>降水量:</Text>
        <Text style={[styles.value, rainfall > 0 && styles.rainfallAlert]}>
          {rainfall.toFixed(1)} mm/h
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  noData: {
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  rainfallAlert: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
});
