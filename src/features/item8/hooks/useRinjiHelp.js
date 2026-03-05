/**
 * 臨時ヘルプ機能の画面状態と操作をまとめて提供するカスタムフック。
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext.js';
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
} from '../services/rinjiHelpService.js';
import { isManager, RINJI_STATUS } from '../constants.js';

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
      const { error } = await createRecruit({ ...payload, head_user_id: user?.id });
      if (error) {
        setError(error.message);
        return false;
      }
      await refresh();
      return true;
    },
    [refresh, user?.id]
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
      const { error } = await updateRecruit(id, payload);
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
      const { error } = await applyRecruit(id, user?.id);
      if (error) {
        const duplicate =
          error?.code === '23505' ||
          error?.message?.includes?.('uq_rinji_apps_recruit_applicant') ||
          error?.message?.toLowerCase?.().includes?.('duplicate key');
        setError(duplicate ? 'すでに応募済みです。応募済みタブをご確認ください。' : error.message);
        return false;
      }
      await refresh();
      return true;
    },
    [refresh, user?.id]
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
      await refresh();
      return true;
    },
    [refresh, user?.id]
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
