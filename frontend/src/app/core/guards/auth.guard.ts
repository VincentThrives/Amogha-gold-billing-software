import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { StoreService } from '../services/store.service';

/** Requires a token; ensures the snapshot is hydrated before activating. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const store = inject(StoreService);
  const router = inject(Router);
  if (!auth.hasToken()) return router.createUrlTree(['/login']);
  if (!store.me()) {
    try { await store.sync(); }
    catch { auth.logout(); return router.createUrlTree(['/login']); }
  }
  return true;
};
