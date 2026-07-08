import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { inr, billDate } from '../../core/calc';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}-${('0' + d.getDate()).slice(-2)}`;
}
function monthStartISO(): string {
  const d = new Date(); d.setDate(1);
  return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}-01`;
}

@Component({
  selector: 'app-fund-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fund-reports.component.html',
  styleUrl: './fund-reports.component.scss',
})
export class FundReportsComponent {
  store = inject(StoreService);
  private toast = inject(ToastService);

  from = signal(monthStartISO());
  to = signal(todayISO());
  busy = signal(false);

  readonly FUND_METHODS = ['Cash', 'Bank deposit', 'RTGS', 'NEFT', 'UPI', 'IMPS', 'Cheque'];

  // add-fund / add-expense form state (admin)
  fundAmount: number | null = null;
  fundMethod = '';
  fundNote = '';
  expAmount: number | null = null;
  expReason = '';

  inr0 = (n: number) => inr(n, 0);
  date = (iso: string) => billDate(iso);

  isAdmin = computed(() => this.store.isAdmin());
  company = computed(() => this.store.company());

  private inRange(iso?: string | null): boolean {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    const from = new Date(this.from() + 'T00:00:00').getTime();
    const to = new Date(this.to() + 'T23:59:59.999').getTime();
    return t >= from && t <= to;
  }

  // funds() is already role-scoped by the server (admin: all, employee: only their own)
  approvedFunds = computed(() => this.store.funds().filter(f => f.status === 'approved' && this.inRange(f.decidedAt)));
  adminFundsInPeriod = computed(() => this.store.adminFunds().filter(f => this.inRange(f.date)));
  expensesInPeriod = computed(() => this.store.expenses().filter(e => this.inRange(e.date)));

  capitalAdded = computed(() => this.adminFundsInPeriod().reduce((s, f) => s + f.amount, 0));
  approvedTotal = computed(() => this.approvedFunds().reduce((s, f) => s + f.amount, 0));
  expensesTotal = computed(() => this.expensesInPeriod().reduce((s, e) => s + e.amount, 0));
  availableNow = computed(() => this.store.adminFundAvailable());

  /** per-employee: how much was approved to them in the period + their current wallet balance */
  employeeRows = computed(() => {
    const approved = this.approvedFunds();
    return this.store.users().filter(u => u.role === 'employee').map(u => {
      const rows = approved.filter(f => f.employeeId === u.id);
      return { id: u.id, name: u.name, count: rows.length, total: rows.reduce((s, f) => s + f.amount, 0), balance: this.store.balanceOf(u.id) };
    });
  });

  // employee self-view
  myApprovedTotal = computed(() => this.approvedFunds().reduce((s, f) => s + f.amount, 0));
  myBalance = computed(() => { const me = this.store.me(); return me ? this.store.balanceOf(me.id) : 0; });

  setToday() { this.from.set(todayISO()); this.to.set(todayISO()); }
  setMonth() { this.from.set(monthStartISO()); this.to.set(todayISO()); }

  addedByName(f: { addedByName?: string; addedBy?: string }): string {
    return f.addedByName || (f.addedBy ? this.store.userById(f.addedBy)?.name || '—' : '—');
  }

  async addFund() {
    const amt = Number(this.fundAmount) || 0;
    if (amt <= 0) { this.toast.err('Enter a valid fund amount.'); return; }
    if (!this.fundMethod) { this.toast.err('Select how the fund was added (Cash / RTGS / NEFT…).'); return; }
    this.busy.set(true);
    try {
      await this.store.addAdminFund(amt, this.fundMethod, this.fundNote.trim());
      this.toast.ok(`Added ₹${amt.toLocaleString('en-IN')} to your fund.`);
      this.fundAmount = null; this.fundMethod = ''; this.fundNote = '';
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not add fund.'); }
    finally { this.busy.set(false); }
  }

  async addExpense() {
    const amt = Number(this.expAmount) || 0;
    if (amt <= 0) { this.toast.err('Enter a valid expense amount.'); return; }
    if (!this.expReason.trim()) { this.toast.err('Enter the reason for the expense.'); return; }
    this.busy.set(true);
    try {
      await this.store.addExpense(amt, this.expReason.trim());
      this.toast.ok(`Recorded expense of ₹${amt.toLocaleString('en-IN')}.`);
      this.expAmount = null; this.expReason = '';
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not record expense.'); }
    finally { this.busy.set(false); }
  }

  async downloadPdf() {
    const el = document.getElementById('fundReportDoc');
    if (!el) return;
    this.busy.set(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: 6,
        filename: `Amogha_Fund_Report_${this.from()}_to_${this.to()}.pdf`,
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(el).save();
    } catch { window.print(); }
    finally { this.busy.set(false); }
  }
}
