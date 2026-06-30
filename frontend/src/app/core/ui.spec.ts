import { highlightField } from './ui';

describe('highlightField', () => {
  let a: HTMLInputElement, b: HTMLInputElement;

  beforeEach(() => {
    a = document.createElement('input'); a.id = 'a';
    b = document.createElement('input'); b.id = 'b';
    document.body.append(a, b);
  });
  afterEach(() => { a.remove(); b.remove(); });

  it('adds the .input-err class and focuses the field', () => {
    highlightField(a);
    expect(a.classList.contains('input-err')).toBeTrue();
    expect(document.activeElement).toBe(a);
  });

  it('is a no-op for null (does not throw)', () => {
    expect(() => highlightField(null)).not.toThrow();
  });

  it('clears the highlight once the user types in the field', () => {
    highlightField(a);
    a.dispatchEvent(new Event('input'));
    expect(a.classList.contains('input-err')).toBeFalse();
  });

  it('moves the highlight to the most recently failed field', () => {
    highlightField(a);
    highlightField(b);
    expect(a.classList.contains('input-err')).toBeFalse();
    expect(b.classList.contains('input-err')).toBeTrue();
  });
});
