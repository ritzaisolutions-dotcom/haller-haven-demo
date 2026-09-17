const { HOME_MAX } = require("./constants");
const { isSafeImageSrc, sanitizePortalLink } = require("./urls");

/**
 * Validate a full listings array before admin PUT.
 * @returns {string|null} error message or null if valid
 */
function validateList(list, homeMax) {
  var max = homeMax == null ? HOME_MAX : homeMax;
  if (!Array.isArray(list)) return "Body must be an array";
  var ids = {};
  var featured = 0;
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (!item || typeof item !== "object") return "Invalid item at index " + i;
    if (!item.id || typeof item.id !== "string") return "Missing id at index " + i;
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)) return "Invalid id at index " + i;
    if (ids[item.id]) return "Duplicate id: " + item.id;
    ids[item.id] = true;

    if (item.featured === true && item.enabled !== false && item.status !== "verkauft") {
      featured += 1;
    }

    if (Array.isArray(item.images)) {
      for (var j = 0; j < item.images.length; j++) {
        var src = item.images[j];
        if (!isSafeImageSrc(src)) {
          return "Invalid image URL at " + item.id;
        }
        if (String(src).indexOf("data:") === 0) {
          return "Data-URL images not allowed — upload via /api/upload first (" + item.id + ")";
        }
      }
    }

    if (!item.links || typeof item.links !== "object") {
      item.links = { is24: "", immowelt: "" };
    } else {
      var is24 = sanitizePortalLink(item.links.is24 || "");
      var immowelt = sanitizePortalLink(item.links.immowelt || "");
      if (is24 === null) return "Invalid ImmoScout24 URL at " + item.id;
      if (immowelt === null) return "Invalid Immowelt URL at " + item.id;
      item.links.is24 = is24;
      item.links.immowelt = immowelt;
    }

    if (typeof item.inquiryCount !== "number" || item.inquiryCount < 0) {
      item.inquiryCount = Number(item.inquiryCount) || 0;
    }
  }
  if (featured > max) {
    return "Max " + max + " featured listings on Startseite (got " + featured + ")";
  }
  return null;
}

module.exports = { validateList };
