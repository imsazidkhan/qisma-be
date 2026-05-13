export const CONTACT_SYNC_CONSTANTS = {
  /** Max phone entries per request (device contact export cap). */
  MAX_CONTACTS: 5000,
  /** Prisma `createMany` chunk size. */
  INSERT_CHUNK: 500,
  /** Inclusive bounds on digit count after normalization (E.164-style storage). */
  MIN_DIGITS: 10,
  MAX_DIGITS: 15,
  /** Per **IP** bucket (heavy payload / abuse containment). */
  RATE_LIMIT: {
    IP_MAX_REQUESTS: 120,
    IP_WINDOW_SECONDS: 3600,
    /** Per authenticated **user** (full address-book sync bursts). */
    USER_MAX_REQUESTS: 36,
    USER_WINDOW_SECONDS: 3600,
  },
} as const;
