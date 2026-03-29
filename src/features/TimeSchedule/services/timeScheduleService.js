/**
 * TimeSchedule サービス
 * TimeSchedule 画面向けにエリア・開催スロット・表示タイムラインを取得する
 */

import { getSupabaseClient } from '../../../services/supabase/client';

/** スロットテーブル名 */
const EVENT_SCHEDULE_SLOTS_TABLE = 'event_schedule_slots';
/** 建物テーブル名 */
const BUILDING_LOCATIONS_TABLE = 'building_locations';
/** エリアテーブル名 */
const AREA_LOCATIONS_TABLE = 'area_locations';
/** 企画テーブル名 */
const EVENTS_TABLE = 'events';
/** 屋台テーブル名 */
const STALLS_TABLE = 'stalls';
/** 屋台場所テーブル名 */
const STALL_LOCATIONS_TABLE = 'stall_locations';
/** 屋台団体テーブル名 */
const STALL_ORGANIZATIONS_TABLE = 'stall_organizations';

/** 運用開始時刻（分） */
const OPERATION_START_MINUTES = 9 * 60;
/** 運用終了時刻（分） */
const OPERATION_END_MINUTES = 20 * 60;
/** 15分刻み */
const TIME_SLOT_INTERVAL_MINUTES = 15;

/** source_type の定数 */
const SOURCE_TYPES = {
  EVENT: 'event',
  STALL: 'stall',
};

/** events 取得時の優先 select 句 */
const EVENT_SELECT_PRIMARY =
  'id,name,name_kana,description,schedule_dates,schedule_start_times,schedule_end_times,image_path,category_id,event_organization_id,location_id,event_locations(name,building_id,building_locations(name)),event_organizations(name,name_kana)';

/** events 取得時のフォールバック select 句 */
const EVENT_SELECT_FALLBACK =
  'id,name,description,schedule_dates,schedule_start_times,schedule_end_times,start_time,end_time,image_path,category_id,event_organization_id,location_id,event_locations(name),event_organizations(name)';

/** stalls 取得時の優先 select 句 */
const STALL_SELECT_PRIMARY =
  'id,name,name_kana,description,image_path,category_id,stall_organization_id,location_id';

/** stalls 取得時のフォールバック select 句 */
const STALL_SELECT_FALLBACK =
  'id,name,description,image_path,category_id,stall_organization_id,location_id';

/** events の最終フォールバック select 句 */
const EVENT_SELECT_LAST_RESORT = 'id,name,description,image_path,category_id,event_organization_id,location_id,schedule_dates,schedule_start_times,schedule_end_times,start_time,end_time';

/** stalls の最終フォールバック select 句 */
const STALL_SELECT_LAST_RESORT = 'id,name,description,image_path,category_id,stall_organization_id,location_id';

/**
 * 指定IDの名称マップを取得する
 * @param {Object} params - パラメータ
 * @param {string} params.tableName - テーブル名
 * @param {Array<string>} params.ids - 対象ID配列
 * @param {Array<string>} [params.selectCandidates] - select句候補
 * @returns {Promise<Map<string, {name: string, nameKana: string}>>} 名称マップ
 */
const selectNameMapByIds = async ({ tableName, ids, selectCandidates = ['id,name,name_kana', 'id,name'] }) => {
  /** 正規化したID配列 */
  const normalizedIds = uniqStringArray(ids);
  if (normalizedIds.length === 0) {
    return new Map();
  }

  /** 取得結果 */
  const rows = await selectRowsWithCandidates({
    tableName,
    selectCandidates,
    applyFilters: (query) => query.in('id', normalizedIds),
  });

  /** 名称マップ */
  const nameMap = new Map();
  (rows || []).forEach((row) => {
    nameMap.set(String(row.id || ''), {
      name: String(row.name || ''),
      nameKana: String(row.name_kana || ''),
    });
  });
  return nameMap;
};

/** 文字列日付の妥当性パターン */
const SCHEDULE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** 建物名のデフォルト表示順 */
const DEFAULT_BUILDING_NAME_ORDER = [
  '11月ホール',
  '実学ホール',
  '記念会館',
  '人工芝グラウンド',
  'その他',
];
/** エリア名のデフォルト表示順 */
const DEFAULT_AREA_NAME_ORDER = [
  '11月ホール',
  '実学ホール',
  '記念会館',
  '人工芝グラウンド',
  '人工芝',
  'その他',
];

/**
 * 時刻文字列を分に変換する
 * @param {string|null} timeText - HH:mm または HH:mm:ss
 * @returns {number|null} 分（0-1439）
 */
const parseTimeTextToMinutes = (timeText) => {
  /** 元値が空の場合は null */
  if (!timeText) {
    return null;
  }

  /** 時刻パーツ */
  const parts = String(timeText).split(':');
  /** 時 */
  const hour = Number(parts[0]);
  /** 分 */
  const minute = Number(parts[1]);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
};

/**
 * 分を HH:mm へ変換する
 * @param {number} minutes - 分
 * @returns {string} HH:mm
 */
const formatMinutesToHm = (minutes) => {
  /** 時 */
  const hour = Math.floor(minutes / 60);
  /** 分 */
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

/**
 * 日付文字列を YYYY-MM-DD に正規化する
 * @param {string|Date} scheduleDate - 日付
 * @returns {string} YYYY-MM-DD
 */
const normalizeScheduleDate = (scheduleDate) => {
  if (scheduleDate instanceof Date) {
    /** 年 */
    const year = scheduleDate.getFullYear();
    /** 月 */
    const month = String(scheduleDate.getMonth() + 1).padStart(2, '0');
    /** 日 */
    const day = String(scheduleDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** 文字列化した日付 */
  const normalized = String(scheduleDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error('scheduleDate は YYYY-MM-DD 形式で指定してください');
  }
  return normalized;
};

/**
 * 参照ID配列を重複なし配列に変換する
 * @param {Array<string>} values - ID配列
 * @returns {Array<string>} 重複なし配列
 */
const uniqStringArray = (values) => {
  /** 正規化したID一覧 */
  const normalizedValues = (Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  return Array.from(new Set(normalizedValues));
};

/**
 * select エラーがスキーマ差分起因か判定する
 * @param {Object|null} error - Supabaseエラー
 * @returns {boolean} フォールバック実行可否
 */
const shouldFallbackSelect = (error) => {
  /** エラーメッセージ */
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('column') ||
    message.includes('relationship') ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  );
};

/**
 * 対象エラーが「列不存在」かを判定する
 * @param {Object|null} error - Supabaseエラー
 * @returns {boolean} 列不存在エラーか
 */
const isMissingColumnError = (error) => {
  /** エラーメッセージ */
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
};

/**
 * エリア名のフォールバック表示順を解決する
 * @param {string} areaName - エリア名
 * @param {number} index - 取得配列内のインデックス
 * @returns {number} 表示順
 */
const resolveAreaFallbackDisplayOrder = (areaName, index) => {
  /** 正規化エリア名 */
  const normalizedAreaName = String(areaName || '').trim();
  /** 固定順の位置 */
  const fixedOrderIndex = DEFAULT_AREA_NAME_ORDER.indexOf(normalizedAreaName);
  if (fixedOrderIndex !== -1) {
    return fixedOrderIndex + 1;
  }

  /** 固定順にない値は後ろへ並べる */
  return DEFAULT_AREA_NAME_ORDER.length + index + 1;
};

/**
 * 日付配列を昇順に並べる
 * @param {Array<string>} dates - 日付配列
 * @returns {Array<string>} 昇順日付配列
 */
const sortScheduleDates = (dates) => {
  return uniqStringArray(dates).filter((date) => SCHEDULE_DATE_PATTERN.test(date)).sort((left, right) => left.localeCompare(right));
};

/**
 * 要求日付を利用可能日付へ解決する
 * @param {Object} params - パラメータ
 * @param {string} params.requestedDate - 要求日付
 * @param {Array<string>} params.availableDates - 利用可能日付
 * @returns {string} 解決済み日付
 */
const resolveScheduleDate = ({ requestedDate, availableDates }) => {
  /** 正規化した利用可能日付配列 */
  const sortedDates = sortScheduleDates(availableDates);
  if (sortedDates.length === 0) {
    return requestedDate;
  }
  if (sortedDates.includes(requestedDate)) {
    return requestedDate;
  }

  /** 要求日付より小さい日付群 */
  const lowerDates = sortedDates.filter((date) => date < requestedDate);
  if (lowerDates.length > 0) {
    return lowerDates[lowerDates.length - 1];
  }
  return sortedDates[0];
};

/**
 * 複数 select 句を順に試して取得する
 * @param {Object} params - パラメータ
 * @param {string} params.tableName - テーブル名
 * @param {Array<string>} params.selectCandidates - select 句候補
 * @param {(query: Object) => Object} [params.applyFilters] - クエリへ絞り込みを適用する関数
 * @returns {Promise<Array<Object>>} 取得結果
 */
const selectRowsWithCandidates = async ({ tableName, selectCandidates, applyFilters = null }) => {
  /** Supabaseクライアント */
  const supabase = getSupabaseClient();
  /** 最後のエラー */
  let lastError = null;

  for (const selectText of selectCandidates) {
    /** ベースクエリ */
    let query = supabase.from(tableName).select(selectText);
    if (applyFilters) {
      query = applyFilters(query);
    }

    /** 実行結果 */
    const { data, error } = await query;
    if (!error) {
      return data || [];
    }

    lastError = error;
    if (!shouldFallbackSelect(error)) {
      break;
    }
  }

  throw new Error(`${tableName} の取得に失敗しました: ${lastError?.message || 'unknown error'}`);
};

/**
 * 公開済みデータを select 句フォールバック付きで取得する
 * @param {Object} params - パラメータ
 * @param {string} params.tableName - テーブル名
 * @param {string} params.idColumn - IDカラム名
 * @param {Array<string>} params.ids - 取得対象ID配列
 * @param {string} params.primarySelect - 優先select句
 * @param {string} params.fallbackSelect - フォールバックselect句
 * @returns {Promise<Array<Object>>} 取得結果
 */
const selectPublishedRowsByIds = async ({ tableName, idColumn, ids, primarySelect, fallbackSelect }) => {
  /** Supabaseクライアント */
  const supabase = getSupabaseClient();

  /** 優先クエリ結果 */
  const primaryResult = await supabase
    .from(tableName)
    .select(primarySelect)
    .in(idColumn, ids)
    .eq('is_published', true);

  if (!primaryResult.error) {
    return primaryResult.data || [];
  }

  if (!shouldFallbackSelect(primaryResult.error) || !fallbackSelect) {
    throw new Error(`${tableName} の取得に失敗しました: ${primaryResult.error.message}`);
  }

  /** フォールバッククエリ結果 */
  const fallbackResult = await supabase
    .from(tableName)
    .select(fallbackSelect)
    .in(idColumn, ids)
    .eq('is_published', true);

  if (fallbackResult.error) {
    throw new Error(`${tableName} の取得に失敗しました: ${fallbackResult.error.message}`);
  }

  return fallbackResult.data || [];
};

/**
 * 公開済みデータを複数 select 候補で取得する
 * @param {Object} params - パラメータ
 * @param {string} params.tableName - テーブル名
 * @param {string} params.idColumn - IDカラム名
 * @param {Array<string>} params.ids - 取得対象ID配列
 * @param {Array<string>} params.selectCandidates - select句候補
 * @returns {Promise<Array<Object>>} 取得結果
 */
const selectPublishedRowsByIdsWithCandidates = async ({ tableName, idColumn, ids, selectCandidates }) => {
  /** 取得結果 */
  const rows = await selectRowsWithCandidates({
    tableName,
    selectCandidates,
    applyFilters: (query) => query.in(idColumn, ids).eq('is_published', true),
  });
  return rows;
};

/**
 * イベントの開催日配列を正規化する
 * @param {Object} params - パラメータ
 * @param {Object} params.slot - スロット
 * @param {Object} params.sourceDetail - イベント詳細
 * @returns {{scheduleDates:Array<string>, scheduleStartTimes:Array<string>, scheduleEndTimes:Array<string>}} 正規化済み配列
 */
const normalizeEventSchedules = ({ slot, sourceDetail }) => {
  /** DBキャッシュ日付配列 */
  const scheduleDates = Array.isArray(sourceDetail?.schedule_dates)
    ? sourceDetail.schedule_dates
    : [];
  /** DBキャッシュ開始時刻配列 */
  const scheduleStartTimes = Array.isArray(sourceDetail?.schedule_start_times)
    ? sourceDetail.schedule_start_times
    : [];
  /** DBキャッシュ終了時刻配列 */
  const scheduleEndTimes = Array.isArray(sourceDetail?.schedule_end_times)
    ? sourceDetail.schedule_end_times
    : [];

  if (scheduleDates.length > 0 && scheduleStartTimes.length > 0 && scheduleEndTimes.length > 0) {
    return {
      scheduleDates,
      scheduleStartTimes,
      scheduleEndTimes,
    };
  }

  /** スロット日付 */
  const slotDate = slot?.schedule_date || null;
  /** スロット開始時刻 */
  const slotStartTime = slot?.start_time || sourceDetail?.start_time || null;
  /** スロット終了時刻 */
  const slotEndTime = slot?.end_time || sourceDetail?.end_time || null;

  return {
    scheduleDates: slotDate ? [slotDate] : [],
    scheduleStartTimes: slotStartTime ? [slotStartTime] : [],
    scheduleEndTimes: slotEndTime ? [slotEndTime] : [],
  };
};

/**
 * 運用時間の15分スロットを作成する
 * @returns {Array<{key: string, minutes: number, label: string}>} タイムラインの時刻配列
 */
const buildOperationTimeSlots = () => {
  /** 時刻スロット一覧 */
  const slots = [];
  for (
    let currentMinutes = OPERATION_START_MINUTES;
    currentMinutes <= OPERATION_END_MINUTES;
    currentMinutes += TIME_SLOT_INTERVAL_MINUTES
  ) {
    slots.push({
      key: String(currentMinutes),
      minutes: currentMinutes,
      label: formatMinutesToHm(currentMinutes),
    });
  }
  return slots;
};

/**
 * イベント詳細を取得する
 * @param {Array<string>} eventIds - イベントID配列
 * @returns {Promise<Map<string, Object>>} ID -> イベント詳細
 */
const selectEventDetailsByIds = async (eventIds) => {
  /** 正規化したイベントID配列 */
  const normalizedEventIds = uniqStringArray(eventIds);
  if (normalizedEventIds.length === 0) {
    return new Map();
  }

  /** イベント詳細取得結果 */
  const data = await selectPublishedRowsByIdsWithCandidates({
    tableName: EVENTS_TABLE,
    idColumn: 'id',
    ids: normalizedEventIds,
    selectCandidates: [EVENT_SELECT_PRIMARY, EVENT_SELECT_FALLBACK, EVENT_SELECT_LAST_RESORT],
  });

  /** イベント詳細Map */
  const eventMap = new Map();
  (data || []).forEach((row) => {
    eventMap.set(String(row.id), row);
  });
  return eventMap;
};

/**
 * 屋台詳細を取得する
 * @param {Array<string>} stallIds - 屋台ID配列
 * @returns {Promise<Map<string, Object>>} ID -> 屋台詳細
 */
const selectStallDetailsByIds = async (stallIds) => {
  /** 正規化した屋台ID配列 */
  const normalizedStallIds = uniqStringArray(stallIds);
  if (normalizedStallIds.length === 0) {
    return new Map();
  }

  /** 屋台詳細取得結果 */
  const data = await selectPublishedRowsByIdsWithCandidates({
    tableName: STALLS_TABLE,
    idColumn: 'id',
    ids: normalizedStallIds,
    selectCandidates: [STALL_SELECT_PRIMARY, STALL_SELECT_FALLBACK, STALL_SELECT_LAST_RESORT],
  });

  /** 場所ID配列 */
  const stallLocationIds = uniqStringArray((data || []).map((row) => row.location_id));
  /** 団体ID配列 */
  const stallOrganizationIds = uniqStringArray((data || []).map((row) => row.stall_organization_id));

  /** 屋台場所名称マップ */
  const stallLocationNameMap = await selectNameMapByIds({
    tableName: STALL_LOCATIONS_TABLE,
    ids: stallLocationIds,
    selectCandidates: ['id,name'],
  });
  /** 屋台団体名称マップ */
  const stallOrganizationNameMap = await selectNameMapByIds({
    tableName: STALL_ORGANIZATIONS_TABLE,
    ids: stallOrganizationIds,
    selectCandidates: ['id,name'],
  });

  /** 屋台詳細Map */
  const stallMap = new Map();
  (data || []).forEach((row) => {
    /** 場所情報 */
    const locationInfo = stallLocationNameMap.get(String(row.location_id || '')) || {
      name: '',
      nameKana: '',
    };
    /** 団体情報 */
    const organizationInfo = stallOrganizationNameMap.get(String(row.stall_organization_id || '')) || {
      name: '',
      nameKana: '',
    };

    stallMap.set(String(row.id), {
      ...row,
      stall_locations: {
        name: locationInfo.name,
        name_kana: locationInfo.nameKana,
      },
      stall_organizations: {
        name: organizationInfo.name,
        name_kana: organizationInfo.nameKana,
      },
    });
  });
  return stallMap;
};

/**
 * エリアマスタ一覧を取得する
 * @returns {Promise<Array<Object>>} エリア一覧
 */
const selectAreaLocations = async () => {
  /** Supabaseクライアント */
  const supabase = getSupabaseClient();
  /** 候補クエリ */
  const queryCandidates = [
    () =>
      supabase
        .from(AREA_LOCATIONS_TABLE)
        .select('id,name,name_kana,display_order')
        .order('display_order', { ascending: true }),
    () => supabase.from(AREA_LOCATIONS_TABLE).select('id,name,name_kana').order('name', { ascending: true }),
    () => supabase.from(AREA_LOCATIONS_TABLE).select('id,name').order('name', { ascending: true }),
  ];

  /** 最後のエラー */
  let lastError = null;
  for (const buildQuery of queryCandidates) {
    /** エリア一覧取得結果 */
    const { data, error } = await buildQuery();
    if (!error) {
      /** 正規化済みエリア一覧 */
      const normalizedRows = (data || []).map((row, index) => ({
        area_id: String(row.id || ''),
        area_name: String(row.name || ''),
        area_name_kana: String(row.name_kana || ''),
        display_order: Number.isFinite(Number(row.display_order))
          ? Number(row.display_order)
          : resolveAreaFallbackDisplayOrder(row.name, index),
      }));

      return normalizedRows.sort((left, right) => {
        if (left.display_order !== right.display_order) {
          return left.display_order - right.display_order;
        }
        return String(left.area_name || '').localeCompare(String(right.area_name || ''), 'ja', { numeric: true });
      });
    }

    lastError = error;
    if (!shouldFallbackSelect(error)) {
      break;
    }
  }

  throw new Error(`area_locations の取得に失敗しました: ${lastError?.message || 'unknown error'}`);
};

/**
 * 建物マスタ一覧を取得する
 * @returns {Promise<Array<Object>>} 建物一覧
 */
const selectBuildingLocations = async () => {
  /** Supabaseクライアント */
  const supabase = getSupabaseClient();
  /** 候補クエリ */
  const queryCandidates = [
    () =>
      supabase
        .from(BUILDING_LOCATIONS_TABLE)
        .select('id,name,name_kana,display_order')
        .order('display_order', { ascending: true }),
    () => supabase.from(BUILDING_LOCATIONS_TABLE).select('id,name,name_kana').order('name', { ascending: true }),
    () => supabase.from(BUILDING_LOCATIONS_TABLE).select('id,name').order('name', { ascending: true }),
  ];

  /** 最後のエラー */
  let lastError = null;
  for (const buildQuery of queryCandidates) {
    /** 建物一覧取得結果 */
    const { data, error } = await buildQuery();
    if (!error) {
      /** 正規化済み建物一覧 */
      const normalizedRows = (data || []).map((row, index) => ({
        building_id: String(row.id || ''),
        building_name: String(row.name || ''),
        building_name_kana: String(row.name_kana || ''),
        display_order: Number.isFinite(Number(row.display_order)) ? Number(row.display_order) : index + 1,
      }));

      /** 建物名の優先順を取得 */
      const getDefaultOrder = (buildingName) => {
        const orderIndex = DEFAULT_BUILDING_NAME_ORDER.indexOf(String(buildingName || '').trim());
        return orderIndex === -1 ? Number.MAX_SAFE_INTEGER : orderIndex;
      };

      return normalizedRows.sort((left, right) => {
        if (left.display_order !== right.display_order) {
          return left.display_order - right.display_order;
        }

        const leftDefaultOrder = getDefaultOrder(left.building_name);
        const rightDefaultOrder = getDefaultOrder(right.building_name);
        if (leftDefaultOrder !== rightDefaultOrder) {
          return leftDefaultOrder - rightDefaultOrder;
        }

        return left.building_name.localeCompare(right.building_name, 'ja', { numeric: true });
      });
    }

    lastError = error;
    if (!shouldFallbackSelect(error)) {
      break;
    }
  }

  throw new Error(`building_locations の取得に失敗しました: ${lastError?.message || 'unknown error'}`);
};

/**
 * 利用可能な開催日一覧を取得する
 * @returns {Promise<Array<string>>} 開催日一覧（YYYY-MM-DD）
 */
const selectAvailableScheduleDates = async () => {
  /** Supabaseクライアント */
  const supabase = getSupabaseClient();
  /** 候補クエリ */
  const queryCandidates = [
    () =>
      supabase
        .from(EVENT_SCHEDULE_SLOTS_TABLE)
        .select('schedule_date,is_visible_time_schedule')
        .eq('is_visible_time_schedule', true),
    () => supabase.from(EVENT_SCHEDULE_SLOTS_TABLE).select('schedule_date'),
  ];

  /** 最後のエラー */
  let lastError = null;
  for (const buildQuery of queryCandidates) {
    /** 開催日取得結果 */
    const { data, error } = await buildQuery();
    if (!error) {
      return sortScheduleDates((data || []).map((row) => String(row.schedule_date || '')));
    }
    lastError = error;
    if (!shouldFallbackSelect(error)) {
      break;
    }
  }

  throw new Error(`event_schedule_slots の開催日取得に失敗しました: ${lastError?.message || 'unknown error'}`);
};

/**
 * 日付・エリア条件で開催スロットを取得する
 * @param {Object} params - パラメータ
 * @param {string|Date} params.scheduleDate - 取得対象日
 * @returns {Promise<Array<Object>>} スロット一覧
 */
const selectEventScheduleSlots = async ({ scheduleDate }) => {
  /** 正規化した日付 */
  const normalizedDate = normalizeScheduleDate(scheduleDate);
  /** Supabaseクライアント */
  const supabase = getSupabaseClient();

  /** クエリ候補 */
  const queryCandidates = [
    {
      selectText: 'id,source_type,source_id,schedule_date,start_time,end_time,area_code,is_visible_time_schedule',
      hasVisibleFlag: true,
    },
    {
      selectText: 'id,source_type,source_id,schedule_date,start_time,end_time,area_code',
      hasVisibleFlag: false,
    },
    {
      selectText: 'id,source_type,source_id,schedule_date,start_time,end_time,area_name,is_visible_time_schedule',
      hasVisibleFlag: true,
    },
    {
      selectText: 'id,source_type,source_id,schedule_date,start_time,end_time,area_name',
      hasVisibleFlag: false,
    },
  ];

  /** 最後のエラー */
  let lastError = null;
  for (const candidate of queryCandidates) {
    /** スロット取得クエリ */
    let query = supabase
      .from(EVENT_SCHEDULE_SLOTS_TABLE)
      .select(candidate.selectText)
      .eq('schedule_date', normalizedDate)
      .order('start_time', { ascending: true })
      .order('end_time', { ascending: true });

    if (candidate.hasVisibleFlag) {
      query = query.eq('is_visible_time_schedule', true);
    }

    /** スロット一覧取得結果 */
    const { data, error } = await query;
    if (!error) {
      return data || [];
    }

    lastError = error;
    if (!shouldFallbackSelect(error)) {
      break;
    }
  }

  throw new Error(`event_schedule_slots の取得に失敗しました: ${lastError?.message || 'unknown error'}`);
};

/**
 * スロットにイベント/屋台詳細を結合する
 * @param {Array<Object>} slots - スロット一覧
 * @returns {Promise<Array<Object>>} 詳細付きスロット
 */
const attachSourceDetailsToSlots = async (slots) => {
  /** event ソースID一覧 */
  const eventIds = uniqStringArray(
    (slots || []).filter((slot) => slot.source_type === SOURCE_TYPES.EVENT).map((slot) => slot.source_id)
  );
  /** stall ソースID一覧 */
  const stallIds = uniqStringArray(
    (slots || []).filter((slot) => slot.source_type === SOURCE_TYPES.STALL).map((slot) => slot.source_id)
  );

  /** イベント詳細Map */
  const eventMap = await selectEventDetailsByIds(eventIds);
  /** 屋台詳細Map */
  const stallMap = await selectStallDetailsByIds(stallIds);

  return (slots || [])
    .map((slot) => {
      /** 参照元タイプ */
      const sourceType = slot.source_type;
      /** 参照元ID */
      const sourceId = String(slot.source_id);
      /** 参照詳細 */
      const sourceDetail = sourceType === SOURCE_TYPES.EVENT ? eventMap.get(sourceId) : stallMap.get(sourceId);

      if (!sourceDetail) {
        return null;
      }

      /** 開始分 */
      const startMinutes = parseTimeTextToMinutes(slot.start_time);
      /** 終了分 */
      const endMinutes = parseTimeTextToMinutes(slot.end_time);

      if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
        return null;
      }

      /** イベント開催日程配列 */
      const eventSchedules =
        sourceType === SOURCE_TYPES.EVENT
          ? normalizeEventSchedules({ slot, sourceDetail })
          : {
              scheduleDates: [],
              scheduleStartTimes: [],
              scheduleEndTimes: [],
            };

      return {
        ...slot,
        source_type: sourceType,
        source_id: sourceId,
        source_detail: sourceDetail,
        itemType: sourceType === SOURCE_TYPES.EVENT ? 'EVENTS' : 'STALLS',
        displayName: sourceDetail.name || '',
        schedule_date: slot.schedule_date || null,
        schedule_dates: eventSchedules.scheduleDates,
        schedule_start_times: eventSchedules.scheduleStartTimes,
        schedule_end_times: eventSchedules.scheduleEndTimes,
        groupName:
          sourceType === SOURCE_TYPES.EVENT
            ? sourceDetail.event_organizations?.name || ''
            : sourceDetail.stall_organizations?.name || '',
        locationName:
          sourceType === SOURCE_TYPES.EVENT
            ? sourceDetail.event_locations?.name || ''
            : sourceDetail.stall_locations?.name || '',
        buildingLocationId:
          sourceType === SOURCE_TYPES.EVENT
            ? String(sourceDetail.event_locations?.building_id || '')
            : String(sourceDetail.stall_locations?.building_id || ''),
        buildingLocationName:
          sourceType === SOURCE_TYPES.EVENT
            ? sourceDetail.event_locations?.building_locations?.name || ''
            : sourceDetail.stall_locations?.building_locations?.name || sourceDetail.stall_locations?.name || '',
        areaId:
          sourceType === SOURCE_TYPES.EVENT
            ? String(
                sourceDetail.event_locations?.building_locations?.area_id ||
                  slot.area_code ||
                  slot.area_name ||
                  ''
              )
            : String(
                sourceDetail.stall_locations?.area_id ||
                  sourceDetail.stall_locations?.building_locations?.area_id ||
                  slot.area_code ||
                  slot.area_name ||
                  ''
              ),
        description: sourceDetail.description || '',
        startMinutes,
        endMinutes,
      };
    })
    .filter(Boolean);
};

/**
 * 詳細付きスロットを15分タイムラインへ投影する
 * @param {Array<Object>} detailedSlots - 詳細付きスロット
 * @param {Array<string>} selectedBuildingIds - 選択中建物ID
 * @returns {Array<Object>} タイムライン行一覧
 */
const buildTimeScheduleTimeline = (detailedSlots, selectedBuildingIds = []) => {
  /** 運用時間の時刻スロット */
  const operationSlots = buildOperationTimeSlots();
  /** 正規化した建物ID */
  const normalizedSelectedBuildingIds = uniqStringArray(selectedBuildingIds);
  /** 表示対象スロット */
  const visibleSlots = (detailedSlots || []).filter((slot) => {
    if (normalizedSelectedBuildingIds.length === 0) {
      return true;
    }
    return normalizedSelectedBuildingIds.includes(String(slot.buildingLocationId || ''));
  });

  return operationSlots.map((timeSlot) => {
    /** 該当時刻に開催中のスロット一覧 */
    const runningItems = visibleSlots
      .filter((slot) => slot.startMinutes <= timeSlot.minutes && timeSlot.minutes < slot.endMinutes)
      .sort((a, b) => {
        if (a.startMinutes !== b.startMinutes) {
          return a.startMinutes - b.startMinutes;
        }
        return (a.displayName || '').localeCompare(b.displayName || '', 'ja', { numeric: true });
      })
      .map((slot) => {
        /** 次のスロット時刻 */
        const nextMinutes = timeSlot.minutes + TIME_SLOT_INTERVAL_MINUTES;
        return {
          ...slot,
          segmentKey: `${slot.source_type}-${slot.source_id}-${slot.startMinutes}-${slot.endMinutes}`,
          isContinuedFromPreviousSlot: slot.startMinutes < timeSlot.minutes,
          isContinuedToNextSlot: nextMinutes < slot.endMinutes,
        };
      });

    return {
      key: timeSlot.key,
      time: timeSlot.label,
      minutes: timeSlot.minutes,
      items: runningItems,
    };
  });
};

/**
 * TimeSchedule 表示に必要なデータ一式を取得する
 * @param {Object} params - パラメータ
 * @param {string|Date} params.scheduleDate - 取得対象日
 * @param {Array<string>} [params.buildingIds] - 建物ID絞り込み
 * @returns {Promise<{areas:Array<Object>, areaLocations:Array<Object>, slots:Array<Object>, timeline:Array<Object>, availableDates:Array<string>, resolvedScheduleDate:string}>} 表示データ
 */
const selectTimeScheduleTimeline = async ({ scheduleDate, buildingIds = [] }) => {
  /** 利用可能な開催日 */
  const availableDates = await selectAvailableScheduleDates();
  /** 要求日付 */
  const requestedDate = normalizeScheduleDate(scheduleDate);
  /** 実際に取得する日付 */
  const resolvedScheduleDate = resolveScheduleDate({ requestedDate, availableDates });

  /** 建物一覧 */
  const areas = await selectBuildingLocations();
  /** エリア一覧 */
  const areaLocations = await selectAreaLocations();
  /** スロット一覧 */
  const slots = await selectEventScheduleSlots({ scheduleDate: resolvedScheduleDate });
  /** 詳細付きスロット */
  const detailedSlots = await attachSourceDetailsToSlots(slots);
  /** タイムライン */
  const timeline = buildTimeScheduleTimeline(detailedSlots, buildingIds);

  return {
    areas,
    areaLocations,
    slots: detailedSlots,
    timeline,
    availableDates,
    resolvedScheduleDate,
  };
};

export const timeScheduleService = {
  selectAreaLocations,
  selectBuildingLocations,
  selectAvailableScheduleDates,
  selectEventScheduleSlots,
  selectTimeScheduleTimeline,
};
