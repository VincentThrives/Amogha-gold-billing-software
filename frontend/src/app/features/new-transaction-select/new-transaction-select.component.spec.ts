import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NewTransactionSelectComponent } from './new-transaction-select.component';
import { StoreService } from '../../core/services/store.service';

function build(customerId: string | null) {
  const store = {
    rates: signal({ gold: 8530, silver: 98, updatedAt: null, updatedBy: null }),
    customerById: (id: string) => (id === 'c1' ? { id: 'c1', name: 'PRIYANKA RAJ' } : undefined),
  };
  TestBed.configureTestingModule({
    imports: [NewTransactionSelectComponent],
    providers: [
      { provide: StoreService, useValue: store },
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(customerId ? { customerId } : {}) } } },
    ],
  });
  return TestBed.createComponent(NewTransactionSelectComponent).componentInstance;
}

describe('NewTransactionSelectComponent', () => {
  it('is a plain metal chooser with no query when no customer', () => {
    const cmp = build(null);
    expect(cmp.customerId).toBeNull();
    expect(cmp.customerName).toBe('');
    expect(cmp.query).toEqual({});
  });

  it('carries the customerId through to the bill and resolves the name', () => {
    const cmp = build('c1');
    expect(cmp.customerId).toBe('c1');
    expect(cmp.customerName).toBe('PRIYANKA RAJ');
    expect(cmp.query).toEqual({ customerId: 'c1' });
  });

  it('rateLabel formats set/unset rates', () => {
    const cmp = build(null);
    expect(cmp.rateLabel(8530)).toBe('₹8,530/g');
    expect(cmp.rateLabel(0)).toBe('not set');
  });
});
