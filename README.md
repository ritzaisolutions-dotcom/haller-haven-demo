# Haller Immobilien

Website der Haller Immobilienberatung GmbH (Andernach). Demo: **https://haller-haven-demo.vercel.app/**

- **Formulare:** Browser → `POST /api/inquiries` → n8n-Webhook „Haller · Website-Anfrage“ → Mail von sales@ an sales@ (`Reply-To` = Besucher) → „Haller · Qualifizierung“ liest sales@ per IMAP, legt den Lead in `leads` an und qualifiziert. Kein Direkt-Insert von der Website. Die Kopfzeilen `Quelle: Website-Formular` / `Name:` / `E-Mail:` / `Telefon:` / `Anliegen:` / `Objekt-ID:` sind der Vertrag mit dem n8n-Parser (`lib/smtp-mail.js` → `buildInquiryBody`). Direkter SMTP-Versand bleibt nur als Fallback, wenn kein Webhook gesetzt ist.
- **Admin:** `/admin` — Objekte (formatierte Beschreibung, Provision, Grundrisse, Energieausweis-PDF, max. 12 Bilder, 6 auf der Startseite) und **Website-Inhalte** (Banner/Event-Banner, Partner-Logos, Bewertungen, Texte, Hausverwaltung-PDF)
- **Daten:** Supabase `website_listings` + `website_settings`, Dateien im Bucket `listing-images` (PDFs per signierter Upload-URL direkt aus dem Browser)
- **Cal.com:** Env `CAL_COM_EVENT_URL` (optional). Auf `kontakt.html#erstgespraech` lädt der Kalender erst nach Klick — ohne URL springt der Button zum Formular.
- **Cookies:** Kein Analyse-Tracking, kein Consent-Banner. Nur technisch notwendig (`rais_admin` nach Admin-Login, `rais_banner_closed` in sessionStorage). Formular-Checkbox bleibt.

## Env (Vercel)

| Variable | Zweck |
|---|---|
| `ADMIN_PASSWORD` | Admin-Login |
| `ADMIN_SESSION_SECRET` | HMAC für Cookie |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Listings, Uploads |
| `CRM_WEBHOOK_URL` | **Pflicht.** `https://n8n.ritz-ai.solutions/webhook/haller-website-anfrage`. Antwortet erst nach dem Mailversand (Timeout 10 s); Fehler → Formular zeigt 502. |
| `CRM_WEBHOOK_SECRET` | **Pflicht.** Header `X-Webhook-Secret`, gleicher Wert wie das Header-Auth-Credential „Haller Website Webhook“ in n8n |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` `INQUIRY_TO` | Optional, nur Fallback ohne Webhook (Port 465 / implicit TLS). `INQUIRY_TO` wäre sales@. |
| `CAL_COM_EVENT_URL` | Öffentliche Buchungs-URL |

Web Analytics / Speed Insights in Vercel müssen aus bleiben — sonst wäre wieder ein Banner nötig.

## Go-Live

1. `CRM_WEBHOOK_URL` + `CRM_WEBHOOK_SECRET` setzen (Production und Preview), sonst liefern Formulare 503.
2. Migrationen in Supabase anwenden: `20261006_listing_energy.sql`, `20261013_site_settings.sql`, `20261013_listings_keep_objekt_id.sql`, `20261013_website_rpc_service_only.sql`.
3. n8n: Workflow „Haller · Website-Anfrage“ aktiv; Parser in „Haller · Qualifizierung“ erkennt `Quelle: Website-Formular`.
4. Inhalte von Haller im Admin pflegen: Texte, Hero-/Teambilder Raum Koblenz, Partner-Logos, Hausverwaltung-PDF, Bewertungszahlen (Google).
5. DNS später auf haller-immobilien.de; OG-Tags der Demo zeigen auf vercel.app.

## Bildnachweis (Unsplash License, frei nutzbar, keine Namensnennung nötig)

Motive bewusst aus dem Marktsegment (ca. 200 k bis 1 Mio. €): Wohnhäuser statt Sehenswürdigkeiten.

| Datei | Seite | Motiv | Fotograf | Quelle |
|---|---|---|---|---|
| `assets/koblenz/wohnhaeuser-rheinufer.jpg` | Startseite (Poster, OG) | Wohnhäuser am Ufer, Koblenz | Anand krishnan | https://unsplash.com/photos/n7kcNCkrLUs |
| `assets/koblenz/einfamilienhaus.jpg` | Objekte | Einfamilienhaus (Aufnahme: Viersen, NRW) | Chris Weiher | https://unsplash.com/photos/Bu9hDBQ0ntE |
| `assets/koblenz/neubau.jpg` | Leistungen | Neubau mit Wärmepumpe (Ort unbekannt) | alpha innotec | https://unsplash.com/photos/kblddocwPa0 |
| `assets/koblenz/altbau-strasse.jpg` | Hausverwaltung | Altbau-Mehrfamilienhäuser, Koblenz | Felix Braas | https://unsplash.com/photos/MJdmJGgl3MU |
| `assets/koblenz/rhein-panorama.jpg` | Kontakt | Rheinpanorama Koblenz | Maxime Vandenberge | https://unsplash.com/photos/9wUQEBf03D0 |

Platzhalter, bis Haller eigene Fotos aus dem Bestand liefert (Spec Abschnitt 6).
