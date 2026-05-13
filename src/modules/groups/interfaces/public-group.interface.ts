/**
 * Group fields safe to expose from APIs (no internal-only relations).
 */
export interface PublicGroup {
  id: string;
  name: string;
  type: string;
  /** Public image URL; null when unset. */
  avatarUrl: string | null;
  /** User who created the group, if recorded. */
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
