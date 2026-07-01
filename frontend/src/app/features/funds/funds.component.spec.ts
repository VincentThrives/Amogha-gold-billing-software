import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FundsComponent } from './funds.component';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';

describe('FundsComponent request validation', () => {
  let fixture: ComponentFixture<FundsComponent>;
  let cmp: FundsComponent;
  let toast: jasmine.SpyObj<ToastService>;
  let addFundRequest: jasmine.Spy;

  beforeEach(() => {
    addFundRequest = jasmine.createSpy('addFundRequest').and.resolveTo(undefined);
    const store = {
      isAdmin: () => false,
      me: () => ({ id: 'u-emp1', name: 'Counter Staff', role: 'employee', phone: '9999900002' }),
      funds: signal([]),
      users: signal([]),
      userById: () => null,
      balanceOf: () => 0,
      addFundRequest,
      decideFund: jasmine.createSpy().and.resolveTo(undefined),
    };
    toast = jasmine.createSpyObj('ToastService', ['err', 'ok', 'show']);
    TestBed.configureTestingModule({
      imports: [FundsComponent],
      providers: [
        { provide: StoreService, useValue: store },
        { provide: ToastService, useValue: toast },
      ],
    });
    fixture = TestBed.createComponent(FundsComponent);
    cmp = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });
  afterEach(() => fixture.nativeElement.remove());

  it('highlights the amount field for a non-positive amount', async () => {
    cmp.amount = 0;
    await cmp.request();
    expect(toast.err).toHaveBeenCalledWith('Enter a valid amount.');
    expect(document.getElementById('fr_amt')!.classList.contains('input-err')).toBeTrue();
    expect(addFundRequest).not.toHaveBeenCalled();
  });

  it('sends the request for a valid amount', async () => {
    cmp.amount = 100000; cmp.note = 'morning float';
    await cmp.request();
    expect(addFundRequest).toHaveBeenCalledWith(100000, 'morning float');
    expect(toast.ok).toHaveBeenCalled();
  });
});

describe('FundsComponent admin approval (payment method)', () => {
  let cmp: FundsComponent;
  let toast: jasmine.SpyObj<ToastService>;
  let decideFund: jasmine.Spy;
  const REQ = { id: 'fr1', employeeId: 'u-emp1', employeeName: 'Counter Staff', amount: 5000, note: '', status: 'pending', requestedAt: '' } as any;

  beforeEach(() => {
    decideFund = jasmine.createSpy('decideFund').and.resolveTo(undefined);
    const store = {
      isAdmin: () => true,
      me: () => ({ id: 'u-admin', name: 'Admin', role: 'admin', phone: '9999900001' }),
      funds: signal([REQ]),
      users: signal([{ id: 'u-emp1', name: 'Counter Staff', role: 'employee', phone: '9999900002' }]),
      userById: () => ({ id: 'u-emp1', name: 'Counter Staff' }),
      balanceOf: () => 0,
      addFundRequest: jasmine.createSpy().and.resolveTo(undefined),
      decideFund,
    };
    toast = jasmine.createSpyObj('ToastService', ['err', 'ok', 'show']);
    TestBed.configureTestingModule({
      imports: [FundsComponent],
      providers: [{ provide: StoreService, useValue: store }, { provide: ToastService, useValue: toast }],
    });
    cmp = TestBed.createComponent(FundsComponent).componentInstance;
  });

  it('blocks approval until a payment method is selected', async () => {
    await cmp.approve(REQ);
    expect(toast.err).toHaveBeenCalledWith(jasmine.stringMatching(/how the funds were given/));
    expect(decideFund).not.toHaveBeenCalled();
  });

  it('approves with the chosen method + reference', async () => {
    cmp.payout('fr1').method = 'NEFT';
    cmp.payout('fr1').reference = 'UTR-9';
    await cmp.approve(REQ);
    expect(decideFund).toHaveBeenCalledWith('fr1', true, 'NEFT', 'UTR-9');
    expect(toast.ok).toHaveBeenCalledWith('Funds approved.');
  });

  it('reject does not require a method', async () => {
    await cmp.reject(REQ);
    expect(decideFund).toHaveBeenCalledWith('fr1', false);
  });
});
