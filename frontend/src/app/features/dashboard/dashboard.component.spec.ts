import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { StoreService } from '../../core/services/store.service';
import { Txn } from '../../core/models';

function txn(over: Partial<Txn>): Txn {
  return {
    id: over.id || 'id', billNo: over.billNo || '0000000000', date: '2025-02-12T10:00:00',
    metal: 'gold', employeeId: '', employeeName: '',
    customer: { name: '', phone: '', address1: '', pincode: '', ...(over.customer || {}) } as any,
    idProofs: over.idProofs || [], reference: over.reference || {}, selfie: null,
    clientOtpVerified: false, article: '', items: [],
    totals: { grossAmount: 0, margin: 0, netAmount: 0, billingCharges: 0, amountPayable: 1000, netWeight: 0 },
    ...over,
  } as Txn;
}

const TXNS: Txn[] = [
  txn({ id: 't1', billNo: '1304FB98B3', customer: { name: 'PRIYANKA RAJ', phone: '9665870336', address1: '2092 SOBHA DAISY', pincode: '560103' } as any,
    idProofs: [{ type: 'Aadhaar Card', number: 'AAD-1' }], reference: { number: 'REF1' } }),
  txn({ id: 't2', billNo: '8005B7710E', customer: { name: 'RAMESH', phone: '9800000000', address1: 'MG ROAD', pincode: '560073' } as any,
    idProofs: [{ type: 'PAN Card', number: 'ABCDE1234F' }], reference: {} }),
];

describe('DashboardComponent search', () => {
  let cmp: DashboardComponent;

  beforeEach(() => {
    const stub = { transactions: signal(TXNS), rates: signal({ gold: 8530, silver: 98, updatedAt: null, updatedBy: null }) };
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [{ provide: StoreService, useValue: stub }, provideRouter([])],
    });
    cmp = TestBed.createComponent(DashboardComponent).componentInstance;
  });

  const ids = () => cmp.results().map(t => t.id);

  it('no term returns all transactions', () => {
    cmp.term.set('');
    expect(ids()).toEqual(['t1', 't2']);
  });
  it('all-fields search by name', () => {
    cmp.searchType.set('all'); cmp.term.set('priyanka');
    expect(ids()).toEqual(['t1']);
  });
  it('name search', () => {
    cmp.searchType.set('name'); cmp.term.set('ramesh');
    expect(ids()).toEqual(['t2']);
  });
  it('bill id search', () => {
    cmp.searchType.set('bill'); cmp.term.set('8005');
    expect(ids()).toEqual(['t2']);
  });
  it('phone search', () => {
    cmp.searchType.set('phone'); cmp.term.set('9665');
    expect(ids()).toEqual(['t1']);
  });
  it('other search matches address', () => {
    cmp.searchType.set('other'); cmp.term.set('mg road');
    expect(ids()).toEqual(['t2']);
  });
  it('other search matches an ID proof number', () => {
    cmp.searchType.set('other'); cmp.term.set('abcde1234f');
    expect(ids()).toEqual(['t2']);
  });
  it('clear() resets type and term', () => {
    cmp.searchType.set('phone'); cmp.term.set('9665');
    cmp.clear();
    expect(cmp.searchType()).toBe('all');
    expect(cmp.term()).toBe('');
    expect(ids()).toEqual(['t1', 't2']);
  });
});
