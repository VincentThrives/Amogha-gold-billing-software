import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TransactionsComponent } from './transactions.component';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { Txn } from '../../core/models';

function txn(id: string, name: string, phone: string, billNo: string, employeeId: string): Txn {
  return {
    id, billNo, date: '', metal: 'gold', employeeId, employeeName: '',
    customer: { name, phone, address1: '', pincode: '' } as any,
    idProofs: [], reference: {}, selfie: null, clientOtpVerified: false, article: '', items: [],
    totals: { grossAmount: 0, margin: 0, netAmount: 0, billingCharges: 0, releaseAmount: 0, amountPayable: 1000, netWeight: 0 },
    status: 'approved',
  } as Txn;
}

const TXNS: Txn[] = [
  txn('t1', 'PRIYANKA RAJ', '9665870336', '1304FB98B3', 'u-emp1'),
  txn('t2', 'RAMESH', '9800000000', '8005B7710E', 'u-emp2'),
  txn('t3', 'PRIYANKA RAJ', '9665870336', '2211AABBCC', 'u-emp1'),  // same customer, 2nd bill
];

let deleteTxn: jasmine.Spy;
function make(isAdmin: boolean, meId: string) {
  deleteTxn = jasmine.createSpy('deleteTxn').and.resolveTo(undefined);
  const store = { transactions: signal(TXNS), isAdmin: () => isAdmin, me: () => ({ id: meId }), deleteTxn };
  TestBed.configureTestingModule({
    imports: [TransactionsComponent],
    providers: [
      { provide: StoreService, useValue: store },
      { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['show', 'err']) },
      provideRouter([]),
    ],
  });
  return TestBed.createComponent(TransactionsComponent).componentInstance;
}

describe('TransactionsComponent', () => {
  it('admin sees every bill (not just latest per customer)', () => {
    const cmp = make(true, 'u-admin');
    expect(cmp.all().length).toBe(3);
    expect(cmp.results().map(t => t.id).sort()).toEqual(['t1', 't2', 't3']);
  });

  it('an employee sees only their own bills', () => {
    const cmp = make(false, 'u-emp1');
    expect(cmp.results().map(t => t.id).sort()).toEqual(['t1', 't3']);
  });

  it('searches by phone number', () => {
    const cmp = make(true, 'u-admin');
    cmp.searchType.set('phone'); cmp.term.set('9800');
    expect(cmp.results().map(t => t.id)).toEqual(['t2']);
  });

  it('searches by bill id', () => {
    const cmp = make(true, 'u-admin');
    cmp.searchType.set('bill'); cmp.term.set('2211');
    expect(cmp.results().map(t => t.id)).toEqual(['t3']);
  });

  it('searches by name across all fields', () => {
    const cmp = make(true, 'u-admin');
    cmp.term.set('ramesh');
    expect(cmp.results().map(t => t.id)).toEqual(['t2']);
  });

  it('clear() resets the search', () => {
    const cmp = make(true, 'u-admin');
    cmp.searchType.set('phone'); cmp.term.set('9800');
    cmp.clear();
    expect(cmp.term()).toBe('');
    expect(cmp.searchType()).toBe('all');
    expect(cmp.results().length).toBe(3);
  });

  it('onDelete confirms then soft-deletes the bill', async () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const cmp = make(true, 'u-admin');
    await cmp.onDelete(cmp.results()[0]);
    expect(deleteTxn).toHaveBeenCalledWith('t1');
  });

  it('onDelete does nothing when cancelled', async () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const cmp = make(true, 'u-admin');
    await cmp.onDelete(cmp.results()[0]);
    expect(deleteTxn).not.toHaveBeenCalled();
  });
});
