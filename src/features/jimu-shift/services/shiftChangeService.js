/**
 * シフト変更申請サービス
 * シフト変更申請の作成・取得・ステータス更新を提供します
 */

import { getSupabaseClient } from '../../../services/supabase/client.js';
import {
  sendNotificationToRole,
  sendNotificationToUser,
  getRoles,
} from '../../../shared/services/notificationService.js';

/**
 * 事務部ロールのIDを取得
 * @returns {Promise<string|null>} 事務部ロールID
 */
const getJimuRoleId = async () => {
  const { roles, error } = await getRoles();
  if (error) {
    return null;
  }

  /** 事務部ロール */
  const jimuRole = roles.find((role) => role.name === '事務部');
  return jimuRole?.id ?? null;
};

/**
 * シフト変更申請を作成し、事務部へ通知を送信する
 * @param {Object} params - 申請パラメータ
 * @param {string} params.requesterUserId - 申請者ユーザーID
 * @param {string} params.organizationName - 団体名
 * @param {string} params.shiftDate - シフト日付（YYYY-MM-DD形式）
 * @param {string} params.sourceMemberName - 移動元メンバー名
 * @param {string} params.sourceTimeSlot - 移動元時間帯
 * @param {string} params.sourceAreaName - 移動元エリア名
 * @param {string|null} params.destinationMemberName - 移動先メンバー名（空き枠の場合null）
 * @param {string} params.destinationTimeSlot - 移動先時間帯
 * @param {string|null} params.destinationAreaName - 移動先エリア名（空き枠の場合null）
 * @param {string|null} params.requesterNote - 申請者の備考（任意）
 * @returns {Promise<Object>} request, error
 */
export const insertShiftChangeRequest = async (params) => {
  try {
    const {
      requesterUserId,
      organizationName,
      shiftDate,
      sourceMemberName,
      sourceTimeSlot,
      sourceAreaName,
      destinationMemberName,
      destinationTimeSlot,
      destinationAreaName,
      requesterNote,
    } = params;

    // 事務部ロールIDを取得
    const jimuRoleId = await getJimuRoleId();
    if (!jimuRoleId) {
      return { request: null, error: new Error('事務部ロールが見つかりません') };
    }

    // 申請レコードを先に作成してIDを確定する
    // （通知の metadata に request_id を含めるため先行挿入）
    /** 救援申請かどうか（交代先メンバーなし） */
    const isRescue = !destinationMemberName;

    const { data, error: insertError } = await getSupabaseClient()
      .from('shift_change_requests')
      .insert({
        requester_user_id: requesterUserId,
        organization_name: organizationName,
        shift_date: shiftDate,
        source_member_name: sourceMemberName,
        source_time_slot: sourceTimeSlot,
        source_area_name: sourceAreaName,
        destination_member_name: destinationMemberName,
        destination_time_slot: destinationTimeSlot ?? null,
        destination_area_name: destinationAreaName,
        requester_note: requesterNote || null,
      })
      .select()
      .single();

    if (insertError) {
      return { request: null, error: insertError };
    }

    // 通知内容を構築
    /** 変更の種類（交換 or 移動）を判定（救援申請の場合は false） */
    const isSwap = !isRescue && !!destinationAreaName;

    /** 通知本文 */
    const notificationBody = isRescue
      ? `${organizationName} - ${sourceMemberName}さん(${sourceTimeSlot} ${sourceAreaName}) → 救援申請（交代者なし）`
      : isSwap
        ? `${organizationName} - ${sourceMemberName}さん(${sourceTimeSlot} ${sourceAreaName}) ↔ ${destinationMemberName}さん(${destinationAreaName})`
        : `${organizationName} - ${sourceMemberName}さん(${sourceTimeSlot} ${sourceAreaName}) → ${destinationMemberName}さん（シフトなし）`;

    /** 通知メタデータ（request_idを含む） */
    const metadata = {
      type: isRescue ? 'shift_rescue_request' : 'shift_change_request',
      request_id: data.id,
      date: shiftDate,
      organization_name: organizationName,
      source: {
        member_name: sourceMemberName,
        time_slot: sourceTimeSlot,
        area_name: sourceAreaName,
      },
      destination: {
        member_name: destinationMemberName,
        time_slot: destinationTimeSlot,
        area_name: destinationAreaName,
      },
      requester_user_id: requesterUserId,
    };

    // 事務部に通知を送信
    const { notification, error: notifyError } = await sendNotificationToRole(
      jimuRoleId,
      '📋 シフト変更申請',
      notificationBody,
      metadata,
      requesterUserId,
    );

    if (notifyError) {
      return { request: null, error: notifyError };
    }

    // 申請レコードに notification_id を紐付け
    await getSupabaseClient()
      .from('shift_change_requests')
      .update({ notification_id: notification?.id ?? null })
      .eq('id', data.id);

    return { request: data, error: null };
  } catch (error) {
    console.error('シフト変更申請の作成に失敗:', error);
    return { request: null, error };
  }
};

/**
 * 申請IDからシフト変更申請を取得
 * @param {string} requestId - 申請ID
 * @returns {Promise<Object>} request, error
 */
export const selectShiftChangeRequestById = async (requestId) => {
  try {
    const { data, error } = await getSupabaseClient()
      .from('shift_change_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error) {
      return { request: null, error };
    }

    return { request: data, error: null };
  } catch (error) {
    console.error('シフト変更申請の取得に失敗:', error);
    return { request: null, error };
  }
};

/**
 * ユーザーの申請履歴を取得
 * @param {string} userId - ユーザーID
 * @returns {Promise<Object>} requests, error
 */
export const selectShiftChangeRequestsByUser = async (userId) => {
  try {
    const { data, error } = await getSupabaseClient()
      .from('shift_change_requests')
      .select('*')
      .eq('requester_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { requests: [], error };
    }

    return { requests: data ?? [], error: null };
  } catch (error) {
    console.error('シフト変更申請履歴の取得に失敗:', error);
    return { requests: [], error };
  }
};

/**
 * シフト変更申請のステータスを完了に更新し、申請者にフィードバック通知を送信
 * @param {string} requestId - 申請ID
 * @param {string} completedByUserId - 完了処理した事務部ユーザーID
 * @param {string} responderNote - 対応備考（必須）
 * @returns {Promise<Object>} success, error
 */
export const completeShiftChangeRequest = async (requestId, completedByUserId, responderNote) => {
  try {
    // 申請データを取得
    const { request, error: fetchError } = await selectShiftChangeRequestById(requestId);
    if (fetchError) {
      return { success: false, error: fetchError };
    }

    if (!request) {
      return { success: false, error: new Error('申請が見つかりません') };
    }

    // 既に対応済みの場合はエラー
    if (request.status !== 'pending') {
      return { success: false, error: new Error('この申請は既に対応済みです') };
    }

    // ステータスを更新
    const { error: updateError } = await getSupabaseClient()
      .from('shift_change_requests')
      .update({
        status: 'completed',
        completed_by: completedByUserId,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        responder_note: responderNote || null,
      })
      .eq('id', requestId);

    if (updateError) {
      return { success: false, error: updateError };
    }

    // 変更の種類を判定
    /** 交換かどうか */
    const isSwap = !!request.destination_area_name;

    /** 完了通知本文 */
    const completionBody = isSwap
      ? `申請されたシフト変更が反映されました。\n${request.organization_name} - ${request.source_member_name}さん(${request.source_time_slot} ${request.source_area_name}) ↔ ${request.destination_member_name}さん(${request.destination_time_slot} ${request.destination_area_name})\n対応内容: ${responderNote}`
      : `申請されたシフト変更が反映されました。\n${request.organization_name} - ${request.source_member_name}さん(${request.source_time_slot} ${request.source_area_name}) → ${request.destination_member_name}さん（シフトなし）\n対応内容: ${responderNote}`;

    /** 完了通知メタデータ */
    const completionMetadata = {
      type: 'shift_change_completed',
      request_id: requestId,
      completed_by: completedByUserId,
    };

    // 申請者に完了通知を送信
    const { error: notifyError } = await sendNotificationToUser(
      request.requester_user_id,
      '✅ シフト変更完了',
      completionBody,
      completionMetadata,
      completedByUserId,
    );

    if (notifyError) {
      console.error('完了通知の送信に失敗:', notifyError);
      // 通知失敗してもステータス更新は成功とする
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('シフト変更申請の完了処理に失敗:', error);
    return { success: false, error };
  }
};

/**
 * シフト変更申請を却下し、申請者に却下通知を送信
 * @param {string} requestId - 申請ID
 * @param {string} rejectedByUserId - 却下処理した事務部ユーザーID
 * @param {string} responderNote - 却下理由・対応備考（必須）
 * @returns {Promise<Object>} success, error
 */
export const rejectShiftChangeRequest = async (requestId, rejectedByUserId, responderNote) => {
  try {
    // 申請データを取得
    const { request, error: fetchError } = await selectShiftChangeRequestById(requestId);
    if (fetchError) {
      return { success: false, error: fetchError };
    }

    if (!request) {
      return { success: false, error: new Error('申請が見つかりません') };
    }

    // 既に対応済みの場合はエラー
    if (request.status !== 'pending') {
      return { success: false, error: new Error('この申請は既に対応済みです') };
    }

    // ステータスを却下に更新
    const { error: updateError } = await getSupabaseClient()
      .from('shift_change_requests')
      .update({
        status: 'rejected',
        completed_by: rejectedByUserId,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        responder_note: responderNote || null,
      })
      .eq('id', requestId);

    if (updateError) {
      return { success: false, error: updateError };
    }

    // 変更の種類を判定
    /** 交換かどうか */
    const isSwap = !!request.destination_area_name;

    /** 却下通知本文 */
    const rejectionBody = isSwap
      ? `申請されたシフト変更が却下されました。\n${request.organization_name} - ${request.source_member_name}さん(${request.source_time_slot} ${request.source_area_name}) ↔ ${request.destination_member_name}さん(${request.destination_time_slot} ${request.destination_area_name})\n却下理由: ${responderNote}`
      : `申請されたシフト変更が却下されました。\n${request.organization_name} - ${request.source_member_name}さん(${request.source_time_slot} ${request.source_area_name}) → ${request.destination_member_name}さん（シフトなし）\n却下理由: ${responderNote}`;

    /** 却下通知メタデータ */
    const rejectionMetadata = {
      type: 'shift_change_rejected',
      request_id: requestId,
      rejected_by: rejectedByUserId,
    };

    // 申請者に却下通知を送信
    const { error: notifyError } = await sendNotificationToUser(
      request.requester_user_id,
      '❌ シフト変更却下',
      rejectionBody,
      rejectionMetadata,
      rejectedByUserId,
    );

    if (notifyError) {
      console.error('却下通知の送信に失敗:', notifyError);
      // 通知失敗してもステータス更新は成功とする
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('シフト変更申請の却下処理に失敗:', error);
    return { success: false, error };
  }
};

/**
 * 全てのシフト変更申請を取得（事務部向け）
 * @returns {Promise<Object>} requests, error
 */
export const selectAllShiftChangeRequests = async () => {
  try {
    const { data, error } = await getSupabaseClient()
      .from('shift_change_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { requests: [], error };
    }

    return { requests: data ?? [], error: null };
  } catch (error) {
    console.error('シフト変更申請一覧の取得に失敗:', error);
    return { requests: [], error };
  }
};
