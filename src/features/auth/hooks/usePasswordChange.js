/**
 * パスワード変更カスタムフック
 * パスワード変更のロジックとバリデーションを提供します
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext.js';
import { verifyCurrentPassword, changePassword } from '../services/passwordService.js';
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_ERROR_MESSAGES,
} from '../constants.js';

/**
 * パスワード変更フック
 * @returns {Object} パスワード変更に必要な状態と関数
 */
export const usePasswordChange = () => {
  // 認証コンテキストからユーザー情報を取得
  const { user, userInfo, login } = useAuth();

  // 入力状態
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 処理状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // エラー状態
  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    general: '',
  });

  /**
   * 入力値をリセット
   */
  const resetForm = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      general: '',
    });
    setIsSuccess(false);
  }, []);

  /**
   * 特定のフィールドのエラーをクリア
   * @param {String} field - フィールド名
   */
  const clearError = useCallback((field) => {
    setErrors((prev) => ({
      ...prev,
      [field]: '',
    }));
  }, []);

  /**
   * 入力値のバリデーション
   * @returns {Boolean} バリデーション結果（成功: true, 失敗: false）
   */
  const validateInputs = useCallback(() => {
    const newErrors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      general: '',
    };

    let isValid = true;

    // 現在のパスワードのバリデーション
    if (!currentPassword) {
      newErrors.currentPassword = PASSWORD_ERROR_MESSAGES.CURRENT_PASSWORD_REQUIRED;
      isValid = false;
    }

    // 新しいパスワードのバリデーション
    if (!newPassword) {
      newErrors.newPassword = PASSWORD_ERROR_MESSAGES.NEW_PASSWORD_REQUIRED;
      isValid = false;
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      newErrors.newPassword = PASSWORD_ERROR_MESSAGES.NEW_PASSWORD_TOO_SHORT;
      isValid = false;
    } else if (newPassword === currentPassword) {
      newErrors.newPassword = PASSWORD_ERROR_MESSAGES.SAME_AS_CURRENT;
      isValid = false;
    }

    // 確認用パスワードのバリデーション
    if (!confirmPassword) {
      newErrors.confirmPassword = PASSWORD_ERROR_MESSAGES.CONFIRM_PASSWORD_REQUIRED;
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = PASSWORD_ERROR_MESSAGES.PASSWORD_MISMATCH;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }, [currentPassword, newPassword, confirmPassword]);

  /**
   * パスワード変更を実行
   * @returns {Promise<Object>} 変更結果（success, error）
   */
  const handleChangePassword = useCallback(async () => {
    // 入力バリデーション
    if (!validateInputs()) {
      return { success: false, error: 'バリデーションエラー' };
    }

    // ユーザー情報チェック
    if (!user || !user.email) {
      setErrors((prev) => ({
        ...prev,
        general: PASSWORD_ERROR_MESSAGES.NETWORK_ERROR,
      }));
      return { success: false, error: 'ユーザー情報が取得できません' };
    }

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, general: '' }));

    try {
      // 1. 現在のパスワードを検証
      const verifyResult = await verifyCurrentPassword(user.email, currentPassword);

      if (!verifyResult.success) {
        setErrors((prev) => ({
          ...prev,
          currentPassword: verifyResult.error,
        }));
        setIsSubmitting(false);
        return { success: false, error: verifyResult.error };
      }

      // 2. パスワードを変更
      const changeResult = await changePassword(user.id, newPassword);

      if (!changeResult.success) {
        setErrors((prev) => ({
          ...prev,
          general: changeResult.error,
        }));
        setIsSubmitting(false);
        return { success: false, error: changeResult.error };
      }

      // 3. 成功
      setIsSuccess(true);
      setIsSubmitting(false);
      return { success: true, error: null };
    } catch (error) {
      console.error('パスワード変更処理でエラーが発生:', error);
      setErrors((prev) => ({
        ...prev,
        general: PASSWORD_ERROR_MESSAGES.NETWORK_ERROR,
      }));
      setIsSubmitting(false);
      return { success: false, error: error.message };
    }
  }, [user, currentPassword, newPassword, validateInputs]);

  return {
    // 入力状態
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,

    // 処理状態
    isSubmitting,
    isSuccess,

    // エラー状態
    errors,
    clearError,

    // 関数
    handleChangePassword,
    resetForm,
    validateInputs,
  };
};

export default usePasswordChange;
