/**
 * シフト変更申請カスタムフック
 * グリッド上のセル選択状態と申請送信ロジックを管理します
 */

import { useState, useCallback } from 'react';
import { insertShiftChangeRequest } from '../services/shiftChangeService.js';

/**
 * 2つのcolIndices配列が完全一致するか判定
 * @param {number[]} a - 比較配列A
 * @param {number[]} b - 比較配列B
 * @returns {boolean} 一致する場合true
 */
const colIndicesEqual = (a, b) => {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
};

/**
 * 複数の時間帯スロットを「開始-終了」形式の1文字列に変換
 * 例: ["8:00-8:30", "8:30-9:00"] → "8:00-9:00"
 * @param {string[]} timeSlots - 時間帯スロットの配列
 * @returns {string} 合成された時間帯文字列
 */
const synthesizeTimeSlot = (timeSlots) => {
  if (timeSlots.length === 1) {
    return timeSlots[0];
  }
  /** 最初のスロットの開始時刻 */
  const startTime = timeSlots[0].split(/[-〜~]/)[0].trim();
  /** 最後のスロットの終了時刻 */
  const lastParts = timeSlots[timeSlots.length - 1].split(/[-〜~]/);
  const endTime = lastParts[lastParts.length - 1].trim();
  return `${startTime}-${endTime}`;
};

/**
 * シフト変更申請の状態管理と操作を提供するカスタムフック
 * @returns {Object} シフト変更申請の状態と操作関数
 */
const useShiftChangeRequest = () => {
  /** 移動元の選択データ */
  const [selectedSource, setSelectedSource] = useState(null);
  /** 移動先の選択データ */
  const [selectedDestination, setSelectedDestination] = useState(null);
  /** 確認モーダルの表示状態 */
  const [isModalVisible, setIsModalVisible] = useState(false);
  /** 送信中かどうか */
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** 操作ガイドメッセージ */
  const [guideMessage, setGuideMessage] = useState('交代してほしいシフトを選択してください');
  /** 申請者の備考（任意） */
  const [note, setNote] = useState('');
  /** 成功メッセージ */
  const [successMessage, setSuccessMessage] = useState('');
  /** エラーメッセージ */
  const [errorMessage, setErrorMessage] = useState('');
  /** 救援申請モーダルの表示状態 */
  const [isRescueModalVisible, setIsRescueModalVisible] = useState(false);

  /**
   * セルがタップされた時の処理
   * 1コマ選択後、隣接する同エリア・同メンバーのコマを追加選択してから交代相手を選択する
   * @param {Object} block - タップされたセルのブロック情報
   * @param {string} block.memberName - メンバー名
   * @param {number[]} block.colIndices - ブロックの列インデックス配列
   * @param {string[]} block.timeSlots - ブロックの時間帯配列
   * @param {string|null} block.areaName - エリア名（空きセルの場合null）
   */
  const handleCellPress = useCallback((block) => {
    const { memberName, colIndices, timeSlots, areaName } = block;
    /** 複数スロットを1つの時間帯文字列に変換（DBへの保存・表示用） */
    const timeSlot = synthesizeTimeSlot(timeSlots);

    // メッセージをリセット
    setSuccessMessage('');
    setErrorMessage('');

    if (!selectedSource) {
      // ステップ1: 交代元を選択（シフトが入っているセルのみ選択可能）
      if (!areaName) {
        setGuideMessage('シフトが入っているセルを選択してください');
        return;
      }

      setSelectedSource({ memberName, colIndices, timeSlots, timeSlot, areaName });
      setGuideMessage('交代相手のセルを選択してください（交代者がいない場合は下の「救援申請」を使用）');
    } else {
      // 同じブロックをタップした場合は選択解除
      if (
        selectedSource.memberName === memberName &&
        colIndicesEqual(selectedSource.colIndices, colIndices)
      ) {
        resetSelection();
        return;
      }

      // 移動元メンバーの隣接する同エリアコマをタップした場合は選択を拡張
      const minSourceCol = Math.min(...selectedSource.colIndices);
      const maxSourceCol = Math.max(...selectedSource.colIndices);
      const isAdjacentExpansion =
        memberName === selectedSource.memberName &&
        areaName === selectedSource.areaName &&
        colIndices.length > 0 &&
        (colIndices[0] === maxSourceCol + 1 || colIndices[colIndices.length - 1] === minSourceCol - 1);

      if (isAdjacentExpansion) {
        /** colIndexをキーにしてtimeSlotを保持したエントリを結合・ソート */
        const mergedEntries = [
          ...selectedSource.colIndices.map((ci, i) => ({ ci, ts: selectedSource.timeSlots[i] })),
          ...colIndices.map((ci, i) => ({ ci, ts: timeSlots[i] })),
        ].sort((a, b) => a.ci - b.ci);
        /** マージ後の列インデックス */
        const mergedColIndices = mergedEntries.map((e) => e.ci);
        /** マージ後の時間帯配列（colIndex昇順） */
        const mergedTimeSlots = mergedEntries.map((e) => e.ts);
        /** マージ後の表示用時間帯文字列 */
        const mergedTimeSlot = synthesizeTimeSlot(mergedTimeSlots);
        setSelectedSource({
          memberName,
          colIndices: mergedColIndices,
          timeSlots: mergedTimeSlots,
          timeSlot: mergedTimeSlot,
          areaName: selectedSource.areaName,
        });
        return;
      }

      // ステップ2: 交代先を選択
      // ShiftGrid側でsourceColIndicesに合わせた強制補完済みのblockが渡ってくるため、
      // 宛先のcolIndicesは移動元と常に一致する。そのままセットしてモーダルを開く。
      setSelectedDestination({ memberName, colIndices, timeSlots, timeSlot, areaName });
      setIsModalVisible(true);
    }
  }, [selectedSource]);

  /**
   * 選択状態をリセット
   */
  const resetSelection = useCallback(() => {
    setSelectedSource(null);
    setSelectedDestination(null);
    setIsModalVisible(false);
    setNote('');
    setGuideMessage('交代してほしいシフトを選択してください');
  }, []);

  /**
   * 申請を送信
   * @param {string} requesterUserId - 申請者ユーザーID
   * @param {string} organizationName - 団体名
   * @param {Date} shiftDate - シフト日付
   * @returns {Promise<boolean>} 送信成功時true
   */
  const submitRequest = useCallback(async (requesterUserId, organizationName, shiftDate) => {
    if (!selectedSource || !selectedDestination) {
      return false;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      /** 日付をYYYY-MM-DD形式に変換 */
      const year = shiftDate.getFullYear();
      const month = String(shiftDate.getMonth() + 1).padStart(2, '0');
      const day = String(shiftDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const { request, error } = await insertShiftChangeRequest({
        requesterUserId,
        organizationName,
        shiftDate: dateStr,
        sourceMemberName: selectedSource.memberName,
        sourceTimeSlot: selectedSource.timeSlot,
        sourceAreaName: selectedSource.areaName,
        destinationMemberName: selectedDestination.memberName,
        destinationTimeSlot: selectedDestination.timeSlot,
        destinationAreaName: selectedDestination.areaName || null,
        requesterNote: note.trim() || null,
      });

      if (error) {
        setErrorMessage(`申請の送信に失敗しました: ${error.message}`);
        setIsModalVisible(false);
        return false;
      }

      setSuccessMessage('シフト変更申請を送信しました');
      resetSelection();
      return true;
    } catch (error) {
      setErrorMessage(`申請の送信に失敗しました: ${error.message}`);
      setIsModalVisible(false);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedSource, selectedDestination, resetSelection]);

  /**
   * モーダルのキャンセル処理
   */
  const cancelModal = useCallback(() => {
    setSelectedDestination(null);
    setIsModalVisible(false);
    setGuideMessage('隣接するコマを追加選択、または交代相手を選択してください');
  }, []);

  /**
   * 救援申請モーダルを開く
   */
  const openRescueModal = useCallback(() => {
    setIsRescueModalVisible(true);
  }, []);

  /**
   * 救援申請モーダルを閉じる
   */
  const cancelRescueModal = useCallback(() => {
    setIsRescueModalVisible(false);
  }, []);

  /**
   * 救援申請を送信（交代先メンバーなし）
   * @param {string} requesterUserId - 申請者ユーザーID
   * @param {string} organizationName - 団体名
   * @param {Date} shiftDate - シフト日付
   * @returns {Promise<boolean>} 送信成功時true
   */
  const submitRescueRequest = useCallback(async (requesterUserId, organizationName, shiftDate) => {
    if (!selectedSource) {
      return false;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      /** 日付をYYYY-MM-DD形式に変換 */
      const year = shiftDate.getFullYear();
      const month = String(shiftDate.getMonth() + 1).padStart(2, '0');
      const day = String(shiftDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const { error } = await insertShiftChangeRequest({
        requesterUserId,
        organizationName,
        shiftDate: dateStr,
        sourceMemberName: selectedSource.memberName,
        sourceTimeSlot: selectedSource.timeSlot,
        sourceAreaName: selectedSource.areaName,
        destinationMemberName: null,
        destinationTimeSlot: null,
        destinationAreaName: null,
        requesterNote: note.trim() || null,
      });

      if (error) {
        setErrorMessage(`申請の送信に失敗しました: ${error.message}`);
        setIsRescueModalVisible(false);
        return false;
      }

      setSuccessMessage('救援申請を送信しました');
      resetSelection();
      setIsRescueModalVisible(false);
      return true;
    } catch (error) {
      setErrorMessage(`申請の送信に失敗しました: ${error.message}`);
      setIsRescueModalVisible(false);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedSource, note, resetSelection]);

  return {
    selectedSource,
    selectedDestination,
    isModalVisible,
    isSubmitting,
    guideMessage,
    note,
    setNote,
    successMessage,
    errorMessage,
    handleCellPress,
    resetSelection,
    submitRequest,
    cancelModal,
    isRescueModalVisible,
    openRescueModal,
    cancelRescueModal,
    submitRescueRequest,
  };
};

export default useShiftChangeRequest;
