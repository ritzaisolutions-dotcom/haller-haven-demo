/**
 * Safe JSON body parsing for Vercel serverless handlers.
 * @returns {{ ok: true, value: any } | { ok: false, error: string }}
 */
function parseBody(req, fallback) {
  var empty = fallback === undefined ? {} : fallback;
  if (req.body == null || req.body === "") {
    return { ok: true, value: empty };
  }
  if (typeof req.body === "string") {
    try {
      return { ok: true, value: JSON.parse(req.body) };
    } catch (e) {
      return { ok: false, error: "invalid_json" };
    }
  }
  if (typeof req.body === "object") {
    return { ok: true, value: req.body };
  }
  return { ok: false, error: "invalid_json" };
}

module.exports = { parseBody };
