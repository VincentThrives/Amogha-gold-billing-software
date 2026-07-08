import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { TxnTableComponent } from '../../shared/txn-table/txn-table.component';
import { Txn } from '../../core/models';
import { inr } from '../../core/calc';

type SearchType = 'all' | 'name' | 'bill' | 'phone' | 'other';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TxnTableComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  store = inject(StoreService);

  searchType = signal<SearchType>('all');
  term = signal('');
  inr0 = (n: number) => inr(n, 0);

  private all = computed(() => this.store.transactions());

  todayCount = computed(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return this.all().filter(t => new Date(t.date) >= start);
  });
  sumToday = computed(() => this.todayCount().reduce((s, t) => s + t.totals.amountPayable, 0));
  sumAll = computed(() => this.all().reduce((s, t) => s + t.totals.amountPayable, 0));
  myBalance = computed(() => { const me = this.store.me(); return me ? this.store.balanceOf(me.id) : 0; });

  results = computed<Txn[]>(() => {
    const term = this.term().trim().toLowerCase();
    if (!term) return this.all();
    const type = this.searchType();
    return this.all().filter(t => {
      const c = t.customer;
      const other = [c.address1, c.address2, c.pincode, c.landmark, t.reference?.number, t.reference?.phone,
        ...(t.idProofs || []).map(p => `${p.type} ${p.number}`)].join(' ').toLowerCase();
      switch (type) {
        case 'name': return (c.name || '').toLowerCase().includes(term);
        case 'bill': return (t.billNo || '').toLowerCase().includes(term);
        case 'phone': return (c.phone || '').toLowerCase().includes(term);
        case 'other': return other.includes(term);
        default: return [c.name, t.billNo, c.phone, other].join(' ').toLowerCase().includes(term);
      }
    });
  });

  clear() { this.term.set(''); this.searchType.set('all'); }
}
