// Production environment.
// The static frontend (e.g. Netlify) calls the Render-hosted backend cross-origin.
// The backend must allow this origin via its CORS_ORIGINS env var.
export const environment = {
  production: true,
  apiUrl: 'https://amogha-gold-billing-software.onrender.com',
};
