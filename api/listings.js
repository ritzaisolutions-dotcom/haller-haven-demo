const { head, put } = require("@vercel/blob");
const { isAdmin } = require("../lib/auth");
const path = require("path");
const fs = require("fs");

const BLOB_PATH = "listings.json";
const HOME_MAX = 6;

function noStore(res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Access-Control-Allow-Origin", "*");
}

function seedFromDisk() {
  try {
    const seedPath = path.join(process.cwd(), "listings.json");
    const raw = fs.readFileSync(seedPath, "utf8");
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

async function readFromBlob() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const meta = await head(BLOB_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!meta || !meta.url) return null;
    const r = await fetch(meta.url + "?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) return null;
    const list = await r.json();
    return Array.isArray(list) ? list : null;
  } catch (e) {
    return null;
  }
}

function publicize(list) {
  return (list || [])
    .filter(function (x) {
      return x && x.enabled !== false;
    })
    .map(function (x) {
      var copy = Object.assign({}, x);
      delete copy.inquiryCount;
      return copy;
    });
}

function validateList(list) {
  if (!Array.isArray(list)) return "Body must be an array";
  var ids = {};
  var featured = 0;
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (!item || typeof item !== "object") return "Invalid item at index " + i;
    if (!item.id || typeof item.id !== "string") return "Missing id at index " + i;
    if (ids[item.id]) return "Duplicate id: " + item.id;
    ids[item.id] = true;
    if (item.featured === true && item.enabled !== false && item.status !== "verkauft") {
      featured += 1;
    }
    if (Array.isArray(item.images)) {
      for (var j = 0; j < item.images.length; j++) {
        var src = item.images[j];
        if (typeof src !== "string" || !src.trim()) return "Invalid image at " + item.id;
        if (src.indexOf("data:") === 0) {
          return "Data-URL images not allowed — upload via /api/upload first (" + item.id + ")";
        }
        if (/\s|\.\./.test(src)) return "Invalid image URL at " + item.id;
        var okUrl =
          src.indexOf("http://") === 0 ||
          src.indexOf("https://") === 0 ||
          src.indexOf("/") === 0 ||
          /^[a-zA-Z0-9_./-]+$/.test(src);
        if (!okUrl) return "Invalid image URL at " + item.id;
      }
    }
  }
  if (featured > HOME_MAX) {
    return "Max " + HOME_MAX + " featured listings on Startseite (got " + featured + ")";
  }
  return null;
}

module.exports = async function handler(req, res) {
  noStore(res);

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    var list = (await readFromBlob()) || seedFromDisk();
    var admin = isAdmin(req);
    var wantAll = String(req.query && req.query.all) === "1";
    if (admin && wantAll) {
      res.status(200).json(list);
      return;
    }
    res.status(200).json(publicize(list));
    return;
  }

  if (req.method === "PUT") {
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
    var body = typeof req.body === "string" ? JSON.parse(req.body || "[]") : req.body;
    var err = validateList(body);
    if (err) {
      res.status(400).json({ ok: false, error: err });
      return;
    }
    try {
      await put(BLOB_PATH, JSON.stringify(body, null, 2), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      res.status(200).json({ ok: true, count: body.length });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message || "Blob write failed" });
    }
    return;
  }

  res.status(405).json({ ok: false });
};
