import type { ExpenseMerchant } from '@prisma/client';

import { normalizeExpenseText } from './normalization.util';

/** Best merchant whose **displayName** / **aliases** overlap the title. */
export function matchExpenseMerchantFromTitle(
  title: string,
  merchants: Pick<ExpenseMerchant, 'id' | 'displayName' | 'aliases'>[],
): ExpenseMerchant | null {
  const nt = normalizeExpenseText(title);
  if (!nt) return null;
  let best: ExpenseMerchant | null = null;
  let bestScore = 0;
  for (const m of merchants) {
    const candidates = [m.displayName, ...m.aliases];
    let s = 0;
    for (const c of candidates) {
      const nc = normalizeExpenseText(c);
      if (nc.length >= 2 && nt.includes(nc)) s += nc.length;
    }
    if (s > bestScore) {
      bestScore = s;
      best = m as ExpenseMerchant;
    }
  }
  return bestScore > 0 ? best : null;
}
