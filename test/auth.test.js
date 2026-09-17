const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const {
  valid,
  signSession,
  passwordMatches,
  sessionSecret
} = require("../lib/auth");

describe("auth", function () {
  var prevPass;
  var prevSecret;

  before(function () {
    prevPass = process.env.ADMIN_PASSWORD;
    prevSecret = process.env.ADMIN_SESSION_SECRET;
    process.env.ADMIN_PASSWORD = "test-pass-xyz";
    process.env.ADMIN_SESSION_SECRET = "session-secret-abc";
  });

  after(function () {
    if (prevPass === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = prevPass;
    if (prevSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = prevSecret;
  });

  it("signs and validates sessions with ADMIN_SESSION_SECRET", function () {
    var token = signSession();
    assert.ok(token);
    assert.equal(valid(token, sessionSecret()), true);
    assert.equal(valid(token, "wrong"), false);
    assert.equal(valid("0.deadbeef", sessionSecret()), false);
  });

  it("rejects expired tokens", function () {
    var exp = String(Date.now() - 1000);
    var sig = crypto
      .createHmac("sha256", process.env.ADMIN_SESSION_SECRET)
      .update(exp)
      .digest("hex");
    assert.equal(valid(exp + "." + sig, process.env.ADMIN_SESSION_SECRET), false);
  });

  it("matches plaintext and sha256 passwords safely", function () {
    assert.equal(passwordMatches("test-pass-xyz"), true);
    assert.equal(passwordMatches("nope"), false);

    var hash = crypto.createHash("sha256").update("hashed-one", "utf8").digest("hex");
    process.env.ADMIN_PASSWORD = "sha256:" + hash;
    assert.equal(passwordMatches("hashed-one"), true);
    assert.equal(passwordMatches("other"), false);
    process.env.ADMIN_PASSWORD = "test-pass-xyz";
  });
});
