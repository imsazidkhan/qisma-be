import { normalizeExpenseText } from './normalization.util';

/**
 * Token overlap between **title** and taxonomy **keywords**.
 *
 * Avoids **`title.includes(keyword)`** — that matched arbitrary **substrings**
 * (e.g. **chai** matched **`hi`**, **`ha`**, **`ai`**, or fragments of longer tokens),
 * which produced wrong categories for short titles.
 */
export function scoreKeywordOverlap(title: string, keywords: readonly string[]): number {
  if (keywords.length === 0) return 0;
  const normalizedTitle = normalizeExpenseText(title);
  const titleTokens = new Set(
    normalizedTitle
      .split(' ')
      .filter((w) => w.length >= 2),
  );
  if (titleTokens.size === 0) return 0;

  let hit = 0;
  for (const k of keywords) {
    const nk = normalizeExpenseText(k);
    if (nk.length < 2) continue;

    const keywordTokens = nk.split(' ').filter((w) => w.length >= 2);
    const tokensToCheck = keywordTokens.length > 0 ? keywordTokens : [nk];

    let matchedThisKeyword = false;
    for (const kwTok of tokensToCheck) {
      if (titleTokens.has(kwTok)) {
        matchedThisKeyword = true;
        break;
      }
    }
    if (matchedThisKeyword) hit += 1;
  }
  return hit;
}
