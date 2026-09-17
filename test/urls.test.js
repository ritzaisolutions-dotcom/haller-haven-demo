const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isSafeHttpsUrl, isSafeImageSrc, sanitizePortalLink } = require("../lib/urls");
const { validateList } = require("../lib/validate-list");

describe("urls", function () {
  it("accepts https portal links only", function () {
    assert.equal(isSafeHttpsUrl("https://www.immobilienscout24.de/expose/1"), true);
    assert.equal(isSafeHttpsUrl("http://evil.example"), false);
    assert.equal(isSafeHttpsUrl("javascript:alert(1)"), false);
    assert.equal(isSafeHttpsUrl('https://x.com/"onclick='), false);
  });

  it("rejects unsafe image sources", function () {
    assert.equal(isSafeImageSrc("assets/objekte/a/01.jpg"), true);
    assert.equal(isSafeImageSrc("/assets/x.jpg"), true);
    assert.equal(isSafeImageSrc("https://blob.vercel-storage.com/x.jpg"), true);
    assert.equal(isSafeImageSrc("data:image/png;base64,aaa"), false);
    assert.equal(isSafeImageSrc('https://x.com/a.jpg" onerror="alert(1)'), false);
  });

  it("sanitizePortalLink returns null for bad urls", function () {
    assert.equal(sanitizePortalLink(""), "");
    assert.equal(sanitizePortalLink("javascript:alert(1)"), null);
    assert.equal(sanitizePortalLink("https://ok.example/x"), "https://ok.example/x");
  });
});

describe("validateList", function () {
  it("rejects javascript portal links", function () {
    var err = validateList([
      {
        id: "x1",
        title: "t",
        enabled: true,
        status: "aktiv",
        featured: false,
        images: ["assets/a.jpg"],
        links: { is24: "javascript:alert(1)", immowelt: "" }
      }
    ]);
    assert.match(err, /ImmoScout24/);
  });

  it("enforces featured cap", function () {
    var list = [];
    for (var i = 0; i < 7; i++) {
      list.push({
        id: "id" + i,
        enabled: true,
        status: "aktiv",
        featured: true,
        images: [],
        links: { is24: "", immowelt: "" }
      });
    }
    assert.match(validateList(list, 6), /Max 6/);
  });
});
