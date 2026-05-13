/**
 * Domain defaults aligned with Prisma `User` model and shared validation hints.
 */
export const USER_CONSTANTS = {
  /** Matches Prisma `@default(false)` */
  DEFAULT_PHONE_VERIFIED: false,
  /** Matches Prisma `@default(true)` */
  DEFAULT_ACTIVE: true,
  /** Minimum grapheme-friendly length after trim / whitespace collapse (UTF-16 code units). */
  NAME_MIN_LENGTH: 1,
  /** Maximum stored display name length (UTF-16 code units). */
  NAME_MAX_LENGTH: 80,
  /** Minimum length for unified `GET /v1/users/search?q`. */
  SEARCH_QUERY_MIN_LENGTH: 2,
  /** Maximum length for `q` (names, typed phones, etc.). */
  SEARCH_QUERY_MAX_LENGTH: 96,
  /** Prefix length for username branch inside `q` (leading `[a-z0-9_]` run). */
  SEARCH_USERNAME_PREFIX_MIN: 2,
  /** Maximum rows returned from `GET /v1/users/search`. */
  SEARCH_MAX_RESULTS: 20,
  /** Full international phone (E.164-style) used when `q` matches this regex. */
  SEARCH_QUERY_AS_PHONE_REGEX: /^\+?[1-9]\d{9,14}$/,
} as const;
