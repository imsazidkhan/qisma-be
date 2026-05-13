/**
 * Out-of-network phone invites (`group_invites`) before a `User` exists.
 */
export const GROUP_INVITE_CONSTANTS = {
  /** Time-to-live for a pending phone invite (ms). */
  TTL_MS: 14 * 24 * 60 * 60 * 1000,
} as const;
