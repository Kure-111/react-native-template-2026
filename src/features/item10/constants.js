/**
 * 項目10の定数（実長システム）
 */

// 自然災害の種類（緊急モード用）
export const DISASTER_TYPES = {
  EARTHQUAKE: 'earthquake',
  TYPHOON: 'typhoon',
  HEAVY_RAIN: 'heavy_rain',
  OTHER: 'other',
};

// 自然災害の種類（日本語）
export const DISASTER_TYPE_LABELS = {
  [DISASTER_TYPES.EARTHQUAKE]: '地震',
  [DISASTER_TYPES.TYPHOON]: '台風',
  [DISASTER_TYPES.HEAVY_RAIN]: '大雨・洪水',
  [DISASTER_TYPES.OTHER]: 'その他',
};

// 緊急度レベル
export const URGENCY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

// 緊急度の色
export const URGENCY_COLORS = {
  [URGENCY_LEVELS.LOW]: '#4CAF50',
  [URGENCY_LEVELS.MEDIUM]: '#FFC107',
  [URGENCY_LEVELS.HIGH]: '#F44336',
};

// 対応状況
export const STATUS_TYPES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
};

// 警備員ステータス（詳細仕様は未定）
export const SECURITY_STATUS = {
  ON_DUTY: 'on_duty',
  BREAK: 'break',
  MOVING: 'moving',
};

// カウント操作種別（表示用のみ）
export const COUNTER_OPERATIONS = {
  INCREMENT: 'increment',
  DECREMENT: 'decrement',
  RESET: 'reset',
};

// 更新間隔（ミリ秒）
export const UPDATE_INTERVALS = {
  WEATHER: 300000,  // 5分
  SECURITY: 30000,  // 30秒
  CLOCK: 1000,      // 1秒
};

// デフォルト位置（生駒市の座標）
export const DEFAULT_LOCATION = {
  latitude: 34.6913,
  longitude: 135.7005,
};

// 避難情報設定（自然災害のみ）
export const EVACUATION_INFO = {
  [DISASTER_TYPES.EARTHQUAKE]: {
    title: '地震発生 - 避難経路',
    description: '耐震構造の建物へ避難してください',
    routes: [],
  },
  [DISASTER_TYPES.TYPHOON]: {
    title: '台風接近 - 屋内避難',
    description: '安全な屋内へ避難してください',
    routes: [],
  },
  [DISASTER_TYPES.HEAVY_RAIN]: {
    title: '大雨・洪水 - 高所避難',
    description: '高所へ避難してください',
    routes: [],
  },
};
