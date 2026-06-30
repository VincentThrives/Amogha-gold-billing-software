import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StoreService } from '../../core/services/store.service';
import { Role } from '../../core/models';
import { digitsOnly } from '../../core/calc';
import { highlightField } from '../../core/ui';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private store = inject(StoreService);
  private router = inject(Router);

  role = signal<Role>('admin');
  phone = '';
  otp = '';
  generatedFor = signal('');
  shownOtp = signal('');
  step = signal<1 | 2>(1);
  hint = signal('');
  error = signal('');
  busy = signal(false);

  onPhone(v: string) { this.phone = digitsOnly(v, 10); }
  onOtp(v: string) { this.otp = digitsOnly(v, 6); }

  async sendOtp() {
    if (!/^\d{10}$/.test(this.phone)) { this.hint.set('Enter a valid 10-digit mobile number.'); highlightField(document.getElementById('login_phone')); return; }
    this.busy.set(true); this.hint.set('Sending OTP…');
    try {
      const r = await this.auth.requestOtp(this.phone, this.role());
      this.generatedFor.set(`${r.name} (${this.role()})`);
      this.shownOtp.set(r.otp);            // no SMS gateway yet — shown on screen
      this.otp = ''; this.error.set(''); this.hint.set('');
      this.step.set(2);
    } catch (e: any) {
      this.hint.set(e?.error?.error || 'Could not send OTP.');
    } finally { this.busy.set(false); }
  }

  async verify() {
    this.busy.set(true); this.error.set('');
    try {
      await this.auth.verifyOtp(this.phone, this.otp);
      await this.store.sync();
      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.error.set(e?.error?.error || 'Incorrect OTP. Please try again.');
      highlightField(document.getElementById('login_otp'));
    } finally { this.busy.set(false); }
  }

  back() { this.step.set(1); }
}
