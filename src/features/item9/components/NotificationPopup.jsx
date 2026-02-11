import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';

// 通知送信ポップアップ
export const NotificationPopup = ({ visible, data, onClose, onSend }) => {
  if (!visible || !data) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>通知送信</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>送信先:</Text>
            <Text style={styles.value}>{data.to}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>メッセージ:</Text>
            <Text style={styles.message}>{data.message}</Text>
          </View>
          
          {data.additionalInfo && (
            <View style={styles.infoBox}>
              <Text style={styles.info}>{data.additionalInfo}</Text>
            </View>
          )}
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.sendButton]} 
              onPress={onSend}
            >
              <Text style={styles.sendButtonText}>送信</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  row: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  message: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  info: {
    fontSize: 14,
    color: '#1976D2',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  sendButton: {
    backgroundColor: '#2196F3',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  sendButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
