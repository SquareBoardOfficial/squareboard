// legal.js
// Where the Terms of Use and Privacy Policy links point.
//
// By default the Terms link goes to the app's own /terms page (src/Terms.jsx).
// To point it somewhere else, or to add a privacy policy link, set these
// environment variables in Vercel and redeploy:
//
//   VITE_TERMS_URL    e.g. https://squareboardapp.com/terms
//   VITE_PRIVACY_URL  e.g. https://squareboardapp.com/privacy
//
// The Privacy link only shows once VITE_PRIVACY_URL is set.

export const TERMS_URL = import.meta.env.VITE_TERMS_URL || '/terms';
export const PRIVACY_URL = import.meta.env.VITE_PRIVACY_URL || '';
