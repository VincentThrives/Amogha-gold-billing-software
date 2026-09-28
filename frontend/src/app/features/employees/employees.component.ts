import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { User } from '../../core/models';
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
  private dlg = inject(DialogService);

  newName = '';
  newPhone = '';
  newRole: 'admin' | 'employee' = 'employee';
  newPassword = '';
  busy = signal(false);

  users = computed(() => this.store.users());
  me = computed(() => this.store.me());

  onPhone(v: string) { this.newPhone = digitsOnly(v, 10); }

  async createUser() {
    if (!this.newName.trim()) { this.toast.err('Enter the name.'); highlightField(document.getElementById('u_name')); return; }
    if (!/^\d{10}$/.test(this.newPhone)) { this.toast.err('Enter a valid 10-digit phone.'); highlightField(document.getElementById('u_phone')); return; }
    if (this.newPassword.length < 4) { this.toast.err('Password must be at least 4 characters.'); highlightField(document.getElementById('u_password')); return; }
    this.busy.set(true);
    try {
      await this.store.createUser(this.newName.trim(), this.newPhone, this.newRole, this.newPassword);
      this.toast.ok(`${this.newRole === 'admin' ? 'Admin' : 'Staff member'} added.`);
      this.newName = ''; this.newPhone = ''; this.newRole = 'employee'; this.newPassword = '';
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not add user.'); }
    finally { this.busy.set(false); }
  }

  async resetPassword(u: User) {
    const pw = await this.dlg.prompt({ title: 'Reset password', message: `Set a new password for ${u.name} (${u.phone}).`, password: true, placeholder: 'New password', okText: 'Reset' });
    if (pw == null) return;
    if (pw.length < 4) { this.toast.err('Password must be at least 4 characters.'); return; }
    try { await this.store.resetUserPassword(u.id, pw); this.toast.ok(`Password reset for ${u.name}.`); }
    catch (e: any) { this.toast.err(e?.error?.error || 'Could not reset password.'); }
  }

  async changePhone(u: User) {
    const entered = await this.dlg.prompt({ title: 'Change mobile number', message: `New mobile number for ${u.name} (current ${u.phone}).`, value: u.phone, placeholder: '10-digit number', okText: 'Update' });
    if (entered == null) return;
    const phone = digitsOnly(entered, 10);
    if (!/^\d{10}$/.test(phone)) { this.toast.err('Enter a valid 10-digit phone.'); return; }
    if (phone === u.phone) return;
    try { await this.store.changeUserPhone(u.id, phone); this.toast.ok(`Mobile number updated for ${u.name}.`); }
    catch (e: any) { this.toast.err(e?.error?.error || 'Could not update number.'); }
  }

  async remove(id: string) {
    try { await this.store.removeEmployee(id); this.toast.show('User removed.'); }
    catch (e: any) { this.toast.err(e?.error?.error || 'Could not remove.'); }
  }
}
