import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FundReportsComponent } from './fund-reports.component';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { AdminFund, Expense, FundRequest, User } from '../../core/models';

const NOW = new Date().toISOString();

function approvedFund(id: string, empId: string, amount: number): FundRequest {
  return { id, employeeId: empId, employeeName: 'Counter Staff', amount, note: 'float', status: 'approved',
    method: 'Cash', reference: '', requestedAt: NOW, decidedAt: NOW, decidedBy: 'u-admin' };
}

function build(over: any = {}) {
  const store = {
    isAdmin: () => true,
    company: () => ({ name: 'Amogha Gold Company' }),
    me: signal<User | null>({ id: 'u-admin', name: 'Admin', role: 'admin', phone: '' }),
    users: signal<User[]>([{ id: 'u-emp1', name: 'Counter Staff', role: 'employee', phone: '' }]),
    funds: signal<FundRequest[]>([]),
    adminFunds: signal<AdminFund[]>([]),
    expenses: signal<Expense[]>([]),
    adminFundAvailable: signal(0),
    balanceOf: (_: string) => 0,
    addAdminFund: jasmine.createSpy('addAdminFund').and.resolveTo(undefined),
    addExpense: jasmine.createSpy('addExpense').and.resolveTo(undefined),
    ...over,
  };
  const toast = jasmine.createSpyObj('ToastService', ['ok', 'err', 'show']);
  TestBed.configureTestingModule({
    imports: [FundReportsComponent],
    providers: [{ provide: StoreService, useValue: store }, { provide: ToastService, useValue: toast }],
  });
  const cmp = TestBed.createComponent(FundReportsComponent).componentInstance;
  return { cmp, store, toast };
}

describe('FundReportsComponent (admin)', () => {
  it('totals capital, approvals, expenses and shows available', () => {
    const { cmp } = build({
      adminFunds: signal<AdminFund[]>([{ id: 'af1', amount: 10000, method: 'Cash', note: 'seed', date: NOW, addedBy: 'u-admin', addedByName: 'Admin' }]),
      funds: signal<FundRequest[]>([approvedFund('fr1', 'u-emp1', 5000)]),
      expenses: signal<Expense[]>([{ id: 'e1', amount: 2000, reason: 'rent', date: NOW, createdBy: 'u-admin' }]),
      adminFundAvailable: signal(3000),
      balanceOf: (id: string) => (id === 'u-emp1' ? 5000 : 0),
    });
    expect(cmp.capitalAdded()).toBe(10000);
    expect(cmp.approvedTotal()).toBe(5000);
    expect(cmp.expensesTotal()).toBe(2000);
    expect(cmp.availableNow()).toBe(3000);
  });

  it('builds a per-employee approved + balance row', () => {
    const { cmp } = build({
      funds: signal<FundRequest[]>([approvedFund('fr1', 'u-emp1', 5000), approvedFund('fr2', 'u-emp1', 2000)]),
      balanceOf: (id: string) => (id === 'u-emp1' ? 3000 : 0),
    });
    const rows = cmp.employeeRows();
    expect(rows.length).toBe(1);
    expect(rows[0].total).toBe(7000);
    expect(rows[0].count).toBe(2);
    expect(rows[0].balance).toBe(3000);
  });

  it('addFund calls the store with amount + method + note', async () => {
    const { cmp, store } = build();
    cmp.fundAmount = 50000; cmp.fundMethod = 'RTGS'; cmp.fundNote = 'cash deposit';
    await cmp.addFund();
    expect(store.addAdminFund).toHaveBeenCalledWith(50000, 'RTGS', 'cash deposit');
  });

  it('addFund blocks when no method is selected', async () => {
    const { cmp, store, toast } = build();
    cmp.fundAmount = 50000; cmp.fundMethod = ''; cmp.fundNote = 'x';
    await cmp.addFund();
    expect(store.addAdminFund).not.toHaveBeenCalled();
    expect(toast.err).toHaveBeenCalledWith('Select how the fund was added (Cash / RTGS / NEFT…).');
  });

  it('addExpense blocks when the reason is empty', async () => {
    const { cmp, store, toast } = build();
    cmp.expAmount = 2500; cmp.expReason = '';
    await cmp.addExpense();
    expect(store.addExpense).not.toHaveBeenCalled();
    expect(toast.err).toHaveBeenCalledWith('Enter the reason for the expense.');
  });

  it('addExpense calls the store with amount + reason', async () => {
    const { cmp, store } = build();
    cmp.expAmount = 2500; cmp.expReason = 'shop rent';
    await cmp.addExpense();
    expect(store.addExpense).toHaveBeenCalledWith(2500, 'shop rent');
  });
});

describe('FundReportsComponent (employee)', () => {
  it('shows the funds approved to me and my wallet balance', () => {
    const { cmp } = build({
      isAdmin: () => false,
      me: signal<User | null>({ id: 'u-emp1', name: 'Counter Staff', role: 'employee', phone: '' }),
      funds: signal<FundRequest[]>([approvedFund('fr1', 'u-emp1', 5000)]),
      balanceOf: (id: string) => (id === 'u-emp1' ? 8000 : 0),
    });
    expect(cmp.myApprovedTotal()).toBe(5000);
    expect(cmp.myBalance()).toBe(8000);
  });
});
