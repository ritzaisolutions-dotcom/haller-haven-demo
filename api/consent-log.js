const ALLOWED_ACTIONS = { accept: true, decline: true, change: true };
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 12;
const hits = new Map();

function cors(res, origin) {
  const allowed = [
    "https://haller-haven-demo.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
  if (origin && (allowed.indexOf(origin) !== -1 || /\.vercel\.app$/.test(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function rateLimited(key) {
  const now = Date.now();
  const row = hits.get(key) || { n: 0, t: now };
  if (now - row.t > RATE_WINDOW_MS) {
    row.n = 0;
    row.t = now;
  }
  row.n += 1;
  hits.set(key, row);
  if (hits.size > 5000) {
    hits.clear();
  }
  return row.n > RATE_MAX;
}

function parseBody(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch (e) {
      return null;
    }
  }
  return req.body || {};
}

function clip(s, max) {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || "";
  cors(res, origin);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(503).json({ ok: false, error: "consent_store_unconfigured" });
    return;
  }

  const body = parseBody(req);
  if (!body) {
    res.status(400).json({ ok: false, error: "invalid_json" });
    return;
  }

  const action = String(body.action || "").toLowerCase();
  if (!ALLOWED_ACTIONS[action]) {
    res.status(400).json({ ok: false, error: "invalid_action" });
    return;
  }

  const services =
    body.services && typeof body.services === "object" && !Array.isArray(body.services)
      ? body.services
      : { necessary: true };

  const visitorKey = clip(body.visitor_key, 64);
  const rateKey = visitorKey || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "anon";
  if (rateLimited(String(rateKey))) {
    res.status(429).json({ ok: false, error: "rate_limited" });
    return;
  }

  let consentAt = new Date().toISOString();
  if (body.consent_at) {
    const d = new Date(body.consent_at);
    if (!Number.isNaN(d.getTime())) consentAt = d.toISOString();
  }

  const row = {
    client_id: "haller",
    consent_at: consentAt,
    action: action,
    services: services,
    visitor_key: visitorKey,
    page_path: clip(body.page_path, 300),
    site_host: clip(body.site_host, 120),
    user_agent: clip(body.user_agent || req.headers["user-agent"], 200),
  };

  try {
    const r = await fetch(url.replace(/\/$/, "") + "/rest/v1/website_consent_log", {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!r.ok) {
      const text = await r.text();
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
