/**
 * 配布率確認システムのデータ取得サービス
 */

import { getSupabaseClient } from '../../../services/supabase/client';
import {
  DISTRIBUTION_TYPES,
  STATUS_LABELS,
} from '../constants';

/**
 * 呼び出し状態のキーを生成する
 * @param {string} eventId - 企画ID
 * @param {string} eventDateId - 開催日ID
 * @returns {string} 連結キー
 */
const createCallStatusKey = (eventId, eventDateId) => {
  /** 呼び出し状態のキー */
  const callStatusKey = `${eventId}_${eventDateId}`;

  return callStatusKey;
};

/**
 * 呼び出し状態をマップに変換する
 * @param {Array<Object>} callStatusList - 呼び出し状態配列
 * @returns {Object} 呼び出し状態マップ
 */
const createCallStatusMap = (callStatusList) => {
  /** 呼び出し状態のマップ */
  const callStatusMap = {};

  callStatusList.forEach((callStatus) => {
    /** 連結キー */
    const callStatusKey = createCallStatusKey(
      callStatus.event_id,
      callStatus.event_date_id
    );

    callStatusMap[callStatusKey] = callStatus;
  });

  return callStatusMap;
};

/**
 * 順次案内制の表示データを生成する
 * @param {Object} params - パラメータ
 * @param {Object} params.event - 企画情報
 * @param {Object} params.eventDate - 開催日情報
 * @param {Object} [params.callStatus] - 呼び出し状態
 * @returns {Object} 表示データ
 */
const createSequentialData = ({ event, eventDate, callStatus }) => {
  /** 現在の呼び出し番号 */
  const currentCallNumber = callStatus?.current_call_number ?? 0;
  /** 次の整理番号 */
  const nextTicketNumber = eventDate?.next_ticket_number ?? 1;
  /** 最後尾番号 */
  const lastTicketNumber = Math.max(nextTicketNumber - 1, 0);
  /** 待ち人数 */
  const waitingCount = Math.max(lastTicketNumber - currentCallNumber, 0);
  /** 1番号あたり待ち時間 */
  const estimatedWaitPerNumber = event?.estimated_wait_minutes ?? 0;
  /** 推定待ち時間 */
  const estimatedWaitMinutes = waitingCount * estimatedWaitPerNumber;

  return {
    currentCallNumber,
    lastTicketNumber,
    waitingCount,
    estimatedWaitMinutes,
    estimatedWaitPerNumber,
  };
};

/**
 * 時間枠定員制の表示データを生成する
 * @param {Object} params - パラメータ
 * @param {Object} params.event - 企画情報
 * @param {Object} params.timeSlot - 時間枠情報
 * @returns {Object} 表示データ
 */
const createTimeSlotData = ({ event, timeSlot }) => {
  /** 定員 */
  const capacityPerSlot = event?.capacity_per_slot ?? 0;
  /** 発券済み数 */
  const currentCount = timeSlot?.current_count ?? 0;
  /** 残り枠数 */
  const remainingCount = Math.max(capacityPerSlot - currentCount, 0);
  /** 受付終了フラグ */
  const isClosed = remainingCount === 0 || timeSlot?.status === 'full';

  return {
    id: timeSlot?.id,
    startTime: timeSlot?.start_time,
    endTime: timeSlot?.end_time,
    status: timeSlot?.status,
    statusLabel: STATUS_LABELS[timeSlot?.status] || '未設定',
    currentCount,
    capacityPerSlot,
    remainingCount,
    isClosed,
  };
};

/**
 * 配布状況一覧を取得する
 * @returns {Promise<Array<Object>>} 配布状況一覧
 */
export const selectTicketDistributions = async () => {
  /** Supabaseクライアント */
  const supabase = getSupabaseClient();

  /** 企画一覧取得結果 */
  const { data: eventList, error: eventError } = await supabase
    .from('events')
    .select(
      `
      id,
      name,
      location,
      type,
      capacity_per_slot,
      estimated_wait_minutes,
      event_dates (
        id,
        date,
        status,
        next_ticket_number,
        updated_at,
        time_slots (
          id,
          start_time,
          end_time,
          status,
          current_count,
          updated_at
        )
      )
    `
    )
    .order('name', { ascending: true });

  if (eventError) {
    throw eventError;
  }

  /** 開催日ID一覧 */
  const eventDateIdList = (eventList || [])
    .flatMap((event) => event.event_dates || [])
    .map((eventDate) => eventDate.id)
    .filter(Boolean);

  /** 呼び出し状態一覧 */
  const { data: callStatusList, error: callStatusError } = eventDateIdList.length
    ? await supabase
        .from('call_status')
        .select(
          `
          event_id,
          event_date_id,
          current_call_number,
          updated_at
        `
        )
        .in('event_date_id', eventDateIdList)
    : { data: [], error: null };

  if (callStatusError) {
    throw callStatusError;
  }

  /** 呼び出し状態マップ */
  const callStatusMap = createCallStatusMap(callStatusList || []);

  /** 配布状況一覧 */
  const distributionList = (eventList || []).flatMap((event) => {
    /** 開催日一覧 */
    const eventDateList = event.event_dates || [];

    return eventDateList.map((eventDate) => {
      /** 呼び出し状態キー */
      const callStatusKey = createCallStatusKey(event.id, eventDate.id);
      /** 呼び出し状態 */
      const callStatus = callStatusMap[callStatusKey];
      /** 共通情報 */
      const baseInfo = {
        eventId: event.id,
        eventName: event.name,
        location: event.location,
        type: event.type,
        eventDateId: eventDate.id,
        date: eventDate.date,
        status: eventDate.status,
        statusLabel: STATUS_LABELS[eventDate.status] || '未設定',
        updatedAt: eventDate.updated_at,
      };

      if (event.type === DISTRIBUTION_TYPES.SEQUENTIAL) {
        /** 順次案内制情報 */
        const sequentialData = createSequentialData({
          event,
          eventDate,
          callStatus,
        });

        return {
          ...baseInfo,
          sequential: sequentialData,
          timeSlots: [],
        };
      }

      /** 時間枠一覧 */
      const timeSlotList = (eventDate.time_slots || [])
        .slice()
        .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
        .map((timeSlot) => createTimeSlotData({ event, timeSlot }));

      return {
        ...baseInfo,
        sequential: null,
        timeSlots: timeSlotList,
      };
    });
  });

  return distributionList;
};
