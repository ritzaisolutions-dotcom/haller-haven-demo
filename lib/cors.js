const { ALLOWED_ORIGINS } = require("./constants");

/**
 * Restrict CORS to the canonical site and local development.
 * Never allow arbitrary *.vercel.app or wildcard on mutating endpoints.
 */
function applyCors(res, origin, methods) {
  var allowed = origin && ALLOWED_ORIGINS.indexOf(origin) !== -1;
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", methods || "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0");
}

function isOriginAllowed(origin) {
  return !!(origin && ALLOWED_ORIGINS.indexOf(origin) !== -1);
}

module.exports = { applyCors, isOriginAllowed };
