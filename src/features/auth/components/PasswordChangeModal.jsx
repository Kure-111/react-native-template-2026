/**
 * パスワード変更推奨モーダル
 * 初回ログイン時にパスワード変更を促すモーダルです
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { PASSWORD_MODAL_TEXT } from '../constants.js';

/**
 * パスワード変更推奨モーダルコンポーネント
 * @param {Object} props - プロパティ
 * @param {Boolean} props.visible - モーダルの表示状態
 * @param {Function} props.onChangeNow - 今すぐ変更ボタン押下時のコールバック
 * @param {Function} props.onChangeLater - 後で変更ボタン押下時のコールバック
 */
const PasswordChangeModal = ({ visible, onChangeNow, onChangeLater }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onChangeLater}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* アイコン */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔐</Text>
          </View>

          {/* タイトル */}
          <Text style={styles.title}>{PASSWORD_MODAL_TEXT.TITLE}</Text>

          {/* 説明文 */}
          <Text style={styles.description}>{PASSWORD_MODAL_TEXT.DESCRIPTION}</Text>

          {/* ボタンエリア */}
          <View style={styles.buttonContainer}>
            {/* 今すぐ変更ボタン */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onChangeNow}
              accessibilityRole="button"
              accessibilityLabel="今すぐパスワードを変更"
            >
              <Text style={styles.primaryButtonText}>
                {PASSWORD_MODAL_TEXT.CHANGE_NOW_BUTTON}
              </Text>
            </TouchableOpacity>

            {/* 後で変更ボタン */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onChangeLater}
              accessibilityRole="button"
              accessibilityLabel="後でパスワードを変更"
            >
              <Text style={styles.secondaryButtonText}>
                {PASSWORD_MODAL_TEXT.CHANGE_LATER_BUTTON}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/**
 * スタイル定義
 */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3a3a4e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#999',
    fontSize: 16,
  },
});

export default PasswordChangeModal;
