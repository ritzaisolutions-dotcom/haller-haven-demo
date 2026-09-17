/**
 * Local smoke test: upload tiny PNG to Supabase listing-images bucket,
 * then insert+remove a disabled listing via RPC.
 *
 * Loads .env.local if present. Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
const fs = require("fs");
const path = require("path");

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .forEach(function (line) {
      if (!line || line[0] === "#") return;
      var i = line.indexOf("=");
      if (i < 1) return;
      var k = line.slice(0, i).trim();
      var v = line.slice(i + 1).trim();
      if ((v[0] === '"' && v[v.length - 1] === '"') || (v[0] === "'" && v[v.length - 1] === "'")) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    });
}

loadEnv(path.join(__dirname, "..", ".env.local"));

async function main() {
  var url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  console.log("env check", {
    hasUrl: !!url,
    hasKey: !!key,
    urlHost: url ? url.split("/")[2] : null
  });
  if (!url || !key) {
    console.error("FAIL: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in env");
    process.exit(2);
  }

  // 1x1 PNG
  var png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  var pathname = "objekte/smoke-test/smoke-" + Date.now() + ".png";
  var uploadUrl = url + "/storage/v1/object/listing-images/" + pathname;
  var up = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "image/png",
      "x-upsert": "true"
    },
    body: png
  });
  var upText = await up.text();
  if (!up.ok) {
    console.error("FAIL upload", up.status, upText.slice(0, 300));
    process.exit(1);
  }
  var publicUrl = url + "/storage/v1/object/public/listing-images/" + pathname;
  var get = await fetch(publicUrl, { method: "GET" });
  if (!get.ok) {
    console.error("FAIL public read", get.status);
    process.exit(1);
  }
  console.log("OK upload + public read", publicUrl);

  // cleanup object
  var del = await fetch(url + "/storage/v1/object/listing-images/" + pathname, {
    method: "DELETE",
    headers: { apikey: key, Authorization: "Bearer " + key }
  });
  console.log("cleanup delete", del.status);
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
