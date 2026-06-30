import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TransactionsComponent } from './transactions.component';
import { StoreService } from '../../core/services/store.service';
import { Txn } from '../../core/models';

function txn(id: string): Txn {
  return {
    id, billNo: 'B' + id, date: '', metal: 'gold', employeeId: '', employeeName: '',
    customer: { name: 'C' + id, phone: id, address1: '', pincode: '' } as any,
    idProofs: [], reference: {}, selfie: null, clientOtpVerified: false, article: '', items: [],
    totals: { grossAmount: 0, margin: 0, netAmount: 0, billingCharges: 0, amountPayable: 1000, netWeight: 0 },
  };
}

describe('TransactionsComponent', () => {
  it('renders the latest-per-customer list from the store', () => {
    const stub = { latestTxns: signal([txn('a'), txn('b')]) };
    TestBed.configureTestingModule({
      imports: [TransactionsComponent],
      providers: [{ provide: StoreService, useValue: stub }, provideRouter([])],
    });
    const f = TestBed.createComponent(TransactionsComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
    expect(el.textContent).toContain('2 customers');
  });
});
