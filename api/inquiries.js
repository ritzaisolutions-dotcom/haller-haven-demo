const { parseBody } = require("../lib/parse-body");
const { applyCors } = require("../lib/cors");
const { clientIp } = require("../lib/auth");
const { checkRateLimit } = require("../lib/rate-limit");
const { listAll, recordInquiry } = require("../lib/listings-repo");
const { isPublicListing } = require("../lib/listings");
const { config } = require("../lib/supabase");
const { envMail, sendInquiryMail } = require("../lib/smtp-mail");

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

function fieldMap(body) {
  return {
    name: clip(body.name, 120),
    email: clip(body.email, 180),
    phone: clip(body.phone || body.tel, 80),
    intent: clip(body.intent, 80),
    kind: clip(body.kind || body.form_kind, 40) || "anfrage",
    place: clip(body.place, 160),
    message: clip(body.message || body.note, 4000),
    financing: clip(body.financing, 80),
    equity: clip(body.equity, 80),
    use: clip(body.use, 80),
    move_in: clip(body.move_in, 80),
    property_type: clip(body.property_type, 80),
    area: clip(body.area, 40),
    price_expect: clip(body.price_expect, 80),
    rooms: clip(body.rooms, 20),
    deal: clip(body.deal, 20),
    budget: clip(body.budget, 80)
  };
}

/**
 * Sends the inquiry by SMTP to the EU mailbox, then records metrics.
 */
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

  if (!envMail()) {
    res.status(503).json({ ok: false, error: "smtp_unconfigured" });
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

  var fields = fieldMap(body);
  if (!fields.name || !fields.email) {
    res.status(400).json({ ok: false, error: "name_email_required" });
    return;
  }

  var listingIds = asArray(body.object_ids || body.object_id || body.listing_ids)
    .map(function (x) {
      return clip(x, 80);
    })
    .filter(Boolean);
  var seen = {};
  listingIds = listingIds
    .filter(function (id) {
      if (seen[id]) return false;
      seen[id] = true;
      return true;
    })
    .slice(0, 12);

  var titles = asArray(body.object_titles || body.object_title)
    .map(function (x) {
      return clip(x, 180);
    })
    .filter(Boolean);

  if (config() && listingIds.length) {
    try {
      var all = await listAll();
      var byId = {};
      all.forEach(function (x) {
        byId[x.id] = x;
      });
      var valid = [];
      titles = [];
      listingIds.forEach(function (id) {
        var item = byId[id];
        if (item && (isPublicListing(item) || item.status === "verkauft")) {
          valid.push(id);
          titles.push(item.title || id);
        }
      });
      listingIds = valid;
    } catch (e) {
      console.error("inquiries list", e && e.message);
    }
  }

  var kindLabel =
    fields.kind === "bewertung"
      ? "Bewertung"
      : fields.kind === "suchprofil"
        ? "Suchprofil"
        : "Anfrage";
  var subject = clip(body.subject, 180) || kindLabel + " · Haller";
  if (titles.length) subject = kindLabel + " · " + titles.join(" · ") + " · Haller";

  try {
    await sendInquiryMail({
      subject: subject,
      name: fields.name,
      email: fields.email,
      phone: fields.phone,
      intent: fields.intent,
      kind: fields.kind,
      place: fields.place,
      message: fields.message,
      object_ids: listingIds.join(", "),
      object_titles: titles.join(" · "),
      financing: fields.financing,
      equity: fields.equity,
      use: fields.use,
      move_in: fields.move_in,
      property_type: fields.property_type,
      area: fields.area,
      price_expect: fields.price_expect,
      rooms: fields.rooms,
      deal: fields.deal,
      budget: fields.budget,
      page_path: clip(body.page_path, 300),
      privacy: "accepted",
      region: "EU"
    });
  } catch (e) {
    console.error("inquiry_smtp", e && e.message);
    res.status(502).json({
      ok: false,
      error: e && e.code === "smtp_unconfigured" ? "smtp_unconfigured" : "mail_failed"
    });
    return;
  }

  if (config()) {
    try {
      await recordInquiry({
        listingIds: listingIds,
        intent: fields.intent || fields.kind || null,
        visitorKey: clip(body.visitor_key, 64) || null,
        pagePath: clip(body.page_path, 300) || null
      });
    } catch (e) {
      console.error("inquiry_record", e && e.message);
    }
  }

  res.status(200).json({
    ok: true,
    success: true,
    objectTitles: titles,
    calUrl: process.env.CAL_COM_EVENT_URL || ""
  });
};
