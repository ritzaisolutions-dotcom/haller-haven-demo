const { parseBody } = require("../lib/parse-body");
const { applyCors } = require("../lib/cors");
const {
  passwordMatches,
  signSession,
  sessionCookie,
  passwordSecret,
  clientIp
} = require("../lib/auth");
const { checkRateLimit } = require("../lib/rate-limit");

module.exports = async function handler(req, res) {
  applyCors(res, req.headers.origin || "", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }

  if (!passwordSecret()) {
    res.status(503).json({ ok: false, error: "ADMIN_PASSWORD env fehlt" });
    return;
  }
  if (!process.env.ADMIN_SESSION_SECRET) {
    res.status(503).json({ ok: false, error: "ADMIN_SESSION_SECRET env fehlt" });
    return;
  }

  var ip = clientIp(req);
  var rate = await checkRateLimit("admin-login", ip, 8, 60);
  if (rate.unavailable) {
    res.status(503).json({ ok: false, error: "rate_limit_unavailable" });
    return;
  }
  if (rate.limited) {
    res.status(429).json({ ok: false, error: "rate_limited" });
    return;
  }

  var parsed = parseBody(req, {});
  if (!parsed.ok) {
    res.status(400).json({ ok: false, error: "invalid_json" });
    return;
  }

  if (!passwordMatches(String((parsed.value && parsed.value.password) || ""))) {
    res.status(401).json({ ok: false });
    return;
  }

  var token = signSession();
  if (!token) {
    res.status(503).json({ ok: false, error: "ADMIN_SESSION_SECRET env fehlt" });
    return;
  }

  res.setHeader("Set-Cookie", sessionCookie(token));
  res.status(200).json({ ok: true });
};
