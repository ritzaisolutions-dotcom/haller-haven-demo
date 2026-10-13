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

describe("exposé fields", function () {
  const { rowToListing, listingToRow } = require("../lib/listing-map");
  const { validateList } = require("../lib/validate-list");
  const { HOME_MAX } = require("../lib/constants");

  it("round-trips provision, floorplans and energyPdf through links jsonb", function () {
    var item = {
      id: "x1",
      title: "T",
      provision: "3,57 % inkl. MwSt.",
      floorplans: [{ url: "https://a.supabase.co/f.pdf", name: "EG" }, { bad: true }],
      energyPdf: { url: "https://a.supabase.co/e.pdf", name: "Ausweis" }
    };
    var back = rowToListing(listingToRow(item, 0));
    assert.equal(back.provision, item.provision);
    assert.deepEqual(back.floorplans, [{ url: "https://a.supabase.co/f.pdf", name: "EG" }]);
    assert.deepEqual(back.energyPdf, item.energyPdf);
  });

  it("caps featured at 6", function () {
    assert.equal(HOME_MAX, 6);
    var list = [];
    for (var i = 0; i < 7; i++) list.push({ id: "f" + i, featured: true, enabled: true, status: "aktiv" });
    assert.match(validateList(list), /Max 6/);
    assert.equal(validateList(list.slice(0, 6)), null);
  });

  it("caps images at 12 and rejects unsafe document urls", function () {
    var imgs = [];
    for (var i = 0; i < 13; i++) imgs.push("/assets/x" + i + ".jpg");
    assert.match(validateList([{ id: "a", images: imgs }]), /12 Bilder/);
    assert.match(validateList([{ id: "a", floorplans: [{ url: "javascript:x" }] }]), /floorplan/);
    assert.match(validateList([{ id: "a", energyPdf: { url: "data:application/pdf;base64,AA" } }]), /Energieausweis/);
  });

  it("sanitizes rich-text description on save", function () {
    var list = [{ id: "a", description: "<p><strong>Top</strong><script>x</script></p>" }];
    assert.equal(validateList(list), null);
    assert.equal(list[0].description, "<p><strong>Top</strong></p>");
  });
});
