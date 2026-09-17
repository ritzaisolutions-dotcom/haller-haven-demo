const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { isPublicListing } = require("../lib/listings");

describe("seo artifacts", function () {
  it("sitemap lists current public listing ids only", function () {
    var list = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "listings.json"), "utf8")
    );
    var sitemap = fs.readFileSync(path.join(__dirname, "..", "sitemap.xml"), "utf8");
    var publicIds = list.filter(isPublicListing).map(function (x) {
      return x.id;
    });
    publicIds.forEach(function (id) {
      assert.match(sitemap, new RegExp("objekt\\.html\\?id=" + id));
    });
    assert.doesNotMatch(sitemap, /o-andernach-altstadt|o-namedy-efh|o-koblenz-maisonette/);
  });
});
