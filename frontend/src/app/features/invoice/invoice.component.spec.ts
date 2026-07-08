import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { InvoiceComponent } from './invoice.component';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { Txn } from '../../core/models';

const TXN = {
  id: 'txn-1', billNo: '1304FB98B3', date: '2025-02-12T15:37:19', metal: 'gold', employeeId: 'u-emp1', employeeName: 'Staff',
  customer: { name: 'PRIYANKA RAJ', phone: '9665870336', address1: '2092 Sobha Daisy', address2: 'Green Glen', pincode: '560103', landmark: 'Park' },
  idProofs: [{ type: 'PAN Card', number: 'ABCDE1234F' }], reference: {}, selfie: null, clientOtpVerified: false, article: 'NECKLACE',
  items: [{ article: 'NECKLACE', gross: 55.11, stone: 0, other: 0, net: 55.11, purity: 90, rate: 8530, amount: 423079.47 }],
  totals: { grossAmount: 423079.47, margin: 79, netAmount: 423000.47, billingCharges: 100, amountPayable: 422900, netWeight: 55.11 },
  status: 'approved',
} as unknown as Txn;

describe('InvoiceComponent', () => {
  let deleteTxn: jasmine.Spy;
  let toast: jasmine.SpyObj<ToastService>;
  let router: Router;

  function build(txn: Txn | undefined = TXN) {
    deleteTxn = jasmine.createSpy('deleteTxn').and.resolveTo(undefined);
    const store = {
      txnById: (_: string) => txn,
      deletedTransactions: signal<Txn[]>([]),
      company: () => ({ name: 'Amogha Gold Company', addressLines: [], gstn: '29ABFCA1286P1Z2', phone: '', legalName: '', terms: [] }),
      isAdmin: () => true,
      deleteTxn,
    };
    toast = jasmine.createSpyObj('ToastService', ['show', 'err']);
    TestBed.configureTestingModule({
      imports: [InvoiceComponent],
      providers: [
        { provide: StoreService, useValue: store },
        { provide: ToastService, useValue: toast },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'txn-1' }) } } },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    const cmp = TestBed.createComponent(InvoiceComponent).componentInstance;
    cmp.ngOnInit();
    return cmp;
  }

  it('loads the transaction and builds the address + totals', () => {
    const cmp = build();
    expect(cmp.txn?.billNo).toBe('1304FB98B3');
    expect(cmp.address).toContain('2092 Sobha Daisy');
    expect(cmp.address).toContain('PIN 560103');
    expect(cmp.totalWeights.n).toBeCloseTo(55.11, 2);
    expect(cmp.rateLabel).toBe('24crt');
    expect(cmp.words(422900)).toBe('Four Lakh Twenty Two Thousand Nine Hundred Rupees Only');
  });

  it('pads the item table up to 6 rows', () => {
    const cmp = build();
    expect(cmp.pad.length).toBe(5); // 1 item + 5 pad = 6
  });

  it('defaults to invoice mode and can switch to estimation', () => {
    const cmp = build();
    expect(cmp.mode()).toBe('invoice');
    cmp.mode.set('estimation');
    expect(cmp.mode()).toBe('estimation');
  });

  it('deleteBill (confirmed) soft-deletes and returns to the list', async () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const cmp = build();
    await cmp.deleteBill();
    expect(deleteTxn).toHaveBeenCalledWith('txn-1');
    expect(router.navigate).toHaveBeenCalledWith(['/transactions']);
  });

  it('deleteBill (cancelled) does nothing', async () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const cmp = build();
    await cmp.deleteBill();
    expect(deleteTxn).not.toHaveBeenCalled();
  });

  it('renders a Release Amount line with the bank and method when release > 0', () => {
    const relTxn = {
      ...TXN,
      totals: { ...(TXN as any).totals, releaseAmount: 300000, amountPayable: 122900 },
      releaseMethod: 'RTGS', releaseBank: 'HDFC Bank',
    } as unknown as Txn;
    const store = {
      txnById: (_: string) => relTxn,
      deletedTransactions: signal<Txn[]>([]),
      company: () => ({ name: 'Amogha Gold Company', addressLines: [], gstn: '', phone: '', legalName: '', terms: [] }),
      isAdmin: () => true,
      deleteTxn: jasmine.createSpy('deleteTxn'),
    };
    TestBed.configureTestingModule({
      imports: [InvoiceComponent],
      providers: [
        { provide: StoreService, useValue: store },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['show', 'err']) },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'txn-1' }) } } },
      ],
    });
    const f = TestBed.createComponent(InvoiceComponent);
    f.detectChanges();
    const text = (f.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Release Amount');
    expect(text).toContain('HDFC Bank');
    expect(text).toContain('RTGS');
  });
});
