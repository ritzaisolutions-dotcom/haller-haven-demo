const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parseBody } = require("../lib/parse-body");

describe("parseBody", function () {
  it("parses JSON strings", function () {
    var r = parseBody({ body: '{"a":1}' });
    assert.equal(r.ok, true);
    assert.deepEqual(r.value, { a: 1 });
  });

  it("rejects invalid JSON", function () {
    var r = parseBody({ body: "{nope" });
    assert.equal(r.ok, false);
    assert.equal(r.error, "invalid_json");
  });

  it("passes through objects", function () {
    var r = parseBody({ body: { x: 2 } });
    assert.equal(r.ok, true);
    assert.deepEqual(r.value, { x: 2 });
  });

  it("uses fallback for empty body", function () {
    var r = parseBody({ body: null }, []);
    assert.equal(r.ok, true);
    assert.deepEqual(r.value, []);
  });
});
