/**
 * Sample Expo / React Native screen — copy into your app and wire navigation.
 *
 * Expects `useGroupInvitesInbox` + React Native primitives. Optionally wrap the
 * list tab icon with `badgeCount` from the same hook (or duplicate fetch with caution).
 */

import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { PendingGroupInviteEntry } from './types';
import { useGroupInvitesInbox } from './useGroupInvitesInbox';

type Props = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  appHeaders?: Record<string, string>;
  /** Bump after OTP verify so inbox refetches without remounting. */
  reloadToken?: number;
  /** Called after successful accept → navigate to your group shell. */
  onAcceptedNavigate: (groupId: string) => void;
};

function InviterLine(entry: PendingGroupInviteEntry): string | null {
  const inv = entry.invitedBy;
  if (!inv) return null;
  const label = inv.name ?? (inv.username ? `@${inv.username}` : inv.userId);
  return `Invited by ${label}`;
}

export function GroupInvitesScreenSample({
  baseUrl,
  getAccessToken,
  appHeaders,
  reloadToken,
  onAcceptedNavigate,
}: Props): React.ReactElement {
  const {
    invites,
    badgeCount,
    loading,
    refreshing,
    error,
    onPullRefresh,
    acceptInvite,
    declineInvite,
    busyGroupId,
  } = useGroupInvitesInbox({
    baseUrl,
    getAccessToken,
    appHeaders,
    reloadToken,
  });

  if (loading && invites.length === 0 && !refreshing && !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator accessibilityLabel="Loading invites" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {error ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {error.message ?? 'Could not load invites'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry invites"
            onPress={() => {
              void onPullRefresh();
            }}
          >
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.badgeLine} accessibilityLiveRegion="polite">
        {badgeCount === 0
          ? 'No pending invites'
          : `${String(badgeCount)} pending`}
      </Text>

      <FlatList
        data={invites}
        keyExtractor={(item) => item.groupId}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void onPullRefresh();
            }}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              Pull down to refresh, or wait for invite notifications later.
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const busy = busyGroupId === item.groupId;
          const inviterLine = InviterLine(item);

          return (
            <View style={styles.row}>
              {item.groupAvatar ? (
                <Image
                  source={{ uri: item.groupAvatar }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]} />
              )}
              <View style={styles.meta}>
                <Text style={styles.title}>{item.groupName}</Text>
                <Text style={styles.subtle}>{item.groupType}</Text>
                {inviterLine ? (
                  <Text style={styles.subtle}>{inviterLine}</Text>
                ) : null}
              </View>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Decline ${item.groupName}`}
                  disabled={busy}
                  onPress={() => {
                    void declineInvite(item.groupId);
                  }}
                  style={[styles.secondaryBtn, busy && styles.btnDisabled]}
                >
                  <Text style={styles.secondaryLabel}>Decline</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Accept ${item.groupName}`}
                  disabled={busy}
                  onPress={async () => {
                    const result = await acceptInvite(item.groupId);
                    if (result.ok) {
                      onAcceptedNavigate(item.groupId);
                    }
                  }}
                  style={[styles.primaryBtn, busy && styles.btnDisabled]}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryLabel}>Accept</Text>
                  )}
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 12,
    backgroundColor: '#0b0b0f',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0b0f',
  },
  banner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2a1515',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bannerText: {
    flex: 1,
    color: '#ffb4b4',
    fontSize: 14,
  },
  retry: {
    color: '#7ec8ff',
    fontWeight: '600',
  },
  badgeLine: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 13,
    color: '#9aa0a8',
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 24,
    marginHorizontal: 24,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#22252c',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1f2229',
  },
  avatarPlaceholder: {},
  meta: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '600',
  },
  subtle: {
    color: '#9aa0a8',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtn: {
    minWidth: 88,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    minWidth: 80,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3f4654',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  secondaryLabel: {
    color: '#e5e7eb',
    fontWeight: '500',
    fontSize: 13,
  },
});
