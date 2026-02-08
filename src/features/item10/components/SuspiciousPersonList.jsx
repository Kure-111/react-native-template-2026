import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SuspiciousPersonCard } from './SuspiciousPersonCard';

// 不審者リスト
export const SuspiciousPersonList = ({ persons, onPersonPress }) => {
  if (!persons || persons.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>不審者情報</Text>
        <Text style={styles.noData}>情報がありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>不審者情報（最新{persons.length}件）</Text>
      <FlatList
        data={persons}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SuspiciousPersonCard 
            person={item} 
            onPress={() => onPersonPress && onPersonPress(item)}
          />
        )}
        scrollEnabled={false}
      />
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
});
