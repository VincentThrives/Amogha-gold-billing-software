// Development environment.
// The app is served by the local Spring Boot jar (same origin at :8088) or via `ng serve`
// (:4200), both of which reach the backend at localhost:8088. Swapped for environment.prod.ts
// in production builds (see angular.json fileReplacements).
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8088',
};
