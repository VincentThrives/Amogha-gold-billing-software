import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User } from '../models';

const TOKEN_KEY = 'amogha_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  get token(): string | null { return localStorage.getItem(TOKEN_KEY); }
  hasToken(): boolean { return !!this.token; }
  private setToken(t: string | null) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

  /** Phone + password login. */
  async login(phone: string, password: string): Promise<User> {
    const r = await firstValueFrom(this.http.post<{ token: string; user: User }>(
      '/api/auth/login', { phone, password }));
    this.setToken(r.token);
    return r.user;
  }

  /** Logged-in user changes their own password. */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/change-password', { currentPassword, newPassword }));
  }

  logout() { this.setToken(null); }

  // ---- OTP login (disabled for now — kept for easy re-enable) ----
  // requestOtp(phone: string, role: Role) {
  //   return firstValueFrom(this.http.post<{ name: string; role: Role; otp: string }>('/api/auth/request-otp', { phone, role }));
  // }
  // async verifyOtp(phone: string, otp: string): Promise<User> {
  //   const r = await firstValueFrom(this.http.post<{ token: string; user: User }>('/api/auth/verify-otp', { phone, otp }));
  //   this.setToken(r.token); return r.user;
  // }
}
