/** Suggested gold/silver article names — shown as a searchable dropdown on the
 *  item rows. Users can also type a custom value. Kept sorted A→Z. */
export const ARTICLE_OPTIONS: string[] = [
  'Bangle',
  'Kada',
  'Bracelet',
  'Rings',
  'Stud Earrings',
  'Necklace',
  'Necklace with stones',
  'Gold Biscuit',
  'Gold Bar',
  'Chain',
  'Chain with dollar',
  'Mixed ornaments',
  'Mixed ornaments with stones',
  'coin 91.6',
  'coin 995',
  'coin 999',
  'biscuit 995',
  'biscuit 999',
].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
