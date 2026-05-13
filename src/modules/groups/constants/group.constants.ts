/**
 * Domain hints aligned with Prisma `Group` model.
 */
export const GROUP_CONSTANTS = {
  /** Minimum name length after trim (UTF-16 code units). */
  NAME_MIN_LENGTH: 2,
  /** Maximum stored group name length (UTF-16 code units). */
  NAME_MAX_LENGTH: 50,
  /** Max activity events returned by **GET /v1/groups/:groupId/activity** (newest first). */
  ACTIVITY_FEED_MAX: 100,
} as const;
