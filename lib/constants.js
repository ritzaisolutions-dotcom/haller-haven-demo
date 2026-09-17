/** Shared server constants for Haller Haven APIs. */
const HOME_MAX = 6;
const SITE_BASE = "https://haller-immobilien.de";
const ALLOWED_ORIGINS = [
  SITE_BASE,
  "https://www.haller-immobilien.de",
  "https://haller-haven-demo.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

module.exports = { HOME_MAX, SITE_BASE, ALLOWED_ORIGINS };
