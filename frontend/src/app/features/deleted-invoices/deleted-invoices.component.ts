import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { Txn } from '../../core/models';
import { inr, billDate } from '../../core/calc';

@Component({
  selector: 'app-deleted-invoices',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './deleted-invoices.component.html',
  styleUrl: './deleted-invoices.component.scss',
})
export class DeletedInvoicesComponent {
  store = inject(StoreService);
  private toast = inject(ToastService);

  deleted = this.store.deletedTransactions;
  busy = signal('');

  inr0 = (n: number) => inr(n, 0);
  date = (iso: string | null | undefined) => (iso ? billDate(iso) : '—');

  async restore(t: Txn) {
    this.busy.set(t.id);
    try { await this.store.restoreTxn(t.id); this.toast.ok(`Bill ${t.billNo} restored.`); }
    catch (e: any) { this.toast.err(e?.error?.error || 'Could not restore.'); }
    finally { this.busy.set(''); }
  }

  async purge(t: Txn) {
    if (!confirm(`Permanently delete bill ${t.billNo}? This cannot be undone.`)) return;
    this.busy.set(t.id);
    try { await this.store.purgeTxn(t.id); this.toast.show('Bill deleted forever.'); }
    catch (e: any) { this.toast.err(e?.error?.error || 'Could not delete.'); }
    finally { this.busy.set(''); }
  }
}
