window.RAIS_ADMIN = { tenant: "haller-haven" };
/** Canonical site origin. Preview URL remains allowed in CORS until DNS cutover. */
window.RAIS_SITE_BASE = "https://haller-immobilien.de";
/** Max listings shown on the home page (featured only). Mirrored server-side in lib/constants.js. */
window.RAIS_HOME_MAX = 6;
/** Live listings endpoint (Supabase-backed; no static JSON fallback). */
window.RAIS_LISTINGS_URL = "/api/listings";
/** After browser→Web3Forms success, metrics are recorded here. */
window.RAIS_INQUIRIES_URL = "/api/inquiries";
