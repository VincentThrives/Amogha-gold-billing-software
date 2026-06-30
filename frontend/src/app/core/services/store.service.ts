import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppState, Company, FundRequest, Rates, Txn, User } from '../models';
import { AuthService } from './auth.service';
import { latestPerCustomer } from '../calc';

const EMPTY_RATES: Rates = { gold: 0, silver: 0, updatedAt: null, updatedBy: null };

@Injectable({ providedIn: 'root' })
export class StoreService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  /* ---- reactive snapshot ---- */
  readonly me = signal<User | null>(null);
  readonly users = signal<User[]>([]);
  readonly company = signal<Company | null>(null);
  readonly rates = signal<Rates>(EMPTY_RATES);
  readonly transactions = signal<Txn[]>([]);
  readonly funds = signal<FundRequest[]>([]);
  readonly balances = signal<Record<string, number>>({});

  readonly isAdmin = computed(() => this.me()?.role === 'admin');
  readonly latestTxns = computed(() => latestPerCustomer(this.transactions()));

  userById(id: string): User | null {
    return this.users().find(u => u.id === id) ?? (this.me()?.id === id ? this.me() : null);
  }
  txnById(id: string): Txn | undefined { return this.transactions().find(t => t.id === id); }
  balanceOf(employeeId: string): number { return Number(this.balances()[employeeId] || 0); }

  /* ---- hydrate ---- */
  async sync(): Promise<boolean> {
    if (!this.auth.hasToken()) return false;
    const s = await firstValueFrom(this.http.get<AppState>('/api/state'));
    this.me.set(s.me);
    this.users.set(s.users || []);
    this.company.set(s.company);
    this.rates.set(s.rates || EMPTY_RATES);
    this.transactions.set(s.transactions || []);
    this.funds.set(s.funds || []);
    this.balances.set(s.balances || {});
    return true;
  }

  clear() {
    this.me.set(null); this.users.set([]); this.company.set(null);
    this.rates.set(EMPTY_RATES); this.transactions.set([]); this.funds.set([]); this.balances.set({});
  }

  /* ---- bill number (client side; server keeps it) ---- */
  genBillNo(): string {
    const hex = '0123456789ABCDEF';
    let s = '';
    for (let i = 0; i < 4; i++) s += Math.floor(Math.random() * 10);
    for (let j = 0; j < 6; j++) s += hex[Math.floor(Math.random() * 16)];
    return s;
  }
  genId(p = 'id'): string { return `${p}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`; }

  /* ---- writes (call API, then re-sync) ---- */
  async setRates(gold: number, silver: number) { await firstValueFrom(this.http.put('/api/rates', { gold, silver })); await this.sync(); }
  async setCompany(c: Partial<Company>) { await firstValueFrom(this.http.put('/api/company', c)); await this.sync(); }
  async addEmployee(name: string, phone: string) { await firstValueFrom(this.http.post('/api/users', { name, phone })); await this.sync(); }
  async removeEmployee(id: string) { await firstValueFrom(this.http.delete(`/api/users/${encodeURIComponent(id)}`)); await this.sync(); }
  async addTxn(txn: Txn): Promise<Txn> { const saved = await firstValueFrom(this.http.post<Txn>('/api/transactions', txn)); await this.sync(); return saved; }
  async addFundRequest(amount: number, note: string) { await firstValueFrom(this.http.post('/api/funds', { amount, note })); await this.sync(); }
  async decideFund(reqId: string, approve: boolean) { await firstValueFrom(this.http.post(`/api/funds/${encodeURIComponent(reqId)}/decide`, { approve })); await this.sync(); }
  async resetAll() { await firstValueFrom(this.http.post('/api/admin/reset', {})); await this.sync(); }
}
