import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { DeletedInvoicesComponent } from './deleted-invoices.component';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { Txn } from '../../core/models';

const DEL = {
  id: 'txn-1', billNo: '1234ABCDEF', metal: 'gold', date: '', employeeId: '', employeeName: '',
  customer: { name: 'RAVI', phone: '9800000000', address1: '', pincode: '' },
  idProofs: [], reference: {}, selfie: null, clientOtpVerified: false, article: 'RING', items: [],
  totals: { grossAmount: 0, margin: 0, netAmount: 0, billingCharges: 0, releaseAmount: 0, amountPayable: 6000, netWeight: 10 },
  status: 'approved', deleted: true, deletedAt: '2025-02-10T10:00:00',
} as unknown as Txn;

describe('DeletedInvoicesComponent', () => {
  let cmp: DeletedInvoicesComponent;
  let restoreTxn: jasmine.Spy;
  let purgeTxn: jasmine.Spy;
  let toast: jasmine.SpyObj<ToastService>;
  let dlgConfirm = true;

  beforeEach(() => {
    dlgConfirm = true;
    restoreTxn = jasmine.createSpy('restoreTxn').and.resolveTo(undefined);
    purgeTxn = jasmine.createSpy('purgeTxn').and.resolveTo(undefined);
    const store = { deletedTransactions: signal<Txn[]>([DEL]), restoreTxn, purgeTxn };
    toast = jasmine.createSpyObj('ToastService', ['ok', 'err', 'show']);
    const dlg = { confirm: () => Promise.resolve(dlgConfirm), prompt: () => Promise.resolve(null) };
    TestBed.configureTestingModule({
      imports: [DeletedInvoicesComponent],
      providers: [{ provide: StoreService, useValue: store }, { provide: ToastService, useValue: toast }, { provide: DialogService, useValue: dlg }, provideRouter([])],
    });
    cmp = TestBed.createComponent(DeletedInvoicesComponent).componentInstance;
  });

  it('restore calls the store', async () => {
    await cmp.restore(DEL);
    expect(restoreTxn).toHaveBeenCalledWith('txn-1');
    expect(toast.ok).toHaveBeenCalled();
  });

  it('delete-forever asks to confirm and purges when confirmed', async () => {
    dlgConfirm = true;
    await cmp.purge(DEL);
    expect(purgeTxn).toHaveBeenCalledWith('txn-1');
  });

  it('delete-forever does nothing when cancelled', async () => {
    dlgConfirm = false;
    await cmp.purge(DEL);
    expect(purgeTxn).not.toHaveBeenCalled();
  });
});
