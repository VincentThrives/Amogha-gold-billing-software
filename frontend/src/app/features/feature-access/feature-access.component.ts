import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-feature-access',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feature-access.component.html',
  styleUrl: './feature-access.component.scss',
})
export class FeatureAccessComponent {
  store = inject(StoreService);
  private toast = inject(ToastService);
  busy = signal('');   // key currently saving

  readonly FEATURES = [
    { key: 'register', label: 'Register Customer' },
    { key: 'new', label: 'New Transaction' },
    { key: 'transactions', label: 'Transaction List' },
    { key: 'rate', label: 'Gold / Silver Rate' },
    { key: 'approvals', label: 'Approvals' },
    { key: 'reports', label: 'Report' },
    { key: 'expense', label: 'Expense' },
    { key: 'users', label: 'Users' },
    { key: 'billingDefaults', label: 'Billing Defaults' },
    { key: 'deleted', label: 'Deleted Invoices' },
    { key: 'settings', label: 'Settings' },
  ];

  isOn(key: string): boolean { return this.store.features()[key] !== false; }

  async toggle(key: string) {
    const next = !this.isOn(key);
    this.busy.set(key);
    try { await this.store.setFeatures({ [key]: next }); }
    catch (e: any) { this.toast.err(e?.error?.error || 'Could not update the toggle.'); }
    finally { this.busy.set(''); }
  }
}
