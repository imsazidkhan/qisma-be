/**
 * Allowed `useCase` values for `PATCH /v1/auth/me` (Screen 3 — Select use case).
 * Slugs are stable API contract; client copy can differ.
 */
export const USER_USE_CASE_SLUGS = [
  'personal',
  'work_or_business',
  'with_groups',
  'just_exploring',
] as const;

export type UserUseCaseSlug = (typeof USER_USE_CASE_SLUGS)[number];
