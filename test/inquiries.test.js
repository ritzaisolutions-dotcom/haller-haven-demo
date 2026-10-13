const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

// Rate limit needs Supabase; stub it before the handler destructures it.
require("../lib/rate-limit").checkRateLimit = async function () {
  return { limited: false };
};
const handler = require("../api/inquiries");

function call(body) {
  var out = { status: 0, json: null };
  var res = {
    setHeader: function () {},
    status: function (s) {
      out.status = s;
      return res;
    },
    json: function (j) {
      out.json = j;
      return res;
    },
    end: function () {
      return res;
    }
  };
  var req = { method: "POST", headers: { "x-forwarded-for": "1.2.3.4" }, body: body };
  return handler(req, res).then(function () {
    return out;
  });
}

var valid = { name: "Erika Muster", email: "erika@example.org", intent: "kaufen", message: "Hallo", privacy: true };
var envKeys = ["CRM_WEBHOOK_URL", "CRM_WEBHOOK_SECRET", "SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SUPABASE_URL"];

describe("POST /api/inquiries via n8n", function () {
  var saved = {};
  var realFetch = global.fetch;
  var calls;

  beforeEach(function () {
    envKeys.forEach(function (k) {
      saved[k] = process.env[k];
      delete process.env[k];
    });
    calls = [];
  });
  afterEach(function () {
    envKeys.forEach(function (k) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
    global.fetch = realFetch;
  });

  it("returns 503 when neither n8n nor SMTP is configured", async function () {
    var out = await call(valid);
    assert.equal(out.status, 503);
    assert.equal(out.json.error, "inquiry_unconfigured");
  });

  it("posts the mail body and secret to n8n", async function () {
    process.env.CRM_WEBHOOK_URL = "https://n8n.example/webhook/haller-website-anfrage";
    process.env.CRM_WEBHOOK_SECRET = "s3cret";
    global.fetch = async function (url, init) {
      calls.push({ url: url, init: init });
      return { ok: true, status: 200 };
    };
    var out = await call(valid);
    assert.equal(out.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.headers["X-Webhook-Secret"], "s3cret");
    var payload = JSON.parse(calls[0].init.body);
    assert.equal(payload.email, "erika@example.org");
    assert.match(payload.body_text, /^Quelle: Website-Formular\nName: Erika Muster\nE-Mail: erika@example.org/);
  });

  it("returns 502 when n8n rejects the inquiry", async function () {
    process.env.CRM_WEBHOOK_URL = "https://n8n.example/webhook/haller-website-anfrage";
    global.fetch = async function () {
      return { ok: false, status: 403 };
    };
    var out = await call(valid);
    assert.equal(out.status, 502);
    assert.equal(out.json.error, "mail_failed");
  });
});
