#!/usr/bin/env node
/**
 * Regenerate sitemap.xml and llms.txt from listings.json (seed / public IDs).
 * Usage: node scripts/generate-seo.js
 */
const fs = require("fs");
const path = require("path");
const { SITE_BASE } = require("../lib/constants");
const { isPublicListing } = require("../lib/listings");

var root = path.join(__dirname, "..");
var list = JSON.parse(fs.readFileSync(path.join(root, "listings.json"), "utf8"));
var base = SITE_BASE.replace(/\/$/, "");
var today = new Date().toISOString().slice(0, 10);

var staticPages = [
  { loc: "/", priority: "1.0", changefreq: "weekly" },
  { loc: "/ueber-uns.html", priority: "0.8", changefreq: "monthly" },
  { loc: "/leistungen.html", priority: "0.8", changefreq: "monthly" },
  { loc: "/verkaufen.html", priority: "0.85", changefreq: "monthly" },
  { loc: "/hausverwaltung.html", priority: "0.85", changefreq: "monthly" },
  { loc: "/objekte.html", priority: "0.9", changefreq: "daily" },
  { loc: "/projekte.html", priority: "0.7", changefreq: "monthly" },
  { loc: "/kontakt.html", priority: "0.8", changefreq: "monthly" },
  { loc: "/impressum.html", priority: "0.3", changefreq: "yearly" },
  { loc: "/datenschutz.html", priority: "0.3", changefreq: "yearly" },
  { loc: "/agb.html", priority: "0.3", changefreq: "yearly" },
  { loc: "/llms.txt", priority: "0.5", changefreq: "monthly" }
];

var publicListings = list.filter(isPublicListing);

var urls = staticPages.slice();
publicListings.forEach(function (item) {
  urls.push({
    loc: "/objekt.html?id=" + encodeURIComponent(item.id),
    priority: "0.7",
    changefreq: "weekly"
  });
});

var sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls
    .map(function (u) {
      return (
        "  <url>\n" +
        "    <loc>" +
        base +
        u.loc +
        "</loc>\n" +
        "    <lastmod>" +
        today +
        "</lastmod>\n" +
        "    <changefreq>" +
        u.changefreq +
        "</changefreq>\n" +
        "    <priority>" +
        u.priority +
        "</priority>\n" +
        "  </url>"
      );
    })
    .join("\n") +
  "\n</urlset>\n";

fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);

var objectLines = publicListings
  .map(function (item) {
    return "- " + (item.title || item.id) + " (" + (item.place || "") + ")";
  })
  .join("\n");

var llms = `# Haller Immobilienberatung GmbH

> Inhabergeführte Immobilienberatung in Andernach: Verkauf, Kaufbegleitung und Hausverwaltung für Andernach, Koblenz, Neuwied und Mayen-Koblenz.

## NAP / Local

- Name: Haller Immobilienberatung GmbH
- Straße: Kirchberg 42
- PLZ Ort: 56626 Andernach
- Region: Rheinland-Pfalz, Deutschland
- Telefon: +49 2632 9458-0
- E-Mail: info@haller-immobilien.de
- Geo: 50.4392, 7.4016
- Website: ${base}/

## Leistungen

- Immobilienverkauf und Vermarktung
- Kaufbegleitung / Immobiliensuche
- Hausverwaltung / Objektmanagement
- Beratungstermine und Besichtigungen nach Vereinbarung

## Seiten

- [Start](${base}/): Überblick und Einstieg
- [Über uns](${base}/ueber-uns.html): Team und Büro
- [Leistungen](${base}/leistungen.html): Verkauf, Kauf, Verwaltung
- [Verkaufen](${base}/verkaufen.html): Verkaufsprozess Wertermittlung bis Notar
- [Hausverwaltung](${base}/hausverwaltung.html): WEG- und Mietverwaltung
- [Objekte](${base}/objekte.html): Aktuelle Inserate mit Termin-Anfrage
- [Projekte](${base}/projekte.html): Referenzprojekte
- [Kontakt](${base}/kontakt.html): Anfrage und Bürozeiten
- [Impressum](${base}/impressum.html)
- [Datenschutz](${base}/datenschutz.html)
- [AGB](${base}/agb.html)

## Objekte

Besichtigungstermine werden objektbezogen angefragt (Mail-Betreff mit Objektname).

${objectLines}

## Optional

- Sitemap: ${base}/sitemap.xml
- Robots: ${base}/robots.txt
`;

fs.writeFileSync(path.join(root, "llms.txt"), llms);
console.log("wrote sitemap.xml and llms.txt for", publicListings.length, "listings");
