import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/** Attaches the Bearer token and, on 401, signs out with a clear "session expired" message. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const token = auth.token;
  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authed).pipe(
    catchError((err) => {
      if (err?.status === 401 && !req.url.includes('/auth/')) {
        auth.logout();
        router.navigate(['/login']);
        toast.err('Your session expired — please sign in again.');
      }
      return throwError(() => err);
    })
  );
};
