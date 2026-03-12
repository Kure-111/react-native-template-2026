/**
 * 臨時ヘルプ機能の画面状態と操作をまとめて提供するカスタムフック。
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext.js';
import { getSupabaseClient } from '../../../services/supabase/client.js';
import {
  fetchRecruits,
  createRecruit,
  updateRecruit,
  closeRecruit,
  reopenRecruit,
  fetchApplications,
  applyRecruit,
  cancelRecruitApplication,
  fetchAppliedRecruits,
  syncExpiredRecruitStatuses,
} from '../services/rinjiHelpService.js';
import { isManager, RINJI_CLOSE_REASON, RINJI_STATUS } from '../constants.js';
import { sendNotificationToUser } from '../../../shared/services/notificationService.js';

const TITLE_SEPARATOR = '\n\n---\n\n';
const META_SEPARATOR = '\n\n::META::\n\n';
const RECRUIT_APPLIED_NOTIFICATION_TYPE = 'rinji_help_recruit_applied';
const RECRUIT_CANCELLED_NOTIFICATION_TYPE = 'rinji_help_recruit_apply_cancelled';
const RECRUIT_UPDATED_NOTIFICATION_TYPE = 'rinji_help_recruit_updated';
const RECRUIT_AUTO_FULL_NOTIFICATION_TYPE = 'rinji_help_recruit_auto_full_closed';
const supabase = getSupabaseClient();

/**
 * description 文字列を「タイトル / 業務内容 / 途中参加可否」に分解する。
 *
 * @param {string | null | undefined} rawDescription
 * @returns {{ title: string, body: string, lateJoin: string }}
 */
const parseRecruitDescriptionParts = (rawDescription) => {
  if (!rawDescription || typeof rawDescription !== 'string') {
    return { title: '', body: '', lateJoin: '' };
  }

  const metaIdx = rawDescription.indexOf(META_SEPARATOR);
  const plain = metaIdx === -1 ? rawDescription : rawDescription.slice(0, metaIdx);
  const lateJoin = metaIdx === -1 ? '' : rawDescription.slice(metaIdx + META_SEPARATOR.length).trim();
  const titleIdx = plain.indexOf(TITLE_SEPARATOR);

  if (titleIdx === -1) {
    return {
      title: '',
      body: plain.trim(),
      lateJoin,
    };
  }

  return {
    title: plain.slice(0, titleIdx).trim(),
    body: plain.slice(titleIdx + TITLE_SEPARATOR.length).trim(),
    lateJoin,
  };
};

/**
 * 通知本文向けに表示値を正規化する。
 *
 * @param {any} value
 * @param {string} fallback
 * @returns {string}
 */
const normalizeDisplayValue = (value, fallback = '未設定') => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? fallback : trimmed;
  }
  return `${value}`;
};

/**
 * 比較用に値を文字列へ正規化する。
 *
 * @param {any} value
 * @returns {string}
 */
const normalizeComparableValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  return `${value}`;
};

/**
 * 途中参加可否コードを表示文言へ変換する。
 *
 * @param {string} value
 * @returns {string}
 */
const formatLateJoinValue = (value) => {
  if (value === 'allow') return '可';
  if (value === 'deny') return '不可';
  return '未設定';
};

/**
 * 更新前後の募集情報から、通知本文用の簡易差分を生成する。
 * 業務内容は本文そのものを出さず、変更有無のみ通知する。
 *
 * @param {Record<string, any> | null} previousRecruit
 * @param {Record<string, any>} nextRecruit
 * @returns {{ title: string, lines: string[] }}
 */
const buildRecruitUpdateDiffSummary = (previousRecruit, nextRecruit) => {
  const previousParts = parseRecruitDescriptionParts(previousRecruit?.description);
  const nextParts = parseRecruitDescriptionParts(nextRecruit?.description);
  const nextTitle = normalizeDisplayValue(nextParts.title, '新しい臨時ヘルプ募集');
  const lines = [];

  const pushDiff = (label, beforeValue, afterValue) => {
    const beforeText = normalizeDisplayValue(beforeValue);
    const afterText = normalizeDisplayValue(afterValue);
    if (beforeText !== afterText) {
      lines.push(`・${label}: ${beforeText} → ${afterText}`);
    }
  };

  if (previousRecruit) {
    pushDiff('募集タイトル', previousParts.title, nextParts.title);
    pushDiff('募集人数', previousRecruit.headcount, nextRecruit.headcount);
    pushDiff('募集日', previousRecruit.work_date, nextRecruit.work_date);
    pushDiff('開始時刻', previousRecruit.work_time, nextRecruit.work_time);
    pushDiff('場所', previousRecruit.location, nextRecruit.location);
    pushDiff('集合場所', previousRecruit.meet_place, nextRecruit.meet_place);
    pushDiff('集合時間', previousRecruit.meet_time, nextRecruit.meet_time);
    pushDiff('途中参加可否', formatLateJoinValue(previousParts.lateJoin), formatLateJoinValue(nextParts.lateJoin));

    const beforeDescriptionBody = normalizeComparableValue(previousParts.body);
    const nextDescriptionBody = normalizeComparableValue(nextParts.body);
    if (beforeDescriptionBody !== nextDescriptionBody) {
      lines.push('・業務内容欄が変更されました');
    }
  } else {
    lines.push('・募集内容が更新されました（詳細は募集画面をご確認ください）');
  }

  return { title: nextTitle, lines };
};

/**
 * description から募集タイトルを抽出する。
 *
 * @param {string | null | undefined} rawDescription
 * @returns {string}
 */
const parseRecruitTitle = (rawDescription) => {
  return normalizeDisplayValue(parseRecruitDescriptionParts(rawDescription).title, '新しい臨時ヘルプ募集');
};

/**
 * 募集一覧・履歴・応募操作を管理し、画面から利用しやすい API を返す。
 *
 * @returns {{
 *   manager: boolean,
 *   authLoading: boolean,
 *   loading: boolean,
 *   error: string | null,
 *   roles: Array<any>,
 *   userInfo: any,
 *   recruits: Array<any>,
 *   historyRecruits: Array<any>,
 *   appliedRecruits: Array<any>,
 *   applications: Record<string, Array<any>>,
 *   refresh: () => Promise<void>,
 *   handleCreate: (payload: Record<string, any>) => Promise<boolean>,
 *   handleUpdate: (id: string, payload: Record<string, any>) => Promise<boolean>,
 *   handleClose: (id: string) => Promise<boolean>,
 *   handleReopen: (id: string) => Promise<{ok: boolean, message?: string}>,
 *   handleApply: (id: string) => Promise<boolean>,
 *   handleCancelApply: (id: string) => Promise<boolean>,
 *   loadApplications: (recruitId: string) => Promise<void>,
 *   RINJI_STATUS: typeof RINJI_STATUS
 * }}
 */
export const useRinjiHelp = () => {
  const { user, userInfo, isLoading: authLoading } = useAuth();
  const [recruits, setRecruits] = useState([]);
  const [historyRecruits, setHistoryRecruits] = useState([]);
  const [appliedRecruits, setAppliedRecruits] = useState([]);
  const [applications, setApplications] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [managerFlag, setManagerFlag] = useState(false);

  // ロール情報が到着したら一度だけ評価し、ユーザーが変わったらリセット
  useEffect(() => {
    if (!user) {
      setManagerFlag(false);
      return;
    }
    const roles = userInfo?.roles || [];
    console.log('[item8] roles:', roles?.map?.((r) => r?.name)?.join(', ') || 'なし');
    setManagerFlag(isManager(roles));
  }, [user, userInfo]);

  const manager = managerFlag;

  /**
   * 募集作成時に、作成者以外の全ユーザーへ通知する。
   *
   * @param {Record<string, any> | null} createdRecruit
   * @param {Record<string, any>} payload
   * @returns {Promise<void>}
   */
  const notifyRecruitCreatedToOthers = useCallback(
    async (createdRecruit, payload) => {
      const creatorUserId = user?.id;
      if (!creatorUserId) return;

      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .neq('user_id', creatorUserId);
      if (profileError) {
        console.warn('[item8] notify recipients fetch failed:', profileError.message || profileError);
        return;
      }

      const recipientUserIds = [
        ...new Set((profiles || []).map((row) => row?.user_id).filter(Boolean)),
      ];
      if (recipientUserIds.length === 0) return;

      const recruitTitle = parseRecruitTitle(createdRecruit?.description || payload?.description);
      const workDate = createdRecruit?.work_date || payload?.work_date || '未設定';
      const workTime = createdRecruit?.work_time || payload?.work_time || '未設定';
      const location = createdRecruit?.location || payload?.location || '未設定';
      const body = `${recruitTitle}\n募集日時: ${workDate} ${workTime}\n場所: ${location}`;
      const metadata = {
        type: 'rinji_help_recruit_created',
        source: 'item8_rinji_help',
        event: 'recruit_created',
        recruit_id: createdRecruit?.id || null,
        creator_user_id: creatorUserId,
      };

      const results = await Promise.allSettled(
        recipientUserIds.map((recipientUserId) =>
          sendNotificationToUser(
            recipientUserId,
            '新しい臨時ヘルプ募集が作成されました',
            body,
            metadata,
            creatorUserId
          )
        )
      );

      let failedCount = 0;
      results.forEach((result) => {
        if (result.status === 'rejected' || result?.value?.error) {
          failedCount += 1;
        }
      });
      if (failedCount > 0) {
        console.warn(`[item8] recruit create notification failed: ${failedCount}/${recipientUserIds.length}`);
      }
    },
    [user?.id]
  );

  /**
   * 募集応募時に、募集作成者へ通知する。
   * 応募登録は DB の一意制約で重複を防いでいるため、同一応募の重複通知は発生しない。
   *
   * @param {{ recruitId: string, applicationId?: string | null, applicantUserId: string }} params
   * @returns {Promise<void>}
   */
  const notifyRecruitOwnerOnApply = useCallback(
    async ({ recruitId, applicationId = null, applicantUserId }) => {
      if (!recruitId || !applicantUserId) return;

      const { data: recruit, error: recruitError } = await supabase
        .from('rinji_help_recruits')
        .select('id, head_user_id, description')
        .eq('id', recruitId)
        .single();
      if (recruitError || !recruit?.head_user_id) {
        console.warn('[item8] recruit apply notify recruit fetch failed:', recruitError?.message || recruitError);
        return;
      }

      const creatorUserId = recruit.head_user_id;
      if (creatorUserId === applicantUserId) {
        // 自分の操作で自分に通知しない
        return;
      }

      const { data: applicantProfile, error: applicantProfileError } = await supabase
        .from('user_profiles')
        .select('name, organization')
        .eq('user_id', applicantUserId)
        .single();
      if (applicantProfileError) {
        console.warn(
          '[item8] recruit apply notify applicant profile fetch failed:',
          applicantProfileError?.message || applicantProfileError
        );
      }

      const recruitTitle = parseRecruitTitle(recruit.description);
      const applicantName = applicantProfile?.name || userInfo?.name || applicantUserId;
      const applicantOrganization = applicantProfile?.organization || userInfo?.organization || '所属不明';
      const title = `[臨時ヘルプ]「${recruitTitle}」に応募がありました`;
      const body = `募集タイトル: ${recruitTitle}\n応募者: ${applicantOrganization} ${applicantName}`;
      const metadata = {
        type: RECRUIT_APPLIED_NOTIFICATION_TYPE,
        source: 'item8_rinji_help',
        event: 'recruit_applied',
        recruit_id: recruitId,
        application_id: applicationId,
        applicant_user_id: applicantUserId,
        creator_user_id: creatorUserId,
      };

      const { error: notifyError } = await sendNotificationToUser(
        creatorUserId,
        title,
        body,
        metadata,
        applicantUserId
      );
      if (notifyError) {
        console.warn('[item8] recruit apply notify failed:', notifyError?.message || notifyError);
      }
    },
    [userInfo?.name, userInfo?.organization]
  );

  /**
   * 応募取り消し時に、募集作成者へ通知する。
   *
   * @param {{ recruitId: string, cancelledApplicationIds?: string[], applicantUserId: string }} params
   * @returns {Promise<void>}
   */
  const notifyRecruitOwnerOnCancelApply = useCallback(
    async ({ recruitId, cancelledApplicationIds = [], applicantUserId }) => {
      if (!recruitId || !applicantUserId) return;

      const { data: recruit, error: recruitError } = await supabase
        .from('rinji_help_recruits')
        .select('id, head_user_id, description')
        .eq('id', recruitId)
        .single();
      if (recruitError || !recruit?.head_user_id) {
        console.warn('[item8] recruit cancel notify recruit fetch failed:', recruitError?.message || recruitError);
        return;
      }

      const creatorUserId = recruit.head_user_id;
      if (creatorUserId === applicantUserId) {
        // 自分の操作で自分に通知しない
        return;
      }

      const { data: applicantProfile, error: applicantProfileError } = await supabase
        .from('user_profiles')
        .select('name, organization')
        .eq('user_id', applicantUserId)
        .single();
      if (applicantProfileError) {
        console.warn(
          '[item8] recruit cancel notify applicant profile fetch failed:',
          applicantProfileError?.message || applicantProfileError
        );
      }

      const recruitTitle = parseRecruitTitle(recruit.description);
      const applicantName = applicantProfile?.name || userInfo?.name || applicantUserId;
      const applicantOrganization = applicantProfile?.organization || userInfo?.organization || '所属不明';
      const title = `[臨時ヘルプ]「${recruitTitle}」の応募が取り消されました`;
      const body = `募集タイトル: ${recruitTitle}\n取消者: ${applicantOrganization} ${applicantName}`;
      const metadata = {
        type: RECRUIT_CANCELLED_NOTIFICATION_TYPE,
        source: 'item8_rinji_help',
        event: 'recruit_apply_cancelled',
        recruit_id: recruitId,
        cancelled_application_ids: cancelledApplicationIds,
        applicant_user_id: applicantUserId,
        creator_user_id: creatorUserId,
      };

      const { error: notifyError } = await sendNotificationToUser(
        creatorUserId,
        title,
        body,
        metadata,
        applicantUserId
      );
      if (notifyError) {
        console.warn('[item8] recruit cancel notify failed:', notifyError?.message || notifyError);
      }
    },
    [userInfo?.name, userInfo?.organization]
  );

  /**
   * 募集が満員で自動終了に遷移した際、募集作成者へ通知する。
   * すでに auto_full だった募集は通知しない（重複抑止）。
   *
   * @param {{
   *   recruitId: string,
   *   actorUserId?: string,
   *   previousRecruit?: Record<string, any> | null
   * }} params
   * @returns {Promise<void>}
   */
  const notifyRecruitOwnerOnAutoFullClose = useCallback(
    async ({ recruitId, actorUserId, previousRecruit = null }) => {
      if (!recruitId) return;

      const { data: latestRecruit, error: recruitError } = await supabase
        .from('rinji_help_recruits')
        .select('id, head_user_id, description, headcount, status, close_reason')
        .eq('id', recruitId)
        .single();
      if (recruitError || !latestRecruit?.head_user_id) {
        console.warn('[item8] auto full notify recruit fetch failed:', recruitError?.message || recruitError);
        return;
      }

      const isLatestAutoFullClosed =
        latestRecruit.status === RINJI_STATUS.CLOSED &&
        latestRecruit.close_reason === RINJI_CLOSE_REASON.AUTO_FULL;
      if (!isLatestAutoFullClosed) return;

      const wasAlreadyAutoFullClosed =
        previousRecruit?.status === RINJI_STATUS.CLOSED &&
        previousRecruit?.close_reason === RINJI_CLOSE_REASON.AUTO_FULL;
      if (wasAlreadyAutoFullClosed) return;

      const creatorUserId = latestRecruit.head_user_id;
      if (actorUserId && creatorUserId === actorUserId) {
        // 自分の操作で自分に通知しない
        return;
      }

      const { count, error: countError } = await supabase
        .from('rinji_help_applications')
        .select('id', { count: 'exact', head: true })
        .eq('recruit_id', recruitId);
      if (countError) {
        console.warn('[item8] auto full notify count fetch failed:', countError?.message || countError);
      }

      const recruitTitle = parseRecruitTitle(latestRecruit.description);
      const applicantCount = Number.isFinite(count) ? count : null;
      const headcount = Number(latestRecruit.headcount);
      const ratioText =
        applicantCount !== null && Number.isFinite(headcount) && headcount > 0
          ? `（${applicantCount}/${headcount}）`
          : '';
      const title = '[臨時ヘルプ] 募集が定員に達しました';
      const body = `募集タイトル: ${recruitTitle}\n応募人数が募集人数に到達しました${ratioText}`;
      const metadata = {
        type: RECRUIT_AUTO_FULL_NOTIFICATION_TYPE,
        source: 'item8_rinji_help',
        event: 'recruit_auto_full_closed',
        recruit_id: recruitId,
        creator_user_id: creatorUserId,
        applicant_count: applicantCount,
        headcount: Number.isFinite(headcount) ? headcount : null,
      };

      const { error: notifyError } = await sendNotificationToUser(
        creatorUserId,
        title,
        body,
        metadata,
        actorUserId || null
      );
      if (notifyError) {
        console.warn('[item8] auto full notify failed:', notifyError?.message || notifyError);
      }
    },
    []
  );

  /**
   * 募集更新時に、応募済みユーザーへ通知する。
   *
   * @param {{ recruitId: string, payload?: Record<string, any>, updaterUserId?: string }} params
   * @returns {Promise<void>}
   */
  const notifyRecruitApplicantsOnUpdate = useCallback(
    async ({ recruitId, payload = {}, updaterUserId, previousRecruit = null }) => {
      if (!recruitId || !updaterUserId) return;

      const { data: applications, error: applicationsError } = await supabase
        .from('rinji_help_applications')
        .select('applicant_user_id')
        .eq('recruit_id', recruitId);
      if (applicationsError) {
        console.warn(
          '[item8] recruit update notify recipients fetch failed:',
          applicationsError?.message || applicationsError
        );
        return;
      }

      const recipientUserIds = [
        ...new Set(
          (applications || [])
            .map((row) => row?.applicant_user_id)
            .filter((userId) => Boolean(userId) && userId !== updaterUserId)
        ),
      ];
      if (recipientUserIds.length === 0) return;

      const { data: latestRecruit, error: recruitError } = await supabase
        .from('rinji_help_recruits')
        .select('id, description, headcount, work_date, work_time, location, meet_place, meet_time')
        .eq('id', recruitId)
        .single();
      if (recruitError) {
        console.warn('[item8] recruit update notify recruit fetch failed:', recruitError?.message || recruitError);
      }

      const sourceRecruit = latestRecruit || payload || {};
      const { title: recruitTitle, lines: diffLines } = buildRecruitUpdateDiffSummary(previousRecruit, sourceRecruit);
      if (diffLines.length === 0) {
        // 変更点が検出できない場合は通知を送らない
        return;
      }

      const title = `[臨時ヘルプ]「${recruitTitle}」の募集内容が更新されました`;
      const body = `募集タイトル: ${recruitTitle}\n変更点:\n${diffLines.join('\n')}`;
      const metadata = {
        type: RECRUIT_UPDATED_NOTIFICATION_TYPE,
        source: 'item8_rinji_help',
        event: 'recruit_updated',
        recruit_id: recruitId,
        updater_user_id: updaterUserId,
      };

      const results = await Promise.allSettled(
        recipientUserIds.map((recipientUserId) =>
          sendNotificationToUser(recipientUserId, title, body, metadata, updaterUserId)
        )
      );

      let failedCount = 0;
      results.forEach((result) => {
        if (result.status === 'rejected' || result?.value?.error) {
          failedCount += 1;
        }
      });
      if (failedCount > 0) {
        console.warn(`[item8] recruit update notification failed: ${failedCount}/${recipientUserIds.length}`);
      }
    },
    []
  );

  /**
   * 募集データを取得して、通常一覧または履歴一覧に振り分ける。
   *
   * @param {{ includeClosed?: boolean }} params
   * @returns {Promise<void>}
   */
  const loadRecruits = useCallback(
    async ({ includeClosed = false, includeAutoFullClosed = false } = {}) => {
      setLoading(true);
      setError(null);
      const { data, error } = await fetchRecruits({ includeClosed, includeAutoFullClosed });
      if (error) {
        setError(error.message);
      } else {
        includeClosed ? setHistoryRecruits(data || []) : setRecruits(data || []);
      }
      setLoading(false);
    },
    []
  );

  /**
   * 画面表示に必要な一覧データを再取得する。
   *
   * @returns {Promise<void>}
   */
  const refresh = useCallback(async () => {
    setApplications({});
    const { error: syncError } = await syncExpiredRecruitStatuses();
    if (syncError) {
      console.warn('[item8] sync expired recruits skipped:', syncError.message || syncError);
    }
    await loadRecruits({ includeClosed: false, includeAutoFullClosed: manager });
    if (manager) {
      await loadRecruits({ includeClosed: true });
      setAppliedRecruits([]);
    } else {
      setHistoryRecruits([]);
      const { data, error: appliedError } = await fetchAppliedRecruits(user?.id);
      if (appliedError) {
        setError(appliedError.message);
      } else {
        setAppliedRecruits(data || []);
      }
    }
  }, [loadRecruits, manager, user?.id]);

  useEffect(() => {
    if (!authLoading) {
      refresh();
    }
  }, [authLoading, refresh, manager]);

  /**
   * 募集を作成して一覧を更新する。
   *
   * @param {Record<string, any>} payload
   * @returns {Promise<boolean>}
   */
  const handleCreate = useCallback(
    async (payload) => {
      const {
        notify_all_on_create: notifyAllOnCreate = false,
        notify_applicants_on_update: _notifyApplicantsOnUpdate,
        ...createPayload
      } = payload || {};
      const { data: createdRecruit, error } = await createRecruit({
        ...createPayload,
        head_user_id: user?.id,
      });
      if (error) {
        setError(error.message);
        return false;
      }
      if (notifyAllOnCreate) {
        notifyRecruitCreatedToOthers(createdRecruit || null, createPayload).catch((notifyError) => {
          console.warn('[item8] recruit create notify skipped:', notifyError?.message || notifyError);
        });
      }
      await refresh();
      return true;
    },
    [notifyRecruitCreatedToOthers, refresh, user?.id]
  );

  /**
   * 募集を更新して一覧を更新する。
   *
   * @param {string} id
   * @param {Record<string, any>} payload
   * @returns {Promise<boolean>}
   */
  const handleUpdate = useCallback(
    async (id, payload) => {
      const {
        notify_applicants_on_update: notifyApplicantsOnUpdate = true,
        notify_all_on_create: _notifyAllOnCreate,
        ...updatePayload
      } = payload || {};
      const { data: previousRecruit, error: previousRecruitError } = await supabase
        .from('rinji_help_recruits')
        .select('id, description, headcount, work_date, work_time, location, meet_place, meet_time, status, close_reason')
        .eq('id', id)
        .single();
      if (previousRecruitError) {
        console.warn(
          '[item8] recruit update previous state fetch failed:',
          previousRecruitError?.message || previousRecruitError
        );
      }
      const { error } = await updateRecruit(id, updatePayload);
      if (error) {
        setError(error.message);
        return false;
      }
      if (notifyApplicantsOnUpdate) {
        notifyRecruitApplicantsOnUpdate({
          recruitId: id,
          payload: updatePayload,
          updaterUserId: user?.id,
          previousRecruit: previousRecruit || null,
        }).catch((notifyError) => {
          console.warn('[item8] recruit update notify skipped:', notifyError?.message || notifyError);
        });
      }
      notifyRecruitOwnerOnAutoFullClose({
        recruitId: id,
        actorUserId: user?.id,
        previousRecruit: previousRecruit || null,
      }).catch((notifyError) => {
        console.warn('[item8] auto full notify after update skipped:', notifyError?.message || notifyError);
      });
      await refresh();
      return true;
    },
    [notifyRecruitApplicantsOnUpdate, notifyRecruitOwnerOnAutoFullClose, refresh, user?.id]
  );

  /**
   * 募集を終了して一覧を更新する。
   *
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  const handleClose = useCallback(
    async (id) => {
      const { error } = await closeRecruit(id);
      if (error) {
        setError(error.message);
        return false;
      }
      await refresh();
      return true;
    },
    [refresh]
  );

  /**
   * 募集を再開して一覧を更新する。
   *
   * @param {string} id
   * @returns {Promise<{ok: boolean, message?: string}>}
   */
  const handleReopen = useCallback(
    async (id) => {
      const { error } = await reopenRecruit(id);
      if (error) {
        const message = error?.message || '募集の再開に失敗しました。';
        setError(message);
        return { ok: false, message };
      }
      await refresh();
      return { ok: true };
    },
    [refresh]
  );

  /**
   * 指定募集に応募して一覧を更新する。
   *
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  const handleApply = useCallback(
    async (id) => {
      const { data: previousRecruit, error: previousRecruitError } = await supabase
        .from('rinji_help_recruits')
        .select('id, status, close_reason')
        .eq('id', id)
        .single();
      if (previousRecruitError) {
        console.warn('[item8] apply previous recruit fetch failed:', previousRecruitError?.message || previousRecruitError);
      }

      const { data: application, error } = await applyRecruit(id, user?.id);
      if (error) {
        const duplicate =
          error?.code === '23505' ||
          error?.message?.includes?.('uq_rinji_apps_recruit_applicant') ||
          error?.message?.toLowerCase?.().includes?.('duplicate key');
        setError(duplicate ? 'すでに応募済みです。応募済みタブをご確認ください。' : error.message);
        return false;
      }
      notifyRecruitOwnerOnApply({
        recruitId: id,
        applicationId: application?.id || null,
        applicantUserId: user?.id,
      }).catch((notifyError) => {
        console.warn('[item8] recruit apply notify skipped:', notifyError?.message || notifyError);
      });
      notifyRecruitOwnerOnAutoFullClose({
        recruitId: id,
        actorUserId: user?.id,
        previousRecruit: previousRecruit || null,
      }).catch((notifyError) => {
        console.warn('[item8] auto full notify skipped:', notifyError?.message || notifyError);
      });
      await refresh();
      return true;
    },
    [notifyRecruitOwnerOnApply, notifyRecruitOwnerOnAutoFullClose, refresh, user?.id]
  );

  /**
   * 指定募集への応募を取り消して一覧を更新する。
   *
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  const handleCancelApply = useCallback(
    async (id) => {
      const { data, error } = await cancelRecruitApplication(id, user?.id);
      if (error) {
        setError(error.message);
        return false;
      }
      if (!data || data.length === 0) {
        setError('応募の取り消しに失敗しました。時間をおいて再度お試しください。');
        return false;
      }
      notifyRecruitOwnerOnCancelApply({
        recruitId: id,
        cancelledApplicationIds: (data || []).map((row) => row?.id).filter(Boolean),
        applicantUserId: user?.id,
      }).catch((notifyError) => {
        console.warn('[item8] recruit cancel notify skipped:', notifyError?.message || notifyError);
      });
      await refresh();
      return true;
    },
    [notifyRecruitOwnerOnCancelApply, refresh, user?.id]
  );

  /**
   * 募集単位の応募者一覧を取得してキャッシュする。
   *
   * @param {string} recruitId
   * @returns {Promise<void>}
   */
  const loadApplications = useCallback(async (recruitId) => {
    const { data, error } = await fetchApplications(recruitId);
    if (error) {
      setError(error.message);
      return;
    }
    setApplications((prev) => ({ ...prev, [recruitId]: data || [] }));
  }, []);

  return {
    manager,
    authLoading,
    loading,
    error,
    roles: userInfo?.roles || [],
    userInfo,
    recruits,
    historyRecruits,
    appliedRecruits,
    applications,
    refresh,
    handleCreate,
    handleUpdate,
    handleClose,
    handleReopen,
    handleApply,
    handleCancelApply,
    loadApplications,
    RINJI_STATUS,
  };
};
