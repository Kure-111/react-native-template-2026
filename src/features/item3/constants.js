/**
 * 項目3の定数
 */

/** 配布方式の定義 */
export const DISTRIBUTION_TYPES = {
	/** 順次案内制 */
	SEQUENTIAL: 'sequential',
	/** 時間枠定員制 */
	TIME_SLOT: 'time_slot',
};

/** ステータス表示ラベル */
export const STATUS_LABELS = {
	/** 未開始 */
	not_started: '未開始',
	/** 発券中 */
	active: '発券中',
	/** 一時停止 */
	paused: '一時停止',
	/** 満員 */
	full: '満員',
	/** 終了 */
	ended: '終了',
};

/** 自動更新間隔（ミリ秒） */
export const DEFAULT_REFRESH_INTERVAL = 30000;

/** 画面表示用ラベル */
export const SCREEN_LABELS = {
	/** 画面タイトル */
	title: '配布率確認',
	/** 順次案内制 */
	sequential: '順次案内制',
	/** 時間枠定員制 */
	timeSlot: '時間枠定員制',
	/** 全て */
	all: '全て',
};

