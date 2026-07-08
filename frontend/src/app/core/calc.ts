/* Pure billing/format helpers (typed port of the original calc.js).
   Mirrors amogha-billing/js/calc.js, which is unit-tested in server/test/calc.test.js. */
import { TxnItem, Txn } from './models';

export function inWords(value: number): string {
  let num = Math.round(Number(value) || 0);
  if (num === 0) return 'Zero Rupees Only';
  const neg = num < 0;
  if (neg) num = -num;
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (n: number): string => n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
  const three = (n: number): string => {
    const h = Math.floor(n / 100), r = n % 100;
    return (h ? a[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? two(r) : '');
  };
  const out: string[] = [];
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thou = Math.floor(num / 1000); num %= 1000;
  if (crore) out.push(three(crore) + ' Crore');
  if (lakh) out.push(two(lakh) + ' Lakh');
  if (thou) out.push(two(thou) + ' Thousand');
  if (num) out.push(three(num));
  return (neg ? 'Minus ' : '') + out.join(' ') + ' Rupees Only';
}

export function netWeight(gross: number, stone: number, other: number): number {
  return Math.max(0, (Number(gross) || 0) - (Number(stone) || 0) - (Number(other) || 0));
}

export function itemAmount(net: number, rate: number, purity: number): number {
  return (Number(net) || 0) * (Number(rate) || 0) * ((Number(purity) || 0) / 100);
}

export interface TotalsResult {
  grossAmount: number; margin: number; netAmount: number;
  billingCharges: number; releaseAmount: number;
  amountPayable: number; amountPayableRounded: number; netWeight: number;
}

/** Amount Payable (net to customer) = gross − margin − billing charges − release amount (paid to the bank). */
export function computeTotals(items: Array<Partial<TxnItem>>, margin: number, charges: number, release = 0): TotalsResult {
  margin = Number(margin) || 0; charges = Number(charges) || 0; release = Math.max(0, Number(release) || 0);
  let gross = 0, netW = 0;
  (items || []).forEach((it) => {
    const amt = it.amount != null ? Number(it.amount) : itemAmount(it.net || 0, it.rate || 0, it.purity || 0);
    gross += amt;
    netW += it.net != null ? Number(it.net) : netWeight(it.gross || 0, it.stone || 0, it.other || 0);
  });
  const netAmount = gross - margin;
  const payable = netAmount - charges - release;
  return {
    grossAmount: gross, margin, netAmount,
    billingCharges: charges, releaseAmount: release, amountPayable: payable,
    amountPayableRounded: Math.round(payable), netWeight: netW
  };
}

/** Keep only the most recent transaction per customer (txns must be newest-first). */
export function latestPerCustomer(txns: Txn[]): Txn[] {
  const seen: Record<string, boolean> = {};
  const out: Txn[] = [];
  (txns || []).forEach((t) => {
    const c = t.customer || ({} as any);
    const key = String(c.phone || c.name || '').toLowerCase();
    if (!seen[key]) { seen[key] = true; out.push(t); }
  });
  return out;
}

export function digitsOnly(str: string, max?: number): string {
  const clean = String(str == null ? '' : str).replace(/\D/g, '');
  return max && max > 0 ? clean.slice(0, max) : clean;
}

/** Indian-format currency. dp=0 → ₹1,23,456 ; dp=2 → ₹ 1,23,456.00 */
export function inr(n: number, dp: 0 | 2 = 2): string {
  n = Number(n) || 0;
  if (dp === 0) return '₹' + Math.round(n).toLocaleString('en-IN');
  return '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function billDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const p = (x: number) => ('0' + x).slice(-2);
  const hr = d.getHours(), ampm = hr >= 12 ? 'PM' : 'AM', h12 = ((hr + 11) % 12) + 1;
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(h12)}:${p(d.getMinutes())}:${p(d.getSeconds())} ${ampm}`;
}
