window.RAIS_ADMIN = { tenant: "haller-haven" };
/** Demo origin for previews until DNS cutover. Canonical production host remains haller-immobilien.de. */
window.RAIS_SITE_BASE = (function () {
  try {
    if (location && location.origin && /^https?:/.test(location.origin)) return location.origin;
  } catch (e) {}
  return "https://haller-haven-demo.vercel.app";
})();
window.RAIS_CANONICAL_HOST = "https://haller-immobilien.de";
window.RAIS_HOME_MAX = 4;
window.RAIS_LISTINGS_URL = "/api/listings";
window.RAIS_INQUIRIES_URL = "/api/inquiries";
/** Public Cal.com event URL. Empty = show fallback button only. Set CAL_COM_EVENT_URL on the server too. */
window.RAIS_CAL_URL = "";
