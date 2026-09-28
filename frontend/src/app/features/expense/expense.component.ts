import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
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
  selector: 'app-expense',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense.component.html',
  styleUrl: './expense.component.scss',
})
export class ExpenseComponent {
  store = inject(StoreService);
  private toast = inject(ToastService);
  private dlg = inject(DialogService);

  from = signal(monthStartISO());
  to = signal(todayISO());
  busy = signal(false);

  // add-expense form
  expAmount: number | null = null;
  expCategory = '';
  expNote = '';

  // manage categories
  newCategory = '';

  // filter
  search = signal('');
  categoryFilter = signal('');   // '' = all

  inr0 = (n: number) => inr(n, 0);
  date = (iso: string) => billDate(iso);
  company = computed(() => this.store.company());
  categories = computed(() => this.store.expenseCategories());

  private inRange(iso?: string): boolean {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= new Date(this.from() + 'T00:00:00').getTime() && t <= new Date(this.to() + 'T23:59:59.999').getTime();
  }

  /** expenses within the date range, matching the category filter and the keyword search */
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.categoryFilter();
    return this.store.expenses()
      .filter(e => this.inRange(e.date))
      .filter(e => !cat || e.category === cat)
      .filter(e => !q || (e.category || '').toLowerCase().includes(q) || (e.reason || '').toLowerCase().includes(q));
  });
  total = computed(() => this.filtered().reduce((s, e) => s + e.amount, 0));

  addedByName(e: { createdByName?: string; createdBy?: string }): string {
    return e.createdByName || (e.createdBy ? this.store.userById(e.createdBy)?.name || '—' : '—');
  }

  setToday() { this.from.set(todayISO()); this.to.set(todayISO()); }
  setMonth() { this.from.set(monthStartISO()); this.to.set(todayISO()); }
  clearFilter() { this.search.set(''); this.categoryFilter.set(''); }

  async addExpense() {
    const amt = Number(this.expAmount) || 0;
    if (amt <= 0) { this.toast.err('Enter a valid expense amount.'); return; }
    if (!this.expCategory) { this.toast.err('Select an expense category.'); return; }
    this.busy.set(true);
    try {
      await this.store.addExpense(amt, this.expCategory, this.expNote.trim());
      this.toast.ok(`Recorded ${this.expCategory} expense of ₹${amt.toLocaleString('en-IN')}.`);
      this.expAmount = null; this.expCategory = ''; this.expNote = '';
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not record expense.'); }
    finally { this.busy.set(false); }
  }

  async addCategory() {
    const name = this.newCategory.trim();
    if (!name) { this.toast.err('Enter a category name.'); return; }
    this.busy.set(true);
    try {
      await this.store.addExpenseCategory(name);
      this.toast.ok(`Added category “${name}”.`);
      this.newCategory = '';
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not add category.'); }
    finally { this.busy.set(false); }
  }

  async removeCategory(id: string, name: string) {
    if (!(await this.dlg.confirm({ title: 'Remove category', message: `Remove the category “${name}”? Past expenses keep their label.`, okText: 'Remove', danger: true }))) return;
    this.busy.set(true);
    try {
      await this.store.removeExpenseCategory(id);
      if (this.categoryFilter() === name) this.categoryFilter.set('');
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not remove category.'); }
    finally { this.busy.set(false); }
  }

  async downloadPdf() {
    const el = document.getElementById('expenseDoc');
    if (!el) return;
    this.busy.set(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: 8,
        filename: `Amogha_Expenses_${this.from()}_to_${this.to()}.pdf`,
        image: { type: 'png' },
        html2canvas: { scale: 3, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(el).save();
    } catch { window.print(); }
    finally { this.busy.set(false); }
  }
}
