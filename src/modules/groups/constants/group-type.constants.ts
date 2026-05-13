/**
 * Allowed `type` values for `POST /v1/groups`.
 * Slugs are stable API contract; client copy can differ.
 */
export const GROUP_TYPE_SLUGS = [
  'trip',
  'home',
  'couple',
  'office',
  'other',
] as const;

export type GroupTypeSlug = (typeof GROUP_TYPE_SLUGS)[number];
