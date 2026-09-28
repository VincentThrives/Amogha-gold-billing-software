import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard, superAdminGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'superadmin',
    loadComponent: () => import('./features/superadmin-login/superadmin-login.component').then(m => m.SuperAdminLoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'register', loadComponent: () => import('./features/register-customer/register-customer.component').then(m => m.RegisterCustomerComponent) },
      { path: 'new', loadComponent: () => import('./features/new-transaction-select/new-transaction-select.component').then(m => m.NewTransactionSelectComponent) },
      { path: 'new/:metal', loadComponent: () => import('./features/new-transaction/new-transaction.component').then(m => m.NewTransactionComponent) },
      { path: 'transactions', loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent) },
      { path: 'approvals', loadComponent: () => import('./features/approvals-hub/approvals-hub.component').then(m => m.ApprovalsHubComponent) },
      { path: 'approvals/:id', canActivate: [adminGuard], loadComponent: () => import('./features/approval-edit/approval-edit.component').then(m => m.ApprovalEditComponent) },
      { path: 'rate', loadComponent: () => import('./features/rate/rate.component').then(m => m.RateComponent) },
      { path: 'funds', redirectTo: 'approvals', pathMatch: 'full' },
      { path: 'billing-defaults', canActivate: [adminGuard], loadComponent: () => import('./features/billing-defaults/billing-defaults.component').then(m => m.BillingDefaultsComponent) },
      { path: 'employees', canActivate: [adminGuard], loadComponent: () => import('./features/employees/employees.component').then(m => m.EmployeesComponent) },
      { path: 'change-password', loadComponent: () => import('./features/change-password/change-password.component').then(m => m.ChangePasswordComponent) },
      { path: 'features', canActivate: [superAdminGuard], loadComponent: () => import('./features/feature-access/feature-access.component').then(m => m.FeatureAccessComponent) },
      { path: 'reports', loadComponent: () => import('./features/reports-hub/reports-hub.component').then(m => m.ReportsHubComponent) },
      { path: 'fund-reports', redirectTo: 'reports', pathMatch: 'full' },
      { path: 'expense', canActivate: [adminGuard], loadComponent: () => import('./features/expense/expense.component').then(m => m.ExpenseComponent) },
      { path: 'deleted', canActivate: [adminGuard], loadComponent: () => import('./features/deleted-invoices/deleted-invoices.component').then(m => m.DeletedInvoicesComponent) },
      { path: 'settings', canActivate: [adminGuard], loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'invoice/:id', loadComponent: () => import('./features/invoice/invoice.component').then(m => m.InvoiceComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
