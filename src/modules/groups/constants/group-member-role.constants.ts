/** Roles that can be set via \`PATCH .../members/:id/role\` (\`owner\` is excluded). */
export const GROUP_MEMBER_ROLES_PATCHABLE = ['admin', 'member'] as const;

/** Prisma-compatible subset of group membership roles (`admin` \| `member`) for PATCH updates. */
export type NonOwnerMembershipRole =
  (typeof GROUP_MEMBER_ROLES_PATCHABLE)[number];
