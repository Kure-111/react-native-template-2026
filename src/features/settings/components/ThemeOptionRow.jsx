/**
 * テーマ選択肢コンポーネント
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/hooks/useTheme';

const IconComponent = ({ iconFamily, iconName, color, size }) => {
  const Icon = iconFamily === 'Ionicons' ? Ionicons : MaterialCommunityIcons;
  return <Icon name={iconName} size={size} color={color} />;
};

export const ThemeOptionRow = ({ option, isSelected, onSelect }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { 
          backgroundColor: theme.surface,
          borderColor: isSelected ? theme.primary : theme.border,
          borderWidth: isSelected ? 2 : 1,
        }
      ]}
      onPress={() => onSelect(option.value)}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconComponent 
            iconFamily={option.iconFamily}
            iconName={option.iconName}
            color={isSelected ? theme.primary : theme.text}
            size={24}
          />
        </View>
        <Text style={[styles.label, { color: theme.text }]}>{option.label}</Text>
      </View>
      {isSelected && (
        <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginVertical: 6,
    borderRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
    width: 28,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
});
