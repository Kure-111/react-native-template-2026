/**
 * 通知タイプ定義
 * システム全体で使用する通知タイプの定数
 */

export const NOTIFICATION_TYPES = {
  // デフォルト通知タイプ
  INFO: 'info',                        // 一般的な情報通知
  SUCCESS: 'success',                  // 処理成功時の通知
  WARNING: 'warning',                  // 注意が必要な内容
  ERROR: 'error',                      // エラー発生時の通知
  
  // 拡張可能な専用タイプ（必要に応じて追加）
  VENDOR_STOP: 'vendor_stop',          // 屋台停止通知
  SCHEDULE_CHANGE: 'schedule_change',   // スケジュール変更通知
  INVENTORY_ALERT: 'inventory_alert',   // 在庫アラート
  USER_ACTION: 'user_action'            // ユーザーアクション通知
};

/**
 * 通知タイプの設定
 */
export const NOTIFICATION_TYPE_CONFIG = {
  [NOTIFICATION_TYPES.INFO]: {
    displayName: '情報',
    color: '#3B82F6',           // 青色
    priority: 1,
    autoDismissSeconds: 7,
    icon: 'ℹ️'
  },
  [NOTIFICATION_TYPES.SUCCESS]: {
    displayName: '成功',
    color: '#10B981',           // 緑色
    priority: 1,
    autoDismissSeconds: 5,
    icon: '✓'
  },
  [NOTIFICATION_TYPES.WARNING]: {
    displayName: '警告',
    color: '#F59E0B',           // 橙色
    priority: 2,
    autoDismissSeconds: null,   // 自動で閉じない
    icon: '⚠️'
  },
  [NOTIFICATION_TYPES.ERROR]: {
    displayName: 'エラー',
    color: '#EF4444',           // 赤色
    priority: 3,
    autoDismissSeconds: null,   // 自動で閉じない
    icon: '✕'
  },
  [NOTIFICATION_TYPES.VENDOR_STOP]: {
    displayName: '屋台停止',
    color: '#DC2626',
    priority: 3,
    autoDismissSeconds: null,
    icon: '🛑'
  },
  [NOTIFICATION_TYPES.SCHEDULE_CHANGE]: {
    displayName: 'スケジュール変更',
    color: '#8B5CF6',
    priority: 2,
    autoDismissSeconds: 10,
    icon: '📅'
  },
  [NOTIFICATION_TYPES.INVENTORY_ALERT]: {
    displayName: '在庫アラート',
    color: '#F59E0B',
    priority: 2,
    autoDismissSeconds: null,
    icon: '📦'
  },
  [NOTIFICATION_TYPES.USER_ACTION]: {
    displayName: 'ユーザーアクション',
    color: '#6366F1',
    priority: 1,
    autoDismissSeconds: 5,
    icon: '👤'
  }
};

/**
 * 通知タイプの設定を取得
 * @param {string} type - 通知タイプ
 * @returns {object} 通知タイプの設定
 */
export function getNotificationTypeConfig(type) {
  return NOTIFICATION_TYPE_CONFIG[type] || NOTIFICATION_TYPE_CONFIG[NOTIFICATION_TYPES.INFO];
}
