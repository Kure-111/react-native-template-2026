/**
 * シフトグリッドコンポーネント
 * 団体全メンバーのシフトをグリッド形式で表示し、
 * セル選択によるシフト変更操作を提供します
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

/**
 * 指定セルが属するブロックを計算する
 *
 * sourceColIndicesが指定されている場合（宛先選択モード）:
 *   自然なブロック展開は行わず、移動元と同じcolIndices範囲を強制的に使用する。
 *   これにより「2コマ→2コマ」が自動補完される。
 *
 * sourceColIndicesが指定されていない場合（移動元選択モード）:
 *   連続する同一エリア名のセルをひとまとまりのブロックとして計算する。
 *
 * @param {Object} member - メンバーデータ { name, cells }
 * @param {number} tappedColIndex - タップされたセルの列インデックス
 * @param {number[]|null} sourceColIndices - 移動元のcolIndices（宛先選択時に指定）
 * @returns {Object} ブロック情報 { memberName, colIndices, timeSlots, areaName }
 */
const getBlockForCell = (member, tappedColIndex, sourceColIndices = null) => {
  const tappedCell = member.cells.find((c) => c.colIndex === tappedColIndex);

  // 宛先選択モード: 移動元と同じcolIndices範囲に強制補完する
  if (sourceColIndices !== null) {
    /** 移動元のcolIndicesに対応する宛先メンバーのセル一覧 */
    const blockCells = sourceColIndices
      .map((idx) => member.cells.find((c) => c.colIndex === idx))
      .filter(Boolean)
      .sort((a, b) => a.colIndex - b.colIndex);
    return {
      memberName: member.name,
      colIndices: blockCells.map((c) => c.colIndex),
      timeSlots: blockCells.map((c) => c.timeSlot),
      /** タップしたセルのエリア名を代表として使用（null = 移動） */
      areaName: tappedCell?.areaName ?? null,
    };
  }

  // 移動元選択モード: 空きセルはブロック展開しない（単一セルとして扱う）
  if (!tappedCell || !tappedCell.areaName) {
    return {
      memberName: member.name,
      colIndices: [tappedColIndex],
      timeSlots: [tappedCell?.timeSlot ?? ''],
      areaName: null,
    };
  }

  /** 展開対象のエリア名 */
  const targetArea = tappedCell.areaName;
  /** colIndexでソートしたセル一覧 */
  const sorted = [...member.cells].sort((a, b) => a.colIndex - b.colIndex);
  /** タップされたセルのインデックス */
  const tappedIdx = sorted.findIndex((c) => c.colIndex === tappedColIndex);

  /** ブロックに含めるセルの配列（タップセルを起点に左右へ展開） */
  const blockCells = [sorted[tappedIdx]];

  /** 左方向への展開 */
  for (let i = tappedIdx - 1; i >= 0; i--) {
    if (
      sorted[i].areaName === targetArea &&
      sorted[i].colIndex === blockCells[0].colIndex - 1
    ) {
      blockCells.unshift(sorted[i]);
    } else {
      break;
    }
  }

  /** 右方向への展開 */
  for (let i = tappedIdx + 1; i < sorted.length; i++) {
    if (
      sorted[i].areaName === targetArea &&
      sorted[i].colIndex === blockCells[blockCells.length - 1].colIndex + 1
    ) {
      blockCells.push(sorted[i]);
    } else {
      break;
    }
  }

  return {
    memberName: member.name,
    colIndices: blockCells.map((c) => c.colIndex),
    timeSlots: blockCells.map((c) => c.timeSlot),
    areaName: targetArea,
  };
};

/** セルの幅 */
const CELL_WIDTH = 90;
/** セルの高さ */
const CELL_HEIGHT = 44;
/** 名前列の幅 */
const NAME_COLUMN_WIDTH = 80;

/** シフトありセルの背景色 */
const SHIFT_CELL_COLOR = '#4FC3F7';
/** 選択中セルの背景色 */
const SELECTED_CELL_COLOR = '#1976D2';
/** 空きセルの背景色 */
const EMPTY_CELL_COLOR = 'transparent';

/**
 * シフトグリッドコンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.gridData - グリッドデータ { organizationName, timeSlots, members }
 * @param {Object|null} props.selectedSource - 選択中の移動元 { memberName, colIndices, timeSlots, areaName }
 * @param {Object|null} props.selectedDestination - 選択中の移動先
 * @param {Function} props.onCellPress - セルタップ時のコールバック (block: { memberName, colIndices, timeSlots, areaName })
 * @param {Object} props.theme - テーマオブジェクト
 * @returns {JSX.Element} シフトグリッド
 */
const ShiftGrid = ({
  gridData,
  selectedSource,
  selectedDestination,
  onCellPress,
  theme,
}) => {
  if (!gridData || !gridData.timeSlots || gridData.timeSlots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          シフトデータがありません
        </Text>
      </View>
    );
  }

  /**
   * セルが選択中かどうかを判定
   * ブロック選択対応：selectedSource/Destinationの colIndices 配列で判定する
   * @param {string} memberName - メンバー名
   * @param {number} colIndex - 列インデックス
   * @returns {string|null} 選択種別（'source' / 'destination' / null）
   */
  const getSelectionType = (memberName, colIndex) => {
    if (
      selectedSource &&
      selectedSource.memberName === memberName &&
      selectedSource.colIndices.includes(colIndex)
    ) {
      return 'source';
    }
    if (
      selectedDestination &&
      selectedDestination.memberName === memberName &&
      selectedDestination.colIndices.includes(colIndex)
    ) {
      return 'destination';
    }
    return null;
  };

  /**
   * セルの背景色を取得
   * @param {string|null} areaName - エリア名
   * @param {string|null} selectionType - 選択種別
   * @returns {string} 背景色
   */
  const getCellBackgroundColor = (areaName, selectionType) => {
    if (selectionType === 'source') {
      return SELECTED_CELL_COLOR;
    }
    if (selectionType === 'destination') {
      return '#FF9800';
    }
    if (areaName) {
      return SHIFT_CELL_COLOR;
    }
    return EMPTY_CELL_COLOR;
  };

  /**
   * セルのテキスト色を取得
   * @param {string|null} selectionType - 選択種別
   * @returns {string} テキスト色
   */
  const getCellTextColor = (selectionType) => {
    if (selectionType) {
      return '#FFFFFF';
    }
    return theme.text;
  };

  /**
   * セルが選択不可かどうかを判定
   * 移動元ブロックが選択済みの場合、ブロックのcolIndices範囲外のセルは選択不可
   * @param {number} colIndex - 列インデックス
   * @returns {boolean} 選択不可の場合true
   */
  const isCellDisabled = (colIndex) => {
    return selectedSource !== null && !selectedSource.colIndices.includes(colIndex);
  };

  return (
    <View style={styles.container}>
      {/* 団体名 */}
      <Text style={[styles.organizationName, { color: theme.text }]}>
        {gridData.organizationName}
      </Text>

      <View style={styles.gridWrapper}>
        {/* 固定名前列 */}
        <View>
          {/* 名前ヘッダー */}
          <View style={[styles.nameHeaderCell, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.nameHeaderText, { color: theme.textSecondary }]}>名前</Text>
          </View>
          {/* 名前セル */}
          {gridData.members.map((member) => (
            <View key={member.name} style={[styles.nameCell, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.nameText, { color: theme.text }]} numberOfLines={1}>
                {member.name}
              </Text>
            </View>
          ))}
        </View>

        {/* スクロール可能なデータ列 */}
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            {/* 時間帯ヘッダー行 */}
            <View style={styles.headerRow}>
              {gridData.timeSlots.map((timeSlot, index) => (
                <View
                  key={`header-${index}`}
                  style={[styles.headerCell, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Text style={[styles.headerText, { color: theme.textSecondary }]} numberOfLines={1}>
                    {timeSlot}
                  </Text>
                </View>
              ))}
            </View>

            {/* メンバーデータ行 */}
            {gridData.members.map((member) => (
              <View key={member.name} style={styles.memberRow}>
                {/* データセル */}
                {member.cells.map((cell) => {
                  /** セルの選択種別 */
                  const selectionType = getSelectionType(member.name, cell.colIndex);
                  /** セルの背景色 */
                  const backgroundColor = getCellBackgroundColor(cell.areaName, selectionType);
                  /** セルのテキスト色 */
                  const textColor = getCellTextColor(selectionType);
                  /** 選択不可かどうか（移動元選択済みで異なる時間帯） */
                  const disabled = isCellDisabled(cell.colIndex);

                  return (
                    <TouchableOpacity
                      key={`${member.name}-${cell.colIndex}`}
                      style={[
                        styles.dataCell,
                        {
                          backgroundColor,
                          borderColor: selectionType ? backgroundColor : theme.border,
                          opacity: disabled ? 0.25 : 1,
                        },
                      ]}
                      onPress={() => onCellPress(getBlockForCell(member, cell.colIndex, selectedSource?.colIndices ?? null))}
                      activeOpacity={disabled ? 1 : 0.7}
                    >
                      <Text style={[styles.dataCellText, { color: textColor }]} numberOfLines={2}>
                        {cell.areaName || ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

/**
 * スタイル定義
 */
const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  gridWrapper: {
    flexDirection: 'row',
  },
  organizationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
  },
  headerRow: {
    flexDirection: 'row',
  },
  nameHeaderCell: {
    width: NAME_COLUMN_WIDTH,
    height: CELL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  nameHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerCell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '600',
  },
  memberRow: {
    flexDirection: 'row',
  },
  nameCell: {
    width: NAME_COLUMN_WIDTH,
    height: CELL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 4,
  },
  nameText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dataCell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 2,
  },
  dataCellText: {
    fontSize: 10,
    textAlign: 'center',
  },
});

export default ShiftGrid;
