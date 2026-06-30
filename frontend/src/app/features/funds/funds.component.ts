import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { FundRequest, User } from '../../core/models';
import { inr, billDate } from '../../core/calc';

@Component({
  selector: 'app-funds',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './funds.component.html',
  styleUrl: './funds.component.scss',
})
export class FundsComponent {
  store = inject(StoreService);
  private toast = inject(ToastService);

  amount: number | null = null;
  note = '';
  busy = signal(false);

  inr0 = (n: number) => inr(n, 0);
  date = (iso: string) => billDate(iso);

  pending = computed(() => this.store.funds().filter(f => f.status === 'pending'));
  employees = computed(() => this.store.users().filter(u => u.role === 'employee'));
  empName = (id: string) => this.store.userById(id)?.name || '—';

  async request() {
    const amt = Number(this.amount) || 0;
    if (amt <= 0) { this.toast.err('Enter a valid amount.'); return; }
    this.busy.set(true);
    try {
      await this.store.addFundRequest(amt, this.note.trim());
      this.toast.ok(`Fund request sent for ${this.inr0(amt)}.`);
      this.amount = null; this.note = '';
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not send request.'); }
    finally { this.busy.set(false); }
  }

  async decide(req: FundRequest, approve: boolean) {
    try {
      await this.store.decideFund(req.id, approve);
      this.toast.show(approve ? 'Approved.' : 'Rejected.', approve ? 'ok' : '');
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not update request.'); }
  }
}
