/**
 * 項目16画面
 * 企画者サポート画面（コンテナコンポーネント）
 * state管理とAPI呼び出しを担当し、子コンポーネントへpropsを渡す
 */

import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
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
  createTicketMessage,
  listTicketMessages,
} from '../../../services/supabase/supportTicketService';
import { KEY_BUILDINGS, KEY_CATALOG } from '../data/keyCatalog';
import { ensureKeysSeededFromCatalog } from '../../../services/supabase/keyMasterService';
import { updateExhibitorEventProfile } from '../../../services/supabase/userService';
import {
  createAttachmentSignedUrl,
  createTicketAttachment,
  listTicketAttachments,
  MAX_ATTACHMENT_FILE_BYTES,
  uploadTicketAttachmentFile,
} from '../../../services/supabase/ticketAttachmentService';
import QuestionForm from '../components/QuestionForm';
import EmergencyForm from '../components/EmergencyForm';
import KeyPreApplyForm from '../components/KeyPreApplyForm';
import EventStatusForm from '../components/EventStatusForm';
import ContactHistory from '../components/ContactHistory';
import OfflineBanner from '../../../shared/components/OfflineBanner';

/** 全棟選択値 */
const ALL_BUILDINGS_VALUE = 'all';

/** 添付ファイルサイズ上限（MB表示用） */
const MAX_ATTACHMENT_FILE_SIZE_MB = Math.floor(MAX_ATTACHMENT_FILE_BYTES / 1024 / 1024);

/** 希望時刻パターン（HH:mm） */
const REQUESTED_AT_TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** 希望時刻パターン（YYYY-MM-DD HH:mm） */
const REQUESTED_AT_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})\s+([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * テキストを正規化（トリム）
 * @param {string|null|undefined} value - 入力値
 * @returns {string} 正規化後の値
 */
const normalizeText = (value) => (value || '').trim();

/**
 * 希望時刻入力を正規化
 * @param {string} value - 入力値
 * @returns {string} 正規化後の値
 */
const normalizeRequestedAtInput = (value) =>
  normalizeText(value).replace(/：/g, ':').replace(/\s+/g, ' ');

/**
 * 日付文字列の妥当性を確認
 * @param {number} year - 年
 * @param {number} month - 月
 * @param {number} day - 日
 * @returns {boolean} 妥当性
 */
const isValidCalendarDate = (year, month, day) => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

/**
 * 鍵希望時刻を検証
 * 受理形式:
 * - HH:mm
 * - YYYY-MM-DD HH:mm
 * @param {string} value - 入力値
 * @returns {{isValid: boolean, normalizedValue: string, message: string}}
 */
const validateKeyRequestedAtInput = (value) => {
  const normalized = normalizeRequestedAtInput(value);
  if (!normalized) {
    return {
      isValid: false,
      normalizedValue: '',
      message: '希望時刻を入力してください。',
    };
  }

  if (REQUESTED_AT_TIME_PATTERN.test(normalized)) {
    return {
      isValid: true,
      normalizedValue: normalized,
      message: '',
    };
  }

  const dateTimeMatch = REQUESTED_AT_DATE_TIME_PATTERN.exec(normalized);
  if (dateTimeMatch) {
    const year = Number(dateTimeMatch[1]);
    const month = Number(dateTimeMatch[2]);
    const day = Number(dateTimeMatch[3]);
    if (!isValidCalendarDate(year, month, day)) {
      return {
        isValid: false,
        normalizedValue: normalized,
        message: '希望時刻の日付が正しくありません。',
      };
    }
    return {
      isValid: true,
      normalizedValue: `${dateTimeMatch[1]}-${dateTimeMatch[2]}-${dateTimeMatch[3]} ${dateTimeMatch[4]}:${dateTimeMatch[5]}`,
      message: '',
    };
  }

  return {
    isValid: false,
    normalizedValue: normalized,
    message: '希望時刻は「HH:mm」または「YYYY-MM-DD HH:mm」で入力してください。',
  };
};

/**
 * ファイルサイズを表示文字列へ変換
 * @param {number|null|undefined} fileSizeBytes - バイト数
 * @returns {string} 表示文字列
 */
const formatFileSize = (fileSizeBytes) => {
  const size = Number(fileSizeBytes);
  if (!Number.isFinite(size) || size < 0) {
    return '-';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

/**
 * ユーザーごとのローカル保存キーを生成
 * @param {string} baseKey - ベースキー
 * @param {string|null|undefined} userId - ユーザーID
 * @returns {string} ユーザー別キー
 */
const buildUserScopedStorageKey = (baseKey, userId) => {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) {
    return `${baseKey}_guest`;
  }
  return `${baseKey}_${normalizedUserId}`;
};

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

  // 添付（任意）
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentCaption, setAttachmentCaption] = useState('');

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
  const [contactAttachments, setContactAttachments] = useState([]);
  const [isLoadingContactAttachments, setIsLoadingContactAttachments] = useState(false);
  const [contactReplyBody, setContactReplyBody] = useState('');
  const [isSubmittingContactReply, setIsSubmittingContactReply] = useState(false);
  const [followupAttachmentFile, setFollowupAttachmentFile] = useState(null);
  const [followupAttachmentCaption, setFollowupAttachmentCaption] = useState('');
  const [isSubmittingFollowupAttachment, setIsSubmittingFollowupAttachment] = useState(false);

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
   * 選択案件の添付一覧を読み込む
   * @param {string|null} ticketId - 連絡案件ID
   * @returns {Promise<void>} 読み込み処理
   */
  const loadContactAttachments = async (ticketId) => {
    if (!ticketId) {
      setContactAttachments([]);
      return;
    }

    setIsLoadingContactAttachments(true);
    const { data, error } = await listTicketAttachments({ ticketId, limit: 20 });
    if (error) {
      setIsLoadingContactAttachments(false);
      console.error('連絡案件添付取得に失敗:', error);
      return;
    }

    const attachments = await Promise.all(
      (data || []).map(async (attachment) => {
        const { data: signedData, error: signedError } = await createAttachmentSignedUrl({
          storageBucket: attachment.storage_bucket,
          storagePath: attachment.storage_path,
          expiresIn: 3600,
        });
        if (signedError) {
          console.warn('添付URL生成に失敗:', signedError);
        }

        return {
          ...attachment,
          signedUrl: signedData?.signedUrl || '',
        };
      })
    );

    setIsLoadingContactAttachments(false);
    setContactAttachments(attachments);
  };

  /**
   * 添付URLを開く
   * @param {Object} attachment - 添付情報
   * @returns {Promise<void>} 実行処理
   */
  const openAttachment = async (attachment) => {
    const signedUrl = normalizeText(attachment?.signedUrl);
    if (!signedUrl) {
      showMessage('添付表示エラー', '添付URLが取得できませんでした。再読み込みしてください。');
      return;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      await Linking.openURL(signedUrl);
    } catch (error) {
      console.error('添付表示エラー:', error);
      showMessage('添付表示エラー', '添付ファイルを開けませんでした。');
    }
  };

  /**
   * 回答スレッドへ追記投稿
   * @returns {Promise<void>} 投稿処理
   */
  const handleSubmitContactReply = async () => {
    if (!selectedContact) {
      showMessage('送信エラー', '連絡案件を選択してください。');
      return;
    }
    if (!user?.id) {
      showMessage('送信エラー', 'ログイン情報が取得できません。');
      return;
    }
    if (!normalizeText(contactReplyBody)) {
      showMessage('入力不足', '追記内容を入力してください。');
      return;
    }

    /** 確認ダイアログを表示 */
    const confirmMessage = '追記を送信しますか？';
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) {
        return;
      }
    } else {
      const confirmed = await new Promise((resolve) => {
        Alert.alert('確認', confirmMessage, [
          { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
          { text: '送信', onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) {
        return;
      }
    }

    setIsSubmittingContactReply(true);
    const { error } = await createTicketMessage({
      ticketId: selectedContact.id,
      authorId: user.id,
      body: normalizeText(contactReplyBody),
    });
    setIsSubmittingContactReply(false);

    if (error) {
      showMessage('送信エラー', error.message || '追記投稿に失敗しました。');
      return;
    }

    setContactReplyBody('');
    await loadContactMessages(selectedContact.id);
    showMessage('送信完了', '追記を投稿しました。');
  };

  /**
   * 追記用添付ファイルを解除
   * @returns {void}
   */
  const clearFollowupAttachment = () => {
    setFollowupAttachmentFile(null);
  };

  /**
   * 追記用添付を登録
   * @returns {Promise<void>} 登録処理
   */
  const handleSubmitFollowupAttachment = async () => {
    if (!selectedContact) {
      showMessage('登録エラー', '連絡案件を選択してください。');
      return;
    }
    if (!user?.id) {
      showMessage('登録エラー', 'ログイン情報が取得できません。');
      return;
    }
    if (!followupAttachmentFile) {
      showMessage('入力不足', '添付ファイルを選択してください。');
      return;
    }
    if (followupAttachmentFile.size > MAX_ATTACHMENT_FILE_BYTES) {
      showMessage(
        '容量超過',
        `添付は${MAX_ATTACHMENT_FILE_SIZE_MB}MB以下にしてください（選択: ${formatFileSize(
          followupAttachmentFile.size
        )}）。`
      );
      return;
    }

    setIsSubmittingFollowupAttachment(true);
    const uploadResult = await uploadTicketAttachmentFile({
      ticketId: selectedContact.id,
      file: followupAttachmentFile,
      fileName: followupAttachmentFile.name || 'attachment.bin',
      mimeType: followupAttachmentFile.type || null,
      fileSizeBytes: followupAttachmentFile.size || null,
    });

    if (uploadResult.error || !uploadResult.data) {
      setIsSubmittingFollowupAttachment(false);
      showMessage('登録エラー', uploadResult.error?.message || '添付アップロードに失敗しました。');
      return;
    }

    const { error } = await createTicketAttachment({
      ticketId: selectedContact.id,
      uploadedBy: user.id,
      storageBucket: uploadResult.data.storageBucket,
      storagePath: uploadResult.data.storagePath,
      mimeType: uploadResult.data.mimeType,
      fileSizeBytes: uploadResult.data.fileSizeBytes,
      caption: normalizeText(followupAttachmentCaption) || null,
    });
    setIsSubmittingFollowupAttachment(false);

    if (error) {
      showMessage('登録エラー', error.message || '添付情報の登録に失敗しました。');
      return;
    }

    clearFollowupAttachment();
    setFollowupAttachmentCaption('');
    await loadContactAttachments(selectedContact.id);
    showMessage('登録完了', '添付を追加しました。');
  };

  /**
   * 企画情報をユーザー単位で復元
   * 優先順: user_profiles > ローカル保存
   */
  useEffect(() => {
    const loadEventInfo = async () => {
      setIsHydrated(false);

      const eventNameKey = buildUserScopedStorageKey(STORAGE_KEYS.EVENT_NAME, user?.id);
      const eventLocationKey = buildUserScopedStorageKey(STORAGE_KEYS.EVENT_LOCATION, user?.id);

      try {
        const values = await AsyncStorage.multiGet([eventNameKey, eventLocationKey]);
        const storedEventName = normalizeText(values[0]?.[1]);
        const storedEventLocation = normalizeText(values[1]?.[1]);

        const profileEventName = normalizeText(userInfo?.exhibitor_event_name);
        const profileEventLocation = normalizeText(userInfo?.exhibitor_event_location);

        setEventName(profileEventName || storedEventName);
        setEventLocation(profileEventLocation || storedEventLocation);
      } catch (error) {
        console.error('企画情報の復元に失敗しました:', error);
      } finally {
        setIsHydrated(true);
      }
    };

    loadEventInfo();
  }, [user?.id, userInfo?.exhibitor_event_location, userInfo?.exhibitor_event_name]);

  /**
   * 鍵マスタが空の場合は初期カタログを投入
   */
  useEffect(() => {
    const seedKeys = async () => {
      const { error } = await ensureKeysSeededFromCatalog(KEY_CATALOG);
      if (error) {
        console.warn('鍵マスタ初期化に失敗:', error);
      }
    };
    seedKeys();
  }, []);

  /**
   * 企画情報をローカルストレージへ保存（ユーザー別）
   */
  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const eventNameKey = buildUserScopedStorageKey(STORAGE_KEYS.EVENT_NAME, user?.id);
    const eventLocationKey = buildUserScopedStorageKey(STORAGE_KEYS.EVENT_LOCATION, user?.id);

    const saveEventInfo = async () => {
      try {
        await AsyncStorage.multiSet([
          [eventNameKey, eventName],
          [eventLocationKey, eventLocation],
        ]);
      } catch (error) {
        console.error('企画情報の保存に失敗しました:', error);
      }
    };

    saveEventInfo();
  }, [eventLocation, eventName, isHydrated, user?.id]);

  /**
   * 企画情報をユーザープロフィールへ保存（ユーザー紐付け）
   */
  useEffect(() => {
    if (!isHydrated || !user?.id) {
      return undefined;
    }

    const hasEventProfileColumns =
      userInfo &&
      Object.prototype.hasOwnProperty.call(userInfo, 'exhibitor_event_name') &&
      Object.prototype.hasOwnProperty.call(userInfo, 'exhibitor_event_location');

    if (!hasEventProfileColumns) {
      return undefined;
    }

    const normalizedEventName = normalizeText(eventName);
    const normalizedEventLocation = normalizeText(eventLocation);
    const profileEventName = normalizeText(userInfo?.exhibitor_event_name);
    const profileEventLocation = normalizeText(userInfo?.exhibitor_event_location);

    if (
      normalizedEventName === profileEventName &&
      normalizedEventLocation === profileEventLocation
    ) {
      return undefined;
    }

    const timerId = setTimeout(async () => {
      const { error } = await updateExhibitorEventProfile(user.id, {
        eventName: normalizedEventName,
        eventLocation: normalizedEventLocation,
      });
      if (error) {
        console.warn('企画情報のプロフィール保存に失敗:', error);
      }
    }, 700);

    return () => {
      clearTimeout(timerId);
    };
  }, [eventLocation, eventName, isHydrated, user?.id, userInfo?.exhibitor_event_location, userInfo?.exhibitor_event_name]);

  /**
   * フォームテキストフィールドの下書きを復元する
   */
  useEffect(() => {
    const restoreDrafts = async () => {
      try {
        const keys = [
          STORAGE_KEYS.DRAFT_QUESTION_DETAIL,
          STORAGE_KEYS.DRAFT_EMERGENCY_DETAIL,
          STORAGE_KEYS.DRAFT_KEY_REASON,
          STORAGE_KEYS.DRAFT_EVENT_MEMO,
        ];
        const values = await AsyncStorage.multiGet(keys);
        const drafts = Object.fromEntries(values.filter(([, v]) => v !== null));
        if (drafts[STORAGE_KEYS.DRAFT_QUESTION_DETAIL]) {
          setQuestionDetail(drafts[STORAGE_KEYS.DRAFT_QUESTION_DETAIL]);
        }
        if (drafts[STORAGE_KEYS.DRAFT_EMERGENCY_DETAIL]) {
          setEmergencyDetail(drafts[STORAGE_KEYS.DRAFT_EMERGENCY_DETAIL]);
        }
        if (drafts[STORAGE_KEYS.DRAFT_KEY_REASON]) {
          setKeyReason(drafts[STORAGE_KEYS.DRAFT_KEY_REASON]);
        }
        if (drafts[STORAGE_KEYS.DRAFT_EVENT_MEMO]) {
          setEventMemo(drafts[STORAGE_KEYS.DRAFT_EVENT_MEMO]);
        }
      } catch (error) {
        console.warn('下書き復元に失敗:', error);
      }
    };
    restoreDrafts();
  }, []);

  /**
   * フォームテキストフィールドの下書きを自動保存する
   */
  useEffect(() => {
    if (!isHydrated) return;
    const saveDrafts = async () => {
      try {
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.DRAFT_QUESTION_DETAIL, questionDetail],
          [STORAGE_KEYS.DRAFT_EMERGENCY_DETAIL, emergencyDetail],
          [STORAGE_KEYS.DRAFT_KEY_REASON, keyReason],
          [STORAGE_KEYS.DRAFT_EVENT_MEMO, eventMemo],
        ]);
      } catch (error) {
        console.warn('下書き保存に失敗:', error);
      }
    };
    saveDrafts();
  }, [questionDetail, emergencyDetail, keyReason, eventMemo, isHydrated]);

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
    loadContactAttachments(selectedContactId);
    setContactReplyBody('');
    clearFollowupAttachment();
    setFollowupAttachmentCaption('');
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
   * 添付選択を解除
   * @returns {void}
   */
  const clearAttachment = () => {
    setAttachmentFile(null);
  };

  /**
   * 添付ファイルを選択（Web共通）
   * @param {(file: File) => void} onSelected - 選択後コールバック
   * @returns {void}
   */
  const pickFileFromDevice = (onSelected) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      showMessage('添付不可', '現在の端末ではファイル選択に未対応です。');
      return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,application/pdf';
    fileInput.onchange = () => {
      const selectedFile = fileInput.files?.[0] || null;
      if (!selectedFile) {
        return;
      }
      if (selectedFile.size > MAX_ATTACHMENT_FILE_BYTES) {
        showMessage(
          '容量超過',
          `添付は${MAX_ATTACHMENT_FILE_SIZE_MB}MB以下にしてください（選択: ${formatFileSize(
            selectedFile.size
          )}）。`
        );
        return;
      }
      onSelected(selectedFile);
    };
    fileInput.click();
  };

  /**
   * 新規連絡用の添付を選択
   * @returns {void}
   */
  const pickAttachmentFile = () => {
    pickFileFromDevice((file) => setAttachmentFile(file));
  };

  /**
   * 追記用の添付を選択
   * @returns {void}
   */
  const pickFollowupAttachmentFile = () => {
    pickFileFromDevice((file) => setFollowupAttachmentFile(file));
  };

  /**
   * 仮送信処理
   * @returns {void}
   */
  const handleSubmit = () => {
    if (!validateCommonFields()) {
      return;
    }
    let normalizedKeyRequestedAt = keyRequestedAt;
    if (activeTab === SUPPORT_TAB_TYPES.KEY_PREAPPLY) {
      const validation = validateKeyRequestedAtInput(keyRequestedAt);
      if (!validation.isValid) {
        showMessage('入力エラー', validation.message);
        return;
      }
      normalizedKeyRequestedAt = validation.normalizedValue;
      if (normalizedKeyRequestedAt !== keyRequestedAt) {
        setKeyRequestedAt(normalizedKeyRequestedAt);
      }
    }
    if (attachmentFile && attachmentFile.size > MAX_ATTACHMENT_FILE_BYTES) {
      showMessage(
        '容量超過',
        `添付は${MAX_ATTACHMENT_FILE_SIZE_MB}MB以下にしてください（選択: ${formatFileSize(
          attachmentFile.size
        )}）。`
      );
      return;
    }

    executeSubmit(normalizedKeyRequestedAt);
  };

  /**
   * 送信実行処理
   * @param {string} normalizedKeyRequestedAt - 正規化済み希望時刻
   * @returns {void}
   */
  const executeSubmit = (normalizedKeyRequestedAt) => {
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
        requestedAt: normalizedKeyRequestedAt,
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
      eventId: null,
      eventName,
      eventLocation,
      attachments: attachmentFile
        ? [
            {
              file: attachmentFile,
              fileName: attachmentFile.name || 'attachment.bin',
              mimeType: attachmentFile.type || null,
              caption: attachmentCaption.trim() || null,
              fileSizeBytes: attachmentFile.size || null,
            },
          ]
        : [],
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
        eventId: request.eventId,
        eventName: request.eventName,
        eventLocation: request.eventLocation,
        attachments: request.attachments,
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
          requestedAt: normalizedKeyRequestedAt,
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

      // 送信後は現在のタブ入力をリセット（AsyncStorage下書きも削除）
      if (activeTab === SUPPORT_TAB_TYPES.QUESTION) {
        setQuestionDetail('');
        AsyncStorage.removeItem(STORAGE_KEYS.DRAFT_QUESTION_DETAIL).catch(() => {});
      } else if (activeTab === SUPPORT_TAB_TYPES.EMERGENCY) {
        setEmergencyDetail('');
        AsyncStorage.removeItem(STORAGE_KEYS.DRAFT_EMERGENCY_DETAIL).catch(() => {});
      } else if (activeTab === SUPPORT_TAB_TYPES.KEY_PREAPPLY) {
        setSelectedKeyIds([]);
        setKeyBuilding(ALL_BUILDINGS_VALUE);
        setKeySelectedId('');
        setKeyRequestedAt('');
        setKeyReason('');
        AsyncStorage.removeItem(STORAGE_KEYS.DRAFT_KEY_REASON).catch(() => {});
      } else if (activeTab === SUPPORT_TAB_TYPES.EVENT_STATUS) {
        setEventMemo('');
        AsyncStorage.removeItem(STORAGE_KEYS.DRAFT_EVENT_MEMO).catch(() => {});
      }
      setAttachmentFile(null);
      setAttachmentCaption('');

      if (result.warning) {
        showMessage('送信完了（一部警告）', `連絡案件を登録しました。\n${result.warning}`);
      } else {
        showMessage('送信完了', '連絡案件を登録しました。');
      }
      loadMyContacts();
    };

    submitAsync();
  };

  /**
   * 選択ボタン群を描画
   * @param {Array<{key: string, label: string}>} options - 選択肢
   * @param {string} selectedValue - 選択値
   * @param {(value: string) => void} onSelect - 選択時コールバック
   * @param {((option: Object) => string)|null} renderSubLabel - サブラベル描画関数
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
        <QuestionForm
          theme={theme}
          questionType={questionType}
          onChangeQuestionType={setQuestionType}
          questionDetail={questionDetail}
          onChangeQuestionDetail={setQuestionDetail}
          renderOptionButtons={renderOptionButtons}
        />
      );
    }

    if (activeTab === SUPPORT_TAB_TYPES.EMERGENCY) {
      return (
        <EmergencyForm
          theme={theme}
          emergencyPriority={emergencyPriority}
          onChangePriority={setEmergencyPriority}
          emergencyDetail={emergencyDetail}
          onChangeDetail={setEmergencyDetail}
          renderOptionButtons={renderOptionButtons}
        />
      );
    }

    if (activeTab === SUPPORT_TAB_TYPES.KEY_PREAPPLY) {
      return (
        <KeyPreApplyForm
          theme={theme}
          keyBuilding={keyBuilding}
          onChangeKeyBuilding={setKeyBuilding}
          keySelectedId={keySelectedId}
          onChangeKeySelectedId={setKeySelectedId}
          onAddSelectedKey={addSelectedKey}
          onRemoveSelectedKey={removeSelectedKey}
          selectedKeyItems={selectedKeyItems}
          filteredKeyCatalog={filteredKeyCatalog}
          keyBuildings={KEY_BUILDINGS}
          allBuildingsValue={ALL_BUILDINGS_VALUE}
          keyRequestedAt={keyRequestedAt}
          onChangeKeyRequestedAt={setKeyRequestedAt}
          keyReason={keyReason}
          onChangeKeyReason={setKeyReason}
        />
      );
    }

    return (
      <EventStatusForm
        theme={theme}
        eventStatus={eventStatus}
        onChangeEventStatus={setEventStatus}
        eventMemo={eventMemo}
        onChangeEventMemo={setEventMemo}
        renderOptionButtons={renderOptionButtons}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />
      <OfflineBanner />
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.description, { color: theme.textSecondary }]}>{SCREEN_DESCRIPTION}</Text>
          </View>

          {/* よくある質問セクション（常時表示） */}
          <View style={[styles.card, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
            <Text style={[styles.sectionTitle, { color: '#0369A1' }]}>
              {'\u2753'} よくある質問
            </Text>
            <View style={styles.faqList}>
              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: '#0C4A6E' }]}>
                  Q. 企画内容を変更したいのですが？
                </Text>
                <Text style={[styles.faqAnswer, { color: '#475569' }]}>
                  「質問」タブから「企画内容の変更」を選択し、変更内容を詳細に記載してください。
                </Text>
              </View>
              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: '#0C4A6E' }]}>
                  Q. 鍵の申請はいつまでにすればよいですか？
                </Text>
                <Text style={[styles.faqAnswer, { color: '#475569' }]}>
                  使用開始の30分前までに「鍵申請」タブから申請してください。
                </Text>
              </View>
              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: '#0C4A6E' }]}>
                  Q. 緊急の場合はどうすれば？
                </Text>
                <Text style={[styles.faqAnswer, { color: '#475569' }]}>
                  「緊急」タブから緊急度を選択して送信してください。本部が最優先で対応します。
                </Text>
              </View>
              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: '#0C4A6E' }]}>
                  Q. 企画の開始/終了報告は必要ですか？
                </Text>
                <Text style={[styles.faqAnswer, { color: '#475569' }]}>
                  はい。「開始終了」タブから企画の開始・終了を報告してください。巡回確認の参考になります。
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.historyHeader}>
              <Text style={[styles.sectionTitle, styles.historyTitle, { color: theme.text }]}>企画情報</Text>
            </View>
            <Text style={[styles.questionTargetHint, { color: theme.textSecondary }]}>
              記述式で入力できます。入力内容はこのアカウントに自動保存され、次回ログイン時に復元されます。
            </Text>

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

            <Text style={[styles.label, { color: theme.text }]}>添付情報（任意）</Text>
            <Text style={[styles.questionTargetHint, { color: theme.textSecondary }]}>
              画像/PDFを1件添付できます（最大 {MAX_ATTACHMENT_FILE_SIZE_MB}MB）。
            </Text>
            <TouchableOpacity
              style={[
                styles.attachPickerButton,
                { borderColor: theme.border, backgroundColor: theme.background },
              ]}
              onPress={pickAttachmentFile}
            >
              <Text style={[styles.attachPickerButtonText, { color: theme.textSecondary }]}>
                {attachmentFile ? '別の添付を選択' : '添付を選択'}
              </Text>
            </TouchableOpacity>

            {attachmentFile ? (
              <View
                style={[
                  styles.attachmentSummary,
                  { borderColor: theme.border, backgroundColor: theme.background },
                ]}
              >
                <Text style={[styles.attachmentSummaryName, { color: theme.text }]} numberOfLines={1}>
                  {attachmentFile.name || 'attachment.bin'}
                </Text>
                <Text style={[styles.attachmentSummaryMeta, { color: theme.textSecondary }]}>
                  {formatFileSize(attachmentFile.size)} / {attachmentFile.type || 'application/octet-stream'}
                </Text>
                <TouchableOpacity
                  style={[styles.removeKeyButton, { borderColor: theme.border }]}
                  onPress={clearAttachment}
                >
                  <Text style={[styles.removeKeyButtonText, { color: theme.textSecondary }]}>添付解除</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.historyEmptyText, { color: theme.textSecondary }]}>
                添付未選択（任意）
              </Text>
            )}

            <TextInput
              value={attachmentCaption}
              onChangeText={setAttachmentCaption}
              placeholder="添付メモ（任意・最大100文字程度）"
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

          <ContactHistory
            theme={theme}
            user={user}
            isLoadingContacts={isLoadingContacts}
            myContacts={myContacts}
            selectedContactId={selectedContactId}
            onSelectContact={setSelectedContactId}
            selectedContact={selectedContact}
            onRefreshContacts={loadMyContacts}
            isLoadingContactMessages={isLoadingContactMessages}
            contactMessages={contactMessages}
            isLoadingContactAttachments={isLoadingContactAttachments}
            contactAttachments={contactAttachments}
            onOpenAttachment={openAttachment}
            onRefreshDetail={() => {
              loadContactMessages(selectedContact.id);
              loadContactAttachments(selectedContact.id);
            }}
            contactReplyBody={contactReplyBody}
            onChangeContactReplyBody={setContactReplyBody}
            onSubmitContactReply={handleSubmitContactReply}
            isSubmittingContactReply={isSubmittingContactReply}
            followupAttachmentFile={followupAttachmentFile}
            onPickFollowupAttachment={pickFollowupAttachmentFile}
            onClearFollowupAttachment={clearFollowupAttachment}
            followupAttachmentCaption={followupAttachmentCaption}
            onChangeFollowupAttachmentCaption={setFollowupAttachmentCaption}
            onSubmitFollowupAttachment={handleSubmitFollowupAttachment}
            isSubmittingFollowupAttachment={isSubmittingFollowupAttachment}
          />
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
  attachPickerButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  attachPickerButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  attachmentSummary: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  attachmentSummaryName: {
    fontSize: 13,
    fontWeight: '600',
  },
  attachmentSummaryMeta: {
    fontSize: 12,
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
    marginTop: 8,
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
  historyEmptyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  faqList: {
    gap: 10,
  },
  faqItem: {
    gap: 2,
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '700',
  },
  faqAnswer: {
    fontSize: 12,
    lineHeight: 18,
    paddingLeft: 8,
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
