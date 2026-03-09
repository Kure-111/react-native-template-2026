/**
 * パスワード変更成功モーダル
 * パスワード変更が成功した時に表示するモーダルです
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { PASSWORD_SUCCESS_TEXT } from '../constants.js';

/**
 * パスワード変更成功モーダルコンポーネント
 * @param {Object} props - プロパティ
 * @param {Boolean} props.visible - モーダルの表示状態
 * @param {Function} props.onClose - 閉じるボタン押下時のコールバック
 */
const PasswordSuccessModal = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* アイコン */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>✅</Text>
          </View>

          {/* タイトル */}
          <Text style={styles.title}>{PASSWORD_SUCCESS_TEXT.TITLE}</Text>

          {/* 説明文 */}
          <Text style={styles.description}>{PASSWORD_SUCCESS_TEXT.DESCRIPTION}</Text>

          {/* OKボタン */}
          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="OK"
          >
            <Text style={styles.buttonText}>{PASSWORD_SUCCESS_TEXT.OK_BUTTON}</Text>
          </TouchableOpacity>
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
    backgroundColor: '#1a3a1a',
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
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PasswordSuccessModal;
