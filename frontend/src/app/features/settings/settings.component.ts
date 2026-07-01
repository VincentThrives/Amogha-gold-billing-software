import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  store = inject(StoreService);
  private toast = inject(ToastService);

  c = this.store.company();
  name = this.c?.name || '';
  addr = (this.c?.addressLines || []).join('\n');
  gstn = this.c?.gstn || '';
  phone = this.c?.phone || '';

  busy = signal(false);

  async saveCompany() {
    this.busy.set(true);
    try {
      await this.store.setCompany({
        name: this.name.trim(),
        addressLines: this.addr.split('\n').map(s => s.trim()).filter(Boolean),
        gstn: this.gstn.trim(),
        phone: this.phone.trim(),
        terms: this.c?.terms,
        legalName: this.c?.legalName,
      });
      this.toast.ok('Company details saved.');
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not save.'); }
    finally { this.busy.set(false); }
  }
}
