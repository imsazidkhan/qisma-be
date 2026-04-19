export enum OtpSessionStatus {
  ACTIVE = 'ACTIVE',
  VERIFIED = 'VERIFIED',
  LOCKED = 'LOCKED',
}

export interface OtpSession {
  sessionId: string;
  otp: string;
  identifier: string;
  status: OtpSessionStatus;
  createdAt: number;
  expiresAt: number;
  lockedUntil?: number; // Timestamp when lock expires
}
