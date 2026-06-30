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
    addTxn = jasmine.createSpy('addTxn').and.resolveTo({ id: 'txn-1', billNo: '1234ABCDEF' } as Txn);
    const store = {
      rates: signal({ gold: 8530, silver: 98, updatedAt: null, updatedBy: null }),
      me: meSig,
      balanceOf: (_: string) => balance,
      genId: (p: string) => p + '-x',
      genBillNo: () => '1234ABCDEF',
      addTxn,
    };
    toast = jasmine.createSpyObj('ToastService', ['err', 'ok', 'show']);
    TestBed.configureTestingModule({
      imports: [NewTransactionComponent],
      providers: [
        { provide: StoreService, useValue: store },
        { provide: ToastService, useValue: toast },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ metal: 'gold' }) } } },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    cmp = TestBed.createComponent(NewTransactionComponent).componentInstance;
    cmp.ngOnInit(); // metal=gold, one item row pre-filled with rate 8530
  }

  function fillValid() {
    cmp.selectedIds = new Set(['PAN Card']);
    cmp.idNumbers = { 'PAN Card': 'ABCDE1234F' };
    cmp.name = 'PRIYANKA RAJ'; cmp.phone = '9665870336';
    cmp.addr1 = '2092 Sobha Daisy'; cmp.pin = '560103';
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

  it('onDigits filters phone/pin input', () => {
    cmp.onDigits('phone', '9a8b76543210999'); expect(cmp.phone).toBe('9876543210');
    cmp.onDigits('pin', 'ab560073xx'); expect(cmp.pin).toBe('560073');
  });

  it('blocks submit when no ID proof is selected', async () => {
    fillValid(); cmp.selectedIds = new Set();
    await cmp.submit();
    expect(toast.err).toHaveBeenCalledWith('Select at least one ID proof.');
    expect(addTxn).not.toHaveBeenCalled();
  });

  it('blocks submit on an invalid phone', async () => {
    fillValid(); cmp.phone = '123';
    await cmp.submit();
    expect(toast.err).toHaveBeenCalledWith('Enter a valid 10-digit seller phone.');
    expect(addTxn).not.toHaveBeenCalled();
  });

  it('blocks submit on an invalid PIN', async () => {
    fillValid(); cmp.pin = '12';
    await cmp.submit();
    expect(toast.err).toHaveBeenCalledWith('Enter a valid 6-digit PIN code.');
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

  it('blocks an employee with insufficient funds', async () => {
    meSig.set({ id: 'u-emp1', name: 'Counter Staff', role: 'employee', phone: '9999900002' });
    balance = 0;
    fillValid();
    await cmp.submit();
    expect(toast.err).toHaveBeenCalledWith(jasmine.stringMatching(/Insufficient funds/));
    expect(addTxn).not.toHaveBeenCalled();
  });

  it('valid admin submit saves the bill and routes to the invoice', async () => {
    fillValid();
    await cmp.submit();
    expect(addTxn).toHaveBeenCalled();
    const sent = addTxn.calls.mostRecent().args[0] as Txn;
    expect(sent.totals.amountPayable).toBe(422900);
    expect(sent.idProofs).toEqual([{ type: 'PAN Card', number: 'ABCDE1234F' }]);
    expect(sent.items[0].article).toBe('NECKLACE');
    expect(sent.article).toBe('NECKLACE');
    expect(router.navigate).toHaveBeenCalledWith(['/invoice', 'txn-1']);
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
