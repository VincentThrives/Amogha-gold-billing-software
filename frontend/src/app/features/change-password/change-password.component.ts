import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-password.component.html',
})
export class ChangePasswordComponent {
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  current = '';
  next = '';
  confirm = '';
  busy = signal(false);

  async submit() {
    if (!this.current) { this.toast.err('Enter your current password.'); return; }
    if (this.next.length < 4) { this.toast.err('New password must be at least 4 characters.'); return; }
    if (this.next !== this.confirm) { this.toast.err('The new passwords do not match.'); return; }
    this.busy.set(true);
    try {
      await this.auth.changePassword(this.current, this.next);
      this.toast.ok('Your password has been changed.');
      this.current = ''; this.next = ''; this.confirm = '';
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not change password.'); }
    finally { this.busy.set(false); }
  }
}
