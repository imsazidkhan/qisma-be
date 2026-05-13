/**
 * Mirrors `PendingGroupInviteEntryDto` / `GET /v1/users/me/group-invites`.
 * `invitedAt` is serialized as ISO-8601 in JSON responses.
 */

export type GroupInviteInvitedBy = {
  userId: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
};

export type PendingGroupInviteEntry = {
  groupId: string;
  groupName: string;
  groupAvatar: string | null;
  groupType: string;
  role: 'owner' | 'admin' | 'member';
  invitedAt: string;
  invitedBy: GroupInviteInvitedBy | null;
};

export type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
};

export type ApiErrorEnvelope = {
  success: false;
  error: { code: string; message: string; retryAfter?: number };
};

export type InviteClientConfig = {
  /** Origin only, no trailing slash, e.g. `https://api.example.com` (global prefix `/v1` added here). */
  baseUrl: string;
  /** Return null if logged out → API calls skipped / 401 surfaced. */
  getAccessToken: () => Promise<string | null>;
  /** Extra headers matching your Flux app (`X-App-Version`, `X-App-Platform`, `X-Device-Id`). */
  appHeaders?: Record<string, string>;
};
