/**
 * 01_Events&Stalls_list (企画・屋台一覧) 定数定義
 */

// タブ定義
export const TABS = {
    ALL: 'ALL',
    STALLS: 'STALLS',
    EVENTS: 'EVENTS',
};

// タブ表示名
export const TAB_NAMES = {
    [TABS.ALL]: 'すべて',
    [TABS.STALLS]: '屋台',
    [TABS.EVENTS]: '企画',
};

// ソート順定義
export const SORT_OPTIONS = {
    NAME_ASC: 'NAME_ASC',
    CATEGORY_ASC: 'CATEGORY_ASC',
    LOCATION_ASC: 'LOCATION_ASC',
    GROUP_ASC: 'GROUP_ASC',
};

// ソート列のヘッダー表示名
export const SORT_COLUMNS = [
    { key: SORT_OPTIONS.NAME_ASC, label: '名称', icon: null },
    { key: SORT_OPTIONS.CATEGORY_ASC, label: 'カテゴリ', icon: 'pricetag-outline' },
    { key: SORT_OPTIONS.LOCATION_ASC, label: '場所', icon: 'location-outline' },
    { key: SORT_OPTIONS.GROUP_ASC, label: '運営団体', icon: 'people-outline' },
];

// カテゴリ未指定を示す特殊値
export const CATEGORY_ALL = 'すべて';

// エリア未指定を示す特殊値
export const AREA_ALL = 'すべて';
