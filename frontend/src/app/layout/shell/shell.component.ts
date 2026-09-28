import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { AuthService } from '../../core/services/auth.service';
import { DialogHostComponent } from '../../shared/dialog-host/dialog-host.component';
import { inr } from '../../core/calc';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, DialogHostComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit, OnDestroy {
  store = inject(StoreService);
  private auth = inject(AuthService);
  private router = inject(Router);

  menuOpen = signal(false);
  private poll: any = null;

  nav = [
    { path: '/dashboard', icon: 'fa-gauge-high', label: 'Dashboard', feature: '' },
    { path: '/register', icon: 'fa-user-plus', label: 'Register Customer', feature: 'register' },
    { path: '/new', icon: 'fa-plus', label: 'New Transaction', feature: 'new' },
    { path: '/transactions', icon: 'fa-list', label: 'Transaction List', feature: 'transactions' },
    { path: '/rate', icon: 'fa-coins', label: 'Gold / Silver Rate', feature: 'rate' },
  ];

  inr0 = (n: number) => inr(n, 0);

  ngOnInit() {
    // keep snapshot fresh across devices (signals re-render bound views; ngModel inputs are untouched)
    this.poll = setInterval(() => { if (this.auth.hasToken()) this.store.sync().catch(() => {}); }, 20000);
  }
  ngOnDestroy() { clearInterval(this.poll); }

  logout() {
    clearInterval(this.poll);
    this.auth.logout();
    this.store.clear();
    this.router.navigate(['/login']);
  }
}
