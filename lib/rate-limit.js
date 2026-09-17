const { rpc } = require("./supabase");

/**
 * Durable rate limit via Supabase RPC. Falls back to fail-closed 503 if unconfigured.
 * @returns {Promise<{ limited: boolean, unavailable?: boolean }>}
 */
async function checkRateLimit(bucket, key, max, windowSeconds) {
  try {
    var result = await rpc("website_rate_limit_hit", {
      p_bucket: bucket,
      p_key: String(key || "anon").slice(0, 128),
      p_max: max,
      p_window_seconds: windowSeconds
    });
    // RPC returns boolean: true = allowed, false = limited
    if (result === false) return { limited: true };
    return { limited: false };
  } catch (e) {
    if (e && e.code === "supabase_unconfigured") {
      return { limited: true, unavailable: true };
    }
    console.error("rate_limit", e && e.message, e && e.body);
    // On unexpected DB errors, fail closed for auth/inquiry abuse paths.
    return { limited: true, unavailable: true };
  }
}

module.exports = { checkRateLimit };
