import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ExpenseComponent } from './expense.component';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { Expense, ExpenseCategory, User } from '../../core/models';

const NOW = new Date().toISOString();

function expense(id: string, category: string, amount: number, reason = ''): Expense {
  return { id, amount, category, reason, date: NOW, createdBy: 'u-admin', createdByName: 'Admin' };
}

function build(over: any = {}) {
  const store = {
    isAdmin: () => true,
    company: () => ({ name: 'Amogha Gold Company' }),
    me: signal<User | null>({ id: 'u-admin', name: 'Admin', role: 'admin', phone: '' }),
    users: signal<User[]>([]),
    userById: (_: string) => ({ name: 'Admin' }),
    expenses: signal<Expense[]>([]),
    expenseCategories: signal<ExpenseCategory[]>([
      { id: 'c1', name: 'Rent' }, { id: 'c2', name: 'Petrol / Fuel' },
    ]),
    addExpense: jasmine.createSpy('addExpense').and.resolveTo(undefined),
    addExpenseCategory: jasmine.createSpy('addExpenseCategory').and.resolveTo(undefined),
    removeExpenseCategory: jasmine.createSpy('removeExpenseCategory').and.resolveTo(undefined),
    ...over,
  };
  const toast = jasmine.createSpyObj('ToastService', ['ok', 'err', 'show']);
  TestBed.configureTestingModule({
    imports: [ExpenseComponent],
    providers: [{ provide: StoreService, useValue: store }, { provide: ToastService, useValue: toast }],
  });
  const cmp = TestBed.createComponent(ExpenseComponent).componentInstance;
  return { cmp, store, toast };
}

describe('ExpenseComponent', () => {
  it('lists expenses and totals them', () => {
    const { cmp } = build({ expenses: signal<Expense[]>([expense('e1', 'Rent', 2500), expense('e2', 'Petrol / Fuel', 800)]) });
    expect(cmp.filtered().length).toBe(2);
    expect(cmp.total()).toBe(3300);
  });

  it('filters by keyword (category or note)', () => {
    const { cmp } = build({ expenses: signal<Expense[]>([expense('e1', 'Rent', 2500, 'march'), expense('e2', 'Petrol / Fuel', 800, 'bike')]) });
    cmp.search.set('petrol');
    expect(cmp.filtered().map(e => e.id)).toEqual(['e2']);
    cmp.search.set('march');
    expect(cmp.filtered().map(e => e.id)).toEqual(['e1']);
  });

  it('filters by selected category', () => {
    const { cmp } = build({ expenses: signal<Expense[]>([expense('e1', 'Rent', 2500), expense('e2', 'Petrol / Fuel', 800)]) });
    cmp.categoryFilter.set('Rent');
    expect(cmp.filtered().map(e => e.id)).toEqual(['e1']);
  });

  it('blocks add when no category is selected', async () => {
    const { cmp, store, toast } = build();
    cmp.expAmount = 2500; cmp.expCategory = '';
    await cmp.addExpense();
    expect(store.addExpense).not.toHaveBeenCalled();
    expect(toast.err).toHaveBeenCalledWith('Select an expense category.');
  });

  it('adds an expense with amount + category + note', async () => {
    const { cmp, store } = build();
    cmp.expAmount = 2500; cmp.expCategory = 'Rent'; cmp.expNote = 'march rent';
    await cmp.addExpense();
    expect(store.addExpense).toHaveBeenCalledWith(2500, 'Rent', 'march rent');
  });

  it('adds a new category', async () => {
    const { cmp, store } = build();
    cmp.newCategory = 'Travel';
    await cmp.addCategory();
    expect(store.addExpenseCategory).toHaveBeenCalledWith('Travel');
  });
});
