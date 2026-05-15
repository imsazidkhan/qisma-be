import type { User } from '@prisma/client';

/** Minimal author card on expense payloads (matches historic `userSnippet` shape). */
export function expenseUserSnippet(
  u: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl'>,
) {
  return {
    id: u.id,
    name: u.name ?? null,
    username: u.username ?? null,
    avatar: u.avatarUrl ?? null,
  };
}
