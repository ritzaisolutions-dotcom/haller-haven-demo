const crypto = require("crypto");

function sign() {
  const exp = String(Date.now() + 8 * 60 * 60 * 1000);
  const sig = crypto.createHmac("sha256", process.env.ADMIN_PASSWORD).update(exp).digest("hex");
  return exp + "." + sig;
}

function cookie(token) {
  return "rais_admin=" + token + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    res.status(503).json({ ok: false, error: "ADMIN_PASSWORD env fehlt" });
    return;
  }
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (body.password !== expected) {
    res.status(401).json({ ok: false });
    return;
  }
  res.setHeader("Set-Cookie", cookie(sign()));
  res.status(200).json({ ok: true });
};
