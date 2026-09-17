const ALLOWED_ACTIONS = { accept: true, decline: true, change: true };
const { parseBody } = require("../lib/parse-body");
const { applyCors } = require("../lib/cors");
const { clientIp } = require("../lib/auth");
const { checkRateLimit } = require("../lib/rate-limit");
const { config } = require("../lib/supabase");

function clip(s, max) {
  if (s == null) return null;
  var t = String(s).trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function sanitizeServices(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { necessary: true };
  }
  var out = {};
  var keys = Object.keys(raw).slice(0, 20);
  keys.forEach(function (k) {
    var key = String(k).slice(0, 40);
    out[key] = !!raw[k];
  });
  if (!Object.prototype.hasOwnProperty.call(out, "necessary")) {
    out.necessary = true;
  }
  return out;
}

module.exports = async function handler(req, res) {
  var origin = req.headers.origin || "";
  applyCors(res, origin, "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }

  var cfg = config();
  if (!cfg) {
    res.status(503).json({ ok: false, error: "consent_store_unconfigured" });
    return;
  }

  var parsed = parseBody(req, {});
  if (!parsed.ok) {
    res.status(400).json({ ok: false, error: "invalid_json" });
    return;
  }
  var body = parsed.value || {};

  var action = String(body.action || "").toLowerCase();
  if (!ALLOWED_ACTIONS[action]) {
    res.status(400).json({ ok: false, error: "invalid_action" });
    return;
  }

  var services = sanitizeServices(body.services);
  var visitorKey = clip(body.visitor_key, 64);
  var rateKey = visitorKey || clientIp(req);
  var rate = await checkRateLimit("consent", rateKey, 12, 60);
  if (rate.unavailable) {
    res.status(503).json({ ok: false, error: "rate_limit_unavailable" });
    return;
  }
  if (rate.limited) {
    res.status(429).json({ ok: false, error: "rate_limited" });
    return;
  }

  var consentAt = new Date().toISOString();
  if (body.consent_at) {
    var d = new Date(body.consent_at);
    if (!Number.isNaN(d.getTime())) consentAt = d.toISOString();
  }

  var row = {
    client_id: "haller",
    consent_at: consentAt,
    action: action,
    services: services,
    visitor_key: visitorKey,
    page_path: clip(body.page_path, 300),
    site_host: clip(body.site_host, 120),
    user_agent: clip(body.user_agent || req.headers["user-agent"], 200)
  };

  try {
    var r = await fetch(cfg.url + "/rest/v1/website_consent_log", {
      method: "POST",
      headers: {
        apikey: cfg.key,
        Authorization: "Bearer " + cfg.key,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(row)
    });
    if (!r.ok) {
      var text = await r.text();
      console.error("consent-log supabase", r.status, text.slice(0, 300));
      res.status(502).json({ ok: false, error: "store_failed" });
      return;
    }
    res.status(204).end();
  } catch (e) {
    console.error("consent-log", e);
    res.status(502).json({ ok: false, error: "store_failed" });
  }
};
