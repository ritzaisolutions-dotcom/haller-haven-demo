const { HOME_MAX, SITE_BASE } = require("../lib/constants");
const { applyCors } = require("../lib/cors");

/** Public runtime config — no secrets. */
module.exports = async function handler(req, res) {
  applyCors(res, req.headers.origin || "", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ ok: false });
    return;
  }

  res.status(200).json({
    ok: true,
    homeMax: HOME_MAX,
    siteBase: SITE_BASE,
    listingsUrl: "/api/listings"
  });
};
