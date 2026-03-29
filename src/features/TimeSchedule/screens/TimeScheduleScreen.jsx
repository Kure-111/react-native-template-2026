/**
 * TimeSchedule 画面
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ThemedHeader } from '../../../shared/components/ThemedHeader';
import { Ionicons } from '../../../shared/components/icons';
import DetailModal from '../../01_Events&Stalls_list/components/DetailModal';
import {
  OPERATION_END_TIME,
  OPERATION_START_TIME,
  SCREEN_DESCRIPTION,
  SCREEN_NAME,
  STORAGE_KEYS,
} from '../constants';
import { timeScheduleService } from '../services/timeScheduleService';

/** 日付フォーマット（YYYY-MM-DD） */
const DATE_FORMAT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** 15分スロット（分） */
const TIME_SLOT_INTERVAL_MINUTES = 15;
/** 1スロットの高さ */
const TIMELINE_ROW_HEIGHT = 45;
/** 並び替えドラッグの1行換算高さ(px) */
const REORDER_DRAG_ROW_HEIGHT_PX = 62;
/** ブックマーク行間(px) */
const BOOKMARK_LIST_ROW_GAP_PX = 8;
/** カード幅 */
const TIMELINE_CARD_WIDTH = 220;
/** カード間隔 */
const TIMELINE_CARD_GAP = 12;
/** タイムカラム幅 */
const TIMELINE_TIME_COLUMN_WIDTH = 72;
/** 場所ヘッダー高さ */
const LOCATION_HEADER_HEIGHT = 40;
/** 初期表示する建物フィルタ名 */
const DEFAULT_VISIBLE_BUILDING_NAMES = [
  '11月ホール',
  '実学ホール',
  '記念会館',
  '人工芝グラウンド',
  'その他',
];
/** 表示順固定ルール */
const FIXED_LOCATION_ORDER = ['11月ホール', '実学ホール', '記念会館', '人工芝', 'その他'];
/** 表示設定のユーザー別保存キープレフィックス */
const DISPLAY_BOOKMARKS_STORAGE_PREFIX = 'time_schedule_display_bookmarks_';
/** 表示設定のアクティブブックマーク保存キープレフィックス */
const ACTIVE_BOOKMARK_STORAGE_PREFIX = 'time_schedule_active_bookmark_';
/** 表示設定の非表示ブックマーク保存キープレフィックス */
const HIDDEN_BOOKMARKS_STORAGE_PREFIX = 'time_schedule_hidden_bookmarks_';
/** 表示設定の並び順保存キープレフィックス */
const BOOKMARK_ORDER_STORAGE_PREFIX = 'time_schedule_bookmark_order_';
/** 既定ブックマークID接頭辞 */
const DEFAULT_BOOKMARK_ID_PREFIX = 'default_building_';
/** 軸タイプ定義 */
const BOOKMARK_AXES = {
  BUILDING: 'building',
  AREA: 'area',
  GROUP: 'group',
};

/** 軸表示名 */
const BOOKMARK_AXIS_LABELS = {
  [BOOKMARK_AXES.BUILDING]: '建物',
  [BOOKMARK_AXES.AREA]: 'エリア',
  [BOOKMARK_AXES.GROUP]: '団体',
};

/**
 * 並び順判定用に場所名を正規化する
 * @param {string} locationName - 場所名
 * @returns {string} 正規化後の場所名
 */
const normalizeLocationOrderName = (locationName) => {
  /** 変換前後の表記ゆれ吸収マップ */
  const aliasMap = {
    人工芝グラウンド: '人工芝',
  };
  /** 正規化前の文字列 */
  const baseName = String(locationName || '').trim();
  return aliasMap[baseName] || baseName;
};

/**
 * 場所名の固定順序で比較する
 * @param {string} left - 比較対象左
 * @param {string} right - 比較対象右
 * @returns {number} 比較結果
 */
const compareByFixedLocationOrder = (left, right) => {
  /** 正規化後左 */
  const normalizedLeft = normalizeLocationOrderName(left);
  /** 正規化後右 */
  const normalizedRight = normalizeLocationOrderName(right);
  /** 左の固定順インデックス */
  const fixedLeftIndex = FIXED_LOCATION_ORDER.indexOf(normalizedLeft);
  /** 右の固定順インデックス */
  const fixedRightIndex = FIXED_LOCATION_ORDER.indexOf(normalizedRight);
  /** 左が固定順対象か */
  const hasLeftFixedOrder = fixedLeftIndex !== -1;
  /** 右が固定順対象か */
  const hasRightFixedOrder = fixedRightIndex !== -1;

  if (hasLeftFixedOrder && hasRightFixedOrder) {
    return fixedLeftIndex - fixedRightIndex;
  }
  if (hasLeftFixedOrder) {
    return -1;
  }
  if (hasRightFixedOrder) {
    return 1;
  }

  return String(left || '').localeCompare(String(right || ''), 'ja', { numeric: true });
};

/**
 * 表示設定の保存キーをユーザー別に生成する
 * @param {string} userId - ユーザーID
 * @returns {{bookmarksKey: string, activeKey: string, hiddenKey: string, orderKey: string}} 保存キー
 */
const buildDisplayStorageKeys = (userId) => {
  /** 正規化したユーザーID */
  const normalizedUserId = String(userId || 'anonymous').trim() || 'anonymous';
  return {
    bookmarksKey: `${DISPLAY_BOOKMARKS_STORAGE_PREFIX}${normalizedUserId}`,
    activeKey: `${ACTIVE_BOOKMARK_STORAGE_PREFIX}${normalizedUserId}`,
    hiddenKey: `${HIDDEN_BOOKMARKS_STORAGE_PREFIX}${normalizedUserId}`,
    orderKey: `${BOOKMARK_ORDER_STORAGE_PREFIX}${normalizedUserId}`,
  };
};

/**
 * 文字列配列が同一内容か判定する
 * @param {Array<string>} left - 左配列
 * @param {Array<string>} right - 右配列
 * @returns {boolean} 判定結果
 */
const isSameStringArray = (left, right) => {
  /** 左配列 */
  const normalizedLeft = Array.isArray(left) ? left : [];
  /** 右配列 */
  const normalizedRight = Array.isArray(right) ? right : [];
  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }
  return normalizedLeft.every((value, index) => String(value) === String(normalizedRight[index]));
};

/**
 * 指定IDを配列内の任意位置へ移動する
 * @param {Array<string>} sourceIds - 元ID配列
 * @param {string} targetId - 移動対象ID
 * @param {number} nextIndex - 移動先インデックス
 * @returns {Array<string>} 移動後ID配列
 */
const moveIdToIndex = (sourceIds, targetId, nextIndex) => {
  /** 元配列 */
  const currentIds = Array.isArray(sourceIds) ? [...sourceIds] : [];
  /** 対象IDの現在位置 */
  const currentIndex = currentIds.findIndex((id) => String(id || '') === String(targetId || ''));
  if (currentIndex === -1) {
    return currentIds;
  }

  /** 正規化した移動先インデックス */
  const normalizedNextIndex = Math.max(0, Math.min(nextIndex, currentIds.length - 1));
  if (currentIndex === normalizedNextIndex) {
    return currentIds;
  }

  /** 対象ID */
  const movedId = currentIds[currentIndex];
  currentIds.splice(currentIndex, 1);
  currentIds.splice(normalizedNextIndex, 0, movedId);
  return currentIds;
};

/**
 * 評価軸ごとの値をスケジュールアイテムから抽出する
 * @param {Object} item - スケジュールアイテム
 * @param {string} axis - 評価軸
 * @param {Object} areaLabelMap - areaIdごとの表示名Map
 * @returns {{key: string, label: string}} 抽出結果
 */
const extractAxisValue = (item, axis, areaLabelMap = {}) => {
  /** 建物ID */
  const buildingId = String(item?.buildingLocationId || '').trim();
  /** 建物表示名 */
  const buildingLabel =
    String(item?.buildingLocationName || item?.locationName || '場所未設定').trim() || '場所未設定';
  /** 団体名 */
  const groupLabel = String(item?.groupName || '団体未設定').trim() || '団体未設定';
  /** エリアID */
  const areaId = String(item?.areaId || '').trim();

  if (axis === BOOKMARK_AXES.GROUP) {
    return {
      key: groupLabel,
      label: groupLabel,
    };
  }

  if (axis === BOOKMARK_AXES.AREA) {
    /** エリア表示名 */
    const areaLabel = areaLabelMap[areaId] || (areaId ? `エリア ${areaId}` : 'エリア未設定');
    return {
      key: areaId || 'UNASSIGNED_AREA',
      label: areaLabel,
    };
  }

  return {
    key: buildingId || buildingLabel,
    label: buildingLabel,
  };
};

/**
 * HH:mm を分へ変換する
 * @param {string} timeText - HH:mm
 * @returns {number} 分
 */
const parseHmToMinutes = (timeText) => {
  /** 分割した時刻文字列 */
  const [hourText, minuteText] = String(timeText || '').split(':');
  /** 時 */
  const hour = Number(hourText);
  /** 分 */
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return 0;
  }
  return hour * 60 + minute;
};

/** 運用開始分 */
const OPERATION_START_MINUTES = parseHmToMinutes(OPERATION_START_TIME);
/** 運用終了分 */
const OPERATION_END_MINUTES = parseHmToMinutes(OPERATION_END_TIME);

/**
 * Date を YYYY-MM-DD 形式へ変換する
 * @param {Date} date - 変換対象日付
 * @returns {string} YYYY-MM-DD
 */
const formatDateToYmd = (date) => {
  /** 年 */
  const year = date.getFullYear();
  /** 月 */
  const month = String(date.getMonth() + 1).padStart(2, '0');
  /** 日 */
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * YYYY-MM-DD 形式の文字列を Date に変換する
 * @param {string} ymd - YYYY-MM-DD
 * @returns {Date} 変換後 Date
 */
const parseYmdToDate = (ymd) => {
  /** 分割した日付文字列 */
  const [yearText, monthText, dayText] = String(ymd).split('-');
  /** 年 */
  const year = Number(yearText);
  /** 月 */
  const month = Number(monthText);
  /** 日 */
  const day = Number(dayText);
  return new Date(year, month - 1, day);
};

/**
 * 初期表示日を決定する
 * @returns {string} YYYY-MM-DD
 */
const getInitialScheduleDate = () => {
  /** 祭開始日（環境変数） */
  const festivalStartDate = String(process.env.EXPO_PUBLIC_FESTIVAL_START_DATE || '').trim();
  if (DATE_FORMAT_PATTERN.test(festivalStartDate)) {
    return festivalStartDate;
  }
  return formatDateToYmd(new Date());
};

/**
 * 日付を表示用に整形する
 * @param {string} ymd - YYYY-MM-DD
 * @returns {string} 表示文字列
 */
const formatDisplayDate = (ymd) => {
  /** 日付オブジェクト */
  const date = parseYmdToDate(ymd);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
};

/**
 * 色文字列へ透過率を適用する
 * @param {string} colorText - 元の色文字列
 * @param {number} alpha - 透過率（0〜1）
 * @returns {string} 透過適用後の色文字列
 */
const toAlphaColor = (colorText, alpha) => {
  /** 正規化した色文字列 */
  const normalizedColor = String(colorText || '').trim();
  /** 正規化した透過率 */
  const normalizedAlpha = Math.max(0, Math.min(1, Number(alpha)));

  if (/^#([0-9a-fA-F]{6})$/.test(normalizedColor)) {
    /** 16進アルファ */
    const alphaHex = Math.round(normalizedAlpha * 255)
      .toString(16)
      .padStart(2, '0');
    return `${normalizedColor}${alphaHex}`;
  }

  if (/^#([0-9a-fA-F]{3})$/.test(normalizedColor)) {
    /** 3桁HEXを6桁HEXへ展開 */
    const hex = normalizedColor.replace('#', '');
    /** 展開後6桁HEX */
    const expandedHex = `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    /** 16進アルファ */
    const alphaHex = Math.round(normalizedAlpha * 255)
      .toString(16)
      .padStart(2, '0');
    return `${expandedHex}${alphaHex}`;
  }

  /** rgb() 形式か */
  const rgbMatch = normalizedColor.match(/^rgb\(([^)]+)\)$/i);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${normalizedAlpha})`;
  }

  /** rgba() 形式か */
  const rgbaMatch = normalizedColor.match(/^rgba\(([^)]+)\)$/i);
  if (rgbaMatch) {
    /** RGBAの要素配列 */
    const rgbaParts = rgbaMatch[1].split(',').map((value) => value.trim());
    if (rgbaParts.length >= 3) {
      return `rgba(${rgbaParts[0]}, ${rgbaParts[1]}, ${rgbaParts[2]}, ${normalizedAlpha})`;
    }
  }

  return normalizedColor;
};

/**
 * TimeSchedule のメイン画面を表示する
 * @param {Object} props - コンポーネント引数
 * @param {Object} props.navigation - React Navigation の navigation
 * @returns {JSX.Element} TimeSchedule 画面
 */
const TimeScheduleScreen = ({ navigation }) => {
  /** テーマ情報 */
  const { theme } = useTheme();
  /** 認証ユーザー情報 */
  const { user } = useAuth();
  /** 選択中日付 */
  const [selectedDate, setSelectedDate] = useState(getInitialScheduleDate());
  /** ユーザー保存済みブックマーク一覧 */
  const [displayBookmarks, setDisplayBookmarks] = useState([]);
  /** 非表示にしたブックマークID一覧 */
  const [hiddenBookmarkIds, setHiddenBookmarkIds] = useState([]);
  /** ブックマーク並び順ID一覧 */
  const [bookmarkOrderIds, setBookmarkOrderIds] = useState([]);
  /** 並び替え中のブックマークID */
  const [draggingBookmarkId, setDraggingBookmarkId] = useState('');
  /** ドラッグ中のY移動量 */
  const [draggingOffsetY, setDraggingOffsetY] = useState(0);
  /** ブックマーク行の実測高さ(px) */
  const [bookmarkRowHeight, setBookmarkRowHeight] = useState(REORDER_DRAG_ROW_HEIGHT_PX);
  /** 現在適用中のブックマークID */
  const [activeBookmarkId, setActiveBookmarkId] = useState('');
  /** DBに存在する開催日 */
  const [availableDates, setAvailableDates] = useState([]);
  /** 読み込み状態 */
  const [isLoading, setIsLoading] = useState(true);
  /** エラーメッセージ */
  const [errorMessage, setErrorMessage] = useState('');
  /** エリア一覧 */
  const [areas, setAreas] = useState([]);
  /** area_locations由来のエリアマスタ一覧 */
  const [areaLocations, setAreaLocations] = useState([]);
  /** タイムライン表示行 */
  const [timelineRows, setTimelineRows] = useState([]);
  /** 選択日付の表示対象スケジュール一覧 */
  const [scheduleItems, setScheduleItems] = useState([]);
  /** タイムライン表示領域幅 */
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0);
  /** 横スクロール位置 */
  const [timelineScrollX, setTimelineScrollX] = useState(0);
  /** 表示項目設定モーダル表示状態 */
  const [isDisplaySettingsModalVisible, setIsDisplaySettingsModalVisible] = useState(false);
  /** ブックマーク一覧モーダル表示状態 */
  const [isBookmarkListModalVisible, setIsBookmarkListModalVisible] = useState(false);
  /** 設定中の評価軸 */
  const [draftAxis, setDraftAxis] = useState(BOOKMARK_AXES.BUILDING);
  /** 設定中の検索語 */
  const [draftSearchText, setDraftSearchText] = useState('');
  /** 設定中の選択キー一覧 */
  const [draftSelectedCriteriaKeys, setDraftSelectedCriteriaKeys] = useState([]);
  /** 設定中のブックマーク名 */
  const [draftBookmarkName, setDraftBookmarkName] = useState('');
  /** 編集対象ブックマークID（新規時は空） */
  const [editingBookmarkId, setEditingBookmarkId] = useState('');
  /** 設定モーダル内のエラー文言 */
  const [settingsErrorMessage, setSettingsErrorMessage] = useState('');
  /** 追加モーダル終了後に一覧へ戻すか */
  const [shouldReturnToBookmarkList, setShouldReturnToBookmarkList] = useState(false);
  /** 選択中詳細アイテム */
  const [selectedItem, setSelectedItem] = useState(null);
  /** 詳細モーダル表示状態 */
  const [isModalVisible, setIsModalVisible] = useState(false);
  /** 並び替えドラッグの内部状態 */
  const reorderDragStateRef = useRef({
    activeBookmarkId: '',
    startIndex: -1,
    currentIndex: -1,
    startPageY: 0,
  });
  /** Webマウスドラッグのイベントハンドラー参照 */
  const webMouseDragListenersRef = useRef({
    move: null,
    up: null,
  });

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    if (UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  /**
   * ローカル保存済みの表示設定を復元する
   * @returns {Promise<void>} 復元処理
   */
  const restoreSelections = useCallback(async () => {
    /** 保存キー */
    const storageKeys = buildDisplayStorageKeys(user?.id);
    try {
      /** 取得した保存値 */
      const savedRows = await AsyncStorage.multiGet([
        STORAGE_KEYS.SELECTED_DATE,
        storageKeys.bookmarksKey,
        storageKeys.activeKey,
        storageKeys.hiddenKey,
        storageKeys.orderKey,
      ]);
      /** 保存済み日付 */
      const savedDate = savedRows.find(([key]) => key === STORAGE_KEYS.SELECTED_DATE)?.[1] || '';
      /** 保存済みブックマーク一覧 */
      const savedBookmarks = savedRows.find(([key]) => key === storageKeys.bookmarksKey)?.[1] || '';
      /** 保存済みアクティブブックマークID */
      const savedActiveBookmarkId =
        savedRows.find(([key]) => key === storageKeys.activeKey)?.[1] || '';
      /** 保存済み非表示ブックマークID */
      const savedHiddenBookmarkIds = savedRows.find(([key]) => key === storageKeys.hiddenKey)?.[1] || '[]';
      /** 保存済み並び順ブックマークID */
      const savedBookmarkOrderIds = savedRows.find(([key]) => key === storageKeys.orderKey)?.[1] || '[]';

      if (DATE_FORMAT_PATTERN.test(savedDate)) {
        setSelectedDate(savedDate);
      }

      if (savedBookmarks) {
        /** 復元したブックマーク一覧 */
        const parsedBookmarks = JSON.parse(savedBookmarks);
        if (Array.isArray(parsedBookmarks)) {
          setDisplayBookmarks(parsedBookmarks);
        }
      }

      /** 復元した非表示ID配列 */
      const parsedHiddenBookmarkIds = JSON.parse(savedHiddenBookmarkIds);
      if (Array.isArray(parsedHiddenBookmarkIds)) {
        setHiddenBookmarkIds(
          parsedHiddenBookmarkIds.map((id) => String(id || '').trim()).filter(Boolean)
        );
      }

      /** 復元した並び順ID配列 */
      const parsedBookmarkOrderIds = JSON.parse(savedBookmarkOrderIds);
      if (Array.isArray(parsedBookmarkOrderIds)) {
        setBookmarkOrderIds(parsedBookmarkOrderIds.map((id) => String(id || '').trim()).filter(Boolean));
      }

      setActiveBookmarkId(String(savedActiveBookmarkId || ''));
    } catch (error) {
      // 復元失敗時は既定値を使用
    }
  }, [user?.id]);

  /**
   * 表示設定をローカル保存する
   * @param {string} nextDate - 保存日付
   * @param {Array<Object>} nextBookmarks - 保存するブックマーク配列
  * @param {string} nextActiveBookmarkId - 保存するアクティブブックマークID
  * @param {Array<string>} nextHiddenBookmarkIds - 保存する非表示ブックマークID配列
   * @param {Array<string>} nextBookmarkOrderIds - 保存する並び順ブックマークID配列
   * @returns {Promise<void>} 保存処理
   */
  const persistSelections = useCallback(async (
    nextDate,
    nextBookmarks,
    nextActiveBookmarkId,
    nextHiddenBookmarkIds,
    nextBookmarkOrderIds
  ) => {
    /** 保存キー */
    const storageKeys = buildDisplayStorageKeys(user?.id);
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.SELECTED_DATE, String(nextDate)],
        [storageKeys.bookmarksKey, JSON.stringify(nextBookmarks || [])],
        [storageKeys.activeKey, String(nextActiveBookmarkId || '')],
        [storageKeys.hiddenKey, JSON.stringify(nextHiddenBookmarkIds || [])],
        [storageKeys.orderKey, JSON.stringify(nextBookmarkOrderIds || [])],
      ]);
    } catch (error) {
      // 保存失敗時は表示処理を継続
    }
  }, [user?.id]);

  /** エリアIDごとの表示名Map */
  const areaLabelMap = useMemo(() => {
    /** 表示名Map */
    const labelMap = {};

    (areaLocations || []).forEach((area) => {
      /** エリアID */
      const areaId = String(area.area_id || '').trim();
      /** エリア名 */
      const areaName = String(area.area_name || '').trim();
      if (!areaId) {
        return;
      }
      labelMap[areaId] = areaName || `エリア ${areaId}`;
    });

    return labelMap;
  }, [areaLocations]);

  /** 初期表示対象の建物ID一覧 */
  const defaultVisibleBuildingIds = useMemo(() => {
    return DEFAULT_VISIBLE_BUILDING_NAMES
      .map((buildingName) =>
        (areas || []).find((building) => String(building.building_name || '') === buildingName)
      )
      .filter(Boolean)
      .map((building) => String(building.building_id || ''));
  }, [areas]);

  /** 既定のブックマーク一覧（建物ごとに個別） */
  const defaultBookmarks = useMemo(() => {
    return defaultVisibleBuildingIds.map((buildingId) => {
      /** 建物情報 */
      const building = (areas || []).find(
        (currentBuilding) => String(currentBuilding.building_id || '') === String(buildingId || '')
      );
      /** 建物名 */
      const buildingName = String(building?.building_name || '既定項目').trim() || '既定項目';
      return {
        id: `${DEFAULT_BOOKMARK_ID_PREFIX}${buildingId}`,
        name: buildingName,
        axis: BOOKMARK_AXES.BUILDING,
        criteriaKeys: [String(buildingId || '')],
        isSystem: true,
      };
    });
  }, [areas, defaultVisibleBuildingIds]);

  /** 画面で利用可能なブックマーク一覧 */
  const mergedBookmarks = useMemo(() => {
    /** ユーザー作成分 */
    const userBookmarks = (displayBookmarks || []).filter(
      (bookmark) => !String(bookmark?.id || '').startsWith(DEFAULT_BOOKMARK_ID_PREFIX)
    );
    return [...defaultBookmarks, ...userBookmarks];
  }, [defaultBookmarks, displayBookmarks]);

  /** 並び順を適用したブックマーク一覧 */
  const orderedMergedBookmarks = useMemo(() => {
    /** 並び順ID -> index のMap */
    const orderMap = {};
    (bookmarkOrderIds || []).forEach((bookmarkId, index) => {
      orderMap[String(bookmarkId || '')] = index;
    });

    return [...(mergedBookmarks || [])].sort((left, right) => {
      /** 左ID */
      const leftId = String(left?.id || '');
      /** 右ID */
      const rightId = String(right?.id || '');
      /** 左並び順 */
      const leftOrder = Number.isInteger(orderMap[leftId]) ? orderMap[leftId] : Number.MAX_SAFE_INTEGER;
      /** 右並び順 */
      const rightOrder = Number.isInteger(orderMap[rightId]) ? orderMap[rightId] : Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return String(left.name || '').localeCompare(String(right.name || ''), 'ja', { numeric: true });
    });
  }, [bookmarkOrderIds, mergedBookmarks]);

  /** 表示対象（非表示除外）のブックマーク一覧 */
  const visibleBookmarks = useMemo(() => {
    return orderedMergedBookmarks.filter(
      (bookmark) => !hiddenBookmarkIds.includes(String(bookmark.id || ''))
    );
  }, [hiddenBookmarkIds, orderedMergedBookmarks]);

  /** 設定モーダルに表示する建物一覧（固定順） */
  const orderedSettingsBuildings = useMemo(() => {
    return [...(areas || [])].sort((left, right) => {
      return compareByFixedLocationOrder(left.building_name, right.building_name);
    });
  }, [areas]);

  /** 軸ごとの選択候補一覧 */
  const axisCandidatesMap = useMemo(() => {
    /** 建物軸候補 */
    const buildingCandidates = orderedSettingsBuildings.map((building) => ({
      key: String(building.building_id || ''),
      label: String(building.building_name || ''),
    }));

    /** 団体名候補 */
    const groupCandidates = Array.from(
      new Set((scheduleItems || []).map((item) => String(item.groupName || '団体未設定').trim() || '団体未設定'))
    )
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, 'ja', { numeric: true }))
      .map((groupName) => ({
        key: groupName,
        label: groupName,
      }));

    /** エリア候補 */
    const areaCandidates = (areaLocations || [])
      .map((area, index) => ({
        key: String(area.area_id || '').trim(),
        label: String(area.area_name || '').trim() || `エリア ${String(area.area_id || '').trim()}`,
        order: Number.isFinite(Number(area.display_order)) ? Number(area.display_order) : index + 1,
      }))
      .filter((candidate) => Boolean(candidate.key))
      .sort((left, right) => {
        if (left.order !== right.order) {
          return left.order - right.order;
        }
        return left.label.localeCompare(right.label, 'ja', { numeric: true });
      })
      .map(({ key, label }) => ({ key, label }));

    /** 未設定エリアの予定が存在するか */
    const hasUnassignedAreaItems = (scheduleItems || []).some(
      (item) => !String(item.areaId || '').trim()
    );
    if (hasUnassignedAreaItems) {
      areaCandidates.push({
        key: 'UNASSIGNED_AREA',
        label: 'エリア未設定',
      });
    }

    return {
      [BOOKMARK_AXES.BUILDING]: buildingCandidates,
      [BOOKMARK_AXES.GROUP]: groupCandidates,
      [BOOKMARK_AXES.AREA]: areaCandidates,
    };
  }, [areaLocations, orderedSettingsBuildings, scheduleItems]);

  /** モーダルで表示する候補一覧（検索適用後） */
  const filteredDraftCandidates = useMemo(() => {
    /** 現在軸の候補一覧 */
    const candidates = axisCandidatesMap[draftAxis] || [];
    /** 正規化検索語 */
    const searchText = String(draftSearchText || '').trim().toLowerCase();
    if (!searchText) {
      return candidates;
    }
    return candidates.filter((candidate) => String(candidate.label || '').toLowerCase().includes(searchText));
  }, [axisCandidatesMap, draftAxis, draftSearchText]);

  /** 選択中日付のインデックス */
  const selectedDateIndex = useMemo(() => {
    return availableDates.indexOf(selectedDate);
  }, [availableDates, selectedDate]);

  /** 前日へ移動可能か */
  const canMovePrevDate = selectedDateIndex > 0;
  /** 翌日へ移動可能か */
  const canMoveNextDate = selectedDateIndex !== -1 && selectedDateIndex < availableDates.length - 1;
  /** 1時間ごとの罫線色（テーマ色を濃く適用） */
  const hourlyLineColor = useMemo(() => toAlphaColor(theme.primary, 0.72), [theme.primary]);
  /** 通常罫線色（テーマ色を薄く適用） */
  const regularLineColor = useMemo(() => toAlphaColor(theme.primary, 0.18), [theme.primary]);

  /**
   * タイムラインを取得する
   * @returns {Promise<void>} 取得処理
   */
  const fetchTimeline = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      /** タイムライン取得結果 */
      const result = await timeScheduleService.selectTimeScheduleTimeline({
        scheduleDate: selectedDate,
        buildingIds: [],
      });

      setAreas(result.areas || []);
      setAreaLocations(result.areaLocations || []);
      setTimelineRows(result.timeline || []);
      setScheduleItems(result.slots || []);
      setAvailableDates(result.availableDates || []);

      if (result.resolvedScheduleDate && result.resolvedScheduleDate !== selectedDate) {
        setSelectedDate(result.resolvedScheduleDate);
      }
    } catch (error) {
      setErrorMessage(error?.message || 'タイムスケジュールの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    restoreSelections();
  }, [restoreSelections]);

  useEffect(() => {
    fetchTimeline();
    persistSelections(
      selectedDate,
      displayBookmarks,
      activeBookmarkId,
      hiddenBookmarkIds,
      bookmarkOrderIds
    );
  }, [
    activeBookmarkId,
    bookmarkOrderIds,
    displayBookmarks,
    fetchTimeline,
    hiddenBookmarkIds,
    persistSelections,
    selectedDate,
  ]);

  useEffect(() => {
    if (!activeBookmarkId) {
      return;
    }
    if (!hiddenBookmarkIds.includes(String(activeBookmarkId || ''))) {
      return;
    }
    setActiveBookmarkId(String(visibleBookmarks[0]?.id || orderedMergedBookmarks[0]?.id || ''));
  }, [activeBookmarkId, hiddenBookmarkIds, orderedMergedBookmarks, visibleBookmarks]);

  useEffect(() => {
    if (activeBookmarkId) {
      return;
    }
    if (visibleBookmarks.length > 0) {
      setActiveBookmarkId(String(visibleBookmarks[0].id || ''));
      return;
    }
    if (orderedMergedBookmarks.length > 0) {
      setActiveBookmarkId(String(orderedMergedBookmarks[0].id || ''));
    }
  }, [activeBookmarkId, orderedMergedBookmarks, visibleBookmarks]);

  useEffect(() => {
    /** 現在有効なブックマークID一覧 */
    const mergedBookmarkIds = (mergedBookmarks || []).map((bookmark) => String(bookmark.id || ''));
    /** 既存並び順のうち有効なIDだけ抽出 */
    const normalizedExistingIds = (bookmarkOrderIds || []).filter((bookmarkId) =>
      mergedBookmarkIds.includes(String(bookmarkId || ''))
    );
    /** 並び順にない新規ID一覧 */
    const missingIds = mergedBookmarkIds.filter(
      (bookmarkId) => !normalizedExistingIds.includes(String(bookmarkId || ''))
    );
    /** 次の並び順ID一覧 */
    const nextOrderIds = [...normalizedExistingIds, ...missingIds];

    if (isSameStringArray(nextOrderIds, bookmarkOrderIds)) {
      return;
    }
    setBookmarkOrderIds(nextOrderIds);
  }, [bookmarkOrderIds, mergedBookmarks]);

  /**
   * タイムライン表示対象アイテムを表示中ブックマーク群で絞り込む
   */
  const visibleScheduleItems = useMemo(() => {
    return (scheduleItems || []).filter((item) => {
      return (visibleBookmarks || []).some((bookmark) => {
        /** 評価軸で抽出したキー */
        const axisValue = extractAxisValue(item, bookmark.axis || BOOKMARK_AXES.BUILDING, areaLabelMap);
        /** ブックマーク基準キー */
        const bookmarkCriteriaKeys = Array.isArray(bookmark.criteriaKeys)
          ? bookmark.criteriaKeys.map((key) => String(key || ''))
          : [];
        return bookmarkCriteriaKeys.includes(String(axisValue.key || ''));
      });
    });
  }, [areaLabelMap, scheduleItems, visibleBookmarks]);

  /**
   * 開始時刻順でスケジュールを並べる
   */
  const sortedScheduleItems = useMemo(() => {
    return [...visibleScheduleItems].sort((left, right) => {
      if (left.startMinutes !== right.startMinutes) {
        return left.startMinutes - right.startMinutes;
      }

      const leftDuration = left.endMinutes - left.startMinutes;
      const rightDuration = right.endMinutes - right.startMinutes;
      if (leftDuration !== rightDuration) {
        return rightDuration - leftDuration;
      }

      return String(left.displayName || '').localeCompare(String(right.displayName || ''), 'ja', {
        numeric: true,
      });
    });
  }, [visibleScheduleItems]);

  /**
   * ブックマークごとに重複時間をレーン分割し、列情報を作る
   */
  const criterionGroups = useMemo(() => {
    /** レイアウト済みグループ */
    const groups = [];
    /** 列オフセット */
    let columnOffset = 0;

    (visibleBookmarks || []).forEach((bookmark) => {
      /** ブックマークID */
      const bookmarkId = String(bookmark.id || '');
      /** ブックマーク基準キー */
      const bookmarkCriteriaKeys = Array.isArray(bookmark.criteriaKeys)
        ? bookmark.criteriaKeys.map((key) => String(key || ''))
        : [];
      /** 対象ブックマークで表示するアイテム */
      const groupItems = (sortedScheduleItems || []).filter((item) => {
        /** 評価軸で抽出したキー */
        const axisValue = extractAxisValue(item, bookmark.axis || BOOKMARK_AXES.BUILDING, areaLabelMap);
        return bookmarkCriteriaKeys.includes(String(axisValue.key || ''));
      });
      /** レーン終端時刻一覧 */
      const laneEndMinutes = [];
      /** レイアウト済みカード */
      const laidOutCards = [];

      groupItems.forEach((item) => {
        /** 表示開始分 */
        const clampedStartMinutes = Math.max(item.startMinutes, OPERATION_START_MINUTES);
        /** 表示終了分 */
        const clampedEndMinutes = Math.min(item.endMinutes, OPERATION_END_MINUTES);
        if (clampedEndMinutes <= clampedStartMinutes) {
          return;
        }

        /** 割り当て先レーン番号 */
        let laneIndex = laneEndMinutes.findIndex((laneEnd) => clampedStartMinutes >= laneEnd);
        if (laneIndex === -1) {
          laneIndex = laneEndMinutes.length;
          laneEndMinutes.push(clampedEndMinutes);
        } else {
          laneEndMinutes[laneIndex] = clampedEndMinutes;
        }

        /** 上位置 */
        const top =
          ((clampedStartMinutes - OPERATION_START_MINUTES) / TIME_SLOT_INTERVAL_MINUTES) * TIMELINE_ROW_HEIGHT;
        /** 高さ */
        const height = Math.max(
          ((clampedEndMinutes - clampedStartMinutes) / TIME_SLOT_INTERVAL_MINUTES) * TIMELINE_ROW_HEIGHT - 4,
          36
        );

        laidOutCards.push({
          ...item,
          criterionKey: bookmarkId,
          criterionLabel: String(bookmark.name || 'ブックマーク'),
          laneIndex,
          columnIndex: columnOffset + laneIndex,
          top,
          height,
        });
      });

      /** 最低1列は確保 */
      const laneCount = Math.max(laneEndMinutes.length, 1);

      groups.push({
        criterionKey: bookmarkId,
        criterionLabel: String(bookmark.name || 'ブックマーク'),
        startColumnIndex: columnOffset,
        laneCount,
        cards: laidOutCards,
      });

      columnOffset += laneCount;
    });

    if (groups.length === 0) {
      groups.push({
        criterionKey: 'EMPTY',
        criterionLabel: '表示項目なし',
        startColumnIndex: 0,
        laneCount: 1,
        cards: [],
      });
    }

    return groups;
  }, [areaLabelMap, sortedScheduleItems, visibleBookmarks]);

  /** レイアウト済みカード一覧 */
  const laidOutScheduleCards = useMemo(() => {
    return criterionGroups.flatMap((group) => group.cards);
  }, [criterionGroups]);

  /** カード列数 */
  const timelineColumnCount = useMemo(() => {
    return Math.max(
      criterionGroups.reduce((sum, group) => sum + Number(group.laneCount || 0), 0),
      1
    );
  }, [criterionGroups]);

  /** タイムラインキャンバス高さ */
  const timelineCanvasHeight = useMemo(() => {
    return timelineRows.length * TIMELINE_ROW_HEIGHT;
  }, [timelineRows.length]);

  /** タイムラインキャンバス幅 */
  const timelineCanvasWidth = useMemo(() => {
    const calculatedWidth =
      timelineColumnCount * TIMELINE_CARD_WIDTH +
      Math.max(0, timelineColumnCount - 1) * TIMELINE_CARD_GAP +
      16;
    return Math.max(calculatedWidth, timelineViewportWidth - TIMELINE_TIME_COLUMN_WIDTH - 8);
  }, [timelineColumnCount, timelineViewportWidth]);

  /**
   * 日付移動
   * @param {number} offsetDays - 移動日数
   */
  const handleMoveDate = useCallback((offsetDays) => {
    if (availableDates.length === 0 || selectedDateIndex === -1) {
      return;
    }

    /** 移動先インデックス */
    const nextIndex = selectedDateIndex + offsetDays;
    if (nextIndex < 0 || nextIndex >= availableDates.length) {
      return;
    }

    setSelectedDate(availableDates[nextIndex]);
  }, [availableDates, selectedDateIndex]);

  /**
   * 設定中の基準キー選択を切り替える
   * @param {string} criterionKey - 基準キー
   */
  const handleToggleDraftCriterion = useCallback((criterionKey) => {
    /** 正規化キー */
    const normalizedKey = String(criterionKey || '').trim();
    if (!normalizedKey) {
      return;
    }

    setDraftSelectedCriteriaKeys((previousKeys) => {
      if (previousKeys.includes(normalizedKey)) {
        return previousKeys.filter((key) => key !== normalizedKey);
      }
      return [...previousKeys, normalizedKey];
    });
  }, []);

  /**
   * 設定中内容をブックマークとして保存する
   */
  const handleSaveBookmark = useCallback(() => {
    /** 正規化した名称 */
    const normalizedName = String(draftBookmarkName || '').trim();
    if (!normalizedName) {
      setSettingsErrorMessage('表示項目名を入力してください。');
      return;
    }

    if (draftSelectedCriteriaKeys.length === 0) {
      setSettingsErrorMessage('表示対象を1つ以上選択してください。');
      return;
    }

    /** 正規化した基準キー一覧 */
    const normalizedCriteriaKeys = Array.from(
      new Set(draftSelectedCriteriaKeys.map((key) => String(key || '').trim()).filter(Boolean))
    );

    if (editingBookmarkId) {
      setDisplayBookmarks((previousBookmarks) => {
        return (previousBookmarks || []).map((bookmark) => {
          if (String(bookmark?.id || '') !== editingBookmarkId) {
            return bookmark;
          }
          return {
            ...bookmark,
            name: normalizedName,
            axis: draftAxis,
            criteriaKeys: normalizedCriteriaKeys,
          };
        });
      });
      setActiveBookmarkId(editingBookmarkId);
      setSettingsErrorMessage('');
      if (shouldReturnToBookmarkList) {
        setIsBookmarkListModalVisible(true);
        setTimeout(() => {
          setIsDisplaySettingsModalVisible(false);
        }, 0);
        setShouldReturnToBookmarkList(false);
      }
      return;
    }

    /** 追加するブックマーク */
    const nextBookmark = {
      id: `bookmark_${Date.now()}`,
      name: normalizedName,
      axis: draftAxis,
      criteriaKeys: normalizedCriteriaKeys,
    };

    setDisplayBookmarks((previousBookmarks) => {
      return [...(previousBookmarks || []), nextBookmark];
    });
    setBookmarkOrderIds((previousIds) => [...(previousIds || []), nextBookmark.id]);
    setHiddenBookmarkIds((previousIds) => previousIds.filter((bookmarkId) => bookmarkId !== nextBookmark.id));
    setActiveBookmarkId(nextBookmark.id);
    setDraftBookmarkName('');
    setSettingsErrorMessage('');
    if (shouldReturnToBookmarkList) {
      setIsBookmarkListModalVisible(true);
      setTimeout(() => {
        setIsDisplaySettingsModalVisible(false);
      }, 0);
      setShouldReturnToBookmarkList(false);
    }
  }, [draftAxis, draftBookmarkName, draftSelectedCriteriaKeys, editingBookmarkId, shouldReturnToBookmarkList]);

  /**
   * 詳細設定モーダルを新規追加モードで開く
   */
  const handleOpenCreateSettings = useCallback(() => {
    setEditingBookmarkId('');
    setDraftAxis(BOOKMARK_AXES.BUILDING);
    setDraftSelectedCriteriaKeys([]);
    setDraftBookmarkName('');
    setDraftSearchText('');
    setSettingsErrorMessage('');
    setShouldReturnToBookmarkList(true);
    setIsDisplaySettingsModalVisible(true);
    setTimeout(() => {
      setIsBookmarkListModalVisible(false);
    }, 0);
  }, []);

  /**
   * 詳細設定モーダルを編集モードで開く
   * @param {Object} bookmark - 編集対象ブックマーク
   */
  const handleOpenEditSettings = useCallback((bookmark) => {
    if (!bookmark || String(bookmark.id || '').startsWith(DEFAULT_BOOKMARK_ID_PREFIX)) {
      return;
    }

    setEditingBookmarkId(String(bookmark.id || ''));
    setDraftAxis(bookmark.axis || BOOKMARK_AXES.BUILDING);
    setDraftSelectedCriteriaKeys(
      Array.isArray(bookmark.criteriaKeys)
        ? bookmark.criteriaKeys.map((key) => String(key || '')).filter(Boolean)
        : []
    );
    setDraftBookmarkName(String(bookmark.name || ''));
    setDraftSearchText('');
    setSettingsErrorMessage('');
    setIsDisplaySettingsModalVisible(true);
    setTimeout(() => {
      setIsBookmarkListModalVisible(false);
    }, 0);
  }, []);

  /**
   * 指定ブックマークの表示/非表示を切り替える
   * @param {string} bookmarkId - ブックマークID
   */
  const handleToggleBookmarkVisibility = useCallback((bookmarkId) => {
    /** 正規化ID */
    const normalizedBookmarkId = String(bookmarkId || '').trim();
    if (!normalizedBookmarkId) {
      return;
    }

    setHiddenBookmarkIds((previousIds) => {
      if (previousIds.includes(normalizedBookmarkId)) {
        return previousIds.filter((id) => id !== normalizedBookmarkId);
      }
      return [...previousIds, normalizedBookmarkId];
    });
  }, []);

  /**
   * 指定ブックマークを削除する
   * @param {string} bookmarkId - ブックマークID
   */
  const handleDeleteBookmark = useCallback((bookmarkId) => {
    const normalizedBookmarkId = String(bookmarkId || '').trim();
    if (!normalizedBookmarkId || normalizedBookmarkId.startsWith(DEFAULT_BOOKMARK_ID_PREFIX)) {
      return;
    }

    setDisplayBookmarks((previousBookmarks) =>
      (previousBookmarks || []).filter(
        (bookmark) => String(bookmark?.id || '') !== normalizedBookmarkId
      )
    );

    setHiddenBookmarkIds((previousIds) => previousIds.filter((id) => id !== normalizedBookmarkId));

    setActiveBookmarkId((previousActiveId) => {
      if (String(previousActiveId || '') === normalizedBookmarkId) {
        return String(visibleBookmarks[0]?.id || orderedMergedBookmarks[0]?.id || '');
      }
      return previousActiveId;
    });
    setBookmarkOrderIds((previousIds) =>
      (previousIds || []).filter((bookmarkId) => String(bookmarkId || '') !== normalizedBookmarkId)
    );
  }, [orderedMergedBookmarks, visibleBookmarks]);

  /**
   * 並び替えドラッグを開始する
  * @param {string} bookmarkId - 対象ブックマークID
  * @param {number} initialPageY - ドラッグ開始時のページY座標
   */
  const handleStartBookmarkReorderDrag = useCallback((bookmarkId, initialPageY = 0) => {
    /** 正規化ID */
    const normalizedBookmarkId = String(bookmarkId || '').trim();
    if (!normalizedBookmarkId) {
      return;
    }

    /** 対象の現在インデックス */
    const currentIndex = (bookmarkOrderIds || []).findIndex(
      (currentBookmarkId) => String(currentBookmarkId || '') === normalizedBookmarkId
    );
    if (currentIndex === -1) {
      return;
    }

    setDraggingBookmarkId(normalizedBookmarkId);
    setDraggingOffsetY(0);
    reorderDragStateRef.current = {
      activeBookmarkId: normalizedBookmarkId,
      startIndex: currentIndex,
      currentIndex,
      startPageY: Number(initialPageY) || 0,
    };
  }, [bookmarkOrderIds]);

  /**
   * 並び替えドラッグ中の移動量を処理する
   * @param {string} bookmarkId - 対象ブックマークID
   * @param {number} gestureDy - ジェスチャー累積Y移動量
   */
  const handleMoveBookmarkReorderDrag = useCallback((bookmarkId, gestureDy) => {
    /** 正規化ID */
    const normalizedBookmarkId = String(bookmarkId || '').trim();
    /** 現在のドラッグ状態 */
    const currentDragState = reorderDragStateRef.current;
    if (!normalizedBookmarkId || currentDragState.activeBookmarkId !== normalizedBookmarkId) {
      return;
    }

    /** 累積ドラッグ量 */
    const normalizedGestureDy = Number(gestureDy) || 0;

    /** 1行あたりのドラッグピッチ（行高 + 行間） */
    const rowPitch =
      Math.max(Number(bookmarkRowHeight || 0), REORDER_DRAG_ROW_HEIGHT_PX) + BOOKMARK_LIST_ROW_GAP_PX;
    /** 既に並び替えで移動済みの行数 */
    const movedIndexCount =
      Number(currentDragState.currentIndex || 0) - Number(currentDragState.startIndex || 0);
    /**
     * 見た目のズレ補正後オフセット
     * 行が入れ替わると要素の自然位置も動くため、移動済み行数分を差し引いて
     * ポインタ配下の見た目位置を維持する。
     */
    const compensatedOffsetY = normalizedGestureDy - movedIndexCount * rowPitch;
    setDraggingOffsetY(compensatedOffsetY);

    /** ドラッグ距離を行数換算（急なジャンプを防ぐためtrunc） */
    const movedRows =
      normalizedGestureDy >= 0
        ? Math.trunc(normalizedGestureDy / rowPitch)
        : -Math.trunc(Math.abs(normalizedGestureDy) / rowPitch);
    /** 開始位置から見た目標インデックス */
    const targetIndexFromStart = Number(currentDragState.startIndex || 0) + movedRows;
    /** 並び順末尾インデックス */
    const lastIndex = Math.max((bookmarkOrderIds || []).length - 1, 0);
    /** 正規化した目標インデックス */
    const nextIndex = Math.max(0, Math.min(targetIndexFromStart, lastIndex));

    if (nextIndex !== Number(currentDragState.currentIndex || 0)) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setBookmarkOrderIds((previousIds) => moveIdToIndex(previousIds, normalizedBookmarkId, nextIndex));
      currentDragState.currentIndex = nextIndex;
    }
  }, [bookmarkOrderIds, bookmarkRowHeight]);

  /**
   * ページY座標からドラッグ移動量を計算して並び替え処理へ渡す
   * @param {string} bookmarkId - 対象ブックマークID
   * @param {number} currentPageY - 現在のページY座標
   */
  const handleMoveBookmarkReorderDragByPageY = useCallback((bookmarkId, currentPageY) => {
    /** 現在のドラッグ状態 */
    const currentDragState = reorderDragStateRef.current;
    /** 開始Y */
    const startPageY = Number(currentDragState.startPageY || 0);
    /** 現在Y */
    const normalizedCurrentPageY = Number(currentPageY || 0);
    /** ドラッグ量 */
    const gestureDy = normalizedCurrentPageY - startPageY;
    handleMoveBookmarkReorderDrag(bookmarkId, gestureDy);
  }, [handleMoveBookmarkReorderDrag]);

  /**
   * Webマウスドラッグのイベントリスナーを解除する
   */
  const clearWebMouseDragListeners = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    /** 現在のmoveリスナー */
    const moveListener = webMouseDragListenersRef.current.move;
    /** 現在のupリスナー */
    const upListener = webMouseDragListenersRef.current.up;

    if (moveListener) {
      window.removeEventListener('mousemove', moveListener);
    }
    if (upListener) {
      window.removeEventListener('mouseup', upListener);
    }

    webMouseDragListenersRef.current = {
      move: null,
      up: null,
    };
  }, []);

  /**
   * 並び替えドラッグを終了する
   */
  const handleEndBookmarkReorderDrag = useCallback(() => {
    clearWebMouseDragListeners();
    setDraggingBookmarkId('');
    setDraggingOffsetY(0);
    reorderDragStateRef.current = {
      activeBookmarkId: '',
      startIndex: -1,
      currentIndex: -1,
      startPageY: 0,
    };
  }, [clearWebMouseDragListeners]);

  /**
   * Webでハンドルのマウスドラッグを開始する
   * @param {string} bookmarkId - 対象ブックマークID
   * @param {Object} event - マウスイベント
   */
  const handleStartBookmarkMouseDrag = useCallback((bookmarkId, event) => {
    if (typeof window === 'undefined') {
      return;
    }

    /** 正規化ID */
    const normalizedBookmarkId = String(bookmarkId || '').trim();
    if (!normalizedBookmarkId) {
      return;
    }

    /** 開始Y座標 */
    const startPageY = Number(event?.nativeEvent?.pageY ?? event?.pageY ?? 0);
    handleStartBookmarkReorderDrag(normalizedBookmarkId, startPageY);

    const handleMouseMove = (mouseEvent) => {
      /** 現在Y座標 */
      const currentPageY = Number(mouseEvent?.pageY || 0);
      handleMoveBookmarkReorderDragByPageY(normalizedBookmarkId, currentPageY);
    };

    const handleMouseUp = () => {
      handleEndBookmarkReorderDrag();
    };

    clearWebMouseDragListeners();
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { once: true });
    webMouseDragListenersRef.current = {
      move: handleMouseMove,
      up: handleMouseUp,
    };

    if (event?.preventDefault) {
      event.preventDefault();
    }
    if (event?.stopPropagation) {
      event.stopPropagation();
    }
  }, [
    clearWebMouseDragListeners,
    handleEndBookmarkReorderDrag,
    handleMoveBookmarkReorderDragByPageY,
    handleStartBookmarkReorderDrag,
  ]);

  useEffect(() => {
    return () => {
      clearWebMouseDragListeners();
    };
  }, [clearWebMouseDragListeners]);

  /**
   * カード押下時の処理
   * @param {Object} item - 対象アイテム
   */
  const handlePressItem = useCallback((item) => {
    setSelectedItem(item);
    setIsModalVisible(true);
  }, []);

  /**
   * モーダルを閉じる
   */
  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  /**
   * 表示設定モーダルを閉じる
   */
  const handleCloseDisplaySettingsModal = useCallback(() => {
    if (shouldReturnToBookmarkList) {
      setIsBookmarkListModalVisible(true);
      setTimeout(() => {
        setIsDisplaySettingsModalVisible(false);
        setShouldReturnToBookmarkList(false);
      }, 0);
      return;
    }
    setIsDisplaySettingsModalVisible(false);
  }, [shouldReturnToBookmarkList]);

  /**
   * ブックマーク一覧モーダルを閉じる
   */
  const handleCloseBookmarkListModal = useCallback(() => {
    setIsBookmarkListModalVisible(false);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />

      <View style={styles.headerSection}>
        <View style={[styles.dateControlRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <TouchableOpacity
            style={[styles.dateButton, !canMovePrevDate && styles.disabledDateButton]}
            onPress={() => handleMoveDate(-1)}
            disabled={!canMovePrevDate}
          >
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.dateText, { color: theme.text }]}>{formatDisplayDate(selectedDate)}</Text>
          <TouchableOpacity
            style={[styles.dateButton, !canMoveNextDate && styles.disabledDateButton]}
            onPress={() => handleMoveDate(1)}
            disabled={!canMoveNextDate}
          >
            <Ionicons name="chevron-forward" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.displaySettingsButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
          onPress={() => setIsBookmarkListModalVisible(true)}
        >
          <Text style={[styles.displaySettingsButtonText, { color: theme.text }]}>ブックマーク設定</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.stateText, { color: theme.textSecondary }]}>読み込み中...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.centerState}>
            <Text style={[styles.stateText, { color: '#ef4444' }]}>{errorMessage}</Text>
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.primary }]} onPress={fetchTimeline}>
              <Text style={styles.retryButtonText}>再取得</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={styles.timelineRoot}
            onLayout={(event) => {
              setTimelineViewportWidth(event.nativeEvent.layout.width);
            }}
          >
            <View style={[styles.locationHeaderRow, { borderBottomColor: theme.border, backgroundColor: theme.background }]}> 
              <View style={styles.locationHeaderTimeCell}> 
              </View>

              <View style={styles.locationHeaderViewport}>
                <View
                  style={[
                    styles.locationHeaderContent,
                    {
                      width: timelineCanvasWidth,
                      transform: [{ translateX: -timelineScrollX }],
                    },
                  ]}
                >
                  {criterionGroups.map((group, index) => (
                    <View
                      key={`header-${group.criterionKey}-${index}`}
                      style={[
                        styles.locationHeaderItem,
                        {
                          width:
                            group.laneCount * TIMELINE_CARD_WIDTH +
                            Math.max(0, group.laneCount - 1) * TIMELINE_CARD_GAP,
                          marginRight: index === criterionGroups.length - 1 ? 0 : TIMELINE_CARD_GAP,
                          borderColor: theme.border,
                          backgroundColor: theme.surface,
                        },
                      ]}
                    >
                      <Text numberOfLines={1} style={[styles.locationHeaderText, { color: theme.text }]}> 
                        {group.criterionLabel}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <ScrollView
              style={styles.timelineVerticalScroll}
              contentContainerStyle={styles.timelineVerticalContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={[styles.timelineWrapper, { minHeight: timelineCanvasHeight }]}> 
                <View style={styles.timeColumnStatic}>
                  {timelineRows.map((row) => (
                    <View
                      key={`time-${row.key}`}
                      style={[
                        styles.timelineRowLabel,
                        {
                          borderBottomWidth: 0,
                          borderTopColor: row.minutes % 60 === 0 ? hourlyLineColor : regularLineColor,
                          borderTopWidth: row.minutes === OPERATION_START_MINUTES ? 0 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.timeText, { color: theme.textSecondary }]}>{row.time}</Text>
                    </View>
                  ))}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  style={styles.timelineGridScroll}
                  onScroll={(event) => {
                    setTimelineScrollX(event.nativeEvent.contentOffset.x || 0);
                  }}
                  scrollEventThrottle={16}
                >
                  <View
                    style={[
                      styles.timelineGridCanvas,
                      {
                        height: timelineCanvasHeight,
                        width: timelineCanvasWidth,
                      },
                    ]}
                  >
                    {timelineRows.map((row, rowIndex) => (
                      <View
                        key={`line-${row.key}`}
                        style={[
                          styles.timelineGridLine,
                          {
                            top: rowIndex * TIMELINE_ROW_HEIGHT,
                            borderBottomWidth: 0,
                            borderTopColor: row.minutes % 60 === 0 ? hourlyLineColor : regularLineColor,
                            borderTopWidth: row.minutes === OPERATION_START_MINUTES ? 0 : 1,
                          },
                        ]}
                      />
                    ))}

                    {criterionGroups.slice(0, -1).map((group) => {
                      /** 次ブックマーク開始列インデックス */
                      const nextGroupStartColumnIndex =
                        Number(group.startColumnIndex || 0) + Number(group.laneCount || 0);
                      /** ブックマーク境界のX座標 */
                      const dividerLeft =
                        nextGroupStartColumnIndex * TIMELINE_CARD_WIDTH +
                        Math.max(0, nextGroupStartColumnIndex - 1) * TIMELINE_CARD_GAP +
                        TIMELINE_CARD_GAP / 2;

                      return (
                        <View
                          key={`divider-${group.criterionKey}`}
                          style={[
                            styles.timelineVerticalDivider,
                            {
                              left: dividerLeft,
                              borderLeftColor: theme.border,
                              height: timelineCanvasHeight,
                            },
                          ]}
                        />
                      );
                    })}

                    {criterionGroups
                      .filter((group) => (group.cards || []).length === 0)
                      .map((group) => {
                        /** 左位置 */
                        const emptyLeft =
                          group.startColumnIndex * (TIMELINE_CARD_WIDTH + TIMELINE_CARD_GAP);
                        /** 表示幅 */
                        const emptyWidth =
                          group.laneCount * TIMELINE_CARD_WIDTH +
                          Math.max(0, group.laneCount - 1) * TIMELINE_CARD_GAP;

                        return (
                          <View
                            key={`empty-wrap-${group.criterionKey}`}
                            style={[
                              styles.emptyColumnWrap,
                              {
                                left: emptyLeft,
                                width: emptyWidth,
                                height: timelineCanvasHeight,
                                pointerEvents: 'none',
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.emptyColumnBadge,
                                {
                                  borderColor: theme.border,
                                  backgroundColor: toAlphaColor(theme.surface, 0.92),
                                },
                              ]}
                            >
                              <Text style={[styles.emptyColumnBadgeText, { color: theme.textSecondary }]}>該当なし</Text>
                            </View>
                          </View>
                        );
                      })}

                    {laidOutScheduleCards.map((item) => (
                      <TouchableOpacity
                        key={`${item.source_type}-${item.source_id}-${item.startMinutes}-${item.endMinutes}`}
                        style={[
                          styles.itemCard,
                          styles.absoluteItemCard,
                          {
                            backgroundColor: theme.surface,
                            borderColor: theme.border,
                            left: item.columnIndex * (TIMELINE_CARD_WIDTH + TIMELINE_CARD_GAP),
                            top: item.top,
                            height: item.height,
                          },
                        ]}
                        onPress={() => handlePressItem(item)}
                      >
                        <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>{item.displayName}</Text>
                        <Text style={[styles.itemMeta, { color: theme.textSecondary }]} numberOfLines={1}>{item.start_time} - {item.end_time}</Text>
                        <Text style={[styles.itemMeta, { color: theme.textSecondary }]} numberOfLines={1}>{item.locationName || '場所未設定'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      <DetailModal
        visible={isModalVisible}
        item={selectedItem}
        onClose={handleCloseModal}
      />

      <Modal
        visible={isDisplaySettingsModalVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseDisplaySettingsModal}
      >
        <Pressable style={styles.settingsModalBackdrop} onPress={handleCloseDisplaySettingsModal}>
          <Pressable
            style={[styles.settingsModalCard, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={() => {}}
          > 
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.settingsModalTitle, { color: theme.text }]}>表示項目の設定</Text>
              <TouchableOpacity
                style={[styles.modalCloseIconButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
                onPress={handleCloseDisplaySettingsModal}
              >
                <Ionicons name="close" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.settingsModalDescription, { color: theme.textSecondary }]}>評価軸を選択して検索し、表示項目を名前付きで保存できます。保存後はユーザー単位のブックマークとして再利用できます。</Text>

            <TextInput
              value={draftBookmarkName}
              onChangeText={setDraftBookmarkName}
              placeholder="ブックマーク名（例: 団体A運営確認）"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.settingsInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                },
              ]}
            />

            <View style={styles.axisTabRow}>
              {Object.keys(BOOKMARK_AXIS_LABELS).map((axisKey) => {
                /** 選択中タブか */
                const isAxisActive = draftAxis === axisKey;
                return (
                  <TouchableOpacity
                    key={`axis-${axisKey}`}
                    style={[
                      styles.axisTabButton,
                      {
                        borderColor: isAxisActive ? theme.primary : theme.border,
                        backgroundColor: isAxisActive ? toAlphaColor(theme.primary, 0.12) : theme.surface,
                      },
                    ]}
                    onPress={() => {
                      setDraftAxis(axisKey);
                      setDraftSelectedCriteriaKeys([]);
                      setDraftSearchText('');
                      setSettingsErrorMessage('');
                    }}
                  >
                    <Text
                      style={[
                        styles.axisTabButtonText,
                        { color: isAxisActive ? theme.primary : theme.textSecondary },
                      ]}
                    >
                      {BOOKMARK_AXIS_LABELS[axisKey]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              value={draftSearchText}
              onChangeText={setDraftSearchText}
              placeholder={`${BOOKMARK_AXIS_LABELS[draftAxis]}を検索`}
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.settingsInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                },
              ]}
            />

            <ScrollView style={styles.settingsModalList} contentContainerStyle={styles.settingsModalListContent}>
              {filteredDraftCandidates.map((candidate) => {
                /** 候補キー */
                const candidateKey = String(candidate.key || '');
                /** 選択状態 */
                const isSelected = draftSelectedCriteriaKeys.includes(candidateKey);

                return (
                  <TouchableOpacity
                    key={`setting-${candidateKey}`}
                    style={[
                      styles.settingsOptionRow,
                      {
                        borderColor: isSelected ? theme.primary : theme.border,
                        backgroundColor: isSelected ? toAlphaColor(theme.primary, 0.12) : theme.surface,
                      },
                    ]}
                    onPress={() => handleToggleDraftCriterion(candidateKey)}
                  >
                    <View
                      style={[
                        styles.settingsOptionIndicator,
                        {
                          borderColor: isSelected ? theme.primary : theme.border,
                          backgroundColor: isSelected ? theme.primary : theme.background,
                        },
                      ]}
                    />
                    <Text style={[styles.settingsOptionLabel, { color: theme.text }]}>{candidate.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {settingsErrorMessage ? (
              <Text style={[styles.settingsErrorText, { color: '#ef4444' }]}>{settingsErrorMessage}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.settingsModalSaveButton, { backgroundColor: theme.primary }]}
              onPress={handleSaveBookmark}
            >
              <Text style={styles.settingsModalSaveButtonText}>
                {editingBookmarkId ? 'ブックマークを更新' : '現在の条件をブックマーク保存'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isBookmarkListModalVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseBookmarkListModal}
      >
        <Pressable style={styles.settingsModalBackdrop} onPress={handleCloseBookmarkListModal}>
          <Pressable
            style={[styles.bookmarkListModalCard, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={() => {}}
          > 
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.settingsModalTitle, { color: theme.text }]}>ブックマーク一覧</Text>
              <TouchableOpacity
                style={[styles.modalCloseIconButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
                onPress={handleCloseBookmarkListModal}
              >
                <Ionicons name="close" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.settingsModalDescription, { color: theme.textSecondary }]}>一覧をタップすると表示/非表示を切り替えます。左のハンドルをドラッグして順序を入れ替えできます。</Text>

            <ScrollView
              style={styles.bookmarkListScroll}
              contentContainerStyle={styles.bookmarkListContent}
              scrollEnabled={!draggingBookmarkId}
            >
              {orderedMergedBookmarks.map((bookmark) => {
                /** 非表示状態 */
                const isHidden = hiddenBookmarkIds.includes(String(bookmark.id || ''));
                /** システム既定か */
                const isSystemBookmark = String(bookmark.id || '').startsWith(DEFAULT_BOOKMARK_ID_PREFIX);
                /** 並び替え対象ID */
                const normalizedBookmarkId = String(bookmark.id || '').trim();
                /** 並び替え中か */
                const isDragging = draggingBookmarkId === normalizedBookmarkId;

                return (
                  <View
                    key={`bookmark-list-${bookmark.id}`}
                    onLayout={(event) => {
                      /** 実測行高さ */
                      const measuredHeight = Number(event?.nativeEvent?.layout?.height || 0);
                      if (!Number.isFinite(measuredHeight) || measuredHeight <= 0) {
                        return;
                      }

                      if (Math.abs(measuredHeight - bookmarkRowHeight) <= 2) {
                        return;
                      }
                      setBookmarkRowHeight(measuredHeight);
                    }}
                    style={[
                      styles.bookmarkListRow,
                      isDragging
                        ? {
                            transform: [{ translateY: draggingOffsetY }],
                            zIndex: 20,
                            elevation: 8,
                          }
                        : null,
                      {
                        borderColor: isDragging
                          ? theme.primary
                          : isHidden
                            ? theme.border
                            : theme.primary,
                        backgroundColor: isDragging
                          ? toAlphaColor(theme.primary, 0.16)
                          : isHidden
                            ? theme.surface
                            : toAlphaColor(theme.primary, 0.08),
                        opacity: isHidden ? 0.55 : 1,
                      },
                    ]}
                  >
                    <View style={styles.bookmarkListMainArea}>
                      <View style={styles.bookmarkInlineReorderContainer}> 
                        <View
                          style={[
                            styles.bookmarkSwipeHandle,
                            {
                              borderColor: isDragging ? theme.primary : theme.border,
                              backgroundColor: isDragging
                                ? toAlphaColor(theme.primary, 0.14)
                                : theme.surface,
                            },
                          ]}
                          onStartShouldSetResponder={() => Platform.OS !== 'web'}
                          onStartShouldSetResponderCapture={() => Platform.OS !== 'web'}
                          onMoveShouldSetResponder={() => Platform.OS !== 'web'}
                          onMoveShouldSetResponderCapture={() => Platform.OS !== 'web'}
                          onMouseDown={(event) => {
                            handleStartBookmarkMouseDrag(normalizedBookmarkId, event);
                          }}
                          onResponderGrant={(event) => {
                            const pageY = Number(
                              event?.nativeEvent?.pageY ?? event?.nativeEvent?.locationY ?? 0
                            );
                            handleStartBookmarkReorderDrag(normalizedBookmarkId, pageY);
                          }}
                          onResponderMove={(event) => {
                            const pageY = Number(
                              event?.nativeEvent?.pageY ?? event?.nativeEvent?.locationY ?? 0
                            );
                            handleMoveBookmarkReorderDragByPageY(normalizedBookmarkId, pageY);
                          }}
                          onResponderRelease={handleEndBookmarkReorderDrag}
                          onResponderTerminate={handleEndBookmarkReorderDrag}
                          onResponderTerminationRequest={() => false}
                        >
                          <Text
                            style={[
                              styles.bookmarkSwipeHandleIcon,
                              { color: isDragging ? theme.primary : theme.textSecondary },
                            ]}
                          >
                            ⠿
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.bookmarkVisibilityArea}
                        onPress={() => handleToggleBookmarkVisibility(bookmark.id)}
                      >
                        <View style={styles.bookmarkListTextBlock}>
                          <Text style={[styles.savedBookmarkName, { color: theme.text }]} numberOfLines={1}>
                            {bookmark.name}
                          </Text>
                          <Text style={[styles.savedBookmarkMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                            {BOOKMARK_AXIS_LABELS[bookmark.axis] || '軸未設定'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[styles.bookmarkIconButton, { borderColor: theme.border }]}
                      onPress={() => handleOpenEditSettings(bookmark)}
                    >
                      <Ionicons name="settings-outline" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>

                    {!isSystemBookmark ? (
                      <TouchableOpacity
                        style={[styles.bookmarkActionButton, { borderColor: theme.border }]}
                        onPress={() => handleDeleteBookmark(bookmark.id)}
                      >
                        <Text style={[styles.bookmarkActionButtonText, { color: theme.textSecondary }]}>削除</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.bookmarkAddButton, { borderColor: theme.primary, backgroundColor: toAlphaColor(theme.primary, 0.12) }]}
              onPress={() => {
                handleOpenCreateSettings();
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
              <Text style={[styles.bookmarkAddButtonText, { color: theme.primary }]}>追加</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  content: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
  },
  operationText: {
    fontSize: 12,
    lineHeight: 18,
  },
  dateControlRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledDateButton: {
    opacity: 0.35,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
  },
  displaySettingsButton: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displaySettingsButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  settingsModalCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '82%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  settingsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  settingsModalDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  axisTabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  axisTabButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisTabButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingsInput: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  settingsModalList: {
    maxHeight: 250,
  },
  settingsModalListContent: {
    gap: 8,
    paddingTop: 2,
    paddingBottom: 2,
  },
  settingsOptionRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsOptionIndicator: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  settingsOptionLabel: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  settingsErrorText: {
    fontSize: 12,
    lineHeight: 18,
  },
  settingsModalSaveButton: {
    borderRadius: 10,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsModalSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalCloseIconButton: {
    borderWidth: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedBookmarkName: {
    fontSize: 13,
    fontWeight: '700',
  },
  savedBookmarkMeta: {
    fontSize: 11,
  },
  bookmarkListModalCard: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '84%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  bookmarkListScroll: {
    maxHeight: 420,
  },
  bookmarkListContent: {
    gap: 8,
  },
  bookmarkListRow: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookmarkListMainArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookmarkInlineReorderContainer: {
    gap: 4,
  },
  bookmarkSwipeHandle: {
    borderWidth: 1,
    borderRadius: 8,
    width: 56,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  bookmarkSwipeHandleIcon: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  bookmarkVisibilityArea: {
    flex: 1,
  },
  bookmarkListTextBlock: {
    flex: 1,
    gap: 2,
  },
  bookmarkIconButton: {
    borderWidth: 1,
    borderRadius: 8,
    width: 34,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkActionButton: {
    borderWidth: 1,
    borderRadius: 8,
    minWidth: 58,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  bookmarkActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookmarkAddButton: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  bookmarkAddButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  stateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  timelineRoot: {
    flex: 1,
  },
  locationHeaderRow: {
    height: LOCATION_HEADER_HEIGHT,
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  locationHeaderTimeCell: {
    width: TIMELINE_TIME_COLUMN_WIDTH,
    justifyContent: 'center',
    paddingLeft: 12,
  },
  locationHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  locationHeaderViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  locationHeaderContent: {
    flexDirection: 'row',
    height: LOCATION_HEADER_HEIGHT,
    alignItems: 'center',
  },
  locationHeaderItem: {
    height: LOCATION_HEADER_HEIGHT - 10,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  locationHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  timelineWrapper: {
    flexDirection: 'row',
  },
  timelineVerticalScroll: {
    flex: 1,
  },
  timelineVerticalContent: {
    flexGrow: 1,
  },
  timeColumnStatic: {
    width: TIMELINE_TIME_COLUMN_WIDTH,
  },
  timelineRowLabel: {
    height: TIMELINE_ROW_HEIGHT,
    borderTopWidth: 1,
    justifyContent: 'flex-start',
    paddingLeft: 12,
    paddingTop: 2,
  },
  timelineGridScroll: {
    flex: 1,
  },
  timelineGridCanvas: {
    position: 'relative',
  },
  timelineGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  timelineVerticalDivider: {
    position: 'absolute',
    top: 0,
    borderLeftWidth: 1,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 12,
    width: TIMELINE_CARD_WIDTH,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  absoluteItemCard: {
    position: 'absolute',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  emptyColumnBadge: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    zIndex: 1,
  },
  emptyColumnWrap: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  emptyColumnBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default TimeScheduleScreen;
