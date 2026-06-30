import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StoreService } from './store.service';
import { AppState, Txn } from '../models';

const STATE: AppState = {
  me: { id: 'u-emp1', name: 'Counter Staff', role: 'employee', phone: '9999900002' },
  users: [{ id: 'u-emp1', name: 'Counter Staff', role: 'employee', phone: '9999900002' }],
  company: { name: 'Amogha Gold Company', addressLines: [], gstn: '29ABFCA1286P1Z2', phone: '', legalName: '', terms: [] },
  rates: { gold: 8530, silver: 98, updatedAt: null, updatedBy: null },
  transactions: [
    { id: 't2', customer: { phone: '999' } } as unknown as Txn,
    { id: 't1', customer: { phone: '999' } } as unknown as Txn,
    { id: 't0', customer: { phone: '888' } } as unknown as Txn,
  ],
  funds: [],
  balances: { 'u-emp1': 5000 },
};

describe('StoreService', () => {
  let store: StoreService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('amogha_token', 'tok');
    TestBed.configureTestingModule({ providers: [StoreService, provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(StoreService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.removeItem('amogha_token'); });

  const flushState = () => http.expectOne(r => r.method === 'GET' && r.url === '/api/state').flush(STATE);

  it('sync() hydrates signals from /api/state', fakeAsync(() => {
    let ok: boolean | undefined;
    store.sync().then(v => (ok = v));
    flushState();
    flushMicrotasks();
    expect(ok).toBeTrue();
    expect(store.me()?.role).toBe('employee');
    expect(store.rates().gold).toBe(8530);
    expect(store.company()?.gstn).toBe('29ABFCA1286P1Z2');
    expect(store.balanceOf('u-emp1')).toBe(5000);
  }));

  it('latestTxns dedupes to most recent per customer', fakeAsync(() => {
    store.sync(); flushState(); flushMicrotasks();
    expect(store.latestTxns().map(t => t.id)).toEqual(['t2', 't0']);
  }));

  it('sync() returns false without a token', fakeAsync(() => {
    localStorage.removeItem('amogha_token');
    let ok: boolean | undefined;
    store.sync().then(v => (ok = v));
    flushMicrotasks();
    expect(ok).toBeFalse();
    http.expectNone('/api/state');
  }));

  it('setRates PUTs /api/rates then re-syncs', fakeAsync(() => {
    store.setRates(9000, 99);
    const put = http.expectOne(r => r.method === 'PUT' && r.url === '/api/rates');
    expect(put.request.body).toEqual({ gold: 9000, silver: 99 });
    put.flush({});
    flushMicrotasks();
    flushState();
    flushMicrotasks();
  }));

  it('addTxn POSTs /api/transactions and returns saved txn', fakeAsync(() => {
    const txn = { id: 'x', billNo: '1234ABCDEF' } as unknown as Txn;
    let saved: Txn | undefined;
    store.addTxn(txn).then(t => (saved = t));
    http.expectOne(r => r.method === 'POST' && r.url === '/api/transactions').flush(txn);
    flushMicrotasks();
    flushState();
    flushMicrotasks();
    expect(saved?.billNo).toBe('1234ABCDEF');
  }));

  it('addFundRequest POSTs /api/funds', fakeAsync(() => {
    store.addFundRequest(10000, 'float');
    const req = http.expectOne(r => r.method === 'POST' && r.url === '/api/funds');
    expect(req.request.body).toEqual({ amount: 10000, note: 'float' });
    req.flush({});
    flushMicrotasks();
    flushState();
    flushMicrotasks();
  }));

  it('decideFund POSTs the decide endpoint', fakeAsync(() => {
    store.decideFund('fr1', true);
    const req = http.expectOne(r => r.method === 'POST' && r.url === '/api/funds/fr1/decide');
    expect(req.request.body).toEqual({ approve: true });
    req.flush({});
    flushMicrotasks();
    flushState();
    flushMicrotasks();
  }));

  it('removeEmployee DELETEs the user', fakeAsync(() => {
    store.removeEmployee('u-emp1');
    http.expectOne(r => r.method === 'DELETE' && r.url === '/api/users/u-emp1').flush({});
    flushMicrotasks();
    flushState();
    flushMicrotasks();
  }));

  it('genBillNo matches the 4-digit + 6-hex format', () => {
    expect(store.genBillNo()).toMatch(/^\d{4}[0-9A-F]{6}$/);
  });
});
