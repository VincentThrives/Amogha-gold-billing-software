import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TxnTableComponent } from './txn-table.component';
import { StoreService } from '../../core/services/store.service';
import { Txn } from '../../core/models';

let adminFlag = true;
const storeStub = { isAdmin: () => adminFlag };

function txn(id: string, name: string): Txn {
  return {
    id, billNo: 'B' + id, date: '2025-02-12T10:00:00', metal: 'gold', employeeId: '', employeeName: '',
    customer: { name, phone: '9000000000', address1: '', pincode: '' } as any,
    idProofs: [], reference: {}, selfie: null, clientOtpVerified: false, article: '', items: [],
    totals: { grossAmount: 0, margin: 0, netAmount: 0, billingCharges: 0, releaseAmount: 0, amountPayable: 1000, netWeight: 12.5 },
    status: 'approved',
  };
}

describe('TxnTableComponent', () => {
  beforeEach(() => { adminFlag = true; });

  function render(rows: Txn[]) {
    TestBed.configureTestingModule({ imports: [TxnTableComponent], providers: [{ provide: StoreService, useValue: storeStub }, provideRouter([])] });
    const f = TestBed.createComponent(TxnTableComponent);
    f.componentInstance.rows = rows;
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  }

  it('renders a row per transaction', () => {
    const el = render([txn('1', 'A'), txn('2', 'B')]);
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
    expect(el.textContent).toContain('A');
  });

  it('shows an empty state when there are no rows', () => {
    const el = render([]);
    expect(el.querySelector('.empty')).toBeTruthy();
    expect(el.querySelector('table')).toBeNull();
  });

  it('shows the Payable amount to an admin but hides it from an employee', () => {
    const adminEl = render([txn('1', 'A')]);
    expect(adminEl.querySelector('thead')!.textContent).toContain('Payable');
    expect(adminEl.querySelector('tbody tr')!.textContent).toContain('1,000');

    TestBed.resetTestingModule();
    adminFlag = false;
    const empEl = render([txn('1', 'A')]);
    expect(empEl.querySelector('thead')!.textContent).not.toContain('Payable');
    expect(empEl.querySelector('tbody tr')!.textContent).not.toContain('1,000');
  });

  it('emits (delete) when allowDelete is on and the trash button is clicked', () => {
    TestBed.configureTestingModule({ imports: [TxnTableComponent], providers: [{ provide: StoreService, useValue: storeStub }, provideRouter([])] });
    const f = TestBed.createComponent(TxnTableComponent);
    f.componentInstance.rows = [txn('1', 'A')];
    f.componentInstance.allowDelete = true;
    const spy = jasmine.createSpy('delete');
    f.componentInstance.delete.subscribe(spy);
    f.detectChanges();
    const btn = (f.nativeElement as HTMLElement).querySelector('tbody .btn-err') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(spy).toHaveBeenCalledWith(f.componentInstance.rows[0]);
  });

  it('hides the delete button when allowDelete is off', () => {
    const el = render([txn('1', 'A')]);   // default allowDelete = false
    expect(el.querySelector('tbody .btn-err')).toBeNull();
  });
});
