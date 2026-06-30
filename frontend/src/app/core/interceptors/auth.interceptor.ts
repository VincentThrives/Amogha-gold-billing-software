import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Attaches the Bearer token and bounces to /login on 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;
  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authed).pipe(
    catchError((err) => {
      if (err?.status === 401 && !req.url.includes('/auth/')) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
