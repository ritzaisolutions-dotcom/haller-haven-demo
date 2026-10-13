const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeHtml, htmlToText } = require("../lib/sanitize-html");

describe("sanitizeHtml", function () {
  it("keeps bold, italic, headings, lists", function () {
    var html = "<h2>Lage</h2><p><strong>Ruhig</strong> und <em>zentral</em></p><ul><li>Balkon</li></ul>";
    assert.equal(sanitizeHtml(html), html);
  });

  it("maps b/i/div/h1 to the allowed set", function () {
    assert.equal(sanitizeHtml("<div><b>a</b><i>b</i></div><h1>T</h1>"), "<p><strong>a</strong><em>b</em></p><h2>T</h2>");
  });

  it("strips scripts, handlers and unknown tags but keeps text", function () {
    var out = sanitizeHtml('<p onclick="x()">Hi<script>alert(1)</script><img src=x onerror=alert(1)><font>there</font></p>');
    assert.equal(out, "<p>Hithere</p>");
  });

  it("drops javascript: links and hardens external links", function () {
    assert.equal(sanitizeHtml('<a href="javascript:alert(1)">x</a>'), "x");
    assert.equal(
      sanitizeHtml('<a href="https://example.com" onmouseover="x">y</a>'),
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">y</a>'
    );
    assert.equal(sanitizeHtml('<a href="kontakt.html">k</a>'), '<a href="kontakt.html">k</a>');
  });

  it("keeps Google-Docs style weights from pasted spans", function () {
    var pasted =
      '<b style="font-weight:normal" id="docs-internal-guid"><p dir="ltr"><span style="font-weight:700;color:red">Fett</span> <span style="font-weight:500">Medium</span> <span style="font-style:italic">Kursiv</span></p></b>';
    assert.equal(
      sanitizeHtml(pasted),
      '<p><strong>Fett</strong> <span class="fw-500">Medium</span> <em>Kursiv</em></p>'
    );
  });

  it("is idempotent (own fw-* output survives a second pass)", function () {
    var once = sanitizeHtml('<p><span style="font-weight:600">Halbfett</span> <span class="evil fw-500">M</span></p>');
    assert.equal(once, '<p><span class="fw-600">Halbfett</span> <span class="fw-500">M</span></p>');
    assert.equal(sanitizeHtml(once), once);
  });

  it("balances unclosed and stray tags", function () {
    assert.equal(sanitizeHtml("<p><strong>a</p>b</em>"), "<p><strong>a</strong></p>b");
  });

  it("escapes stray angle brackets in text", function () {
    assert.equal(sanitizeHtml("3 < 4 & 5 > 2"), "3 &lt; 4 &amp; 5 &gt; 2");
  });

  it("htmlToText flattens markup", function () {
    assert.equal(htmlToText("<p>A &amp; B</p><ul><li>x</li></ul>"), "A & B\nx");
  });
});
