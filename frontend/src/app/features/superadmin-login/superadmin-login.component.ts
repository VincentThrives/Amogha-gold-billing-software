import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-superadmin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './superadmin-login.component.html',
  styleUrl: '../login/login.component.scss',
})
export class SuperAdminLoginComponent {
  private auth = inject(AuthService);
  private store = inject(StoreService);
  private router = inject(Router);

  username = '';
  password = '';
  error = signal('');
  busy = signal(false);

  async login() {
    if (!this.username.trim()) { this.error.set('Enter the super admin email.'); return; }
    if (!this.password) { this.error.set('Enter the password.'); return; }
    this.busy.set(true); this.error.set('');
    try {
      await this.auth.login(this.username.trim(), this.password);
      await this.store.sync();
      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.error.set(e?.error?.error || 'Incorrect username or password.');
    } finally { this.busy.set(false); }
  }
}
