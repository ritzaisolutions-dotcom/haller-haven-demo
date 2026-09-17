const crypto = require("crypto");

var COOKIE_NAME = "rais_admin";
var SESSION_MS = 8 * 60 * 60 * 1000;

function readCookie(req) {
  var raw = req.headers.cookie || "";
  var part = raw
    .split(";")
    .map(function (s) {
      return s.trim();
    })
    .filter(function (s) {
      return s.indexOf(COOKIE_NAME + "=") === 0;
    })[0];
  return part ? part.slice(COOKIE_NAME.length + 1) : "";
}

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

function passwordSecret() {
  return process.env.ADMIN_PASSWORD || "";
}

function valid(token, secret) {
  if (!token || !secret) return false;
  var i = token.indexOf(".");
  if (i < 1) return false;
  var exp = token.slice(0, i);
  var sig = token.slice(i + 1);
  var expect = crypto.createHmac("sha256", secret).update(exp).digest("hex");
  if (expect.length !== sig.length) return false;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expect, "utf8"), Buffer.from(sig, "utf8"))) {
      return false;
    }
  } catch (e) {
    return false;
  }
  return Number(exp) > Date.now();
}

function isAdmin(req) {
  var secret = sessionSecret();
  if (!secret) return false;
  return valid(readCookie(req), secret);
}

function signSession() {
  var secret = sessionSecret();
  if (!secret) return null;
  var exp = String(Date.now() + SESSION_MS);
  var sig = crypto.createHmac("sha256", secret).update(exp).digest("hex");
  return exp + "." + sig;
}

function sessionCookie(token) {
  return (
    COOKIE_NAME +
    "=" +
    token +
    "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800"
  );
}

function clearSessionCookie() {
  return COOKIE_NAME + "=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";
}

/**
 * Compare submitted password to ADMIN_PASSWORD using timing-safe equality.
 * Supports either a plaintext env password or a sha256 hex digest prefixed with "sha256:".
 */
function passwordMatches(submitted) {
  var expected = passwordSecret();
  if (!expected || typeof submitted !== "string") return false;

  var got;
  var want;
  if (expected.indexOf("sha256:") === 0) {
    got = crypto.createHash("sha256").update(submitted, "utf8").digest("hex");
    want = expected.slice("sha256:".length);
  } else {
    got = submitted;
    want = expected;
  }

  var a = Buffer.from(got, "utf8");
  var b = Buffer.from(want, "utf8");
  if (a.length !== b.length) {
    // Still do a compare against itself to reduce trivial timing branches.
    crypto.timingSafeEqual(a, a);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function clientIp(req) {
  var xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0].trim().slice(0, 64);
  }
  if (req.headers["x-real-ip"]) return String(req.headers["x-real-ip"]).slice(0, 64);
  if (req.socket && req.socket.remoteAddress) {
    return String(req.socket.remoteAddress).slice(0, 64);
  }
  return "unknown";
}

module.exports = {
  COOKIE_NAME,
  SESSION_MS,
  readCookie,
  valid,
  isAdmin,
  signSession,
  sessionCookie,
  clearSessionCookie,
  passwordMatches,
  clientIp,
  sessionSecret,
  passwordSecret
};
