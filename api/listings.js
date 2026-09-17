const { isAdmin } = require("../lib/auth");
const { parseBody } = require("../lib/parse-body");
const { applyCors } = require("../lib/cors");
const { HOME_MAX } = require("../lib/constants");
const { publicize } = require("../lib/listings");
const { validateList } = require("../lib/validate-list");
const { listAll, replaceAll } = require("../lib/listings-repo");
const { config } = require("../lib/supabase");

module.exports = async function handler(req, res) {
  applyCors(res, req.headers.origin || "", "GET, PUT, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    var wantAll = String(req.query && req.query.all) === "1";
    var admin = isAdmin(req);

    if (wantAll && !admin) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }

    try {
      var list = await listAll();
      if (admin && wantAll) {
        res.status(200).json(list);
        return;
      }
      res.status(200).json(publicize(list));
    } catch (e) {
      console.error("listings GET", e && e.message, e && e.body);
      if (e && e.code === "supabase_unconfigured") {
        res.status(503).json({ ok: false, error: "listings_store_unconfigured" });
        return;
      }
      // Fail closed — never substitute seed data for live reads.
      res.status(502).json({ ok: false, error: "listings_unavailable" });
    }
    return;
  }

  if (req.method === "PUT") {
    if (!isAdmin(req)) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    if (!config()) {
      res.status(503).json({
        ok: false,
        error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen"
      });
      return;
    }

    var parsed = parseBody(req, []);
    if (!parsed.ok) {
      res.status(400).json({ ok: false, error: "invalid_json" });
      return;
    }

    var err = validateList(parsed.value, HOME_MAX);
    if (err) {
      res.status(400).json({ ok: false, error: err });
      return;
    }

    try {
      var count = await replaceAll(parsed.value);
      res.status(200).json({ ok: true, count: count });
    } catch (e) {
      console.error("listings PUT", e && e.message, e && e.body);
      res.status(500).json({ ok: false, error: "listings_write_failed" });
    }
    return;
  }

  res.status(405).json({ ok: false });
};
