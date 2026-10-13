/**
 * Admin-editable site content stored in public.website_settings (key -> jsonb).
 * Every key has a default (so the site renders before anything is saved) and a
 * normalizer that is the only way a value reaches the database.
 */

const { rest } = require("./supabase");
const { sanitizeHtml, safeHref } = require("./sanitize-html");
const { isSafeImageSrc, isSafeHttpsUrl } = require("./urls");

var MAX_PARTNERS = 24;
var PAGE_KEYS = ["startIntro", "ueberUnsIntro", "ueberUnsService", "teamIntro", "leistungenIntro", "hausverwaltungIntro"];
var REVIEW_SOURCES = { google: "Google", immoscout: "ImmoScout24", immowelt: "Immowelt" };

var DEFAULTS = {
  banner: {
    enabled: false,
    variant: "info",
    text: "",
    linkUrl: "",
    linkLabel: "",
    from: "",
    until: ""
  },
  partners: [
    { name: "VDIV – Verband der Immobilienverwalter", logoUrl: "/assets/vdiv.jpg", href: "https://vdiv.de/" },
    { name: "Immowelt Platin-Partner", logoUrl: "/assets/immowelt3.jpg", href: "" },
    { name: "EHL", logoUrl: "/assets/ehl.jpg", href: "" },
    { name: "M+", logoUrl: "/assets/mplus.jpg", href: "" },
    { name: "Rahmig", logoUrl: "/assets/rahmig.jpg", href: "" }
  ],
  // Only sourced figures. Google rating stays empty until confirmed by the office.
  reviews: [
    {
      source: "google",
      rating: "",
      count: "",
      text: "Bewertungen unseres Büros am Kirchberg 42 auf Google.",
      url: "https://www.google.com/maps/place/Haller+Immobilienberatung+GmbH/@50.43358,7.3896,17z"
    },
    {
      source: "immoscout",
      rating: "4,5",
      count: "3",
      text: "Suchende auf ImmoScout24, 100 % Weiterempfehlung. Exposé und Beratung: exzellent.",
      url: "https://www.immobilienscout24.de/anbieter/profil/haller-immobilienberatung-gmbh"
    },
    {
      source: "immowelt",
      rating: "Platin",
      count: "",
      text: "Immowelt-Platin-Partner, seit über zehn Jahren auf dem Portal.",
      url: "https://www.immowelt.de/profil/d9f7f306efffb14aa0ffaf43b2974eb8"
    }
  ],
  pages: {},
  hausverwaltungPdf: null
};

function str(v, max) {
  return String(v == null ? "" : v).trim().slice(0, max || 200);
}

function isoDate(v) {
  var s = str(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

function link(v) {
  var s = str(v, 500);
  return s ? safeHref(s) : "";
}

function asset(v) {
  var s = str(v, 500);
  return s && isSafeImageSrc(s) ? s : "";
}

var NORMALIZE = {
  banner: function (v) {
    v = v || {};
    return {
      enabled: v.enabled === true,
      variant: v.variant === "event" ? "event" : "info",
      text: sanitizeHtml(str(v.text, 2000)),
      linkUrl: link(v.linkUrl),
      linkLabel: str(v.linkLabel, 60),
      from: isoDate(v.from),
      until: isoDate(v.until)
    };
  },
  partners: function (v) {
    if (!Array.isArray(v)) throw new Error("partners must be an array");
    return v.slice(0, MAX_PARTNERS).map(function (p) {
      p = p || {};
      var logo = asset(p.logoUrl);
      if (!logo) throw new Error("Logo fehlt oder ungültig: " + str(p.name, 60));
      return { name: str(p.name, 120), logoUrl: logo, href: p.href ? (isSafeHttpsUrl(str(p.href, 500)) ? str(p.href, 500) : "") : "" };
    });
  },
  reviews: function (v) {
    if (!Array.isArray(v)) throw new Error("reviews must be an array");
    return v
      .filter(function (r) {
        return r && REVIEW_SOURCES[r.source];
      })
      .slice(0, 6)
      .map(function (r) {
        return {
          source: r.source,
          rating: str(r.rating, 12),
          count: str(r.count, 12),
          text: str(r.text, 300),
          url: isSafeHttpsUrl(str(r.url, 500)) ? str(r.url, 500) : ""
        };
      });
  },
  pages: function (v) {
    v = v || {};
    var out = {};
    PAGE_KEYS.forEach(function (k) {
      if (typeof v[k] === "string" && v[k].trim()) out[k] = sanitizeHtml(v[k]);
    });
    return out;
  },
  hausverwaltungPdf: function (v) {
    if (!v) return null;
    var url = asset(v.url);
    if (!url) throw new Error("Ungültige PDF-URL");
    return { url: url, name: str(v.name, 120) || "Hausverwaltung.pdf" };
  }
};

function isKnownKey(key) {
  return Object.prototype.hasOwnProperty.call(NORMALIZE, key);
}

function normalize(key, value) {
  if (!isKnownKey(key)) throw new Error("unknown key");
  return NORMALIZE[key](value);
}

/** Merge stored rows over defaults. Rows that no longer validate fall back to the default. */
function merge(rows) {
  var out = JSON.parse(JSON.stringify(DEFAULTS));
  (rows || []).forEach(function (row) {
    if (!row || !isKnownKey(row.key)) return;
    try {
      out[row.key] = normalize(row.key, row.value);
    } catch (e) {
      // keep default
    }
  });
  return out;
}

/** Banner visible today (Europe/Berlin calendar date)? */
function bannerActive(banner, today) {
  if (!banner || !banner.enabled || !banner.text) return false;
  var d = today || new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  if (banner.from && d < banner.from) return false;
  if (banner.until && d > banner.until) return false;
  return true;
}

async function loadAll() {
  var rows = await rest("website_settings?select=key,value", { method: "GET" });
  return merge(Array.isArray(rows) ? rows : []);
}

async function save(key, value) {
  var clean = normalize(key, value);
  await rest("website_settings?on_conflict=key", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: [{ key: key, value: clean, updated_at: new Date().toISOString() }]
  });
  return clean;
}

module.exports = { DEFAULTS, PAGE_KEYS, REVIEW_SOURCES, normalize, merge, bannerActive, loadAll, save, isKnownKey };
