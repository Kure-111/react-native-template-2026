/**
 * 通知テスト画面
 * 開発・テスト用に通知を手動で送信できる画面
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { sendNotification } from '../../../shared/services/sendNotification';
import { NOTIFICATION_TYPES } from '../constants/notificationType';
import { USER_ROLES } from '../../../shared/constants/userRoles';

export default function NotificationTestScreen() {
  const [type, setType] = useState('info');
  const [title, setTitle] = useState('テスト通知');
  const [message, setMessage] = useState('これはテスト通知です');
  const [selectedRoles, setSelectedRoles] = useState(['staff']);
  const [deepLink, setDeepLink] = useState('');
  const [sending, setSending] = useState(false);

  const notificationTypes = Object.keys(NOTIFICATION_TYPES);
  const userRoles = Object.values(USER_ROLES);

  const toggleRole = (role) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleSend = async () => {
    if (selectedRoles.length === 0) {
      Alert.alert('エラー', '少なくとも1つのロールを選択してください');
      return;
    }

    setSending(true);
    try {
      const result = await sendNotification({
        type,
        message,
        recipientRoles: selectedRoles,
        title: title || undefined,
        deepLink: deepLink || undefined
      });

      if (result.success) {
        Alert.alert('成功', `通知を送信しました\nID: ${result.notificationId}`);
        console.log('通知送信成功:', result);
      } else {
        Alert.alert('失敗', result.error || '通知の送信に失敗しました');
        console.error('通知送信失敗:', result.error);
      }
    } catch (error) {
      Alert.alert('エラー', error.message);
      console.error('通知送信エラー:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>通知テスト</Text>
        <Text style={styles.description}>
          開発・テスト用の通知送信画面です
        </Text>

        {/* 通知タイプ */}
        <View style={styles.section}>
          <Text style={styles.label}>通知タイプ</Text>
          <View style={styles.buttonGroup}>
            {notificationTypes.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={[
                  styles.typeButton,
                  type === t && styles.typeButtonActive
                ]}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === t && styles.typeButtonTextActive
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* タイトル */}
        <View style={styles.section}>
          <Text style={styles.label}>タイトル</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="通知のタイトル"
          />
        </View>

        {/* メッセージ */}
        <View style={styles.section}>
          <Text style={styles.label}>メッセージ *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="通知のメッセージ本文"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* 受信者ロール */}
        <View style={styles.section}>
          <Text style={styles.label}>受信者ロール *</Text>
          <View style={styles.roleGrid}>
            {userRoles.map((role) => (
              <TouchableOpacity
                key={role}
                onPress={() => toggleRole(role)}
                style={[
                  styles.roleButton,
                  selectedRoles.includes(role) && styles.roleButtonActive
                ]}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    selectedRoles.includes(role) && styles.roleButtonTextActive
                  ]}
                >
                  {role}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ディープリンク */}
        <View style={styles.section}>
          <Text style={styles.label}>ディープリンク（オプション）</Text>
          <TextInput
            style={styles.input}
            value={deepLink}
            onChangeText={setDeepLink}
            placeholder="/item1"
          />
        </View>

        {/* 送信ボタン */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending}
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
        >
          <Text style={styles.sendButtonText}>
            {sending ? '送信中...' : '通知を送信'}
          </Text>
        </TouchableOpacity>

        {/* 選択中のロール表示 */}
        {selectedRoles.length > 0 && (
          <View style={styles.selectedRolesContainer}>
            <Text style={styles.selectedRolesLabel}>
              選択中: {selectedRoles.length}件
            </Text>
            <Text style={styles.selectedRolesText}>
              {selectedRoles.join(', ')}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  content: {
    padding: 20,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%'
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24
  },
  section: {
    marginBottom: 24
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827'
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6
  },
  typeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6'
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280'
  },
  typeButtonTextActive: {
    color: '#ffffff'
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  roleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6
  },
  roleButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981'
  },
  roleButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280'
  },
  roleButtonTextActive: {
    color: '#ffffff'
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF'
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff'
  },
  selectedRolesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  selectedRolesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4
  },
  selectedRolesText: {
    fontSize: 14,
    color: '#3B82F6'
  }
});
