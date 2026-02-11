/**
 * 項目16画面
 * 企画者サポート画面
 */

import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ThemedHeader } from '../../../shared/components/ThemedHeader';
import {
  EMERGENCY_PRIORITIES,
  EVENT_STATUS_OPTIONS,
  QUESTION_TYPES,
  SCREEN_DESCRIPTION,
  SCREEN_NAME,
  STORAGE_KEYS,
  SUPPORT_TABS,
  SUPPORT_TAB_TYPES,
} from '../constants';
import { exhibitorSupportService } from '../services/exhibitorSupportService';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  listTicketMessages,
  SUPPORT_TICKET_STATUSES,
} from '../../../services/supabase/supportTicketService';
import { KEY_BUILDINGS, KEY_CATALOG } from '../data/keyCatalog';

/** 連絡案件ステータス表示名 */
const STATUS_LABELS = {
  [SUPPORT_TICKET_STATUSES.NEW]: '新規',
  [SUPPORT_TICKET_STATUSES.ACKNOWLEDGED]: '受領',
  [SUPPORT_TICKET_STATUSES.IN_PROGRESS]: '対応中',
  [SUPPORT_TICKET_STATUSES.WAITING_EXTERNAL]: '外部待ち',
  [SUPPORT_TICKET_STATUSES.RESOLVED]: '解決済み',
  [SUPPORT_TICKET_STATUSES.CLOSED]: 'クローズ',
};

const ALL_BUILDINGS_VALUE = 'all';

/**
 * 項目16画面コンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.navigation - React Navigationのnavigationオブジェクト
 * @returns {JSX.Element} 項目16画面
 */
const Item16Screen = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, userInfo } = useAuth();

  // 画面切替
  const [activeTab, setActiveTab] = useState(SUPPORT_TAB_TYPES.QUESTION);

  // 共通入力（ローカル保存対象）
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  // 質問系統
  const [questionType, setQuestionType] = useState(QUESTION_TYPES[0].key);
  const [questionDetail, setQuestionDetail] = useState('');

  // 緊急呼び出し
  const [emergencyPriority, setEmergencyPriority] = useState(EMERGENCY_PRIORITIES[0].key);
  const [emergencyDetail, setEmergencyDetail] = useState('');

  // 鍵の事前申請
  const [keyBuilding, setKeyBuilding] = useState(ALL_BUILDINGS_VALUE);
  const [keySelectedId, setKeySelectedId] = useState('');
  const [selectedKeyIds, setSelectedKeyIds] = useState([]);
  const [keyRequestedAt, setKeyRequestedAt] = useState('');
  const [keyReason, setKeyReason] = useState('');

  // 企画の開始/終了報告
  const [eventStatus, setEventStatus] = useState(EVENT_STATUS_OPTIONS[0].key);
  const [eventMemo, setEventMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [myContacts, setMyContacts] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [contactMessages, setContactMessages] = useState([]);
  const [isLoadingContactMessages, setIsLoadingContactMessages] = useState(false);

  /**
   * メッセージ表示
   * @param {string} title - タイトル
   * @param {string} message - 本文
   * @returns {void}
   */
  const showMessage = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  /**
   * 連絡案件一覧を読み込む
   * @returns {Promise<void>} 読み込み処理
   */
  const loadMyContacts = async () => {
    if (!user?.id) {
      setMyContacts([]);
      return;
    }

    setIsLoadingContacts(true);
    const { data, error } = await exhibitorSupportService.listMyContacts({
      createdBy: user.id,
      limit: 10,
    });
    setIsLoadingContacts(false);

    if (error) {
      console.error('連絡案件一覧取得に失敗:', error);
      return;
    }

    const nextContacts = data || [];
    setMyContacts(nextContacts);

    if (nextContacts.length === 0) {
      setSelectedContactId(null);
      return;
    }

    if (
      selectedContactId &&
      nextContacts.some((contact) => contact.id === selectedContactId)
    ) {
      return;
    }

    setSelectedContactId(nextContacts[0].id);
  };

  /**
   * 選択案件の対応メッセージを読み込む
   * @param {string|null} ticketId - 連絡案件ID
   * @returns {Promise<void>} 読み込み処理
   */
  const loadContactMessages = async (ticketId) => {
    if (!ticketId) {
      setContactMessages([]);
      return;
    }

    setIsLoadingContactMessages(true);
    const { data, error } = await listTicketMessages({ ticketId });
    setIsLoadingContactMessages(false);

    if (error) {
      console.error('対応メッセージ取得に失敗:', error);
      return;
    }

    setContactMessages(data || []);
  };

  /**
   * 企画情報をローカルストレージから復元
   */
  useEffect(() => {
    const loadEventInfo = async () => {
      try {
        const values = await AsyncStorage.multiGet([
          STORAGE_KEYS.EVENT_NAME,
          STORAGE_KEYS.EVENT_LOCATION,
        ]);

        const eventNameValue = values[0]?.[1];
        const eventLocationValue = values[1]?.[1];

        if (eventNameValue) {
          setEventName(eventNameValue);
        }
        if (eventLocationValue) {
          setEventLocation(eventLocationValue);
        }
      } catch (error) {
        console.error('企画情報の復元に失敗しました:', error);
      } finally {
        setIsHydrated(true);
      }
    };

    loadEventInfo();
  }, []);

  /**
   * 企画情報をローカルストレージに保存
   */
  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const saveEventInfo = async () => {
      try {
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.EVENT_NAME, eventName],
          [STORAGE_KEYS.EVENT_LOCATION, eventLocation],
        ]);
      } catch (error) {
        console.error('企画情報の保存に失敗しました:', error);
      }
    };

    saveEventInfo();
  }, [eventLocation, eventName, isHydrated]);

  /**
   * ログインユーザーが変わったら履歴を再取得
   */
  useEffect(() => {
    loadMyContacts();
  }, [user?.id]);

  /**
   * 選択案件が変わったら対応メッセージを再取得
   */
  useEffect(() => {
    loadContactMessages(selectedContactId);
  }, [selectedContactId]);

  /**
   * 現在タブのタイトル
   */
  const activeTabTitle = useMemo(() => {
    const tab = SUPPORT_TABS.find((item) => item.key === activeTab);
    return tab?.title || '';
  }, [activeTab]);

  /**
   * 選択中の連絡案件
   */
  const selectedContact = useMemo(() => {
    return myContacts.find((contact) => contact.id === selectedContactId) || null;
  }, [myContacts, selectedContactId]);

  /**
   * 選択中の質問種別
   */
  const selectedQuestion = useMemo(() => {
    return QUESTION_TYPES.find((item) => item.key === questionType) || QUESTION_TYPES[0];
  }, [questionType]);

  /**
   * 棟プルダウン選択に応じた鍵候補
   */
  const filteredKeyCatalog = useMemo(() => {
    if (keyBuilding === ALL_BUILDINGS_VALUE) {
      return KEY_CATALOG;
    }
    return KEY_CATALOG.filter((item) => item.building === keyBuilding);
  }, [keyBuilding]);

  /**
   * 複数追加済みの鍵一覧
   */
  const selectedKeyItems = useMemo(() => {
    const selectedSet = new Set(selectedKeyIds);
    return KEY_CATALOG.filter((item) => selectedSet.has(item.id));
  }, [selectedKeyIds]);

  /**
   * 棟切替時に選択中の鍵が候補外になった場合は先頭へ戻す
   */
  useEffect(() => {
    if (filteredKeyCatalog.length === 0) {
      setKeySelectedId('');
      return;
    }
    if (!filteredKeyCatalog.some((item) => item.id === keySelectedId)) {
      setKeySelectedId(filteredKeyCatalog[0].id);
    }
  }, [filteredKeyCatalog, keySelectedId]);

  /**
   * プルダウン選択中の鍵を複数選択リストへ追加
   */
  const addSelectedKey = () => {
    if (!keySelectedId) {
      showMessage('入力不足', '追加する鍵を選択してください。');
      return;
    }
    if (selectedKeyIds.includes(keySelectedId)) {
      showMessage('確認', 'その鍵はすでに追加済みです。');
      return;
    }
    setSelectedKeyIds((prev) => [...prev, keySelectedId]);
  };

  /**
   * 複数選択リストから鍵を1件削除
   * @param {string} keyId - 削除する鍵ID
   */
  const removeSelectedKey = (keyId) => {
    setSelectedKeyIds((prev) => prev.filter((id) => id !== keyId));
  };

  /**
   * 共通入力の必須チェック
   * @returns {boolean} バリデーション結果
   */
  const validateCommonFields = () => {
    if (!eventName.trim() || !eventLocation.trim()) {
      showMessage('入力不足', '「企画名」と「企画場所」は必須です。');
      return false;
    }
    return true;
  };

  /**
   * 仮送信処理
   * @returns {void}
   */
  const handleSubmit = () => {
    if (!validateCommonFields()) {
      return;
    }

    let payload = {};

    if (activeTab === SUPPORT_TAB_TYPES.QUESTION) {
      payload = {
        type: activeTab,
        questionType,
        detail: questionDetail,
      };
    } else if (activeTab === SUPPORT_TAB_TYPES.EMERGENCY) {
      payload = {
        type: activeTab,
        priority: emergencyPriority,
        detail: emergencyDetail,
      };
    } else if (activeTab === SUPPORT_TAB_TYPES.KEY_PREAPPLY) {
      payload = {
        type: activeTab,
        keyTargets: selectedKeyItems,
        requestedAt: keyRequestedAt,
        reason: keyReason,
      };
    } else if (activeTab === SUPPORT_TAB_TYPES.EVENT_STATUS) {
      payload = {
        type: activeTab,
        status: eventStatus,
        memo: eventMemo,
      };
    }

    const request = {
      eventName,
      eventLocation,
      submittedAt: new Date().toISOString(),
      payload,
    };

    const submitAsync = async () => {
      if (!user?.id) {
        showMessage('送信エラー', 'ログイン情報が取得できません。再ログインしてください。');
        return;
      }

      setIsSubmitting(true);

      const commonPayload = {
        eventName: request.eventName,
        eventLocation: request.eventLocation,
        createdBy: user.id,
        orgId: userInfo?.org_id || null,
      };

      let result = { data: null, error: null };

      if (activeTab === SUPPORT_TAB_TYPES.QUESTION) {
        result = await exhibitorSupportService.createQuestionContact({
          ...commonPayload,
          questionType: questionType,
          detail: questionDetail,
        });
      } else if (activeTab === SUPPORT_TAB_TYPES.EMERGENCY) {
        result = await exhibitorSupportService.createEmergencyContact({
          ...commonPayload,
          priority: emergencyPriority,
          detail: emergencyDetail,
        });
      } else if (activeTab === SUPPORT_TAB_TYPES.KEY_PREAPPLY) {
        result = await exhibitorSupportService.createKeyPreapply({
          ...commonPayload,
          keyTargets: selectedKeyItems,
          requestedAt: keyRequestedAt,
          reason: keyReason,
        });
      } else if (activeTab === SUPPORT_TAB_TYPES.EVENT_STATUS) {
        result = await exhibitorSupportService.createEventStatusReport({
          ...commonPayload,
          status: eventStatus,
          memo: eventMemo,
        });
      }

      setIsSubmitting(false);

      if (result.error) {
        const message = result.error.message || '連絡案件の送信に失敗しました。';
        showMessage('送信エラー', message);
        return;
      }

      // 送信後は現在のタブ入力をリセット
      if (activeTab === SUPPORT_TAB_TYPES.QUESTION) {
        setQuestionDetail('');
      } else if (activeTab === SUPPORT_TAB_TYPES.EMERGENCY) {
        setEmergencyDetail('');
      } else if (activeTab === SUPPORT_TAB_TYPES.KEY_PREAPPLY) {
        setSelectedKeyIds([]);
        setKeyBuilding(ALL_BUILDINGS_VALUE);
        setKeySelectedId('');
        setKeyRequestedAt('');
        setKeyReason('');
      } else if (activeTab === SUPPORT_TAB_TYPES.EVENT_STATUS) {
        setEventMemo('');
      }

      showMessage('送信完了', '連絡案件を登録しました。');
      loadMyContacts();
    };

    submitAsync();
  };

  /**
   * 選択ボタン群を描画
   * @param {Array<{key: string, label: string}>} options - 選択肢
   * @param {string} selectedValue - 選択値
   * @param {(value: string) => void} onSelect - 選択時コールバック
   * @returns {JSX.Element} 選択UI
   */
  const renderOptionButtons = (options, selectedValue, onSelect, renderSubLabel = null) => {
    return (
      <View style={styles.optionGroup}>
        {options.map((option) => {
          const isActive = option.key === selectedValue;
          return (
            <Pressable
              key={option.key}
              style={[
                styles.optionButton,
                {
                  borderColor: isActive ? theme.primary : theme.border,
                  backgroundColor: isActive ? `${theme.primary}22` : theme.surface,
                },
              ]}
              onPress={() => onSelect(option.key)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  { color: isActive ? theme.primary : theme.textSecondary },
                ]}
              >
                {option.label}
              </Text>
              {renderSubLabel ? (
                <Text
                  style={[
                    styles.optionButtonSubText,
                    { color: isActive ? theme.primary : theme.textSecondary },
                  ]}
                >
                  {renderSubLabel(option)}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    );
  };

  /**
   * 現在タブのフォームを描画
   * @returns {JSX.Element} フォーム
   */
  const renderActiveForm = () => {
    if (activeTab === SUPPORT_TAB_TYPES.QUESTION) {
      return (
        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>質問種別</Text>
          {renderOptionButtons(QUESTION_TYPES, questionType, setQuestionType, (option) => {
            return `対応: ${option.targetLabel}`;
          })}
          <Text style={[styles.questionTargetHint, { color: theme.textSecondary }]}>
            現在の対応先: {selectedQuestion.targetLabel}
          </Text>

          <Text style={[styles.label, { color: theme.text }]}>詳細</Text>
          <TextInput
            value={questionDetail}
            onChangeText={setQuestionDetail}
            multiline
            placeholder="内容を入力してください"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.multilineInput,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
          />
        </View>
      );
    }

    if (activeTab === SUPPORT_TAB_TYPES.EMERGENCY) {
      return (
        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>優先度</Text>
          {renderOptionButtons(EMERGENCY_PRIORITIES, emergencyPriority, setEmergencyPriority)}

          <Text style={[styles.label, { color: theme.text }]}>緊急内容</Text>
          <TextInput
            value={emergencyDetail}
            onChangeText={setEmergencyDetail}
            multiline
            placeholder="緊急内容を入力してください"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.multilineInput,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
          />
        </View>
      );
    }

    if (activeTab === SUPPORT_TAB_TYPES.KEY_PREAPPLY) {
      return (
        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>棟を選択</Text>
          <View
            style={[
              styles.pickerContainer,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Picker
              selectedValue={keyBuilding}
              onValueChange={(value) => setKeyBuilding(value)}
              style={[styles.picker, { color: theme.text }]}
              dropdownIconColor={theme.text}
            >
              <Picker.Item label="すべての棟" value={ALL_BUILDINGS_VALUE} />
              {KEY_BUILDINGS.map((building) => (
                <Picker.Item key={building} label={building} value={building} />
              ))}
            </Picker>
          </View>

          <Text style={[styles.label, { color: theme.text }]}>鍵を選択</Text>
          <View
            style={[
              styles.pickerContainer,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Picker
              selectedValue={keySelectedId}
              onValueChange={(value) => setKeySelectedId(value)}
              style={[styles.picker, { color: theme.text }]}
              dropdownIconColor={theme.text}
            >
              {filteredKeyCatalog.length === 0 ? (
                <Picker.Item label="選択できる鍵がありません" value="" />
              ) : (
                filteredKeyCatalog.map((item) => (
                  <Picker.Item
                    key={item.id}
                    label={`${item.building} / ${item.name}`}
                    value={item.id}
                  />
                ))
              )}
            </Picker>
          </View>

          <TouchableOpacity
            style={[styles.addKeyButton, { borderColor: theme.border, backgroundColor: theme.background }]}
            onPress={addSelectedKey}
          >
            <Text style={[styles.addKeyButtonText, { color: theme.textSecondary }]}>この鍵を追加</Text>
          </TouchableOpacity>

          <Text style={[styles.selectedKeyTitle, { color: theme.text }]}>
            申請対象（{selectedKeyItems.length}件）
          </Text>

          {selectedKeyItems.length === 0 ? (
            <Text style={[styles.selectedKeyEmpty, { color: theme.textSecondary }]}>
              まだ鍵が追加されていません
            </Text>
          ) : (
            <View style={styles.selectedKeyList}>
              {selectedKeyItems.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.selectedKeyRow,
                    { borderColor: theme.border, backgroundColor: theme.background },
                  ]}
                >
                  <Text style={[styles.selectedKeyText, { color: theme.text }]} numberOfLines={1}>
                    {item.building} / {item.name}
                  </Text>
                  <TouchableOpacity
                    style={[styles.removeKeyButton, { borderColor: theme.border }]}
                    onPress={() => removeSelectedKey(item.id)}
                  >
                    <Text style={[styles.removeKeyButtonText, { color: theme.textSecondary }]}>削除</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.label, { color: theme.text }]}>希望時刻</Text>
          <TextInput
            value={keyRequestedAt}
            onChangeText={setKeyRequestedAt}
            placeholder="例）10:30"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
          />

          <Text style={[styles.label, { color: theme.text }]}>理由</Text>
          <TextInput
            value={keyReason}
            onChangeText={setKeyReason}
            multiline
            placeholder="利用目的を入力してください"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.multilineInput,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
          />
        </View>
      );
    }

    return (
      <View style={styles.formSection}>
        <Text style={[styles.label, { color: theme.text }]}>報告種別</Text>
        {renderOptionButtons(EVENT_STATUS_OPTIONS, eventStatus, setEventStatus)}

        <Text style={[styles.label, { color: theme.text }]}>メモ（任意）</Text>
        <TextInput
          value={eventMemo}
          onChangeText={setEventMemo}
          multiline
          placeholder="補足事項があれば入力してください"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.multilineInput,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.description, { color: theme.textSecondary }]}>{SCREEN_DESCRIPTION}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>企画情報</Text>

            <Text style={[styles.label, { color: theme.text }]}>企画名</Text>
            <TextInput
              value={eventName}
              onChangeText={setEventName}
              placeholder="企画名を入力"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
            />

            <Text style={[styles.label, { color: theme.text }]}>企画場所</Text>
            <TextInput
              value={eventLocation}
              onChangeText={setEventLocation}
              placeholder="企画場所を入力"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
            />
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{activeTabTitle}</Text>
            {renderActiveForm()}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.primary }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? '送信中...' : '送信'}
            </Text>
          </TouchableOpacity>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.historyHeader}>
              <Text style={[styles.sectionTitle, styles.historyTitle, { color: theme.text }]}>
                最近の連絡案件
              </Text>
              <TouchableOpacity
                style={[styles.refreshButton, { borderColor: theme.border }]}
                onPress={loadMyContacts}
              >
                <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
              </TouchableOpacity>
            </View>

            {isLoadingContacts ? (
              <Text style={[styles.historyEmptyText, { color: theme.textSecondary }]}>読み込み中...</Text>
            ) : myContacts.length === 0 ? (
              <Text style={[styles.historyEmptyText, { color: theme.textSecondary }]}>
                まだ送信された連絡案件はありません
              </Text>
            ) : (
              <View style={styles.historyList}>
                {myContacts.map((contact) => (
                  <Pressable
                    key={contact.id}
                    style={[
                      styles.historyItem,
                      {
                        borderColor:
                          contact.id === selectedContactId ? theme.primary : theme.border,
                        backgroundColor:
                          contact.id === selectedContactId
                            ? `${theme.primary}14`
                            : theme.background,
                      },
                    ]}
                    onPress={() => setSelectedContactId(contact.id)}
                  >
                    <Text style={[styles.historyItemTitle, { color: theme.text }]} numberOfLines={1}>
                      {contact.title}
                    </Text>
                    <Text style={[styles.historyItemMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                      {(STATUS_LABELS[contact.ticket_status] || contact.ticket_status) +
                        ' / ' +
                        new Date(contact.created_at).toLocaleString('ja-JP')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {selectedContact ? (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.historyHeader}>
                <Text style={[styles.sectionTitle, styles.historyTitle, { color: theme.text }]}>
                  回答内容
                </Text>
                <TouchableOpacity
                  style={[styles.refreshButton, { borderColor: theme.border }]}
                  onPress={() => loadContactMessages(selectedContact.id)}
                >
                  <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>更新</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.historyItemTitle, { color: theme.text }]}>{selectedContact.title}</Text>
              <Text style={[styles.historyItemMeta, { color: theme.textSecondary }]}>
                状態: {STATUS_LABELS[selectedContact.ticket_status] || selectedContact.ticket_status}
              </Text>
              <Text
                style={[
                  styles.requestText,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
              >
                {selectedContact.description}
              </Text>

              {isLoadingContactMessages ? (
                <Text style={[styles.historyEmptyText, { color: theme.textSecondary }]}>読み込み中...</Text>
              ) : contactMessages.length === 0 ? (
                <Text style={[styles.historyEmptyText, { color: theme.textSecondary }]}>
                  まだ回答メッセージはありません
                </Text>
              ) : (
                <View style={styles.messageList}>
                  {contactMessages.map((message) => {
                    const isMine = message.author_id === user?.id;
                    return (
                      <View
                        key={message.id}
                        style={[
                          styles.messageItem,
                          {
                            borderColor: isMine ? theme.primary : theme.border,
                            backgroundColor: isMine ? `${theme.primary}14` : theme.background,
                          },
                        ]}
                      >
                        <Text style={[styles.messageAuthor, { color: theme.textSecondary }]}>
                          {isMine ? 'あなた' : '担当者'}
                        </Text>
                        <Text style={[styles.messageBody, { color: theme.text }]}>{message.body}</Text>
                        <Text style={[styles.messageDate, { color: theme.textSecondary }]}>
                          {new Date(message.created_at).toLocaleString('ja-JP')}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.bottomArea, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
          <View style={[styles.iosTabBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {SUPPORT_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[
                    styles.tabButton,
                    isActive && [
                      styles.tabButtonActive,
                      { backgroundColor: theme.background, borderColor: theme.border },
                    ],
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      { color: isActive ? theme.text : theme.textSecondary },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  formSection: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 52,
  },
  addKeyButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addKeyButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedKeyTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectedKeyEmpty: {
    fontSize: 12,
    lineHeight: 18,
  },
  selectedKeyList: {
    gap: 8,
  },
  selectedKeyRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectedKeyText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  removeKeyButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  removeKeyButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  multilineInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  optionButtonSubText: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '500',
  },
  questionTargetHint: {
    fontSize: 12,
    marginTop: -2,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyTitle: {
    marginBottom: 0,
  },
  refreshButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyItemMeta: {
    fontSize: 12,
  },
  requestText: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 10,
  },
  historyEmptyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  messageList: {
    gap: 8,
  },
  messageItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  messageAuthor: {
    fontSize: 11,
    marginBottom: 2,
  },
  messageBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageDate: {
    fontSize: 11,
    marginTop: 4,
  },
  bottomArea: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  iosTabBar: {
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default Item16Screen;
