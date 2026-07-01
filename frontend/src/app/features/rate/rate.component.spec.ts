import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RateComponent } from './rate.component';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';

describe('RateComponent', () => {
  let cmp: RateComponent;
  let toast: jasmine.SpyObj<ToastService>;
  let setRates: jasmine.Spy;

  function build(gold: number, silver: number, updatedBy: string | null = 'u-admin') {
    setRates = jasmine.createSpy('setRates').and.resolveTo(undefined);
    const store = {
      rates: signal({ gold, silver, updatedAt: '2026-07-01T10:00:00', updatedBy }),
      userById: (id: string) => (id === 'u-admin' ? { name: 'Amogha Admin' } : null),
      setRates,
    };
    toast = jasmine.createSpyObj('ToastService', ['ok', 'err']);
    TestBed.configureTestingModule({
      imports: [RateComponent],
      providers: [{ provide: StoreService, useValue: store }, { provide: ToastService, useValue: toast }],
    });
    cmp = TestBed.createComponent(RateComponent).componentInstance;
  }

  it('seeds inputs from the stored rates', () => {
    build(8530, 98);
    expect(cmp.gold).toBe(8530);
    expect(cmp.silver).toBe(98);
    expect(cmp.updatedByName()).toBe('Amogha Admin');
  });

  it('seeds nulls when rates are unset', () => {
    build(0, 0, null);
    expect(cmp.gold).toBeNull();
    expect(cmp.silver).toBeNull();
    expect(cmp.updatedByName()).toBe('');
  });

  it('save() persists gold + silver and toasts', async () => {
    build(0, 0, null);
    cmp.gold = 9000; cmp.silver = 99;
    await cmp.save();
    expect(setRates).toHaveBeenCalledWith(9000, 99);
    expect(toast.ok).toHaveBeenCalledWith('Rates updated.');
  });
});
