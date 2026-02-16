/**
 * 項目16画面
 * 企画者サポート画面
 */

import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import {
  Alert,
  Image,
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
  SUPPORT_TICKET_STATUSES,
} from '../../../services/supabase/supportTicketService';
import { KEY_BUILDINGS, KEY_CATALOG } from '../data/keyCatalog';
import { ensureKeysSeededFromCatalog } from '../../../services/supabase/keyMasterService';
import { listEvents } from '../../../services/supabase/eventService';
import {
  createAttachmentSignedUrl,
  createTicketAttachment,
  listTicketAttachments,
  MAX_ATTACHMENT_FILE_BYTES,
  uploadTicketAttachmentFile,
} from '../../../services/supabase/ticketAttachmentService';

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
const EVENT_QUICK_PICK_LIMIT = 30;
const MAX_ATTACHMENT_FILE_SIZE_MB = Math.floor(MAX_ATTACHMENT_FILE_BYTES / 1024 / 1024);
const REQUESTED_AT_TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const REQUESTED_AT_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})\s+([01]\d|2[0-3]):([0-5]\d)$/;
const FAQ_HINTS_BY_QUESTION_TYPE = {
  rule_change: [
    '案内資料との差分（何を、どの時間帯で変えるか）を先に整理すると回答が早くなります。',
    '安全導線・音量・火気など運用制約に触れる変更は優先して明記してください。',
  ],
  layout_change: [
    '変更前/変更後の動線（人・物の流れ）を文章で添えると確認がスムーズです。',
    '通路幅・避難経路への影響がある場合は必ず詳細欄に記載してください。',
  ],
  distribution_change: [
    '配布開始時刻と対象者の範囲を明記すると会計側の確認が早くなります。',
    '既存ルールとの差分を先に書くと再確認が減ります。',
  ],
  damage_report: [
    '破損物品名、現状、保管場所を先に書くと物品対応が早くなります。',
    '写真添付（任意）をつけると状況判断がしやすくなります。',
  ],
};
const normalizeText = (value) => (value || '').trim();
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
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventOptions, setEventOptions] = useState([]);
  const [eventSearchText, setEventSearchText] = useState('');
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
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
   * 企画一覧を取得
   * @returns {Promise<void>} 取得処理
   */
  const loadEvents = async () => {
    setIsLoadingEvents(true);
    const { data, error } = await listEvents({ limit: 120 });
    setIsLoadingEvents(false);

    if (error) {
      console.error('企画一覧取得に失敗:', error);
      return;
    }

    const nextEvents = (data || []).map((event) => ({
      ...event,
      key: event.id,
      label: event.name,
    }));
    setEventOptions(nextEvents);

    if (nextEvents.length === 0) {
      setSelectedEventId('');
      return;
    }

    if (selectedEventId && nextEvents.some((event) => event.id === selectedEventId)) {
      return;
    }

    const matchedByStoredText = nextEvents.find(
      (event) => event.name === eventName.trim() && event.location === eventLocation.trim()
    );
    const nextSelected = matchedByStoredText || nextEvents[0];

    setSelectedEventId(nextSelected.id);
    setEventName(nextSelected.name || '');
    setEventLocation(nextSelected.location || '');
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
   * 企画マスタを読み込む
   */
  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    loadEvents();
  }, [isHydrated]);

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
   * 選択企画が変わったら企画名/場所を同期
   */
  useEffect(() => {
    if (!selectedEventId) {
      return;
    }
    const selectedEvent = eventOptions.find((event) => event.id === selectedEventId);
    if (!selectedEvent) {
      return;
    }
    setEventName(selectedEvent.name || '');
    setEventLocation(selectedEvent.location || '');
  }, [eventOptions, selectedEventId]);

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
   * 選択中の質問種別
   */
  const selectedQuestion = useMemo(() => {
    return QUESTION_TYPES.find((item) => item.key === questionType) || QUESTION_TYPES[0];
  }, [questionType]);

  /**
   * 検索語に応じた企画候補
   * 未検索時は先頭候補を表示し、候補が多い場合は検索を促す。
   */
  const filteredEventOptions = useMemo(() => {
    const keyword = normalizeText(eventSearchText).toLowerCase();
    if (!keyword) {
      if (eventOptions.length <= EVENT_QUICK_PICK_LIMIT) {
        return eventOptions;
      }
      const quickPick = eventOptions.slice(0, EVENT_QUICK_PICK_LIMIT);
      if (!selectedEventId || quickPick.some((event) => event.id === selectedEventId)) {
        return quickPick;
      }
      const selectedEvent = eventOptions.find((event) => event.id === selectedEventId);
      if (!selectedEvent) {
        return quickPick;
      }
      return [selectedEvent, ...quickPick.slice(0, EVENT_QUICK_PICK_LIMIT - 1)];
    }

    return eventOptions.filter((event) => {
      const source = `${normalizeText(event.name)} ${normalizeText(event.location)}`.toLowerCase();
      return source.includes(keyword);
    });
  }, [eventOptions, eventSearchText, selectedEventId]);

  const hiddenEventCount = useMemo(() => {
    if (normalizeText(eventSearchText)) {
      return 0;
    }
    return Math.max(eventOptions.length - filteredEventOptions.length, 0);
  }, [eventOptions.length, filteredEventOptions.length, eventSearchText]);

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
    if (!selectedEventId) {
      showMessage('入力不足', '対象企画を選択してください。');
      return false;
    }
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
      eventId: selectedEventId,
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
          {(FAQ_HINTS_BY_QUESTION_TYPE[selectedQuestion.key] || []).length > 0 ? (
            <View
              style={[
                styles.faqHintBox,
                { borderColor: theme.border, backgroundColor: theme.background },
              ]}
            >
              <Text style={[styles.faqHintTitle, { color: theme.text }]}>FAQ/入力ヒント</Text>
              {(FAQ_HINTS_BY_QUESTION_TYPE[selectedQuestion.key] || []).map((hint) => (
                <Text key={hint} style={[styles.faqHintItem, { color: theme.textSecondary }]}>
                  ・{hint}
                </Text>
              ))}
            </View>
          ) : null}

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
              style={[
                styles.picker,
                styles.themedPicker,
                {
                  color: theme.text,
                  backgroundColor: theme.surface,
                },
              ]}
              itemStyle={{ color: theme.text }}
              dropdownIconColor={theme.text}
            >
              <Picker.Item label="すべての棟" value={ALL_BUILDINGS_VALUE} color={theme.text} />
              {KEY_BUILDINGS.map((building) => (
                <Picker.Item key={building} label={building} value={building} color={theme.text} />
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
              style={[
                styles.picker,
                styles.themedPicker,
                {
                  color: theme.text,
                  backgroundColor: theme.surface,
                },
              ]}
              itemStyle={{ color: theme.text }}
              dropdownIconColor={theme.text}
            >
              {filteredKeyCatalog.length === 0 ? (
                <Picker.Item label="選択できる鍵がありません" value="" color={theme.text} />
              ) : (
                filteredKeyCatalog.map((item) => (
                  <Picker.Item
                    key={item.id}
                    label={`${item.building} / ${item.name}`}
                    value={item.id}
                    color={theme.text}
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
            onBlur={() => {
              const normalized = normalizeRequestedAtInput(keyRequestedAt);
              if (normalized !== keyRequestedAt) {
                setKeyRequestedAt(normalized);
              }
            }}
            placeholder="例）10:30 または 2026-02-16 10:30"
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
          <Text style={[styles.questionTargetHint, { color: theme.textSecondary }]}>
            入力形式: HH:mm または YYYY-MM-DD HH:mm
          </Text>

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
            <View style={styles.historyHeader}>
              <Text style={[styles.sectionTitle, styles.historyTitle, { color: theme.text }]}>企画情報</Text>
              <TouchableOpacity
                style={[styles.refreshButton, { borderColor: theme.border }]}
                onPress={loadEvents}
              >
                <Text style={[styles.refreshButtonText, { color: theme.textSecondary }]}>
                  {isLoadingEvents ? '更新中...' : '企画更新'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.questionTargetHint, { color: theme.textSecondary }]}>
              `events`マスタから対象企画を選択してください（event_id必須）。
            </Text>

            <Text style={[styles.label, { color: theme.text }]}>対象企画</Text>
            <TextInput
              value={eventSearchText}
              onChangeText={setEventSearchText}
              placeholder="企画名・場所で検索"
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
            {eventOptions.length === 0 ? (
              <Text style={[styles.historyEmptyText, { color: theme.textSecondary }]}>
                企画が未登録です。先に企画マスタを登録してください。
              </Text>
            ) : filteredEventOptions.length === 0 ? (
              <Text style={[styles.historyEmptyText, { color: theme.textSecondary }]}>
                検索条件に一致する企画がありません。キーワードを変更してください。
              </Text>
            ) : (
              <View style={styles.optionGroup}>
                {filteredEventOptions.map((event) => {
                  const isActive = event.id === selectedEventId;
                  return (
                    <Pressable
                      key={event.id}
                      style={[
                        styles.optionButton,
                        {
                          borderColor: isActive ? theme.primary : theme.border,
                          backgroundColor: isActive ? `${theme.primary}22` : theme.background,
                        },
                      ]}
                      onPress={() => setSelectedEventId(event.id)}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          { color: isActive ? theme.primary : theme.textSecondary },
                        ]}
                      >
                        {event.name}
                      </Text>
                      <Text
                        style={[
                          styles.optionButtonSubText,
                          { color: isActive ? theme.primary : theme.textSecondary },
                        ]}
                      >
                        {event.location || '場所未設定'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {hiddenEventCount > 0 ? (
              <Text style={[styles.historyEmptyText, { color: theme.textSecondary }]}>
                候補が多いため先頭{filteredEventOptions.length}件のみ表示中です。検索で絞り込んでください。
              </Text>
            ) : null}

            <Text style={[styles.label, { color: theme.text }]}>企画名</Text>
            <TextInput
              value={eventName}
              onChangeText={setEventName}
              placeholder="企画名を入力"
              placeholderTextColor={theme.textSecondary}
              editable={false}
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
              editable={false}
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
                  連絡詳細・回答
                </Text>
                <TouchableOpacity
                  style={[styles.refreshButton, { borderColor: theme.border }]}
                  onPress={() => {
                    loadContactMessages(selectedContact.id);
                    loadContactAttachments(selectedContact.id);
                  }}
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

              <Text style={[styles.label, { color: theme.text }]}>添付</Text>
              {isLoadingContactAttachments ? (
                <Text style={[styles.historyEmptyText, { color: theme.textSecondary }]}>読み込み中...</Text>
              ) : contactAttachments.length === 0 ? (
                <Text style={[styles.historyEmptyText, { color: theme.textSecondary }]}>
                  添付はありません
                </Text>
              ) : (
                <View style={styles.messageList}>
                  {contactAttachments.map((attachment) => {
                    const isImage = normalizeText(attachment.mime_type).startsWith('image/');
                    const fileName = normalizeText(attachment.storage_path).split('/').pop() || '添付ファイル';
                    return (
                      <View
                        key={attachment.id}
                        style={[
                          styles.messageItem,
                          {
                            borderColor: theme.border,
                            backgroundColor: theme.background,
                          },
                        ]}
                      >
                        <Text style={[styles.messageBody, { color: theme.text }]}>
                          {attachment.caption || fileName}
                        </Text>
                        <Text style={[styles.messageDate, { color: theme.textSecondary }]}>
                          {fileName} / {formatFileSize(attachment.file_size_bytes)} /{' '}
                          {attachment.mime_type || 'application/octet-stream'}
                        </Text>
                        {isImage && attachment.signedUrl ? (
                          <Image
                            source={{ uri: attachment.signedUrl }}
                            style={styles.inlineAttachmentPreview}
                            resizeMode="cover"
                          />
                        ) : null}
                        <TouchableOpacity
                          style={[styles.attachPickerButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
                          onPress={() => openAttachment(attachment)}
                          disabled={!attachment.signedUrl}
                        >
                          <Text style={[styles.attachPickerButtonText, { color: theme.textSecondary }]}>
                            {attachment.signedUrl ? '添付を開く' : 'URL生成失敗'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              <Text style={[styles.label, { color: theme.text }]}>対応メッセージ</Text>
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

              <Text style={[styles.label, { color: theme.text }]}>追記投稿</Text>
              <TextInput
                value={contactReplyBody}
                onChangeText={setContactReplyBody}
                multiline
                placeholder="担当者への追記内容を入力してください"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.multilineInput,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                    minHeight: 88,
                  },
                ]}
              />
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.primary }]}
                onPress={handleSubmitContactReply}
                disabled={isSubmittingContactReply}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmittingContactReply ? '送信中...' : '追記を送信'}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.label, { color: theme.text }]}>添付追加（必要時）</Text>
              <TouchableOpacity
                style={[
                  styles.attachPickerButton,
                  { borderColor: theme.border, backgroundColor: theme.background },
                ]}
                onPress={pickFollowupAttachmentFile}
              >
                <Text style={[styles.attachPickerButtonText, { color: theme.textSecondary }]}>
                  {followupAttachmentFile ? '別の添付を選択' : '添付を選択'}
                </Text>
              </TouchableOpacity>

              {followupAttachmentFile ? (
                <View
                  style={[
                    styles.attachmentSummary,
                    { borderColor: theme.border, backgroundColor: theme.background },
                  ]}
                >
                  <Text style={[styles.attachmentSummaryName, { color: theme.text }]} numberOfLines={1}>
                    {followupAttachmentFile.name || 'attachment.bin'}
                  </Text>
                  <Text style={[styles.attachmentSummaryMeta, { color: theme.textSecondary }]}>
                    {formatFileSize(followupAttachmentFile.size)} /{' '}
                    {followupAttachmentFile.type || 'application/octet-stream'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.removeKeyButton, { borderColor: theme.border }]}
                    onPress={clearFollowupAttachment}
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
                value={followupAttachmentCaption}
                onChangeText={setFollowupAttachmentCaption}
                placeholder="添付メモ（任意）"
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
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.primary }]}
                onPress={handleSubmitFollowupAttachment}
                disabled={isSubmittingFollowupAttachment}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmittingFollowupAttachment ? '登録中...' : '添付を追加'}
                </Text>
              </TouchableOpacity>
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
  themedPicker: {
    borderWidth: 0,
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
  faqHintBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  faqHintTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  faqHintItem: {
    fontSize: 12,
    lineHeight: 18,
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
  inlineAttachmentPreview: {
    width: '100%',
    height: 132,
    borderRadius: 8,
    marginTop: 6,
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
