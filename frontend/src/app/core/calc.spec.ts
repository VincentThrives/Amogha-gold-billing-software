import { inWords, netWeight, itemAmount, computeTotals, latestPerCustomer, digitsOnly, inr, billDate } from './calc';
import { Txn } from './models';

describe('calc.inWords', () => {
  it('zero', () => expect(inWords(0)).toBe('Zero Rupees Only'));
  it('matches the supplied sample bill (422900)', () =>
    expect(inWords(422900)).toBe('Four Lakh Twenty Two Thousand Nine Hundred Rupees Only'));
  it('rounds paise', () => expect(inWords(99.6)).toBe('One Hundred Rupees Only'));
  it('hundreds', () => expect(inWords(105)).toBe('One Hundred Five Rupees Only'));
  it('crore', () =>
    expect(inWords(12345678)).toBe('One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Rupees Only'));
});

describe('calc.netWeight', () => {
  it('subtracts stone + other', () => expect(netWeight(55.11, 0, 0)).toBe(55.11));
  it('deductions', () => expect(netWeight(20, 2, 1)).toBe(17));
  it('never negative', () => expect(netWeight(5, 10, 0)).toBe(0));
});

describe('calc.itemAmount', () => {
  it('matches sample (55.11 x 8530 x 90%)', () => expect(itemAmount(55.11, 8530, 90)).toBeCloseTo(423079.47, 2));
  it('zero rate → zero', () => expect(itemAmount(10, 0, 91.6)).toBe(0));
});

describe('calc.computeTotals', () => {
  it('reproduces the sample invoice numbers', () => {
    const t = computeTotals([{ net: 55.11, rate: 8530, purity: 90 }], 79, 100);
    expect(t.grossAmount).toBeCloseTo(423079.47, 2);
    expect(t.netAmount).toBeCloseTo(423000.47, 2);
    expect(t.amountPayableRounded).toBe(422900);
    expect(t.netWeight).toBeCloseTo(55.11, 3);
  });
  it('sums multiple items', () => {
    const t = computeTotals([{ amount: 1000, net: 5 }, { amount: 2000, net: 3 }], 0, 0);
    expect(t.grossAmount).toBe(3000);
    expect(t.amountPayable).toBe(3000);
    expect(t.netWeight).toBe(8);
  });
});

describe('calc.latestPerCustomer', () => {
  const mk = (id: string, phone?: string, name?: string) => ({ id, customer: { phone, name } } as unknown as Txn);
  it('keeps only the most recent per phone', () => {
    const out = latestPerCustomer([mk('c', '999', 'A'), mk('b', '999', 'A'), mk('a', '888', 'B')]);
    expect(out.map(t => t.id)).toEqual(['c', 'a']);
  });
  it('falls back to name when no phone', () => {
    const out = latestPerCustomer([mk('2', undefined, 'Ravi'), mk('1', undefined, 'Ravi')]);
    expect(out.length).toBe(1);
    expect(out[0].id).toBe('2');
  });
});

describe('calc.digitsOnly', () => {
  it('strips letters', () => expect(digitsOnly('re98dd76543210')).toBe('9876543210'));
  it('caps PIN to 6', () => expect(digitsOnly('ab5601x73zz', 6)).toBe('560173'));
  it('caps phone to 10', () => expect(digitsOnly('98765432109999', 10)).toBe('9876543210'));
  it('empty / null safe', () => { expect(digitsOnly('', 10)).toBe(''); expect(digitsOnly(null as any, 6)).toBe(''); });
});

describe('calc.inr', () => {
  it('2dp Indian format', () => expect(inr(423079.47, 2)).toBe('₹ 4,23,079.47'));
  it('0dp rounds', () => expect(inr(422900, 0)).toBe('₹4,22,900'));
});

describe('calc.billDate', () => {
  it('formats dd-mm-yyyy hh:mm:ss AM/PM', () =>
    expect(billDate('2025-02-12T15:37:19')).toMatch(/^12-02-2025 \d{2}:\d{2}:\d{2} (AM|PM)$/));
});
