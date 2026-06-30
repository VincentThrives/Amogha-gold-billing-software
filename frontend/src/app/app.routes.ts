import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'new', loadComponent: () => import('./features/new-transaction-select/new-transaction-select.component').then(m => m.NewTransactionSelectComponent) },
      { path: 'new/:metal', loadComponent: () => import('./features/new-transaction/new-transaction.component').then(m => m.NewTransactionComponent) },
      { path: 'transactions', loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent) },
      { path: 'rate', loadComponent: () => import('./features/rate/rate.component').then(m => m.RateComponent) },
      { path: 'funds', loadComponent: () => import('./features/funds/funds.component').then(m => m.FundsComponent) },
      { path: 'reports', loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent) },
      { path: 'settings', canActivate: [adminGuard], loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'invoice/:id', loadComponent: () => import('./features/invoice/invoice.component').then(m => m.InvoiceComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
