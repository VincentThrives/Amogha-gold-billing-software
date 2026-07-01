import { TestBed } from '@angular/core/testing';
import { BillingDefaultsComponent } from './billing-defaults.component';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';

describe('BillingDefaultsComponent', () => {
  let cmp: BillingDefaultsComponent;
  let toast: jasmine.SpyObj<ToastService>;
  let setBillingConfig: jasmine.Spy;

  beforeEach(() => {
    setBillingConfig = jasmine.createSpy('setBillingConfig').and.resolveTo(undefined);
    const store = { billingConfig: () => ({ defaultMargin: 10, defaultBillingCharges: 100 }), setBillingConfig };
    toast = jasmine.createSpyObj('ToastService', ['ok', 'err']);
    TestBed.configureTestingModule({
      imports: [BillingDefaultsComponent],
      providers: [{ provide: StoreService, useValue: store }, { provide: ToastService, useValue: toast }],
    });
    cmp = TestBed.createComponent(BillingDefaultsComponent).componentInstance;
  });

  it('seeds inputs from the stored billing config', () => {
    expect(cmp.defMargin).toBe(10);
    expect(cmp.defCharges).toBe(100);
  });

  it('save() persists margin + charges and toasts', async () => {
    cmp.defMargin = 25; cmp.defCharges = 150;
    await cmp.save();
    expect(setBillingConfig).toHaveBeenCalledWith(25, 150);
    expect(toast.ok).toHaveBeenCalledWith('Billing defaults saved.');
  });

  it('surfaces a server error', async () => {
    setBillingConfig.and.rejectWith({ error: { error: 'nope' } });
    await cmp.save();
    expect(toast.err).toHaveBeenCalledWith('nope');
  });
});
