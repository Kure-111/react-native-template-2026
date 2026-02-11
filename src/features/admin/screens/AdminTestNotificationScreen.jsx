/**
 * 管理者向けテスト通知送信画面
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { ThemedHeader } from '../../../shared/components/ThemedHeader';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { isAdmin } from '../../../services/supabase/permissionService';
import {
  getRoles,
  getUsersByRole,
  getUserProfilesByIds,
  sendNotificationToRoles,
  sendNotificationToUser,
} from '../../../shared/services/notificationService';

const SCREEN_NAME = '通知送信（管理者）';

const DropdownSelect = ({
  label,
  placeholder,
  items,
  selectedId,
  onSelect,
  theme,
  isOpen,
  onOpen,
  onClose,
}) => {
  const selectedItem = items.find((item) => item.id === selectedId);

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.dropdownButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
        onPress={onOpen}
      >
        <Text style={{ color: selectedItem ? theme.text : theme.textSecondary }}>
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{label}</Text>
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      { borderColor: theme.border, backgroundColor: isSelected ? theme.primary : 'transparent' },
                    ]}
                    onPress={() => {
                      onSelect(item.id);
                      onClose();
                    }}
                  >
                    <Text style={{ color: isSelected ? '#fff' : theme.text }}>{item.label}</Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.helperText, { color: theme.textSecondary }]}>選択肢がありません</Text>
              }
            />
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Text style={{ color: theme.text }}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const AdminTestNotificationScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { userInfo, user } = useAuth();
  const isUserAdmin = useMemo(() => isAdmin(userInfo?.roles || []), [userInfo?.roles]);

  const [targetType, setTargetType] = useState('user');
  const [roles, setRoles] = useState([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [userSelectMode, setUserSelectMode] = useState('userId');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetRoleIdForUser, setTargetRoleIdForUser] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserIdByRole, setSelectedUserIdByRole] = useState('');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadRoles = async () => {
      const { roles: data, error } = await getRoles();
      if (!error) {
        setRoles(data);
      }
    };
    loadRoles();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      if (!targetRoleIdForUser) {
        setAvailableUsers([]);
        setSelectedUserIdByRole('');
        return;
      }
      const { users, error: usersError } = await getUsersByRole(targetRoleIdForUser);
      if (usersError) {
        setAvailableUsers([]);
        return;
      }
      const { profiles, error: profileError } = await getUserProfilesByIds(users);
      if (profileError) {
        setAvailableUsers([]);
        return;
      }
      const sorted = [...profiles].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setAvailableUsers(
        sorted.map((profile) => ({
          id: profile.user_id,
          label: profile.name || '（名前なし）',
        }))
      );
      setSelectedUserIdByRole('');
    };
    loadUsers();
  }, [targetRoleIdForUser]);

  const toggleRole = (roleId) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSelectAllRoles = () => {
    setSelectedRoleIds(roles.map((role) => role.id));
  };

  const handleClearRoles = () => {
    setSelectedRoleIds([]);
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setStatusMessage('');

    if (title.trim() === '') {
      setErrorMessage('タイトルは必須です');
      return;
    }

    setIsSubmitting(true);
    if (targetType === 'user') {
      let resolvedUserId = '';
      if (userSelectMode === 'userId') {
        if (targetUserId.trim() === '') {
          setErrorMessage('送信先ユーザーIDを入力してください');
          setIsSubmitting(false);
          return;
        }
        resolvedUserId = targetUserId.trim();
      } else {
        if (!targetRoleIdForUser) {
          setErrorMessage('送信先ロールを選択してください');
          setIsSubmitting(false);
          return;
        }
        if (!selectedUserIdByRole) {
          setErrorMessage('送信先の氏名を選択してください');
          setIsSubmitting(false);
          return;
        }
        resolvedUserId = selectedUserIdByRole;
      }

      const result = await sendNotificationToUser(
        resolvedUserId,
        title.trim(),
        body.trim(),
        {},
        user?.id ?? null
      );
      if (result.error) {
        setErrorMessage('通知送信に失敗しました');
      } else {
        const pushText = result.push
          ? ` / Push: ${result.push.succeeded}/${result.push.attempted}（失敗${result.push.failed}）`
          : '';
        setStatusMessage(`送信完了: ${result.notification.id}（1件）${pushText}`);
        setTargetUserId('');
        setTargetRoleIdForUser('');
        setAvailableUsers([]);
        setSelectedUserIdByRole('');
        setTitle('');
        setBody('');
      }
    } else {
      if (selectedRoleIds.length === 0) {
        setErrorMessage('送信先ロールを選択してください');
        setIsSubmitting(false);
        return;
      }
      const result = await sendNotificationToRoles(
        selectedRoleIds,
        title.trim(),
        body.trim(),
        {},
        user?.id ?? null
      );
      if (result.error) {
        setErrorMessage('通知送信に失敗しました');
      } else {
        const pushText = result.push
          ? ` / Push: ${result.push.succeeded}/${result.push.attempted}（失敗${result.push.failed}）`
          : '';
        setStatusMessage(`送信完了: ${result.notification.id}（${result.recipientsCount}件）${pushText}`);
        setSelectedRoleIds([]);
        setTitle('');
        setBody('');
      }
    }
    setIsSubmitting(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />
      {!isUserAdmin ? (
        <View style={styles.content}>
          <Text style={[styles.errorText, { color: theme.error }]}>
            この画面は管理者のみ利用できます
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>対象タイプ</Text>
          <View style={styles.segment}>
            {['user', 'role'].map((type) => {
              const label = type === 'user' ? '個人' : 'ロール';
              const isSelected = targetType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setTargetType(type)}
                >
                  <Text style={{ color: isSelected ? '#fff' : theme.text }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {targetType === 'user' ? (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>送信方法</Text>
              <View style={styles.segment}>
                {[
                  { key: 'userId', label: 'ユーザーID' },
                  { key: 'roleName', label: 'ロール + 氏名' },
                ].map((mode) => {
                  const isSelected = userSelectMode === mode.key;
                  return (
                    <TouchableOpacity
                      key={mode.key}
                      style={[
                        styles.segmentButton,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.surface,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => setUserSelectMode(mode.key)}
                    >
                      <Text style={{ color: isSelected ? '#fff' : theme.text }}>{mode.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {userSelectMode === 'userId' ? (
                <>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>送信先ユーザーID</Text>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    placeholder="ユーザーIDを入力"
                    placeholderTextColor={theme.textSecondary}
                    value={targetUserId}
                    onChangeText={setTargetUserId}
                    autoCapitalize="none"
                  />
                </>
              ) : (
                <>
                  <DropdownSelect
                    label="送信先ロール"
                    placeholder="ロールを選択"
                    items={roles.map((role) => ({
                      id: role.id,
                      label: role.display_name || role.name,
                    }))}
                    selectedId={targetRoleIdForUser}
                    onSelect={setTargetRoleIdForUser}
                    theme={theme}
                    isOpen={roleDropdownOpen}
                    onOpen={() => setRoleDropdownOpen(true)}
                    onClose={() => setRoleDropdownOpen(false)}
                  />

                  <DropdownSelect
                    label="送信先氏名"
                    placeholder="氏名を選択"
                    items={availableUsers}
                    selectedId={selectedUserIdByRole}
                    onSelect={setSelectedUserIdByRole}
                    theme={theme}
                    isOpen={userDropdownOpen}
                    onOpen={() => setUserDropdownOpen(true)}
                    onClose={() => setUserDropdownOpen(false)}
                  />
                </>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>送信先ロール（複数選択可）</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: theme.border }]}
                  onPress={handleSelectAllRoles}
                >
                  <Text style={{ color: theme.text }}>全選択</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: theme.border }]}
                  onPress={handleClearRoles}
                >
                  <Text style={{ color: theme.text }}>全解除</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.roleList}>
                {roles.map((role) => {
                  const isSelected = selectedRoleIds.includes(role.id);
                  return (
                    <TouchableOpacity
                      key={role.id}
                      style={[
                        styles.roleItem,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.surface,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => toggleRole(role.id)}
                    >
                      <Text style={{ color: isSelected ? '#fff' : theme.text }}>
                        {role.display_name || role.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <Text style={[styles.sectionTitle, { color: theme.text }]}>通知タイトル（必須）</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder="タイトルを入力"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={[styles.sectionTitle, { color: theme.text }]}>通知本文</Text>
          <TextInput
            style={[styles.textArea, { color: theme.text, borderColor: theme.border }]}
            placeholder="本文を入力"
            placeholderTextColor={theme.textSecondary}
            value={body}
            onChangeText={setBody}
            multiline
          />

          {statusMessage !== '' && (
            <Text style={[styles.statusText, { color: theme.primary }]}>{statusMessage}</Text>
          )}
          {errorMessage !== '' && (
            <Text style={[styles.errorText, { color: theme.error }]}>{errorMessage}</Text>
          )}

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.primary }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? '送信中...' : '送信'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  segment: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
  },
  roleList: {
    gap: 8,
  },
  dropdownButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 12,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalItem: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  modalCloseButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  roleItem: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statusText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
  },
  submitButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdminTestNotificationScreen;
