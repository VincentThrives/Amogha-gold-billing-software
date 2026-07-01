import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TxnTableComponent } from './txn-table.component';
import { Txn } from '../../core/models';

function txn(id: string, name: string): Txn {
  return {
    id, billNo: 'B' + id, date: '2025-02-12T10:00:00', metal: 'gold', employeeId: '', employeeName: '',
    customer: { name, phone: '9000000000', address1: '', pincode: '' } as any,
    idProofs: [], reference: {}, selfie: null, clientOtpVerified: false, article: '', items: [],
    totals: { grossAmount: 0, margin: 0, netAmount: 0, billingCharges: 0, amountPayable: 1000, netWeight: 12.5 },
    status: 'approved',
  };
}

describe('TxnTableComponent', () => {
  function render(rows: Txn[]) {
    TestBed.configureTestingModule({ imports: [TxnTableComponent], providers: [provideRouter([])] });
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
});
