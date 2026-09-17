const { isAdmin } = require("../lib/auth");
const { parseBody } = require("../lib/parse-body");
const { applyCors } = require("../lib/cors");
const { detectImageMime, isAllowedUploadMime } = require("../lib/image-mime");
const { config } = require("../lib/supabase");

var MAX_BYTES = 4 * 1024 * 1024;
var BUCKET = "listing-images";

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

  if (!isAdmin(req)) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  var cfg = config();
  if (!cfg) {
    res.status(503).json({
      ok: false,
      error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen"
    });
    return;
  }

  var parsed = parseBody(req, {});
  if (!parsed.ok) {
    res.status(400).json({ ok: false, error: "invalid_json" });
    return;
  }

  var body = parsed.value || {};
  var dataUrl = body.dataUrl || body.data || "";
  var listingId =
    String(body.listingId || body.id || "misc")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 64) || "misc";

  if (typeof dataUrl !== "string" || dataUrl.indexOf("data:image/") !== 0) {
    res.status(400).json({ ok: false, error: "dataUrl (data:image/...) required" });
    return;
  }

  var comma = dataUrl.indexOf(",");
  if (comma < 0) {
    res.status(400).json({ ok: false, error: "invalid dataUrl" });
    return;
  }

  var meta = dataUrl.slice(0, comma);
  var b64 = dataUrl.slice(comma + 1);
  var mimeMatch = meta.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64$/);
  if (!mimeMatch || !isAllowedUploadMime(mimeMatch[1])) {
    res.status(400).json({ ok: false, error: "unsupported image mime" });
    return;
  }

  var buf;
  try {
    buf = Buffer.from(b64, "base64");
  } catch (e) {
    res.status(400).json({ ok: false, error: "invalid base64" });
    return;
  }

  if (!buf.length) {
    res.status(400).json({ ok: false, error: "empty image" });
    return;
  }
  if (buf.length > MAX_BYTES) {
    res.status(400).json({ ok: false, error: "image too large (max 4 MB)" });
    return;
  }

  var detected = detectImageMime(buf);
  if (!detected || !isAllowedUploadMime(detected.mime)) {
    res.status(400).json({ ok: false, error: "unsupported image content" });
    return;
  }

  var pathname = "objekte/" + listingId + "/" + Date.now() + "." + detected.ext;
  var uploadUrl = cfg.url + "/storage/v1/object/" + BUCKET + "/" + pathname;

  try {
    var r = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: cfg.key,
        Authorization: "Bearer " + cfg.key,
        "Content-Type": detected.mime,
        "x-upsert": "true"
      },
      body: buf
    });
    if (!r.ok) {
      var text = await r.text();
      console.error("upload supabase", r.status, text.slice(0, 300));
      res.status(500).json({ ok: false, error: "upload failed" });
      return;
    }

    var publicUrl = cfg.url + "/storage/v1/object/public/" + BUCKET + "/" + pathname;
    res.status(200).json({ ok: true, url: publicUrl, pathname: pathname });
  } catch (e) {
    console.error("upload", e && e.message);
    res.status(500).json({ ok: false, error: "upload failed" });
  }
};
