/**
 * 臨時ヘルプ機能の定数群
 */

export const RINJI_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
};

export const OPTIONAL_FIELD_DEFAULTS = {
  meet_place: (location) => location || '',
  meet_time: null,
  belongings: 'なし',
};

// 臨時ヘルプで「部長権限」とみなすロール名
const PRIVILEGED_ROLE_NAMES = ['部長', '管理者', '実長', '副実', '祭実長'];

const normalizeRoleName = (name) =>
  (name || '').toString().trim();

export const isManager = (roles = []) =>
  roles?.some((role) => {
    const n = normalizeRoleName(role?.name);
    return PRIVILEGED_ROLE_NAMES.includes(n);
  });
