import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ReportsComponent } from './reports.component';
import { StoreService } from '../../core/services/store.service';
import { Txn } from '../../core/models';

function txn(over: Partial<Txn> & { metal: 'gold' | 'silver'; date: string; status: string; net: number; payable: number; employeeId?: string }): Txn {
  return {
    id: over.id || Math.random().toString(36), billNo: over.billNo || '0000000000', date: over.date,
    metal: over.metal, employeeId: over.employeeId || 'u-admin', employeeName: '',
    customer: { name: 'Cust', phone: '9000000000', address1: '', pincode: '' } as any,
    idProofs: [], reference: {}, selfie: null, clientOtpVerified: false, article: 'RING',
    items: [{ article: 'RING', gross: over.net, stone: 0, other: 0, net: over.net, purity: 91.6, rate: 8000, amount: over.payable }],
    totals: { grossAmount: over.payable, margin: 0, netAmount: over.payable, billingCharges: 0, amountPayable: over.payable, netWeight: over.net },
    status: over.status as any,
  } as Txn;
}

const TXNS: Txn[] = [
  txn({ id: 'g1', metal: 'gold', date: '2025-02-10T10:00:00', status: 'approved', net: 55.11, payable: 100000 }),
  txn({ id: 's1', metal: 'silver', date: '2025-02-15T10:00:00', status: 'approved', net: 50, payable: 5000 }),
  txn({ id: 'g0', metal: 'gold', date: '2025-01-10T10:00:00', status: 'approved', net: 20, payable: 40000 }),   // out of range
  txn({ id: 'p1', metal: 'gold', date: '2025-02-20T10:00:00', status: 'pending', net: 10, payable: 20000 }),    // not approved
];

function makeComponent(isAdmin: boolean, meId: string, txns: Txn[]) {
  const store = { transactions: signal(txns), isAdmin: () => isAdmin, me: () => ({ id: meId }) };
  TestBed.configureTestingModule({
    imports: [ReportsComponent],
    providers: [{ provide: StoreService, useValue: store }, provideRouter([])],
  });
  const cmp = TestBed.createComponent(ReportsComponent).componentInstance;
  cmp.from.set('2025-02-01');
  cmp.to.set('2025-02-28');
  return cmp;
}

describe('ReportsComponent (admin)', () => {
  let cmp: ReportsComponent;
  beforeEach(() => { cmp = makeComponent(true, 'u-admin', TXNS); });

  it('lists only approved bills within the date range', () => {
    expect(cmp.rows().map(t => t.id).sort()).toEqual(['g1', 's1']);
  });

  it('summarises gold grams/amount, silver grams/amount and total', () => {
    const s = cmp.summary();
    expect(s.goldG).toBeCloseTo(55.11, 2);
    expect(s.goldAmt).toBe(100000);
    expect(s.silverG).toBe(50);
    expect(s.silverAmt).toBe(5000);
    expect(s.total).toBe(105000);
    expect(s.count).toBe(2);
  });

  it('narrowing the range to a single day filters accordingly', () => {
    cmp.from.set('2025-02-15'); cmp.to.set('2025-02-15');
    expect(cmp.rows().map(t => t.id)).toEqual(['s1']);
    expect(cmp.summary().total).toBe(5000);
  });

  it('setToday sets from and to to the same day', () => {
    cmp.setToday();
    expect(cmp.from()).toBe(cmp.to());
  });
});

describe('ReportsComponent (employee scoping)', () => {
  const MIXED: Txn[] = [
    txn({ id: 'mine', metal: 'gold', date: '2025-02-10T10:00:00', status: 'approved', net: 20, payable: 60000, employeeId: 'u-emp1' }),
    txn({ id: 'other', metal: 'gold', date: '2025-02-11T10:00:00', status: 'approved', net: 30, payable: 90000, employeeId: 'u-emp2' }),
    txn({ id: 'admin', metal: 'silver', date: '2025-02-12T10:00:00', status: 'approved', net: 10, payable: 1000, employeeId: 'u-admin' }),
  ];

  it('an employee sees only their own sales', () => {
    const cmp = makeComponent(false, 'u-emp1', MIXED);
    cmp.from.set('2025-02-01'); cmp.to.set('2025-02-28');
    expect(cmp.rows().map(t => t.id)).toEqual(['mine']);
    expect(cmp.summary().total).toBe(60000);
    expect(cmp.mineOnly()).toBeTrue();
  });

  it('the admin sees everyone\'s sales', () => {
    const cmp = makeComponent(true, 'u-admin', MIXED);
    cmp.from.set('2025-02-01'); cmp.to.set('2025-02-28');
    expect(cmp.rows().map(t => t.id).sort()).toEqual(['admin', 'mine', 'other']);
    expect(cmp.summary().total).toBe(151000);
    expect(cmp.mineOnly()).toBeFalse();
  });
});
