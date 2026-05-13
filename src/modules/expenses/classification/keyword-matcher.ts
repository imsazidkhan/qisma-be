import { normalizeExpenseText } from './normalization.util';

/** Returns normalized overlap score between **title** and **keywords**. */
export function scoreKeywordOverlap(title: string, keywords: readonly string[]): number {
  if (keywords.length === 0) return 0;
  const t = new Set(
    normalizeExpenseText(title)
      .split(' ')
      .filter((w) => w.length >= 2),
  );
  let hit = 0;
  for (const k of keywords) {
    const nk = normalizeExpenseText(k);
    if (nk.length < 2) continue;
    if (t.has(nk) || normalizeExpenseText(title).includes(nk)) hit += 1;
  }
  return hit;
}
