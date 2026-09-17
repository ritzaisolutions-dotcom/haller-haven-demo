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

/**
 * Records a successful browser→Web3Forms inquiry (metrics only).
 * Mail is sent from the client to avoid Cloudflare blocking Vercel IPs.
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

  try {
    await recordInquiry({
      listingIds: listingIds,
      intent: clip(body.intent, 80) || null,
      visitorKey: clip(body.visitor_key, 64) || null,
      pagePath: clip(body.page_path, 300) || null
    });
  } catch (e) {
    console.error("inquiry_record", e && e.message, e && e.body);
    res.status(502).json({ ok: false, error: "record_failed" });
    return;
  }

  res.status(200).json({
    ok: true,
    success: true,
    objectTitles: titles
  });
};
