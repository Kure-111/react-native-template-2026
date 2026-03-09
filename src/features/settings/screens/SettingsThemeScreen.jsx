/**
 * テーマ設定画面
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ThemeOptionRow } from '../components/ThemeOptionRow';
import { ThemeStatusText } from '../components/ThemeStatusText';
import { ThemedHeader } from '../../../shared/components/ThemedHeader';
import { THEME_OPTIONS } from '../constants';

export default function SettingsThemeScreen({ navigation }) {
  const { themeMode, theme, changeTheme, isTransitioning } = useTheme();
  const [status, setStatus] = useState(null);

  const handleThemeChange = async (newMode) => {
    setStatus(null);
    const success = await changeTheme(newMode);
    
    if (success) {
      setStatus({ type: 'success', message: '保存しました' });
    } else {
      setStatus({ type: 'error', message: '保存に失敗しました（ローカルに保持）' });
    }

    setTimeout(() => {
      setStatus(null);
    }, 3000);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title="テーマ設定" navigation={navigation} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={[
            styles.subtitle, 
            { 
              color: theme.textSecondary,
              fontSize: theme.fontSize.medium,
            }
          ]}>
            お好みのテーマを選択してください
          </Text>

          <View style={styles.options}>
            {THEME_OPTIONS.map((option) => (
              <ThemeOptionRow
                key={option.value}
                option={option}
                isSelected={themeMode === option.value}
                onSelect={handleThemeChange}
                disabled={isTransitioning}
              />
            ))}
          </View>

          <ThemeStatusText status={status} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  options: {
    marginTop: 8,
  },
});
