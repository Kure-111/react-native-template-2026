/**
 * パスワード変更フォーム
 * パスワード変更の入力フォームを提供します
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { PASSWORD_CHANGE_SCREEN_TEXT } from '../constants.js';

/**
 * パスワード変更フォームコンポーネント
 * @param {Object} props - プロパティ
 * @param {String} props.currentPassword - 現在のパスワード
 * @param {Function} props.onCurrentPasswordChange - 現在のパスワード変更時のコールバック
 * @param {String} props.newPassword - 新しいパスワード
 * @param {Function} props.onNewPasswordChange - 新しいパスワード変更時のコールバック
 * @param {String} props.confirmPassword - 確認用パスワード
 * @param {Function} props.onConfirmPasswordChange - 確認用パスワード変更時のコールバック
 * @param {Object} props.errors - エラー状態
 * @param {Function} props.onClearError - エラークリア時のコールバック
 * @param {Boolean} props.isSubmitting - 送信中フラグ
 * @param {Function} props.onSubmit - 送信時のコールバック
 * @param {Function} props.onCancel - キャンセル時のコールバック
 */
const PasswordChangeForm = ({
  currentPassword,
  onCurrentPasswordChange,
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  errors,
  onClearError,
  isSubmitting,
  onSubmit,
  onCancel,
}) => {
  /**
   * 入力時にエラーをクリア
   * @param {String} field - フィールド名
   * @param {Function} setValue - 値を設定する関数
   * @param {String} value - 新しい値
   */
  const handleInputChange = (field, setValue, value) => {
    setValue(value);
    if (errors[field]) {
      onClearError(field);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {/* タイトル */}
          <Text style={styles.title}>{PASSWORD_CHANGE_SCREEN_TEXT.TITLE}</Text>

          {/* 全体エラーメッセージ */}
          {errors.general ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          ) : null}

          {/* フォーム */}
          <View style={styles.form}>
            {/* 現在のパスワード */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {PASSWORD_CHANGE_SCREEN_TEXT.CURRENT_PASSWORD_LABEL}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  errors.currentPassword ? styles.inputError : null,
                ]}
                placeholder={PASSWORD_CHANGE_SCREEN_TEXT.CURRENT_PASSWORD_PLACEHOLDER}
                placeholderTextColor="#999"
                value={currentPassword}
                onChangeText={(value) =>
                  handleInputChange('currentPassword', onCurrentPasswordChange, value)
                }
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
              {errors.currentPassword ? (
                <Text style={styles.fieldError}>{errors.currentPassword}</Text>
              ) : null}
            </View>

            {/* 新しいパスワード */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {PASSWORD_CHANGE_SCREEN_TEXT.NEW_PASSWORD_LABEL}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  errors.newPassword ? styles.inputError : null,
                ]}
                placeholder={PASSWORD_CHANGE_SCREEN_TEXT.NEW_PASSWORD_PLACEHOLDER}
                placeholderTextColor="#999"
                value={newPassword}
                onChangeText={(value) =>
                  handleInputChange('newPassword', onNewPasswordChange, value)
                }
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
              {errors.newPassword ? (
                <Text style={styles.fieldError}>{errors.newPassword}</Text>
              ) : null}
            </View>

            {/* 確認用パスワード */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {PASSWORD_CHANGE_SCREEN_TEXT.CONFIRM_PASSWORD_LABEL}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  errors.confirmPassword ? styles.inputError : null,
                ]}
                placeholder={PASSWORD_CHANGE_SCREEN_TEXT.CONFIRM_PASSWORD_PLACEHOLDER}
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={(value) =>
                  handleInputChange('confirmPassword', onConfirmPasswordChange, value)
                }
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
              {errors.confirmPassword ? (
                <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
              ) : null}
            </View>

            {/* 送信ボタン */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="パスワードを変更"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {PASSWORD_CHANGE_SCREEN_TEXT.SUBMIT_BUTTON}
                </Text>
              )}
            </TouchableOpacity>

            {/* キャンセルボタン */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="キャンセル"
            >
              <Text style={styles.cancelButtonText}>
                {PASSWORD_CHANGE_SCREEN_TEXT.CANCEL_BUTTON}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/**
 * スタイル定義
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 32,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a1a1a',
    borderWidth: 1,
    borderColor: '#ff3b30',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    flex: 1,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#2a2a3e',
    borderWidth: 1,
    borderColor: '#3a3a4e',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  fieldError: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#555',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 16,
  },
});

export default PasswordChangeForm;
