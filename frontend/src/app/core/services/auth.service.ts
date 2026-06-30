import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Role, User } from '../models';

const TOKEN_KEY = 'amogha_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  get token(): string | null { return localStorage.getItem(TOKEN_KEY); }
  hasToken(): boolean { return !!this.token; }
  private setToken(t: string | null) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

  requestOtp(phone: string, role: Role) {
    return firstValueFrom(this.http.post<{ name: string; role: Role; otp: string }>(
      '/api/auth/request-otp', { phone, role }));
  }

  async verifyOtp(phone: string, otp: string): Promise<User> {
    const r = await firstValueFrom(this.http.post<{ token: string; user: User }>(
      '/api/auth/verify-otp', { phone, otp }));
    this.setToken(r.token);
    return r.user;
  }

  logout() { this.setToken(null); }
}
