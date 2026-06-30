import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { digitsOnly } from '../../core/calc';

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
  private router = inject(Router);

  c = this.store.company();
  name = this.c?.name || '';
  addr = (this.c?.addressLines || []).join('\n');
  gstn = this.c?.gstn || '';
  phone = this.c?.phone || '';

  empName = '';
  empPhone = '';
  busy = signal(false);

  employees = computed(() => this.store.users().filter(u => u.role === 'employee'));
  onEmpPhone(v: string) { this.empPhone = digitsOnly(v, 10); }

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

  async addEmployee() {
    if (!this.empName.trim() || !/^\d{10}$/.test(this.empPhone)) { this.toast.err('Enter name and valid 10-digit phone.'); return; }
    try {
      await this.store.addEmployee(this.empName.trim(), this.empPhone);
      this.toast.ok('Employee added.');
      this.empName = ''; this.empPhone = '';
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not add employee.'); }
  }

  async removeEmployee(id: string) {
    try { await this.store.removeEmployee(id); this.toast.show('Employee removed.'); }
    catch (e: any) { this.toast.err(e?.error?.error || 'Could not remove.'); }
  }

  async reset() {
    if (!confirm('Wipe ALL transactions, funds & rates? This cannot be undone.')) return;
    try {
      await this.store.resetAll();
      this.toast.show('All data reset.');
      this.router.navigate(['/dashboard']);
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not reset.'); }
  }
}
