/**
 * Normalizes to digits-only, matching OTP send/verify and `User.identifier` storage.
 */
export function normalizeInvitePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}
