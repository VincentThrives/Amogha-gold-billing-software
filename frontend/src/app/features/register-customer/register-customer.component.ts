import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { KycFormComponent } from '../../shared/kyc-form/kyc-form.component';
import { KycModel, emptyKyc, kycToRegistration, validateKyc } from '../../core/kyc';
import { highlightField } from '../../core/ui';
import { billDate } from '../../core/calc';
import { RegisteredCustomer } from '../../core/models';

@Component({
  selector: 'app-register-customer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, KycFormComponent],
  templateUrl: './register-customer.component.html',
  styleUrl: './register-customer.component.scss',
})
export class RegisterCustomerComponent {
  store = inject(StoreService);
  private toast = inject(ToastService);
  private router = inject(Router);

  kyc: KycModel = emptyKyc();
  busy = signal(false);
  term = signal('');

  results = computed(() => {
    const q = this.term().trim().toLowerCase();
    const all = this.store.customers();
    if (!q) return all;
    return all.filter(c => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q));
  });

  date = (iso: string) => billDate(iso);

  async save() {
    const v = validateKyc(this.kyc);
    if (!v.ok) { this.toast.err(v.message!); highlightField(document.getElementById(v.fieldId!)); return; }
    this.busy.set(true);
    try {
      const res = await this.store.registerCustomer(kycToRegistration(this.kyc));
      this.toast.ok(res.existed
        ? `Customer already exists — details updated (${res.customer.name}).`
        : `Customer registered — ${res.customer.name}.`);
      this.kyc = emptyKyc();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      this.toast.err(e?.error?.error || 'Could not register customer.');
    } finally { this.busy.set(false); }
  }

  /** Start a bill for this customer: choose gold/silver, then the prefilled New Transaction. */
  startTxn(c: RegisteredCustomer) {
    this.router.navigate(['/new'], { queryParams: { customerId: c.id } });
  }
}
