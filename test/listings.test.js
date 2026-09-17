const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isPublicListing, publicize, featuredHome } = require("../lib/listings");

describe("listings visibility", function () {
  it("rejects disabled and sold", function () {
    assert.equal(isPublicListing({ enabled: false, status: "aktiv" }), false);
    assert.equal(isPublicListing({ enabled: true, status: "verkauft" }), false);
    assert.equal(isPublicListing({ enabled: true, status: "aktiv" }), true);
  });

  it("strips inquiryCount from publicize", function () {
    var out = publicize([
      {
        id: "a",
        title: "T",
        enabled: true,
        status: "aktiv",
        featured: true,
        inquiryCount: 9,
        note: "n",
        images: ["x.jpg"],
        links: { is24: "https://example.com/a", immowelt: "" }
      },
      { id: "b", enabled: false, status: "aktiv", inquiryCount: 1 }
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].id, "a");
    assert.equal(out[0].inquiryCount, undefined);
    assert.equal(Object.prototype.hasOwnProperty.call(out[0], "inquiryCount"), false);
  });

  it("featuredHome respects cap and falls back to live", function () {
    var list = [
      { id: "1", enabled: true, status: "aktiv", featured: false },
      { id: "2", enabled: true, status: "aktiv", featured: true },
      { id: "3", enabled: true, status: "aktiv", featured: true },
      { id: "4", enabled: false, status: "aktiv", featured: true }
    ];
    var feat = featuredHome(list, 6);
    assert.deepEqual(
      feat.map(function (x) {
        return x.id;
      }),
      ["2", "3"]
    );
    var none = featuredHome(
      [
        { id: "1", enabled: true, status: "aktiv", featured: false },
        { id: "2", enabled: true, status: "aktiv", featured: false }
      ],
      6
    );
    assert.equal(none.length, 2);
  });
});
