import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { inr, billDate } from '../../core/calc';

@Component({
  selector: 'app-rate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rate.component.html',
  styleUrl: './rate.component.scss',
})
export class RateComponent {
  store = inject(StoreService);
  private toast = inject(ToastService);

  gold = this.store.rates().gold || null;
  silver = this.store.rates().silver || null;
  busy = signal(false);

  inr0 = (n: number) => inr(n, 0);
  date = (iso: string) => billDate(iso);

  updatedByName(): string {
    const id = this.store.rates().updatedBy;
    return id ? (this.store.userById(id)?.name || '') : '';
  }

  async save() {
    this.busy.set(true);
    try {
      await this.store.setRates(Number(this.gold) || 0, Number(this.silver) || 0);
      this.toast.ok('Rates updated.');
    } catch (e: any) {
      this.toast.err(e?.error?.error || 'Could not update rates.');
    } finally { this.busy.set(false); }
  }
}
