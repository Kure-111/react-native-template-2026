/**
 * ログイン画面
 * メールアドレスとパスワードでログインします
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../../shared/contexts/AuthContext.js';
import { useTheme } from '../../../shared/hooks/useTheme';

/**
 * ログイン画面コンポーネント
 */
const LoginScreen = () => {
  // 入力値の状態管理
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 認証コンテキストから login 関数を取得
  const { login } = useAuth();
  // テーマを取得
  const { theme } = useTheme();

  /**
   * ログインボタン押下時の処理
   */
  const handleLogin = async () => {
    // エラーメッセージをクリア
    setErrorMessage('');

    // バリデーション
    if (!email || !password) {
      setErrorMessage('メールアドレスとパスワードを入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const { success, error } = await login(email, password);

      if (!success) {
        setErrorMessage('メールアドレスまたはパスワードが異なります');
        setIsSubmitting(false);
        return;
      }

      // ログイン成功時は AuthContext が自動的に画面遷移を処理
    } catch (error) {
      console.error('ログイン処理でエラーが発生:', error);
      setErrorMessage('ログイン処理中にエラーが発生しました');
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* タイトル */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>生駒祭 ERP</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>2026</Text>
        </View>

        {/* ログインフォーム */}
        <View style={styles.form}>
          {/* エラーメッセージ */}
          {errorMessage ? (
            <View style={[styles.errorContainer, { backgroundColor: theme.error + '20', borderColor: theme.error }]}>
              <Text style={[styles.errorText, { color: theme.error }]}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* メールアドレス入力 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>メールアドレス</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="example@example.com"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
          </View>

          {/* パスワード入力 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>パスワード</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="パスワードを入力"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
          </View>

          {/* ログインボタン */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: isSubmitting ? theme.textSecondary : theme.primary }]}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>ログイン</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* フッター */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            アカウントをお持ちでない場合は、管理者にお問い合わせください
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

/**
 * スタイル定義
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  errorContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default LoginScreen;
