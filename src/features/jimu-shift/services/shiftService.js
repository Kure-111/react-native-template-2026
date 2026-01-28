/**
 * シフトデータ解析サービス
 * GAS APIから取得したスプレッドシートデータを解析し、
 * ユーザーのシフト情報を抽出します
 */

/**
 * 団体名行かどうかを判定
 * 団体名行はA列に括弧付きの情報が含まれる（例: "渉外 (部長6, 部員0, 期間部5)"）
 * @param {Array} row - 行データ
 * @returns {boolean} 団体名行の場合true
 */
const isOrganizationRow = (row) => {
  if (!row || !row[0]) {
    return false;
  }

  const cellValue = String(row[0]).trim();

  // 空文字は無視
  if (cellValue === '') {
    return false;
  }

  // 括弧付きの情報が含まれている行は団体名行
  // 例: "渉外 (部長6, 部員0, 期間部5)"
  return cellValue.includes('(') || cellValue.includes('（');
};

/**
 * 団体名行から団体名を抽出
 * 括弧以前の文字列を団体名として返す
 * @param {string} cellValue - セルの値（例: "渉外 (部長6, 部員0, 期間部5)"）
 * @returns {string} 団体名（例: "渉外"）
 */
const extractOrganizationName = (cellValue) => {
  const value = String(cellValue).trim();

  // 半角・全角括弧の前で分割
  const matchHalf = value.indexOf('(');
  const matchFull = value.indexOf('（');

  let endIndex;
  if (matchHalf >= 0 && matchFull >= 0) {
    endIndex = Math.min(matchHalf, matchFull);
  } else if (matchHalf >= 0) {
    endIndex = matchHalf;
  } else if (matchFull >= 0) {
    endIndex = matchFull;
  } else {
    endIndex = value.length;
  }

  return value.substring(0, endIndex).trim();
};

/**
 * ヘッダー行かどうかを判定
 * ヘッダー行は「名前」という文字列がA列に含まれる
 * @param {Array} row - 行データ
 * @returns {boolean} ヘッダー行の場合true
 */
const isHeaderRow = (row) => {
  if (!row || !row[0]) {
    return false;
  }
  return String(row[0]).trim() === '名前';
};

/**
 * スプレッドシートデータを団体ブロックごとに分割
 * @param {Array<Array>} values - セルの値（2次元配列）
 * @returns {Array<Object>} 団体ブロックの配列
 */
const parseOrganizationBlocks = (values) => {
  /** 団体ブロックの配列 */
  const blocks = [];
  /** 現在処理中の団体ブロック */
  let currentBlock = null;

  for (let rowIndex = 0; rowIndex < values.length; rowIndex++) {
    const row = values[rowIndex];

    // 団体名行を検出
    if (isOrganizationRow(row)) {
      // 前のブロックがあれば保存
      if (currentBlock) {
        blocks.push(currentBlock);
      }

      // 新しいブロックを開始
      currentBlock = {
        organizationName: extractOrganizationName(row[0]),
        headerRow: null,
        members: [],
      };
      continue;
    }

    // 現在のブロックがない場合はスキップ
    if (!currentBlock) {
      continue;
    }

    // ヘッダー行を検出
    if (isHeaderRow(row)) {
      // 時間帯のヘッダーを保存（1列目の「名前」は除く）
      currentBlock.headerRow = row.slice(1).map((cell) => String(cell).trim());
      continue;
    }

    // データ行（名前が入っている行）
    const memberName = String(row[0]).trim();
    if (memberName !== '' && currentBlock.headerRow) {
      currentBlock.members.push({
        name: memberName,
        values: row.slice(1),
      });
    }
  }

  // 最後のブロックを保存
  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
};

/**
 * ユーザーのシフトを抽出
 * @param {Array<Object>} blocks - 団体ブロックの配列
 * @param {string} userName - ユーザー名（user_profiles.name）
 * @param {Array<string>} userOrganizations - ユーザーの所属団体名リスト
 * @returns {Array<Object>} シフト情報の配列（時系列順）
 */
const extractUserShifts = (blocks, userName, userOrganizations) => {
  /** ユーザーのシフト一覧 */
  const shifts = [];

  /** 目に優しい水色（全シフト共通） */
  const backgroundColor = '#4FC3F7';

  for (const block of blocks) {
    // ユーザーの所属団体かチェック
    const isUserOrg = userOrganizations.some(
      (org) => block.organizationName === org
    );

    if (!isUserOrg) {
      continue;
    }

    // ユーザー名で該当行を検索
    const memberData = block.members.find(
      (member) => member.name === userName
    );

    if (!memberData) {
      continue;
    }

    // ヘッダー行がない場合はスキップ
    if (!block.headerRow) {
      continue;
    }

    // 各セルをチェックしてシフトを抽出
    for (let colIndex = 0; colIndex < memberData.values.length; colIndex++) {
      const cellValue = String(memberData.values[colIndex]).trim();

      // 空白セルはスキップ（シフトなし）
      if (cellValue === '') {
        continue;
      }

      // 時間帯を取得
      const timeSlot = block.headerRow[colIndex] || '';

      shifts.push({
        timeSlot: timeSlot,
        areaName: cellValue,
        backgroundColor: backgroundColor,
        organizationName: block.organizationName,
      });
    }
  }

  // 時間帯でソート
  shifts.sort((a, b) => {
    return a.timeSlot.localeCompare(b.timeSlot);
  });

  // 連続する同じエリアのシフトをまとめる
  return mergeConsecutiveShifts(shifts);
};

/**
 * 連続する同じエリアのシフトをまとめる
 * @param {Array<Object>} shifts - シフト情報の配列
 * @returns {Array<Object>} まとめられたシフト情報の配列
 */
const mergeConsecutiveShifts = (shifts) => {
  if (shifts.length === 0) {
    return [];
  }

  /** まとめられたシフト一覧 */
  const merged = [];
  /** 現在処理中のシフト */
  let currentShift = null;
  /** 現在の開始時刻 */
  let startTime = null;
  /** 現在の終了時刻 */
  let endTime = null;

  for (const shift of shifts) {
    // 時間帯を分割（例: "10:00-10:30" → ["10:00", "10:30"]）
    const times = shift.timeSlot.split(/[-〜~]/);
    if (times.length !== 2) {
      continue;
    }

    const shiftStart = times[0].trim();
    const shiftEnd = times[1].trim();

    // 現在のシフトがない場合、または異なるエリアの場合
    if (
      !currentShift ||
      currentShift.areaName !== shift.areaName ||
      endTime !== shiftStart
    ) {
      // 前のシフトを保存
      if (currentShift && startTime && endTime) {
        merged.push({
          ...currentShift,
          timeSlot: `${startTime}〜${endTime}`,
        });
      }

      // 新しいシフトを開始
      currentShift = shift;
      startTime = shiftStart;
      endTime = shiftEnd;
    } else {
      // 連続している場合は終了時刻を更新
      endTime = shiftEnd;
    }
  }

  // 最後のシフトを保存
  if (currentShift && startTime && endTime) {
    merged.push({
      ...currentShift,
      timeSlot: `${startTime}〜${endTime}`,
    });
  }

  return merged;
};

/**
 * 日付文字列をスプレッドシートのシート名形式に変換
 * @param {Date} date - 日付オブジェクト
 * @returns {string} シート名形式の文字列（例: "11月3日"）
 */
export const formatDateToSheetName = (date) => {
  /** 月（1始まり） */
  const month = date.getMonth() + 1;
  /** 日 */
  const day = date.getDate();

  // m月d日 形式（ゼロ埋めなし）
  return `${month}月${day}日`;
};

/**
 * CSV取得レスポンスからユーザーのシフトを取得
 * @param {Object} shiftData - CSV取得レスポンス { sheetName, exists, values }
 * @param {string} userName - ユーザー名
 * @param {Array<string>} userOrganizations - ユーザーの所属団体名リスト
 * @returns {Array<Object>} シフト情報の配列
 */
export const getUserShifts = (shiftData, userName, userOrganizations) => {
  // シートが存在しない場合は空配列を返す
  if (!shiftData || !shiftData.exists) {
    return [];
  }

  // データがない場合は空配列を返す
  if (!shiftData.values || shiftData.values.length === 0) {
    return [];
  }

  // 団体ブロックに分割
  const blocks = parseOrganizationBlocks(shiftData.values);

  // ユーザーのシフトを抽出
  return extractUserShifts(blocks, userName, userOrganizations);
};

/**
 * 16進数カラーコードをRGBA形式に変換（透明度を指定）
 * @param {string} hexColor - 16進数カラーコード（例: "#ff9900"）
 * @param {number} opacity - 不透明度（0〜1）
 * @returns {string} RGBA形式の色（例: "rgba(255, 153, 0, 0.2)"）
 */
export const hexToRgba = (hexColor, opacity = 0.2) => {
  // デフォルトの白色
  if (!hexColor || hexColor === '#ffffff' || hexColor === '#FFFFFF') {
    return `rgba(200, 200, 200, ${opacity})`;
  }

  // #を除去
  const hex = hexColor.replace('#', '');

  // RGB値を取得
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
