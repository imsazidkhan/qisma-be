/**
 * **BE Task 9** — stable **`analyticsEvent`** values on Pino JSON logs for later
 * pipeline routing (Datadog / BigQuery / etc.). No PII beyond **`userId`** / **`groupId`**.
 */
export const ANALYTICS_EVENT = {
  CONTACTS_SYNC: 'contacts_sync',
  INVITE_CONVERSION: 'invite_conversion',
} as const;

export const INVITE_CONVERSION_CHANNEL = {
  /** **`group_invites`** → **`group_members`** **pending** at **`/v1/otp/verify`** (must accept later). */
  OTP_SIGNUP: 'otp_signup',
  /** **`group_members` pending → active** via **`/v1/groups/.../invites/accept`**. */
  ACCEPT_PENDING_MEMBER: 'accept_pending_member',
} as const;
