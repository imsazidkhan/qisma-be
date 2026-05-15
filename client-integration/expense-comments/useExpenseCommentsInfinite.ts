/**
 * Cursor-based infinite list for **`GET …/expenses/:expenseId/comments`**.
 *
 * - Append pages when **`loadMore()`** runs (**`nextCursor`** from API).
 * - **`sort=desc`**: first page is newest; **`loadMore`** appends **older** messages — use with **`inverted`** **`FlatList`** or scroll-up-at-top UX.
 * - Call **`refresh()`** after **`POST`** (create) or when **`parentCommentId`** / **`sort`** changes.
 *
 * Peer deps: **`react`** ≥ 18.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { fetchExpenseCommentsPage, CommentApiError } from './api';
import type { CommentClientConfig, ExpenseCommentEntry } from './types';

export type UseExpenseCommentsInfiniteParams = CommentClientConfig & {
  groupId: string;
  expenseId: string;
  /** `undefined`/`null` → top-level thread. UUID → replies under that root. */
  parentCommentId?: string | null;
  /** Page size (server default 20, max 100). */
  limit?: number;
  /** **`desc`** = newest first (append older pages when scrolling up). Omit/`asc` = API default chronological. */
  sort?: 'asc' | 'desc';
  /** Increment after login/token refresh to reload first page. */
  reloadToken?: number;
};

export function useExpenseCommentsInfinite(params: UseExpenseCommentsInfiniteParams) {
  const {
    baseUrl,
    getAccessToken,
    appHeaders,
    groupId,
    expenseId,
    parentCommentId,
    limit,
    sort,
    reloadToken,
  } = params;

  const clientCfg = useMemo<CommentClientConfig>(
    () => ({ baseUrl, getAccessToken, appHeaders }),
    [baseUrl, getAccessToken, appHeaders],
  );

  const [items, setItems] = useState<ExpenseCommentEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<CommentApiError | null>(null);

  /** Guard concurrent tail fetches (e.g. double **`onEndReached`**). */
  const tailBusyRef = useRef(false);

  const fetchFirstPage = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      tailBusyRef.current = true;
      try {
        const page = await fetchExpenseCommentsPage(clientCfg, {
          groupId,
          expenseId,
          parentCommentId: parentCommentId ?? undefined,
          limit,
          sort,
        });
        setItems(page.items);
        setNextCursor(page.nextCursor);
      } catch (err: unknown) {
        setItems([]);
        setNextCursor(null);
        setError(
          err instanceof CommentApiError
            ? err
            : new CommentApiError('UNKNOWN', String(err)),
        );
      } finally {
        tailBusyRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [clientCfg, expenseId, groupId, limit, parentCommentId, sort],
  );

  /** Scope or **`reloadToken`** change → reset list + load page 1. */
  useEffect(() => {
    void fetchFirstPage('initial');
  }, [fetchFirstPage, reloadToken]);

  const refresh = useCallback(async () => {
    await fetchFirstPage('refresh');
  }, [fetchFirstPage]);

  const loadMore = useCallback(async () => {
    if (loading || refreshing || loadingMore || nextCursor === null) {
      return;
    }
    if (tailBusyRef.current) {
      return;
    }
    tailBusyRef.current = true;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await fetchExpenseCommentsPage(clientCfg, {
        groupId,
        expenseId,
        parentCommentId: parentCommentId ?? undefined,
        cursor: nextCursor,
        limit,
        sort,
      });
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (err: unknown) {
      setError(
        err instanceof CommentApiError
          ? err
          : new CommentApiError('UNKNOWN', String(err)),
      );
    } finally {
      tailBusyRef.current = false;
      setLoadingMore(false);
    }
  }, [
    clientCfg,
    expenseId,
    groupId,
    limit,
    loading,
    loadingMore,
    nextCursor,
    parentCommentId,
    refreshing,
    sort,
  ]);

  const hasMore = nextCursor !== null;

  /** Replace row locally after optimistic reconciliation (optional). */
  const mergeUpdatedComment = useCallback((updated: ExpenseCommentEntry) => {
    setItems((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
  }, []);

  const removeCommentById = useCallback((commentId: string) => {
    setItems((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  const prependComment = useCallback((comment: ExpenseCommentEntry) => {
    setItems((prev) => [comment, ...prev]);
  }, []);

  return {
    items,
    loading,
    loadingMore,
    refreshing,
    error,
    hasMore,
    refresh,
    loadMore,
    mergeUpdatedComment,
    removeCommentById,
    prependComment,
  };
}
