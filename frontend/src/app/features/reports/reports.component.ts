import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { inr, billDate } from '../../core/calc';
import { Txn } from '../../core/models';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}-${('0' + d.getDate()).slice(-2)}`;
}
function monthStartISO(): string {
  const d = new Date(); d.setDate(1);
  return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}-01`;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent {
  private store = inject(StoreService);

  from = signal(todayISO());
  to = signal(todayISO());

  inr0 = (n: number) => inr(n, 0);
  date = (iso: string) => billDate(iso);

  // admins see every sale; an employee sees only the bills they handled
  mineOnly = computed(() => !this.store.isAdmin());

  /** approved (non-deleted) bills whose date falls within [from, to] inclusive */
  rows = computed<Txn[]>(() => {
    const from = new Date(this.from() + 'T00:00:00').getTime();
    const to = new Date(this.to() + 'T23:59:59.999').getTime();
    const meId = this.store.me()?.id;
    const mine = this.mineOnly();
    return this.store.transactions()
      .filter(t => t.status === 'approved')
      .filter(t => !mine || t.employeeId === meId)
      .filter(t => { const d = new Date(t.date).getTime(); return d >= from && d <= to; });
  });

  summary = computed(() => {
    let goldG = 0, goldAmt = 0, silverG = 0, silverAmt = 0;
    for (const t of this.rows()) {
      if (t.metal === 'gold') { goldG += t.totals.netWeight; goldAmt += t.totals.amountPayable; }
      else { silverG += t.totals.netWeight; silverAmt += t.totals.amountPayable; }
    }
    return { goldG, goldAmt, silverG, silverAmt, total: goldAmt + silverAmt, count: this.rows().length };
  });

  setToday() { this.from.set(todayISO()); this.to.set(todayISO()); }
  setMonth() { this.from.set(monthStartISO()); this.to.set(todayISO()); }
}
