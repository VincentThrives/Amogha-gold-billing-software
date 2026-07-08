import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { ApprovalEditComponent } from './approval-edit.component';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { Txn } from '../../core/models';

const TXN = {
  id: 'txn-1', billNo: '1234ABCDEF', date: '', metal: 'gold', employeeId: 'u-emp1', employeeName: 'Counter Staff',
  customer: { name: 'RAVI', phone: '9800000000', address1: 'MG Rd', pincode: '560073' },
  idProofs: [], reference: {}, selfie: null, clientOtpVerified: false, article: 'RING',
  items: [{ article: 'RING', gross: 10, stone: 0, other: 0, net: 10, purity: 100, rate: 600, amount: 6000 }],
  totals: { grossAmount: 6000, margin: 0, netAmount: 6000, billingCharges: 0, amountPayable: 6000, netWeight: 10 },
  status: 'pending',
} as unknown as Txn;

describe('ApprovalEditComponent', () => {
  let cmp: ApprovalEditComponent;
  let approveTxn: jasmine.Spy;
  let rejectTxn: jasmine.Spy;
  let toast: jasmine.SpyObj<ToastService>;
  let router: Router;

  function build(txn: Txn | undefined = TXN) {
    approveTxn = jasmine.createSpy('approveTxn').and.resolveTo(undefined);
    rejectTxn = jasmine.createSpy('rejectTxn').and.resolveTo(undefined);
    const store = {
      txnById: (_: string) => txn,
      billingConfig: () => ({ defaultMargin: 0, defaultBillingCharges: 100 }),
      approveTxn, rejectTxn,
    };
    toast = jasmine.createSpyObj('ToastService', ['ok', 'err', 'show']);
    TestBed.configureTestingModule({
      imports: [ApprovalEditComponent],
      providers: [
        { provide: StoreService, useValue: store },
        { provide: ToastService, useValue: toast },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'txn-1' }) } } },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    cmp = TestBed.createComponent(ApprovalEditComponent).componentInstance;
    cmp.ngOnInit();
  }

  it('loads the pending txn items and seeds charges to ₹100', () => {
    build();
    expect(cmp.items().length).toBe(1);
    expect(cmp.items()[0].rate).toBe(600);
    expect(cmp.charges).toBe(100);
  });

  it('recomputes totals when the admin edits the rate', () => {
    build();
    cmp.items()[0].rate = 1200;      // admin edits the 24crt rate
    const t = cmp.totals();
    expect(t.grossAmount).toBe(12000);          // 10 x 1200 x 100%
    expect(t.amountPayableRounded).toBe(11900); // 12000 - 100
  });

  it('approve sends edited items + margin/charges and routes to the invoice', async () => {
    build();
    cmp.items()[0].rate = 1200; cmp.charges = 100;
    await cmp.approve();
    expect(approveTxn).toHaveBeenCalled();
    const [id, items, margin, charges] = approveTxn.calls.mostRecent().args;
    expect(id).toBe('txn-1');
    expect(items[0].rate).toBe(1200);
    expect(items[0].amount).toBe(12000);
    expect(charges).toBe(100);
    expect(router.navigate).toHaveBeenCalledWith(['/invoice', 'txn-1']);
  });

  it('seeds the release fields from the pending txn', () => {
    build({ ...TXN, totals: { ...TXN.totals, releaseAmount: 3000 }, releaseMethod: 'RTGS', releaseBank: 'HDFC Bank' } as Txn);
    expect(cmp.release).toBe(3000);
    expect(cmp.releaseMethod).toBe('RTGS');
    expect(cmp.releaseBank).toBe('HDFC Bank');
  });

  it('approve sends the release amount, method and bank; payable reflects the deduction', async () => {
    build();
    cmp.items()[0].rate = 1200;              // gross 12000
    cmp.release = 5000; cmp.releaseMethod = 'RTGS'; cmp.releaseBank = 'HDFC Bank';
    await cmp.approve();
    expect(approveTxn).toHaveBeenCalled();
    const [, , , , release, method, bank] = approveTxn.calls.mostRecent().args;
    expect(release).toBe(5000);
    expect(method).toBe('RTGS');
    expect(bank).toBe('HDFC Bank');
    expect(cmp.totals().amountPayableRounded).toBe(6900); // 12000 − 100 − 5000
  });

  it('blocks approve when the release amount has no method', async () => {
    build();
    cmp.items()[0].rate = 1200;
    cmp.release = 5000; cmp.releaseMethod = ''; cmp.releaseBank = 'HDFC Bank';
    await cmp.approve();
    expect(toast.err).toHaveBeenCalledWith('Select how the release amount was paid (Cash / RTGS / NEFT…).');
    expect(approveTxn).not.toHaveBeenCalled();
  });

  it('blocks approve when an item has no rate', async () => {
    build();
    cmp.items()[0].rate = 0;
    await cmp.approve();
    expect(toast.err).toHaveBeenCalledWith('Item 1 needs a rate.');
    expect(approveTxn).not.toHaveBeenCalled();
  });

  it('reject calls the store and returns to the list', async () => {
    build();
    await cmp.reject();
    expect(rejectTxn).toHaveBeenCalledWith('txn-1');
    expect(router.navigate).toHaveBeenCalledWith(['/approvals']);
  });

  it('redirects to /approvals if the txn is not pending', () => {
    build({ ...TXN, status: 'approved' } as Txn);
    expect(router.navigate).toHaveBeenCalledWith(['/approvals']);
  });
});
