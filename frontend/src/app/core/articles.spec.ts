import { ARTICLE_OPTIONS } from './articles';

describe('ARTICLE_OPTIONS', () => {
  it('is sorted alphabetically (case-insensitive)', () => {
    const sorted = [...ARTICLE_OPTIONS].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    expect(ARTICLE_OPTIONS).toEqual(sorted);
  });

  it('contains the expected article types', () => {
    for (const a of ['Bangle', 'Kada', 'Necklace', 'Necklace with stones', 'Gold Bar', 'coin 91.6', 'biscuit 999', 'Chain with dollar']) {
      expect(ARTICLE_OPTIONS).toContain(a);
    }
  });

  it('has no duplicates', () => {
    const lower = ARTICLE_OPTIONS.map(a => a.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });
});
