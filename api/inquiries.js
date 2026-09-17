const { parseBody } = require("../lib/parse-body");
const { applyCors } = require("../lib/cors");
const { clientIp } = require("../lib/auth");
const { checkRateLimit } = require("../lib/rate-limit");
const { listAll, recordInquiry } = require("../lib/listings-repo");
const { isPublicListing } = require("../lib/listings");
const { config } = require("../lib/supabase");

function clip(s, max) {
  if (s == null) return "";
  var t = String(s).trim();
  if (!t) return "";
  return t.length > max ? t.slice(0, max) : t;
}

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null || v === "") return [];
  return [v];
}

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

  var key = process.env.WEB3FORMS_ACCESS_KEY;
  if (!key || key.indexOf("REPLACE_") === 0) {
    res.status(503).json({ ok: false, error: "form_unconfigured" });
    return;
  }
  if (!config()) {
    res.status(503).json({ ok: false, error: "listings_store_unconfigured" });
    return;
  }

  var rate = await checkRateLimit("inquiries", clientIp(req), 6, 60);
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
  var body = parsed.value || {};

  if (!body.privacy && body.privacy !== "accepted" && body.privacy !== true) {
    res.status(400).json({ ok: false, error: "privacy_required" });
    return;
  }

  var name = clip(body.name, 120);
  var email = clip(body.email, 200);
  var phone = clip(body.phone || body.tel, 60);
  var message = clip(body.message || body.msg, 4000);
  var intent = clip(body.intent, 80);
  var subject = clip(body.subject, 200) || "Neue Anfrage · Haller";

  if (!name || !email) {
    res.status(400).json({ ok: false, error: "name_email_required" });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ ok: false, error: "invalid_email" });
    return;
  }

  var listingIds = asArray(body.object_ids || body.object_id || body.listing_ids)
    .map(function (x) {
      return clip(x, 80);
    })
    .filter(Boolean);
  // Dedupe, cap
  var seen = {};
  listingIds = listingIds.filter(function (id) {
    if (seen[id]) return false;
    seen[id] = true;
    return true;
  }).slice(0, 12);

  var titles = [];
  try {
    if (listingIds.length) {
      var all = await listAll();
      var byId = {};
      all.forEach(function (x) {
        byId[x.id] = x;
      });
      var valid = [];
      listingIds.forEach(function (id) {
        var item = byId[id];
        if (item && isPublicListing(item)) {
          valid.push(id);
          titles.push(item.title || id);
        }
      });
      listingIds = valid;
    }
  } catch (e) {
    console.error("inquiries list", e && e.message);
    res.status(502).json({ ok: false, error: "listings_unavailable" });
    return;
  }

  if (titles.length) {
    var prefix =
      intent === "besichtigung" || intent === "objekt"
        ? "Besichtigung / Objektinteresse"
        : "Anfrage";
    subject = clip(prefix + " · " + titles.join(" · ") + " · Haller", 200);
  }

  var fd = new FormData();
  fd.append("access_key", key);
  fd.append("subject", subject);
  fd.append("from_name", "Haller Haven Website");
  fd.append("name", name);
  fd.append("email", email);
  if (phone) fd.append("phone", phone);
  if (message) fd.append("message", message);
  if (intent) fd.append("intent", intent);
  fd.append("privacy", "accepted");
  fd.append("consent_at", new Date().toISOString());
  if (listingIds.length) {
    fd.append("object_ids", listingIds.join(", "));
    fd.append("object_id", listingIds[0]);
  }
  if (titles.length) {
    fd.append("object_titles", titles.join(" · "));
    fd.append("object_title", titles.join(" · "));
  }

  var extraKeys = ["place", "object_ref", "object_type"];
  extraKeys.forEach(function (k) {
    var v = clip(body[k], 200);
    if (v) fd.append(k, v);
  });

  var w3;
  try {
    var r = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: fd
    });
    w3 = await r.json();
    if (!r.ok || !w3 || !w3.success) {
      res.status(502).json({
        ok: false,
        error: "mail_failed",
        message: (w3 && w3.message) || "Senden fehlgeschlagen."
      });
      return;
    }
  } catch (e) {
    console.error("web3forms", e && e.message);
    res.status(502).json({ ok: false, error: "mail_failed" });
    return;
  }

  try {
    await recordInquiry({
      listingIds: listingIds,
      intent: intent || null,
      visitorKey: clip(body.visitor_key, 64) || null,
      pagePath: clip(body.page_path, 300) || null
    });
  } catch (e) {
    // Mail already sent — log metric failure but still report success to visitor.
    console.error("inquiry_record", e && e.message, e && e.body);
  }

  res.status(200).json({
    ok: true,
    success: true,
    objectTitles: titles
  });
};
