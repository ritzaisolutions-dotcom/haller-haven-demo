const { applyCors } = require("../lib/cors");
const { clientIp } = require("../lib/auth");
const { checkRateLimit } = require("../lib/rate-limit");

/**
 * Returns the Web3Forms access key for browser submit.
 * Cloudflare blocks Vercel→Web3Forms, so the visitor's browser must post the mail.
 */
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

  var rate = await checkRateLimit("form-config", clientIp(req), 30, 60);
  if (rate.unavailable) {
    res.status(503).json({ ok: false, error: "rate_limit_unavailable" });
    return;
  }
  if (rate.limited) {
    res.status(429).json({ ok: false, error: "rate_limited" });
    return;
  }

  var key = process.env.WEB3FORMS_ACCESS_KEY || "";
  if (!key || key.indexOf("REPLACE_") === 0) {
    res.status(503).json({ ok: false, error: "form_unconfigured" });
    return;
  }

  res.status(200).json({
    ok: true,
    accessKey: key,
    fromName: "Haller Haven Website"
  });
};
