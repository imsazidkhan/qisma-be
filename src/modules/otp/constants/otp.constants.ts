export const OTP_CONSTANTS = {
  LENGTH: 6,
  EXPIRY_SECONDS: 300, // 5 minutes
  MAX_ATTEMPTS: 5,
  COOLDOWN_SECONDS: 60, // 1 minute between resends
  LOCK_DURATION_SECONDS: 900, // 15 minutes lock after max attempts
} as const;

export const RATE_LIMIT_CONSTANTS = {
  // Per-phone rate limit (send OTP)
  PHONE_MAX_REQUESTS: 5,
  PHONE_WINDOW_SECONDS: 60,
  // Per-IP rate limit (send OTP)
  IP_MAX_REQUESTS: 10,
  IP_WINDOW_SECONDS: 60,
  // Per-session verify rate limit
  VERIFY_MAX_REQUESTS: 10,
  VERIFY_WINDOW_SECONDS: 60,
} as const;

export const OTP_REDIS_KEYS = {
  session: (sessionId: string) => `otp:session:${sessionId}`,
  attempts: (sessionId: string) => `otp:attempts:${sessionId}`,
  cooldown: (identifier: string) => `otp:cooldown:${identifier}`,
  identifierSession: (identifier: string) => `otp:id:${identifier}`,
  // Rate limit keys
  phoneRateLimit: (identifier: string) => `ratelimit:phone:${identifier}`,
  ipRateLimit: (ip: string) => `ratelimit:ip:${ip}`,
  verifyRateLimit: (sessionId: string) => `ratelimit:verify:${sessionId}`,
  // Idempotency keys
  idempotency: (key: string) => `idem:${key}`,
} as const;

export const IDEMPOTENCY_CONSTANTS = {
  TTL_SECONDS: 600, // 10 minutes
  PROCESSING_TTL_SECONDS: 30, // Lock while processing
} as const;
