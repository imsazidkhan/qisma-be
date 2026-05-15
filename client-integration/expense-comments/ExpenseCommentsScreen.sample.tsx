/**
 * Sample Expo / React Native screen — infinite scroll via **`GET …/comments`** cursor pagination.
 *
 * Copy into your app. Wire **`baseUrl`**, **`getAccessToken`**, navigation params **`groupId`** / **`expenseId`**.
 *
 * **`FlatList`**: **`onEndReached`** calls **`loadMore`** when **`hasMore`**; **`RefreshControl`** calls **`refresh`**.
 */

import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ExpenseCommentEntry } from './types';
import { useExpenseCommentsInfinite } from './useExpenseCommentsInfinite';

type Props = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  appHeaders?: Record<string, string>;
  groupId: string;
  expenseId: string;
  /** Omit for top-level feed; set to open replies under one root comment. */
  parentCommentId?: string | null;
  limit?: number;
  /** **`desc`** (default) — newest first; **`loadMore`** adds older at list end. **`asc`** — API default chronological. */
  sort?: 'asc' | 'desc';
};

function authorLabel(c: ExpenseCommentEntry): string {
  const u = c.user;
  return u.name ?? (u.username ? `@${u.username}` : u.id.slice(0, 8));
}

export function ExpenseCommentsScreenSample({
  baseUrl,
  getAccessToken,
  appHeaders,
  groupId,
  expenseId,
  parentCommentId,
  limit,
  sort = 'desc',
}: Props): React.ReactElement {
  const {
    items,
    loading,
    loadingMore,
    refreshing,
    error,
    hasMore,
    refresh,
    loadMore,
  } = useExpenseCommentsInfinite({
    baseUrl,
    getAccessToken,
    appHeaders,
    groupId,
    expenseId,
    parentCommentId,
    limit,
    sort,
  });

  const listEmpty =
    !loading && !refreshing && items.length === 0 && !error;

  return (
    <View style={styles.root}>
      {error ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {error.code}: {error.message}
          </Text>
          <Text style={styles.hint}>
            INVALID_EXPENSE_CURSOR: pull to refresh (cursor reset).
          </Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
        }
        onEndReached={() => {
          if (hasMore && !loadingMore && !loading) {
            void loadMore();
          }
        }}
        onEndReachedThreshold={0.35}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator accessibilityLabel="Loading comments" />
            </View>
          ) : listEmpty ? (
            <Text style={styles.empty}>No comments yet.</Text>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator accessibilityLabel="Loading more" />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.user.avatar ? (
              <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}
            <View style={styles.body}>
              <Text style={styles.meta}>
                {authorLabel(item)} · {new Date(item.createdAt).toLocaleString()}
              </Text>
              <Text style={styles.message}>{item.message}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  centered: { padding: 24, alignItems: 'center' },
  banner: {
    padding: 12,
    backgroundColor: '#fee2e2',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#fca5a5',
  },
  bannerText: { color: '#991b1b', fontSize: 14 },
  hint: { color: '#7f1d1d', fontSize: 12, marginTop: 4 },
  empty: { padding: 24, textAlign: 'center', color: '#64748b' },
  footer: { paddingVertical: 16 },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarPlaceholder: { backgroundColor: '#e2e8f0' },
  body: { flex: 1 },
  meta: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  message: { fontSize: 15, color: '#0f172a' },
});
