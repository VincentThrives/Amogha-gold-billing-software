import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RegisterCustomerComponent } from './register-customer.component';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { RegisteredCustomer } from '../../core/models';

function customer(id: string, name: string, phone: string): RegisteredCustomer {
  return { id, name, phone, address1: 'A', pincode: '560073', idProofs: [], reference: {}, selfie: null, createdAt: '2025-02-12T10:00:00' };
}

describe('RegisterCustomerComponent', () => {
  let cmp: RegisterCustomerComponent;
  let toast: jasmine.SpyObj<ToastService>;
  let register: jasmine.Spy;
  let router: Router;
  const customers = signal<RegisteredCustomer[]>([]);

  function fillValidKyc(phone = '9111100000') {   // default = a phone NOT already registered
    cmp.kyc.selectedIds = ['PAN Card'];
    cmp.kyc.idNumbers = { 'PAN Card': 'ABCDE1234F' };
    cmp.kyc.name = 'Ravi'; cmp.kyc.phone = phone; cmp.kyc.addr1 = 'MG Road'; cmp.kyc.pin = '560073';
  }

  beforeEach(() => {
    customers.set([customer('c1', 'Ravi', '9800000000'), customer('c2', 'Priya', '9665870336')]);
    register = jasmine.createSpy('registerCustomer').and.resolveTo({ customer: customer('c1', 'Ravi', '9800000000'), existed: false });
    const store = { customers, registerCustomer: register };
    toast = jasmine.createSpyObj('ToastService', ['err', 'ok', 'show']);
    TestBed.configureTestingModule({
      imports: [RegisterCustomerComponent],
      providers: [
        { provide: StoreService, useValue: store },
        { provide: ToastService, useValue: toast },
        provideRouter([]),
      ],
    });
    const f = TestBed.createComponent(RegisterCustomerComponent);
    cmp = f.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('blocks save on invalid KYC and does not call the API', async () => {
    await cmp.save();
    expect(toast.err).toHaveBeenCalledWith('Select at least one ID proof.');
    expect(register).not.toHaveBeenCalled();
  });

  it('registers a new customer (no popup for a fresh phone)', async () => {
    fillValidKyc('9111100000');
    await cmp.save();
    expect(register).toHaveBeenCalled();
    expect(toast.ok).toHaveBeenCalledWith(jasmine.stringMatching(/Customer registered/));
  });

  it('pops up "already exists with this number" and cancelling aborts the save', async () => {
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
    fillValidKyc('9800000000');  // already registered to Ravi (c1)
    await cmp.save();
    expect(confirmSpy).toHaveBeenCalledWith(jasmine.stringMatching(/already exists with this number/));
    expect(register).not.toHaveBeenCalled();
  });

  it('confirming the popup updates the existing customer', async () => {
    spyOn(window, 'confirm').and.returnValue(true);
    register.and.resolveTo({ customer: customer('c1', 'Ravi Kumar', '9800000000'), existed: true });
    fillValidKyc('9800000000');
    await cmp.save();
    expect(register).toHaveBeenCalled();
    expect(toast.ok).toHaveBeenCalledWith(jasmine.stringMatching(/details updated/));
  });

  it('search filters the registered list by name or phone', () => {
    cmp.term.set('priya');
    expect(cmp.results().map(c => c.id)).toEqual(['c2']);
    cmp.term.set('9800');
    expect(cmp.results().map(c => c.id)).toEqual(['c1']);
    cmp.term.set('');
    expect(cmp.results().length).toBe(2);
  });

  it('clicking a customer starts a transaction carrying the customerId', () => {
    cmp.startTxn(customers()[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/new'], { queryParams: { customerId: 'c1' } });
  });
});
