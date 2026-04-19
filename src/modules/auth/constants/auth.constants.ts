export const JWT_CONSTANTS = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  ACCESS_TOKEN_EXPIRY_SECONDS: 900, // 15 minutes
  REFRESH_TOKEN_EXPIRY_SECONDS: 604800, // 7 days
  CLOCK_TOLERANCE_SECONDS: 5, // Allow 5s clock skew
} as const;

export const AUTH_REDIS_KEYS = {
  refreshToken: (tokenId: string) => `auth:refresh:${tokenId}`,
  userSessions: (identifier: string) => `auth:sessions:${identifier}`,
  revokedUsers: (identifier: string) => `auth:revoked:${identifier}`,
} as const;
