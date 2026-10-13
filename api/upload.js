const { isAdmin } = require("../lib/auth");
const { parseBody } = require("../lib/parse-body");
const { applyCors } = require("../lib/cors");
const { detectImageMime, isAllowedUploadMime } = require("../lib/image-mime");
const { config } = require("../lib/supabase");

var MAX_BYTES = 4 * 1024 * 1024;
var MAX_PDF_BYTES = 10 * 1024 * 1024;
var BUCKET = "listing-images";

function slug(raw, fallback) {
  return (
    String(raw || "")
      .toLowerCase()
      .replace(/\.pdf$/i, "")
      .replace(/[äöüß]/g, function (c) {
        return { ä: "ae", ö: "oe", ü: "ue", ß: "ss" }[c];
      })
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || fallback
  );
}

/**
 * PDFs (Grundrisse, Energieausweis, Hausverwaltung) bypass the 4.5 MB function body
 * limit: we return a short-lived signed upload URL and the browser PUTs the file
 * straight to Supabase Storage. Bucket allowed_mime_types / file_size_limit enforce type + size.
 */
async function signPdfUpload(cfg, body, folder, res) {
  var size = Number(body.size) || 0;
  if (size <= 0 || size > MAX_PDF_BYTES) {
    res.status(400).json({ ok: false, error: "PDF zu groß (max. 10 MB)" });
    return;
  }
  var pathname = folder + "/" + Date.now() + "-" + slug(body.name, "dokument") + ".pdf";
  var r = await fetch(cfg.url + "/storage/v1/object/upload/sign/" + BUCKET + "/" + pathname, {
    method: "POST",
    headers: {
      apikey: cfg.key,
      Authorization: "Bearer " + cfg.key,
      "Content-Type": "application/json"
    },
    body: "{}"
  });
  var j = await r.json().catch(function () {
    return null;
  });
  if (!r.ok || !j || !j.url) {
    console.error("upload sign", r.status, JSON.stringify(j).slice(0, 300));
    res.status(500).json({ ok: false, error: "upload failed" });
    return;
  }
  res.status(200).json({
    ok: true,
    uploadUrl: cfg.url + "/storage/v1" + j.url,
    url: cfg.url + "/storage/v1/object/public/" + BUCKET + "/" + pathname,
    pathname: pathname
  });
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
  // "site" = CMS assets (Partner-Logos, Hausverwaltung-PDF); default = per listing.
  var folder = body.scope === "site" ? "site" : "objekte/" + listingId;

  if (body.kind === "pdf") {
    try {
      await signPdfUpload(cfg, body, folder, res);
    } catch (e) {
      console.error("upload sign", e && e.message);
      res.status(500).json({ ok: false, error: "upload failed" });
    }
    return;
  }

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

  var pathname = folder + "/" + Date.now() + "." + detected.ext;
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
