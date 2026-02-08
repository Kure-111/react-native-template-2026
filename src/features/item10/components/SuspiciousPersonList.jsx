import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SuspiciousPersonCard } from './SuspiciousPersonCard';

// 不審者リスト
export const SuspiciousPersonList = ({ persons, onPersonPress }) => {
  if (!persons || persons.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="alert-circle" size={20} color="#FF9800" />
          <Text style={styles.title}>不審者情報</Text>
        </View>
        <Text style={styles.noData}>情報がありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="alert-circle" size={20} color="#FF9800" />
        <Text style={styles.title}>不審者情報</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{persons.length}件</Text>
        </View>
      </View>
      <FlatList
        data={persons.slice(0, 3)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SuspiciousPersonCard 
            person={item} 
            onPress={() => onPersonPress && onPersonPress(item)}
          />
        )}
        scrollEnabled={false}
        style={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  badge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF9800',
  },
  noData: {
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 12,
  },
  list: {
    maxHeight: 200,
  },
});
