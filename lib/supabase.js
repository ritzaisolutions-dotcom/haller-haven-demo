/**
 * Minimal Supabase REST helpers using the service-role key (server only).
 */

function config() {
  var url = process.env.SUPABASE_URL;
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key: key };
}

function headers(key, prefer) {
  var h = {
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json"
  };
  if (prefer) h.Prefer = prefer;
  return h;
}

async function rest(path, options) {
  var cfg = config();
  if (!cfg) {
    var err = new Error("supabase_unconfigured");
    err.code = "supabase_unconfigured";
    throw err;
  }
  var opts = options || {};
  var r = await fetch(cfg.url + "/rest/v1/" + path, {
    method: opts.method || "GET",
    headers: headers(cfg.key, opts.prefer),
    body: opts.body != null ? JSON.stringify(opts.body) : undefined
  });
  var text = await r.text();
  var json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch (e) {
      json = text;
    }
  }
  if (!r.ok) {
    var e = new Error("supabase_error");
    e.status = r.status;
    e.body = typeof json === "string" ? json.slice(0, 300) : json;
    throw e;
  }
  return json;
}

async function rpc(fn, args) {
  var cfg = config();
  if (!cfg) {
    var err = new Error("supabase_unconfigured");
    err.code = "supabase_unconfigured";
    throw err;
  }
  var r = await fetch(cfg.url + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: headers(cfg.key),
    body: JSON.stringify(args || {})
  });
  var text = await r.text();
  var json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch (e) {
      json = text;
    }
  }
  if (!r.ok) {
    var e = new Error("supabase_rpc_error");
    e.status = r.status;
    e.body = typeof json === "string" ? json.slice(0, 300) : json;
    throw e;
  }
  return json;
}

module.exports = { config, rest, rpc };
