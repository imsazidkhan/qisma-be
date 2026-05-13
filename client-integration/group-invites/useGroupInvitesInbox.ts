/**
 * React / React Native hook for Phase B inbox + badge.
 * Peer deps: `react` ≥ 18 (uses useCallback, useEffect, useMemo, useState).
 *
 * Optional: with React Navigation, refetch when the tab gains focus:
 * `useFocusEffect(useCallback(() => { void cfgRefreshSilent(); }, [...]))`.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { InviteClientConfig } from './types';

import {
  fetchPendingGroupInvites,
  InviteApiError,
  postAcceptGroupInvite,
  postDeclineGroupInvite,
} from './api';
import type { PendingGroupInviteEntry } from './types';

export type UseGroupInvitesInboxParams = InviteClientConfig & {
  /** Increment when tokens refresh post-login (`POST /v1/otp/verify`). */
  reloadToken?: number;
};

export function useGroupInvitesInbox(cfg: UseGroupInvitesInboxParams) {
  const [invites, setInvites] = useState<PendingGroupInviteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<InviteApiError | null>(null);
  const [actionGroupId, setActionGroupId] = useState<string | null>(null);

  const { baseUrl, getAccessToken, appHeaders, reloadToken } = cfg;

  const clientCfg = useMemo<InviteClientConfig>(
    () => ({
      baseUrl,
      getAccessToken,
      appHeaders,
    }),
    [baseUrl, getAccessToken, appHeaders],
  );

  const refresh = useCallback(async (mode: 'full' | 'silent' = 'full') => {
    if (mode === 'full') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    try {
      const list = await fetchPendingGroupInvites(clientCfg);
      setInvites(list);
    } catch (err: unknown) {
      setError(
        err instanceof InviteApiError
          ? err
          : new InviteApiError('UNKNOWN', String(err)),
      );
    } finally {
      if (mode === 'full') {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, [clientCfg]);

  useEffect(() => {
    void refresh('full');
  }, [refresh, reloadToken]);

  const badgeCount = invites.length;

  const acceptInvite = useCallback(
    async (groupId: string): Promise<{ ok: true } | { ok: false }> => {
      setActionGroupId(groupId);
      setError(null);
      try {
        await postAcceptGroupInvite(clientCfg, groupId);
        setInvites((prev) => prev.filter((i) => i.groupId !== groupId));
        return { ok: true };
      } catch (err: unknown) {
        setError(
          err instanceof InviteApiError
            ? err
            : new InviteApiError('UNKNOWN', String(err)),
        );
        return { ok: false };
      } finally {
        setActionGroupId(null);
      }
    },
    [clientCfg],
  );

  const declineInvite = useCallback(
    async (groupId: string): Promise<{ ok: true } | { ok: false }> => {
      setActionGroupId(groupId);
      setError(null);
      try {
        await postDeclineGroupInvite(clientCfg, groupId);
        setInvites((prev) => prev.filter((i) => i.groupId !== groupId));
        return { ok: true };
      } catch (err: unknown) {
        setError(
          err instanceof InviteApiError
            ? err
            : new InviteApiError('UNKNOWN', String(err)),
        );
        return { ok: false };
      } finally {
        setActionGroupId(null);
      }
    },
    [clientCfg],
  );

  const onPullRefresh = useCallback(async () => {
    await refresh('silent');
  }, [refresh]);

  return {
    invites,
    badgeCount,
    loading,
    refreshing,
    error,
    refresh,
    /** Pull-to-refresh / silent reload (badge updates from `invites`). */
    onPullRefresh,
    acceptInvite,
    declineInvite,
    busyGroupId: actionGroupId,
  };
}
