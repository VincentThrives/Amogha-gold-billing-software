import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StoreService } from '../services/store.service';

/** Admin-only routes (e.g. Settings). Super admin passes too. */
export const adminGuard: CanActivateFn = () => {
  const store = inject(StoreService);
  const router = inject(Router);
  return store.isAdmin() ? true : router.createUrlTree(['/dashboard']);
};

/** Super-admin-only routes (e.g. Feature Access). */
export const superAdminGuard: CanActivateFn = () => {
  const store = inject(StoreService);
  const router = inject(Router);
  return store.isSuperAdmin() ? true : router.createUrlTree(['/dashboard']);
};
