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

export const ThemeOptionRow = ({ option, isSelected, onSelect, disabled }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { 
          backgroundColor: theme.surface,
          borderColor: isSelected ? theme.primary : theme.border,
          borderWidth: isSelected ? 2 : 1,
          borderRadius: theme.borderRadius,
          opacity: disabled ? 0.5 : 1,
        }
      ]}
      onPress={() => !disabled && onSelect(option.value)}
      disabled={disabled}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.emoji}>{option.icon}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.label, { color: theme.text, fontWeight: theme.fontWeight }]}>
            {option.label}
          </Text>
          {option.description && (
            <Text style={[styles.description, { color: theme.textSecondary, fontSize: theme.fontSize.small }]}>
              {option.description}
            </Text>
          )}
        </View>
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
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 12,
    width: 32,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
  },
  description: {
    marginTop: 2,
  },
});
