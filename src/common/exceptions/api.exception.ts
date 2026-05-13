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

/** \`POST /v1/contacts/sync\` — per-user hourly quota exceeded. */
export class ContactsSyncUserRateLimitedException extends ApiException {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Contact sync rate limit exceeded. Try again after ${retryAfter} seconds.`
      : 'Contact sync rate limit exceeded for this account. Try again later.';
    super(
      'CONTACT_SYNC_RATE_LIMIT_USER',
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      retryAfter,
    );
  }
}

/** \`POST /v1/contacts/sync\` — per-IP hourly quota exceeded. */
export class ContactsSyncIpRateLimitedException extends ApiException {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Too many contact sync requests from this network. Try again after ${retryAfter} seconds.`
      : 'Too many contact sync requests from this network. Try again later.';
    super(
      'CONTACT_SYNC_RATE_LIMIT_IP',
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      retryAfter,
    );
  }
}

/** Uploaded contact row could not be parsed into a valid E.164 subscriber number. */
export class ContactPhonesNormalizeException extends ApiException {
  constructor(
    index: number,
    message = 'could not be parsed as a valid E.164 phone number',
  ) {
    super(
      'INVALID_CONTACT_PHONE',
      `Contact at index ${String(index)} ${message}`,
      HttpStatus.BAD_REQUEST,
    );
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

/** Profile / user resource */
export class UserNotFoundException extends ApiException {
  constructor(message = 'User not found.') {
    super('USER_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

export class AccountInactiveException extends ApiException {
  constructor(message = 'This account is inactive.') {
    super('ACCOUNT_INACTIVE', message, HttpStatus.FORBIDDEN);
  }
}

export class InvalidDisplayNameException extends ApiException {
  constructor(message = 'Display name is invalid.') {
    super('DISPLAY_NAME_INVALID', message, HttpStatus.BAD_REQUEST);
  }
}

/** Group resource (ownership enforced in service layer). */
export class GroupNotFoundException extends ApiException {
  constructor(message = 'Group not found.') {
    super('GROUP_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

/** `Expense.id` not found or soft-deleted (when filtered). */
export class ExpenseNotFoundException extends ApiException {
  constructor(message = 'Expense not found.') {
    super('EXPENSE_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

/** Split payload inconsistent with **splitType** or invariants. */
export class ExpenseSplitValidationException extends ApiException {
  constructor(message: string) {
    super('SPLIT_VALIDATION_ERROR', message, HttpStatus.BAD_REQUEST);
  }
}

/** **PATCH** failed because **expectedUpdatedAt** does not match the stored row. */
export class ExpenseStaleVersionException extends ApiException {
  constructor(message = 'Expense was modified by another client. Refresh and try again.') {
    super('EXPENSE_STALE_VERSION', message, HttpStatus.CONFLICT);
  }
}

/** Opaque **cursor** for **GET …/expenses** feed is malformed or expired. */
export class ExpenseInvalidCursorException extends ApiException {
  constructor(message = 'Invalid pagination cursor.') {
    super('INVALID_EXPENSE_CURSOR', message, HttpStatus.BAD_REQUEST);
  }
}

/** Caller is not an active member of this group (or invite still pending). */
export class NotGroupMemberException extends ApiException {
  constructor(message = 'You are not an active member of this group.') {
    super('NOT_GROUP_MEMBER', message, HttpStatus.FORBIDDEN);
  }
}

/** Caller must have `admin` or `owner` role (membership RBAC). */
export class GroupAdminRequiredException extends ApiException {
  constructor(
    message = 'You must be a group admin or owner to perform this action.',
  ) {
    super('GROUP_ADMIN_REQUIRED', message, HttpStatus.FORBIDDEN);
  }
}

/** Caller must have `owner` role (destructive actions, ownership transfer prep). */
export class GroupOwnerRequiredException extends ApiException {
  constructor(message = 'You must be the group owner to perform this action.') {
    super('GROUP_OWNER_REQUIRED', message, HttpStatus.FORBIDDEN);
  }
}

/** Duplicate membership violates unique `(groupId, userId)`. */
export class GroupMemberConflictException extends ApiException {
  constructor(message = 'This user is already a member of the group.') {
    super('ALREADY_GROUP_MEMBER', message, HttpStatus.CONFLICT);
  }
}

/** A pending invite already exists for this user in this group. */
export class InviteAlreadyPendingException extends ApiException {
  constructor(message = 'A pending invitation already exists for this user.') {
    super('INVITE_ALREADY_PENDING', message, HttpStatus.CONFLICT);
  }
}

/** Accept/decline called when the row exists but is not \`pending\` (or wrong state). */
export class GroupInviteNotPendingException extends ApiException {
  constructor(message = 'There is no pending invitation for this group.') {
    super('GROUP_INVITE_NOT_PENDING', message, HttpStatus.BAD_REQUEST);
  }
}

/** \`GET …/invite-preview\` requires your membership to still be **\`pending\`**. Active members must use roster APIs after joining. */
export class GroupInvitePreviewNotPendingException extends ApiException {
  constructor(
    message = 'Preview is available only before you accept the invite.',
  ) {
    super('GROUP_INVITE_PREVIEW_NOT_PENDING', message, HttpStatus.FORBIDDEN);
  }
}

/** Caller cannot invite their own account. */
export class InviteSelfForbiddenException extends ApiException {
  constructor(message = 'You cannot add yourself as a member.') {
    super('INVITE_SELF', message, HttpStatus.BAD_REQUEST);
  }
}

/** No `group_members` row for this user + group pair. */
export class GroupMemberNotFoundException extends ApiException {
  constructor(message = 'That user is not a member of this group.') {
    super('GROUP_MEMBER_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

/** Removing the owner membership is not allowed via remove-member (use delete group / future transfer). */
export class GroupOwnerProtectedException extends ApiException {
  constructor(
    message = 'The group owner cannot be removed in this way. Delete the group or transfer ownership.',
  ) {
    super('GROUP_OWNER_PROTECTED', message, HttpStatus.FORBIDDEN);
  }
}

/** Only owners may remove another active admin from the group. */
export class AdminRemoveRequiresOwnerException extends ApiException {
  constructor(message = 'Only the group owner can remove another admin.') {
    super('ADMIN_REMOVE_REQUIRES_OWNER', message, HttpStatus.FORBIDDEN);
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
