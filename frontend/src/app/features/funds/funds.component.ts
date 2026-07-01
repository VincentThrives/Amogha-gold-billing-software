import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { FundRequest, User } from '../../core/models';
import { inr, billDate } from '../../core/calc';
import { highlightField } from '../../core/ui';

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

  readonly METHODS = ['Cash', 'UPI', 'IMPS', 'NEFT', 'RTGS', 'Cheque'];

  amount: number | null = null;
  note = '';
  busy = signal(false);
  // per-request payout details entered by the admin on approval
  private payouts = new Map<string, { method: string; reference: string }>();

  inr0 = (n: number) => inr(n, 0);
  date = (iso: string) => billDate(iso);

  pending = computed(() => this.store.funds().filter(f => f.status === 'pending'));
  employees = computed(() => this.store.users().filter(u => u.role === 'employee'));
  empName = (id: string) => this.store.userById(id)?.name || '—';

  payout(id: string) {
    if (!this.payouts.has(id)) this.payouts.set(id, { method: '', reference: '' });
    return this.payouts.get(id)!;
  }

  async request() {
    const amt = Number(this.amount) || 0;
    if (amt <= 0) { this.toast.err('Enter a valid amount.'); highlightField(document.getElementById('fr_amt')); return; }
    this.busy.set(true);
    try {
      await this.store.addFundRequest(amt, this.note.trim());
      this.toast.ok(`Fund request sent for ${this.inr0(amt)}.`);
      this.amount = null; this.note = '';
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not send request.'); }
    finally { this.busy.set(false); }
  }

  async approve(req: FundRequest) {
    const p = this.payout(req.id);
    if (!p.method) {
      this.toast.err('Select how the funds were given (Cash / UPI / NEFT / RTGS…).');
      highlightField(document.getElementById('fr_method_' + req.id));
      return;
    }
    this.busy.set(true);
    try {
      await this.store.decideFund(req.id, true, p.method, p.reference.trim());
      this.toast.ok('Funds approved.');
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not approve.'); }
    finally { this.busy.set(false); }
  }

  async reject(req: FundRequest) {
    try {
      await this.store.decideFund(req.id, false);
      this.toast.show('Rejected.');
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not update request.'); }
  }
}
