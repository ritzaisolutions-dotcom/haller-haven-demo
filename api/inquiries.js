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

  var payload = {
    access_key: key,
    subject: subject,
    from_name: "Haller Haven Website",
    name: name,
    email: email,
    privacy: "accepted",
    consent_at: new Date().toISOString()
  };
  if (phone) payload.phone = phone;
  if (message) payload.message = message;
  if (intent) payload.intent = intent;
  if (listingIds.length) {
    payload.object_ids = listingIds.join(", ");
    payload.object_id = listingIds[0];
  }
  if (titles.length) {
    payload.object_titles = titles.join(" · ");
    payload.object_title = titles.join(" · ");
  }
  ["place", "object_ref", "object_type"].forEach(function (k) {
    var v = clip(body[k], 200);
    if (v) payload[k] = v;
  });

  var w3;
  try {
    var r = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });
    var raw = await r.text();
    try {
      w3 = JSON.parse(raw);
    } catch (parseErr) {
      console.error("web3forms non-json", r.status, raw.slice(0, 200));
      res.status(502).json({ ok: false, error: "mail_failed" });
      return;
    }
    if (!r.ok || !w3 || !w3.success) {
      console.error("web3forms reject", r.status, w3 && w3.message);
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
