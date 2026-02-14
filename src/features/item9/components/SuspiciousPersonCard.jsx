import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { URGENCY_COLORS } from '../constants';

// 不審者情報カード
export const SuspiciousPersonCard = ({ person, onPress }) => {
  const urgencyColor = URGENCY_COLORS[person.urgency_level] || '#999';
  const statusText = {
    pending: '未対応',
    in_progress: '対応中',
    resolved: '対応済み',
  }[person.status] || person.status;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[styles.urgencyIndicator, { backgroundColor: urgencyColor }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.location}>{person.location}</Text>
          <Text style={styles.status}>{statusText}</Text>
        </View>
        <Text style={styles.time}>
          {new Date(person.discovered_at).toLocaleString('ja-JP')}
        </Text>
        {person.description && (
          <Text style={styles.description} numberOfLines={2}>
            {person.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 6,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  urgencyIndicator: {
    width: 6,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  location: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  status: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
});
