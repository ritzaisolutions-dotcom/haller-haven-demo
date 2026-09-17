const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { detectImageMime, isAllowedUploadMime } = require("../lib/image-mime");

describe("image-mime", function () {
  it("detects jpeg png webp", function () {
    var jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert.equal(detectImageMime(jpeg).mime, "image/jpeg");

    var png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    assert.equal(detectImageMime(png).mime, "image/png");

    var webp = Buffer.from("RIFF....WEBP!!!!", "ascii");
    assert.equal(detectImageMime(webp).mime, "image/webp");
  });

  it("rejects svg-like and empty buffers", function () {
    var svg = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>", "utf8");
    assert.equal(detectImageMime(svg), null);
    assert.equal(detectImageMime(Buffer.alloc(0)), null);
    assert.equal(isAllowedUploadMime("image/svg+xml"), false);
    assert.equal(isAllowedUploadMime("image/jpeg"), true);
  });
});
