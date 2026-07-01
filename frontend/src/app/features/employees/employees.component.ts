import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { digitsOnly } from '../../core/calc';
import { highlightField } from '../../core/ui';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.scss',
})
export class EmployeesComponent {
  store = inject(StoreService);
  private toast = inject(ToastService);

  empName = '';
  empPhone = '';

  employees = computed(() => this.store.users().filter(u => u.role === 'employee'));
  onEmpPhone(v: string) { this.empPhone = digitsOnly(v, 10); }

  async addEmployee() {
    if (!this.empName.trim()) {
      this.toast.err('Enter the employee name.');
      highlightField(document.getElementById('emp_name'));
      return;
    }
    if (!/^\d{10}$/.test(this.empPhone)) {
      this.toast.err('Enter a valid 10-digit phone.');
      highlightField(document.getElementById('emp_phone'));
      return;
    }
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
}
