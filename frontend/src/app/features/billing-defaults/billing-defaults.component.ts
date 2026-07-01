import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-billing-defaults',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './billing-defaults.component.html',
  styleUrl: './billing-defaults.component.scss',
})
export class BillingDefaultsComponent {
  store = inject(StoreService);
  private toast = inject(ToastService);

  defMargin = this.store.billingConfig().defaultMargin;
  defCharges = this.store.billingConfig().defaultBillingCharges;
  busy = signal(false);

  async save() {
    this.busy.set(true);
    try {
      await this.store.setBillingConfig(Number(this.defMargin) || 0, Number(this.defCharges) || 0);
      this.toast.ok('Billing defaults saved.');
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not save.'); }
    finally { this.busy.set(false); }
  }
}
