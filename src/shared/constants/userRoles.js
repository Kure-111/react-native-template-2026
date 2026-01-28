/**
 * ユーザーロール定義
 * システム全体で使用するユーザーロールの定数
 */

export const USER_ROLES = {
  // 基本ロール
  ADMIN: 'admin',                      // システム管理者（全機能アクセス可）
  OPERATOR: 'operator',                // オペレーター（ほぼ全機能アクセス可）
  STAFF: 'staff',                      // スタッフ（基本機能のみ）
  
  // 部門別ロール
  VENDOR_MANAGER: 'vendor_manager',    // 屋台担当マネージャー
  INVENTORY_MANAGER: 'inventory_manager',  // 在庫管理者
  ACCOUNTANT: 'accountant',            // 会計担当者
  SCHEDULE_MANAGER: 'schedule_manager',    // スケジュール管理者
  
  // サークル関連ロール
  CIRCLE_LEADER: 'circle_leader',      // サークル責任者
  CIRCLE_MEMBER: 'circle_member',      // サークルメンバー
  
  // その他
  MANAGER: 'manager'                   // 総合マネージャー
};

/**
 * ロール表示名のマッピング
 */
export const ROLE_DISPLAY_NAMES = {
  [USER_ROLES.ADMIN]: 'システム管理者',
  [USER_ROLES.OPERATOR]: 'オペレーター',
  [USER_ROLES.STAFF]: 'スタッフ',
  [USER_ROLES.VENDOR_MANAGER]: '屋台担当マネージャー',
  [USER_ROLES.INVENTORY_MANAGER]: '在庫管理者',
  [USER_ROLES.ACCOUNTANT]: '会計担当者',
  [USER_ROLES.SCHEDULE_MANAGER]: 'スケジュール管理者',
  [USER_ROLES.CIRCLE_LEADER]: 'サークル責任者',
  [USER_ROLES.CIRCLE_MEMBER]: 'サークルメンバー',
  [USER_ROLES.MANAGER]: '総合マネージャー'
};

/**
 * ロールの権限レベル
 */
export const ROLE_LEVELS = {
  [USER_ROLES.ADMIN]: 100,
  [USER_ROLES.OPERATOR]: 80,
  [USER_ROLES.MANAGER]: 60,
  [USER_ROLES.VENDOR_MANAGER]: 50,
  [USER_ROLES.INVENTORY_MANAGER]: 50,
  [USER_ROLES.ACCOUNTANT]: 50,
  [USER_ROLES.SCHEDULE_MANAGER]: 50,
  [USER_ROLES.CIRCLE_LEADER]: 30,
  [USER_ROLES.STAFF]: 20,
  [USER_ROLES.CIRCLE_MEMBER]: 10
};
