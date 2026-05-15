import { scoreKeywordOverlap } from './keyword-matcher';

describe('scoreKeywordOverlap', () => {
  it('matches whole title token to keyword token (chai → chai)', () => {
    expect(scoreKeywordOverlap('Chai', ['chai', 'shop'])).toBeGreaterThanOrEqual(1);
  });

  it('does not match substring of title (chai vs adobe — no shared tokens)', () => {
    expect(scoreKeywordOverlap('chai', ['adobe'])).toBe(0);
  });

  it('does not match title substring against misleading short fragments', () => {
    // Previously `chai`.includes('ai') falsely counted hits.
    expect(scoreKeywordOverlap('chai', ['ai'])).toBe(0);
    expect(scoreKeywordOverlap('chai', ['hi'])).toBe(0);
    expect(scoreKeywordOverlap('chai', ['ha'])).toBe(0);
  });

  it('matches multi-word title when any keyword token appears', () => {
    const score = scoreKeywordOverlap('masala chai cup', ['chai', 'tea']);
    expect(score).toBeGreaterThanOrEqual(1);
  });
});
