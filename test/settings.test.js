const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { normalize, merge, bannerActive, DEFAULTS } = require("../lib/settings");

describe("settings", function () {
  it("normalizes banner and sanitizes its text", function () {
    var b = normalize("banner", {
      enabled: true,
      variant: "event",
      text: "<strong>Tag der offenen Tür</strong><script>x</script>",
      linkUrl: "javascript:alert(1)",
      from: "2026-10-01",
      until: "nope"
    });
    assert.equal(b.text, "<strong>Tag der offenen Tür</strong>");
    assert.equal(b.linkUrl, "");
    assert.equal(b.variant, "event");
    assert.equal(b.until, "");
  });

  it("banner date window", function () {
    var b = { enabled: true, text: "x", from: "2026-10-10", until: "2026-10-20" };
    assert.equal(bannerActive(b, "2026-10-09"), false);
    assert.equal(bannerActive(b, "2026-10-10"), true);
    assert.equal(bannerActive(b, "2026-10-20"), true);
    assert.equal(bannerActive(b, "2026-10-21"), false);
    assert.equal(bannerActive(Object.assign({}, b, { enabled: false }), "2026-10-12"), false);
  });

  it("partners require a safe logo and https link", function () {
    assert.throws(function () {
      normalize("partners", [{ name: "X", logoUrl: "javascript:x" }]);
    });
    var p = normalize("partners", [{ name: "X", logoUrl: "/assets/x.jpg", href: "http://insecure.example" }]);
    assert.deepEqual(p, [{ name: "X", logoUrl: "/assets/x.jpg", href: "" }]);
  });

  it("reviews only from known sources", function () {
    var r = normalize("reviews", [{ source: "google", rating: "4,9" }, { source: "yelp", rating: "5" }]);
    assert.equal(r.length, 1);
    assert.equal(r[0].source, "google");
  });

  it("pages keep only known keys", function () {
    var p = normalize("pages", { ueberUnsIntro: "<p>Hallo</p>", evil: "<p>x</p>" });
    assert.deepEqual(p, { ueberUnsIntro: "<p>Hallo</p>" });
  });

  it("merge falls back to defaults for unknown or invalid rows", function () {
    var m = merge([
      { key: "partners", value: "not-an-array" },
      { key: "unknown", value: 1 },
      { key: "banner", value: { enabled: true, text: "Hi" } }
    ]);
    assert.deepEqual(m.partners, DEFAULTS.partners);
    assert.equal(m.banner.text, "Hi");
    assert.equal(m.unknown, undefined);
  });
});
