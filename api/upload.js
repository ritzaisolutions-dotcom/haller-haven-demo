const { put } = require("@vercel/blob");
const { isAdmin } = require("../lib/auth");

function noStore(res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
}

module.exports = async function handler(req, res) {
  noStore(res);

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(503).json({
      ok: false,
      error: "BLOB_READ_WRITE_TOKEN fehlt — Blob-Store im Vercel-Projekt anbinden"
    });
    return;
  }

  var body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  var dataUrl = body.dataUrl || body.data || "";
  var listingId = String(body.listingId || body.id || "misc")
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
  if (!mimeMatch) {
    res.status(400).json({ ok: false, error: "unsupported image mime" });
    return;
  }
  var mime = mimeMatch[1];
  var ext = mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : "jpg";
  var buf;
  try {
    buf = Buffer.from(b64, "base64");
  } catch (e) {
    res.status(400).json({ ok: false, error: "invalid base64" });
    return;
  }
  if (buf.length > 4 * 1024 * 1024) {
    res.status(400).json({ ok: false, error: "image too large (max 4 MB)" });
    return;
  }

  var pathname = "objekte/" + listingId + "/" + Date.now() + "." + ext;
  try {
    var result = await put(pathname, buf, {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    res.status(200).json({ ok: true, url: result.url, pathname: result.pathname });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "upload failed" });
  }
};
