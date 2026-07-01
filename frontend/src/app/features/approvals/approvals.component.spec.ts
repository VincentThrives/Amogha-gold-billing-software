import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ApprovalsComponent } from './approvals.component';
import { StoreService } from '../../core/services/store.service';
import { Txn } from '../../core/models';

const TXN = {
  id: 'txn-1', billNo: '1234ABCDEF', date: '', metal: 'gold', employeeId: 'u-emp1', employeeName: 'Counter Staff',
  customer: { name: 'RAVI', phone: '9800000000', address1: '', pincode: '' },
  idProofs: [], reference: {}, selfie: null, clientOtpVerified: false, article: 'RING',
  items: [{ article: 'RING', gross: 10, stone: 0, other: 0, net: 10, purity: 91.6, rate: 600, amount: 6000 }],
  totals: { grossAmount: 6000, margin: 0, netAmount: 6000, billingCharges: 0, amountPayable: 6000, netWeight: 10 },
  status: 'pending',
} as unknown as Txn;

describe('ApprovalsComponent (list)', () => {
  it('lists pending bills with an Edit & Approve link to the editor', () => {
    const store = { pendingTxns: signal<Txn[]>([TXN]) };
    TestBed.configureTestingModule({
      imports: [ApprovalsComponent],
      providers: [{ provide: StoreService, useValue: store }, provideRouter([])],
    });
    const f = TestBed.createComponent(ApprovalsComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.textContent).toContain('RAVI');
    const link = el.querySelector('a[href="/approvals/txn-1"]') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Edit & Approve');
  });

  it('shows an empty state when nothing is pending', () => {
    const store = { pendingTxns: signal<Txn[]>([]) };
    TestBed.configureTestingModule({
      imports: [ApprovalsComponent],
      providers: [{ provide: StoreService, useValue: store }, provideRouter([])],
    });
    const f = TestBed.createComponent(ApprovalsComponent);
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('.empty')).toBeTruthy();
  });
});
