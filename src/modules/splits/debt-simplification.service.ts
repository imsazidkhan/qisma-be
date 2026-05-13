import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

import type { SimplifiedTransfer } from './types/split.types';

const D = (x: string): Decimal => new Decimal(x);

/**
 * Greedy matching of debtors ↔ creditors.
 * **Net** map: positive = user is owed money overall, negative = user owes money.
 * Returns a **minimal** set of directed transfers (at most **n − 1** for **n** users with non-zero net).
 */
@Injectable()
export class DebtSimplificationService {
  simplify(
    netByUserId: Readonly<Record<string, string>>,
    scale: number,
  ): SimplifiedTransfer[] {
    const debtors: { id: string; amt: Decimal }[] = [];
    const creditors: { id: string; amt: Decimal }[] = [];

    for (const [id, raw] of Object.entries(netByUserId)) {
      const v = D(raw).toDP(scale, Decimal.ROUND_HALF_UP);
      if (v.isZero()) {
        continue;
      }
      if (v.isNegative()) {
        debtors.push({ id, amt: v.neg() });
      } else {
        creditors.push({ id, amt: v });
      }
    }

    debtors.sort((a, b) => b.amt.cmp(a.amt));
    creditors.sort((a, b) => b.amt.cmp(a.amt));

    const out: SimplifiedTransfer[] = [];
    let i = 0;
    let j = 0;
    const dust = new Decimal(10).pow(-scale);
    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i]!;
      const c = creditors[j]!;
      if (d.amt.lte(dust)) {
        i += 1;
        continue;
      }
      if (c.amt.lte(dust)) {
        j += 1;
        continue;
      }
      const pay = Decimal.min(d.amt, c.amt).toDP(scale, Decimal.ROUND_HALF_UP);
      if (pay.gt(dust)) {
        out.push({
          fromUserId: d.id,
          toUserId: c.id,
          amount: pay.toString(),
        });
      }
      d.amt = d.amt.sub(pay);
      c.amt = c.amt.sub(pay);
      if (d.amt.lte(dust)) {
        i += 1;
      }
      if (c.amt.lte(dust)) {
        j += 1;
      }
    }

    return out;
  }
}
