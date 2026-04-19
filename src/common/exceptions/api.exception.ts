import { HttpException, HttpStatus } from '@nestjs/common';

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    retryAfter?: number;
  };
}

export class ApiException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
    retryAfter?: number,
  ) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: { code, message },
    };
    if (retryAfter !== undefined) {
      errorResponse.error.retryAfter = retryAfter;
    }
    super(errorResponse, status);
  }
}

export class InvalidIdentifierException extends ApiException {
  constructor(message = 'Phone or email is invalid') {
    super('INVALID_IDENTIFIER', message, HttpStatus.BAD_REQUEST);
  }
}

export class SessionNotFoundException extends ApiException {
  constructor(message = 'OTP session not found or expired') {
    super('SESSION_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

export class OtpExpiredException extends ApiException {
  constructor(message = 'OTP has expired') {
    super('OTP_EXPIRED', message, HttpStatus.GONE);
  }
}

export class InvalidOtpException extends ApiException {
  constructor(message = 'The OTP entered is incorrect') {
    super('INVALID_OTP', message, HttpStatus.BAD_REQUEST);
  }
}

export class MaxAttemptsException extends ApiException {
  constructor(
    message = 'Maximum OTP attempts reached. Please request a new OTP.',
  ) {
    super('MAX_ATTEMPTS', message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class SessionLockedException extends ApiException {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Session is locked. Try again after ${retryAfter} seconds.`
      : 'Session is locked due to multiple failed attempts.';
    super('SESSION_LOCKED', message, HttpStatus.LOCKED, retryAfter);
  }
}

export class CooldownException extends ApiException {
  constructor(retryAfter: number) {
    super(
      'COOLDOWN_ACTIVE',
      `Please wait ${retryAfter} seconds before requesting a new OTP.`,
      HttpStatus.TOO_MANY_REQUESTS,
      retryAfter,
    );
  }
}

export class InternalErrorException extends ApiException {
  constructor(message = 'Unable to process request. Please try again.') {
    super('INTERNAL_ERROR', message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class PhoneRateLimitedException extends ApiException {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Too many OTP requests for this phone. Try again after ${retryAfter} seconds.`
      : 'Too many OTP requests for this phone. Please try again later.';
    super(
      'RATE_LIMITED_PHONE',
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      retryAfter,
    );
  }
}

export class IpRateLimitedException extends ApiException {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Too many requests from this IP. Try again after ${retryAfter} seconds.`
      : 'Too many requests from this IP. Please try again later.';
    super('RATE_LIMITED_IP', message, HttpStatus.TOO_MANY_REQUESTS, retryAfter);
  }
}

export class VerifyRateLimitedException extends ApiException {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Too many verification attempts. Try again after ${retryAfter} seconds.`
      : 'Too many verification attempts. Please try again later.';
    super(
      'VERIFY_RATE_LIMITED',
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      retryAfter,
    );
  }
}

export class MaxAttemptsLockedException extends ApiException {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Maximum attempts reached. Session locked for ${retryAfter} seconds.`
      : 'Maximum OTP attempts reached. Please request a new OTP.';
    super('MAX_ATTEMPTS', message, HttpStatus.TOO_MANY_REQUESTS, retryAfter);
  }
}

export class IdempotencyKeyRequiredException extends ApiException {
  constructor() {
    super(
      'IDEMPOTENCY_KEY_REQUIRED',
      'Idempotency-Key header is required for this request.',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class IdempotencyKeyInvalidException extends ApiException {
  constructor() {
    super(
      'IDEMPOTENCY_KEY_INVALID',
      'Idempotency-Key must be a valid UUID or non-empty string (max 64 chars).',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class IdempotencyConflictException extends ApiException {
  constructor() {
    super(
      'IDEMPOTENCY_CONFLICT',
      'A request with this Idempotency-Key is already being processed.',
      HttpStatus.CONFLICT,
    );
  }
}

// JWT Exceptions
export class UnauthorizedException extends ApiException {
  constructor(message = 'Authentication required.') {
    super('UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED);
  }
}

export class InvalidTokenException extends ApiException {
  constructor(message = 'Invalid or malformed token.') {
    super('INVALID_TOKEN', message, HttpStatus.UNAUTHORIZED);
  }
}

export class TokenExpiredException extends ApiException {
  constructor(message = 'Token has expired.') {
    super('TOKEN_EXPIRED', message, HttpStatus.UNAUTHORIZED);
  }
}

export class InvalidSignatureException extends ApiException {
  constructor(message = 'Token signature is invalid.') {
    super('INVALID_SIGNATURE', message, HttpStatus.UNAUTHORIZED);
  }
}

export class RefreshTokenInvalidException extends ApiException {
  constructor(message = 'Refresh token is invalid or has been revoked.') {
    super('REFRESH_TOKEN_INVALID', message, HttpStatus.UNAUTHORIZED);
  }
}

export class RefreshTokenExpiredException extends ApiException {
  constructor(message = 'Refresh token has expired. Please login again.') {
    super('REFRESH_TOKEN_EXPIRED', message, HttpStatus.UNAUTHORIZED);
  }
}

export class RefreshTokenRequiredException extends ApiException {
  constructor() {
    super(
      'REFRESH_TOKEN_REQUIRED',
      'Refresh token is required.',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class TokenReusedException extends ApiException {
  constructor() {
    super(
      'TOKEN_REUSED',
      'Token reuse detected. All sessions have been revoked for security.',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class SessionRevokedException extends ApiException {
  constructor() {
    super(
      'SESSION_REVOKED',
      'Session has been revoked. Please login again.',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
