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
