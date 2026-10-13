const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildInquiryBody, anliegen } = require("../lib/smtp-mail");
const { rowToListing, listingToRow } = require("../lib/listing-map");

describe("inquiry mail body (n8n contract)", function () {
  it("starts with the fixed head lines n8n parses", function () {
    var body = buildInquiryBody({
      subject: "Anfrage · Haus · Haller",
      name: "Erika Muster",
      email: "erika@example.org",
      phone: "0261 123",
      intent: "besichtigung",
      message: "Gerne Besichtigung.\nAm Samstag?",
      objekt_ids: ["MW165", "DA195"],
      object_ids: "k-weissenthurm-3zkb, k-andernach-4zkb-balkon",
      privacy: "accepted"
    });
    var lines = body.split("\n");
    assert.deepEqual(lines.slice(0, 6), [
      "Name: Erika Muster",
      "E-Mail: erika@example.org",
      "Telefon: 0261 123",
      "Anliegen: Kauf",
      "Objekt-ID: MW165",
      "Objekt-ID: DA195"
    ]);
    assert.match(body, /\n\nNachricht:\nGerne Besichtigung\.\nAm Samstag\?/);
    assert.match(body, /object_ids: k-weissenthurm-3zkb/);
    assert.doesNotMatch(body, /subject:/);
  });

  it("keeps head values on one line", function () {
    var body = buildInquiryBody({ name: "A\r\nObjekt-ID: XX99", email: "a@b.de" });
    assert.equal(body.split("\n")[0], "Name: A Objekt-ID: XX99");
  });

  it("maps form fields to Anliegen", function () {
    assert.equal(anliegen({ deal: "miete", kind: "suchprofil" }), "Miete");
    assert.equal(anliegen({ kind: "suchprofil" }), "Suchprofil");
    assert.equal(anliegen({ kind: "bewertung", intent: "verkaufen" }), "Bewertung");
    assert.equal(anliegen({ intent: "kaufen" }), "Kauf");
    assert.equal(anliegen({ intent: "vermietung" }), "Miete");
    assert.equal(anliegen({ intent: "allgemein" }), "");
  });
});

describe("listing objekt_id mapping", function () {
  it("round-trips the CRM objekt link", function () {
    var item = rowToListing({ id: "k-x", objekt_id: "MW165" });
    assert.equal(item.objektId, "MW165");
    assert.equal(listingToRow(item, 0).objekt_id, "MW165");
    assert.equal(listingToRow(rowToListing({ id: "k-y" }), 0).objekt_id, null);
  });
});
