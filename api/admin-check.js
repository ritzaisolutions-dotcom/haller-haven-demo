const crypto = require("crypto");

function readCookie(req) {
  const raw = req.headers.cookie || "";
  const part = raw.split(";").map(function (s) { return s.trim(); }).filter(function (s) { return s.indexOf("rais_admin=") === 0; })[0];
  return part ? part.slice("rais_admin=".length) : "";
}

function valid(token, secret) {
  if (!token || !secret) return false;
  const i = token.indexOf(".");
  if (i < 1) return false;
  const exp = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expect = crypto.createHmac("sha256", secret).update(exp).digest("hex");
  if (expect.length !== sig.length) return false;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expect), Buffer.from(sig))) return false;
  } catch (e) {
    return false;
  }
  return Number(exp) > Date.now();
}

module.exports = async function handler(req, res) {
  const ok = valid(readCookie(req), process.env.ADMIN_PASSWORD);
  res.status(ok ? 200 : 401).json({ ok: ok });
};
