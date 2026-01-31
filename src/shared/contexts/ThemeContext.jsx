/**
 * テーマコンテキスト
 * アプリ全体のテーマ状態を管理
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_MODES, getThemeTokens } from '../utils/themeTokens';
import { themeSettingsService } from '../services/themeSettingsService';
import { AuthContext } from './AuthContext';

export const ThemeContext = createContext();

const THEME_STORAGE_KEY = '@ikomasai_theme';

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(THEME_MODES.LIGHT);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    loadTheme();
  }, [user]);

  const loadTheme = async () => {
    try {
      if (user?.id) {
        const savedTheme = await themeSettingsService.getThemeSettings(user.id);
        if (savedTheme) {
          setThemeMode(savedTheme);
        } else {
          const localTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
          if (localTheme) {
            setThemeMode(localTheme);
          }
        }
      } else {
        const localTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (localTheme) {
          setThemeMode(localTheme);
        }
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeTheme = async (newMode) => {
    try {
      // 光過敏性てんかん対策: フェード処理
      setIsTransitioning(true);
      
      // 500ms待機してからテーマ変更
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setThemeMode(newMode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);

      // テーマ変更後も300ms待機
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setIsTransitioning(false);

      if (user?.id) {
        const success = await themeSettingsService.saveThemeSettings(user.id, newMode);
        return success;
      }
      return true;
    } catch (error) {
      console.error('Failed to change theme:', error);
      setIsTransitioning(false);
      return false;
    }
  };

  const theme = getThemeTokens(themeMode);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        theme,
        changeTheme,
        loading,
        isTransitioning,
      }}
    >
      <>
        {children}
        {isTransitioning && (
          <View style={styles.globalOverlay} />
        )}
      </>
    </ThemeContext.Provider>
  );
};

const styles = StyleSheet.create({
  globalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    opacity: 0.9,
    zIndex: 99999,
  },
});
