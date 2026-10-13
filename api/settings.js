const { isAdmin } = require("../lib/auth");
const { parseBody } = require("../lib/parse-body");
const { applyCors } = require("../lib/cors");
const { config } = require("../lib/supabase");
const { DEFAULTS, loadAll, save, isKnownKey, bannerActive } = require("../lib/settings");

/**
 * GET  /api/settings          public site content (banner only when active today)
 * GET  /api/settings?all=1    admin: everything incl. inactive banner
 * PUT  /api/settings          admin: { key, value }
 */
module.exports = async function handler(req, res) {
  applyCors(res, req.headers.origin || "", "GET, PUT, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    var wantAll = String(req.query && req.query.all) === "1";
    if (wantAll && !isAdmin(req)) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    var data;
    try {
      data = config() ? await loadAll() : JSON.parse(JSON.stringify(DEFAULTS));
    } catch (e) {
      console.error("settings GET", e && e.message, e && e.body);
      // Site must keep rendering: serve defaults, but don't let the CDN pin them.
      res.status(200).json(Object.assign({ ok: true, fallback: true }, publicView(DEFAULTS)));
      return;
    }
    if (wantAll) {
      res.status(200).json(Object.assign({ ok: true }, data));
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
    res.status(200).json(Object.assign({ ok: true }, publicView(data)));
    return;
  }

  if (req.method === "PUT") {
    if (!isAdmin(req)) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    if (!config()) {
      res.status(503).json({ ok: false, error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen" });
      return;
    }
    var parsed = parseBody(req, {});
    if (!parsed.ok || !parsed.value || !isKnownKey(parsed.value.key)) {
      res.status(400).json({ ok: false, error: "invalid_key" });
      return;
    }
    try {
      var clean = await save(parsed.value.key, parsed.value.value);
      res.status(200).json({ ok: true, key: parsed.value.key, value: clean });
    } catch (e) {
      if (e && !e.status) {
        res.status(400).json({ ok: false, error: e.message || "invalid_value" });
        return;
      }
      console.error("settings PUT", e && e.message, e && e.body);
      res.status(500).json({ ok: false, error: "settings_write_failed" });
    }
    return;
  }

  res.status(405).json({ ok: false });
};

function publicView(data) {
  return {
    banner: bannerActive(data.banner) ? data.banner : null,
    partners: data.partners,
    reviews: data.reviews,
    pages: data.pages,
    hausverwaltungPdf: data.hausverwaltungPdf
  };
}
