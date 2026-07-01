import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { TxnTableComponent } from '../../shared/txn-table/txn-table.component';
import { Txn } from '../../core/models';

type SearchType = 'all' | 'name' | 'phone' | 'bill';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TxnTableComponent],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss',
})
export class TransactionsComponent {
  store = inject(StoreService);

  searchType = signal<SearchType>('all');
  term = signal('');

  // every bill (newest first from the server); admins see all, staff see their own
  all = computed<Txn[]>(() => {
    const txns = this.store.transactions();
    if (this.store.isAdmin()) return txns;
    const meId = this.store.me()?.id;
    return txns.filter(t => t.employeeId === meId);
  });

  results = computed<Txn[]>(() => {
    const term = this.term().trim().toLowerCase();
    if (!term) return this.all();
    const type = this.searchType();
    return this.all().filter(t => {
      const c = t.customer;
      switch (type) {
        case 'name': return (c.name || '').toLowerCase().includes(term);
        case 'phone': return (c.phone || '').toLowerCase().includes(term);
        case 'bill': return (t.billNo || '').toLowerCase().includes(term);
        default: return [c.name, c.phone, t.billNo].join(' ').toLowerCase().includes(term);
      }
    });
  });

  clear() { this.term.set(''); this.searchType.set('all'); }
}
