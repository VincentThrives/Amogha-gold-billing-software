import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StoreService } from '../../core/services/store.service';
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

  phone = '';
  password = '';
  error = signal('');
  busy = signal(false);

  onPhone(v: string) { this.phone = digitsOnly(v, 10); }

  async login() {
    if (!/^\d{10}$/.test(this.phone)) { this.error.set('Enter a valid 10-digit mobile number.'); highlightField(document.getElementById('login_phone')); return; }
    if (!this.password) { this.error.set('Enter your password.'); highlightField(document.getElementById('login_password')); return; }
    this.busy.set(true); this.error.set('');
    try {
      await this.auth.login(this.phone, this.password);
      await this.store.sync();
      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.error.set(e?.error?.error || 'Incorrect phone number or password.');
      highlightField(document.getElementById('login_password'));
    } finally { this.busy.set(false); }
  }
}
