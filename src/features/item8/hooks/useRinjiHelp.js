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
} from '../services/rinjiHelpService.js';
import { isManager, RINJI_STATUS } from '../constants.js';

export const useRinjiHelp = () => {
  const { user, userInfo, isLoading: authLoading } = useAuth();
  const [recruits, setRecruits] = useState([]);
  const [historyRecruits, setHistoryRecruits] = useState([]);
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

  const loadRecruits = useCallback(
    async ({ includeClosed = false } = {}) => {
      setLoading(true);
      setError(null);
      const { data, error } = await fetchRecruits({ includeClosed });
      if (error) {
        setError(error.message);
      } else {
        includeClosed ? setHistoryRecruits(data || []) : setRecruits(data || []);
      }
      setLoading(false);
    },
    []
  );

  const refresh = useCallback(async () => {
    await loadRecruits({ includeClosed: false });
    if (manager) {
      await loadRecruits({ includeClosed: true });
    } else {
      setHistoryRecruits([]);
    }
  }, [loadRecruits, manager]);

  useEffect(() => {
    if (!authLoading) {
      refresh();
    }
  }, [authLoading, refresh, manager]);

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

  const handleReopen = useCallback(
    async (id) => {
      const { error } = await reopenRecruit(id);
      if (error) {
        setError(error.message);
        return false;
      }
      await refresh();
      return true;
    },
    [refresh]
  );

  const handleApply = useCallback(
    async (id) => {
      const { error } = await applyRecruit(id, user?.id);
      if (error) {
        setError(error.message);
        return false;
      }
      await refresh();
      return true;
    },
    [refresh, user?.id]
  );

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
    applications,
    refresh,
    handleCreate,
    handleUpdate,
    handleClose,
    handleReopen,
    handleApply,
    loadApplications,
    RINJI_STATUS,
  };
};
