import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** Routes relative /api requests to the environment's backend base URL. */
export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  const base = environment.apiUrl;
  if (base && req.url.startsWith('/api')) {
    return next(req.clone({ url: base.replace(/\/$/, '') + req.url }));
  }
  return next(req);
};
