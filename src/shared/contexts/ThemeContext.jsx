/**
 * テーマコンテキスト
 * アプリ全体のテーマ状態を管理
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_MODES, getThemeTokens } from '../utils/themeTokens';
import { themeSettingsService } from '../services/themeSettingsService';
import { AuthContext } from './AuthContext';

export const ThemeContext = createContext();

const THEME_STORAGE_KEY = '@ikomasai_theme';

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(THEME_MODES.LIGHT);
  const [loading, setLoading] = useState(true);
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
      setThemeMode(newMode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);

      if (user?.id) {
        const success = await themeSettingsService.saveThemeSettings(user.id, newMode);
        return success;
      }
      return true;
    } catch (error) {
      console.error('Failed to change theme:', error);
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
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
