import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StoreService } from '../services/store.service';

/** Admin-only routes (e.g. Settings). */
export const adminGuard: CanActivateFn = () => {
  const store = inject(StoreService);
  const router = inject(Router);
  return store.isAdmin() ? true : router.createUrlTree(['/dashboard']);
};
