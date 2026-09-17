/**
 * URL and link validation for listing images and portal links.
 */

function isSafeHttpsUrl(raw) {
  if (typeof raw !== "string") return false;
  var s = raw.trim();
  if (!s || /\s/.test(s) || /[<>"']/.test(s)) return false;
  try {
    var u = new URL(s);
    return u.protocol === "https:";
  } catch (e) {
    return false;
  }
}

function isSafeImageSrc(raw) {
  if (typeof raw !== "string") return false;
  var s = raw.trim();
  if (!s || /\s|\.\./.test(s) || /[<>"']/.test(s)) return false;
  if (s.indexOf("data:") === 0) return false;
  if (s.indexOf("javascript:") === 0) return false;
  if (s.indexOf("https://") === 0 || s.indexOf("http://") === 0) {
    try {
      var u = new URL(s);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch (e) {
      return false;
    }
  }
  if (s.indexOf("/") === 0) return /^\/[a-zA-Z0-9_./-]+$/.test(s);
  return /^[a-zA-Z0-9_./-]+$/.test(s);
}

function sanitizePortalLink(raw) {
  if (raw == null || raw === "") return "";
  var s = String(raw).trim();
  if (!s) return "";
  return isSafeHttpsUrl(s) ? s : null;
}

module.exports = { isSafeHttpsUrl, isSafeImageSrc, sanitizePortalLink };
