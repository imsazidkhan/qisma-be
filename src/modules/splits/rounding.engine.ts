import Decimal from 'decimal.js';

const D = (x: string | number | Decimal): Decimal => new Decimal(x);

/**
 * Largest-remainder method: distributes **total** minor units across positive integer **weights**
 * so the result sums **exactly** to **totalMinor**.
 */
export function distributeMinorByWeights(
  totalMinor: bigint,
  weights: readonly bigint[],
): bigint[] {
  if (weights.length === 0) {
    return [];
  }
  const sumW = weights.reduce((a, b) => a + b, 0n);
  if (sumW <= 0n) {
    throw new Error('Sum of weights must be positive');
  }
  if (totalMinor < 0n) {
    throw new Error('Total minor units cannot be negative');
  }

  const floors = weights.map((w) => (totalMinor * w) / sumW);
  const remainders = weights.map((w) => (totalMinor * w) % sumW);

  const allocated = floors.reduce((a, b) => a + b, 0n);
  let leftover = totalMinor - allocated;

  const idxByFrac = [...weights.keys()].sort((i, j) => {
    const cmp = remainders[j]! - remainders[i]!;
    return cmp !== 0n ? Number(cmp) : i - j;
  });

  const out = [...floors];
  let k = 0;
  while (leftover > 0n && k < idxByFrac.length) {
    const i = idxByFrac[k]!;
    out[i] = out[i]! + 1n;
    leftover -= 1n;
    k += 1;
  }

  if (leftover !== 0n) {
    throw new Error('Rounding allocation invariant failed');
  }

  return out;
}

/** `amount` string → integer minor units (e.g. paise for scale 2). */
export function toMinorUnits(amount: string, scale: number): bigint {
  if (!Number.isInteger(scale) || scale < 0 || scale > 8) {
    throw new Error('scale must be an integer between 0 and 8');
  }
  const d = D(amount).toDP(scale, Decimal.ROUND_HALF_UP);
  const factor = D(10).pow(scale);
  const s = d.mul(factor).toFixed(0, Decimal.ROUND_HALF_UP);
  return BigInt(s);
}

/** Minor units → decimal string fixed to **scale** places. */
export function fromMinorUnits(minor: bigint, scale: number): string {
  const neg = minor < 0n;
  const abs = neg ? -minor : minor;
  const base = D(10).pow(scale);
  const whole = D(abs.toString()).div(base);
  return (neg ? whole.neg() : whole).toDP(scale, Decimal.ROUND_HALF_UP).toString();
}

/**
 * Distribute **total** money across **weights** (shares, percentages×100 as integers, etc.).
 * Returned decimals are clipped to **scale** and sum to **total** (penny-perfect).
 */
export function distributeMoneyByWeights(
  total: string,
  weights: readonly string[],
  scale: number,
): string[] {
  if (weights.length === 0) {
    return [];
  }
  const wBig = weights.map((w) => {
    const m = toMinorUnits(w, scale);
    if (m < 0n) {
      throw new Error('Weights must be non-negative');
    }
    return m;
  });
  const totalMinor = toMinorUnits(total, scale);
  const parts = distributeMinorByWeights(totalMinor, wBig);
  return parts.map((m) => fromMinorUnits(m, scale));
}

/** Divide **total** equally among **count** people (e.g. ₹33.33 + ₹33.33 + ₹33.34). */
export function distributeEqual(
  total: string,
  count: number,
  scale: number,
): string[] {
  if (count <= 0) {
    throw new Error('count must be positive');
  }
  const weights = Array.from({ length: count }, () => '1');
  return distributeMoneyByWeights(total, weights, scale);
}
