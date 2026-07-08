import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { NewTransactionComponent } from './new-transaction.component';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { Txn, User } from '../../core/models';

describe('NewTransactionComponent', () => {
  let cmp: NewTransactionComponent;
  let toast: jasmine.SpyObj<ToastService>;
  let router: Router;
  let addTxn: jasmine.Spy;
  let meSig: ReturnType<typeof signal<User | null>>;
  let balance = 0;

  function build() {
    meSig = signal<User | null>({ id: 'u-admin', name: 'Amogha Admin', role: 'admin', phone: '9999900001' });
    addTxn = jasmine.createSpy('addTxn').and.resolveTo({ id: 'txn-1', billNo: '1234ABCDEF', status: 'approved' } as Txn);
    const store = {
      rates: signal({ gold: 8530, silver: 98, updatedAt: null, updatedBy: null }),
      me: meSig,
      isAdmin: () => meSig()?.role === 'admin',
      billingConfig: () => ({ defaultMargin: 0, defaultBillingCharges: 100 }),
      balanceOf: (_: string) => balance,
      transactions: signal<Txn[]>([]),
      genId: (p: string) => p + '-x',
      genBillNo: () => '1234ABCDEF',
      addTxn,
      searchCustomers: (_: string) => [],
      customerById: (_: string) => undefined,
    };
    toast = jasmine.createSpyObj('ToastService', ['err', 'ok', 'show']);
    TestBed.configureTestingModule({
      imports: [NewTransactionComponent],
      providers: [
        { provide: StoreService, useValue: store },
        { provide: ToastService, useValue: toast },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ metal: 'gold' }), queryParamMap: convertToParamMap({}) } } },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    cmp = TestBed.createComponent(NewTransactionComponent).componentInstance;
    cmp.ngOnInit(); // metal=gold, one item row pre-filled with rate 8530
  }

  const CUST = {
    id: 'c1', name: 'PRIYANKA RAJ', phone: '9665870336', address1: '2092 Sobha Daisy', pincode: '560103',
    idProofs: [{ type: 'PAN Card', number: 'ABCDE1234F' }], reference: {}, selfie: null, createdAt: '',
  };

  function fillValid() {
    cmp.selectedCustomer.set(CUST as any);
    const row = cmp.items()[0];
    row.article = 'NECKLACE'; row.gross = 55.11; row.purity = 90; row.rate = 8530;
    cmp.margin = 79; cmp.charges = 100;
  }

  beforeEach(() => { balance = 0; build(); });

  it('starts on gold with one item row pre-filled from the admin rate', () => {
    expect(cmp.metal).toBe('gold');
    expect(cmp.items().length).toBe(1);
    expect(cmp.items()[0].rate).toBe(8530);
  });

  it('totals() reactively reproduces the sample bill', () => {
    fillValid();
    const t = cmp.totals();
    expect(t.grossAmount).toBeCloseTo(423079.47, 2);
    expect(t.amountPayableRounded).toBe(422900);
  });

  it('blocks submit until a registered customer is selected', async () => {
    const row = cmp.items()[0]; row.article = 'RING'; row.gross = 10; row.rate = 8530;
    await cmp.submit();
    expect(toast.err).toHaveBeenCalledWith('Search and select a registered customer first.');
    expect(addTxn).not.toHaveBeenCalled();
  });

  it('blocks submit when a row article name is missing', async () => {
    fillValid(); cmp.items()[0].article = '';
    await cmp.submit();
    expect(toast.err).toHaveBeenCalledWith('Enter the article name for item 1.');
    expect(addTxn).not.toHaveBeenCalled();
  });

  it('blocks submit when no row has a gross weight', async () => {
    fillValid(); cmp.items()[0].gross = null;
    await cmp.submit();
    expect(toast.err).toHaveBeenCalledWith('Add at least one item with its gross weight.');
    expect(addTxn).not.toHaveBeenCalled();
  });

  it('admin new bill defaults billing charges to the configured ₹100', () => {
    expect(cmp.charges).toBe(100);
    expect(cmp.margin).toBe(0);
  });

  it('valid admin submit generates the bill and routes to the invoice', async () => {
    fillValid();
    await cmp.submit();
    expect(addTxn).toHaveBeenCalled();
    const sent = addTxn.calls.mostRecent().args[0] as Txn;
    expect(sent.totals.amountPayable).toBe(422900);
    expect(sent.customer.name).toBe('PRIYANKA RAJ');
    expect(sent.idProofs).toEqual([{ type: 'PAN Card', number: 'ABCDE1234F' }]);
    expect(sent.items[0].article).toBe('NECKLACE');
    expect(router.navigate).toHaveBeenCalledWith(['/invoice', 'txn-1']);
  });

  it('staff submit sends for approval and routes to the list (not the invoice)', async () => {
    meSig.set({ id: 'u-emp1', name: 'Counter Staff', role: 'employee', phone: '9999900002' });
    balance = 600000;  // enough funds to cover the ~₹4.23L bill
    addTxn.and.resolveTo({ id: 'txn-2', billNo: '5678ABCDEF', status: 'pending' } as Txn);
    fillValid();
    await cmp.submit();
    expect(addTxn).toHaveBeenCalled();
    expect(toast.ok).toHaveBeenCalledWith('Sent to admin for approval.');
    expect(router.navigate).toHaveBeenCalledWith(['/transactions']);
    expect(router.navigate).not.toHaveBeenCalledWith(['/invoice', 'txn-2']);
  });

  it('blocks a staff submit when their available funds cannot cover the bill', async () => {
    meSig.set({ id: 'u-emp1', name: 'Counter Staff', role: 'employee', phone: '9999900002' });
    balance = 200000;  // bill is ~₹4.23L → insufficient
    fillValid();
    await cmp.submit();
    expect(addTxn).not.toHaveBeenCalled();
    expect(toast.err).toHaveBeenCalledWith(jasmine.stringMatching(/Insufficient funds/));
  });

  it('lets an admin bill without any funds (no fund check for admins)', async () => {
    balance = 0;  // admin has no wallet; should still generate the bill
    fillValid();
    await cmp.submit();
    expect(addTxn).toHaveBeenCalled();
  });

  it('release amount is deducted from the payable and sent with the bill', async () => {
    fillValid();
    cmp.release = 300000; cmp.releaseMethod = 'RTGS'; cmp.releaseBank = 'HDFC Bank';
    await cmp.submit();
    expect(addTxn).toHaveBeenCalled();
    const sent = addTxn.calls.mostRecent().args[0] as Txn;
    expect(sent.totals.releaseAmount).toBe(300000);
    expect(sent.totals.amountPayable).toBe(122900); // 423079.47 − 79 − 100 − 300000
    expect(sent.releaseMethod).toBe('RTGS');
    expect(sent.releaseBank).toBe('HDFC Bank');
  });

  it('blocks submit when a release amount has no payment method', async () => {
    fillValid();
    cmp.release = 100000; cmp.releaseMethod = ''; cmp.releaseBank = 'HDFC Bank';
    await cmp.submit();
    expect(toast.err).toHaveBeenCalledWith('Select how the release amount was paid (Cash / RTGS / NEFT…).');
    expect(addTxn).not.toHaveBeenCalled();
  });

  it('blocks submit when the release amount has no bank', async () => {
    fillValid();
    cmp.release = 100000; cmp.releaseMethod = 'Cash'; cmp.releaseBank = '';
    await cmp.submit();
    expect(toast.err).toHaveBeenCalledWith('Enter the bank the release amount was paid to.');
    expect(addTxn).not.toHaveBeenCalled();
  });

  it('pickCustomer selects the registered customer and clears the search', () => {
    cmp.custSearch.set('rav');
    cmp.pickCustomer({
      id: 'c1', name: 'RAVI', phone: '9800000000', address1: 'MG Rd', pincode: '560073',
      idProofs: [{ type: 'PAN Card', number: 'ABCDE1234F' }], reference: {}, selfie: null, createdAt: '',
    } as any);
    expect(cmp.selectedCustomer()?.name).toBe('RAVI');
    expect(cmp.custSearch()).toBe('');
    cmp.clearCustomer();
    expect(cmp.selectedCustomer()).toBeNull();
  });

  it('addItem / removeItem manage rows (min one, no error at one row)', () => {
    cmp.addItem();
    expect(cmp.items().length).toBe(2);
    cmp.removeItem(0);
    expect(cmp.items().length).toBe(1);
    cmp.removeItem(0); // guarded — cannot remove the last, and does not error
    expect(cmp.items().length).toBe(1);
    expect(toast.err).not.toHaveBeenCalled();
  });

  it('highlights the offending row cell in the rendered form (article)', async () => {
    const f = TestBed.createComponent(NewTransactionComponent);
    cmp = f.componentInstance;
    document.body.appendChild(f.nativeElement);
    f.detectChanges();                    // render the real template (row ids present)
    fillValid(); cmp.items()[0].article = ''; // everything valid except the row's article
    await cmp.submit();
    expect(document.getElementById('i_article_0')!.classList.contains('input-err')).toBeTrue();
    f.nativeElement.remove();
  });
});
