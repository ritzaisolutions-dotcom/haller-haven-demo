# Haller Immobilien

Website der Haller Immobilienberatung GmbH (Andernach). Demo: **https://haller-haven-demo.vercel.app/**

- **Formulare:** Browser → `POST /api/inquiries` → SMTP an EU-Postfach (kein Web3Forms) → optional CRM-Webhook (`CRM_WEBHOOK_URL`)
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
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` | EU-Mailversand (Port 465 / implicit TLS) |
| `SMTP_FROM` / `INQUIRY_TO` | Absender / Empfänger (Demo: marco@-Postfach) |
| `CAL_COM_EVENT_URL` | Öffentliche Buchungs-URL |
| `CRM_WEBHOOK_URL` | Optional, `https://…` — jede Anfrage zusätzlich als JSON an das CRM (Zapier/Make/n8n oder CRM-Intake). Timeout 4 s, blockiert den Versand nie. |
| `CRM_WEBHOOK_SECRET` | Optional, wird als Header `X-Webhook-Secret` mitgeschickt |

Web Analytics / Speed Insights in Vercel müssen aus bleiben — sonst wäre wieder ein Banner nötig.

## Go-Live

1. SMTP-Env setzen, sonst liefern Formulare 503.
2. Migrationen in Supabase anwenden: `20261006_listing_energy.sql`, `20261013_site_settings.sql` (Tabelle `website_settings`, PDFs im Bucket).
3. Sobald das CRM feststeht: `CRM_WEBHOOK_URL` setzen und die Datenschutzerklärung um den CRM-Anbieter als Empfänger ergänzen.
4. Inhalte von Haller im Admin pflegen: Texte, Hero-/Teambilder Raum Koblenz, Partner-Logos, Hausverwaltung-PDF, Bewertungszahlen (Google).
5. DNS später auf haller-immobilien.de; OG-Tags der Demo zeigen auf vercel.app.

## Bildnachweis Koblenz (Unsplash License, frei nutzbar, keine Namensnennung nötig)

| Datei | Motiv | Fotograf | Quelle |
|---|---|---|---|
| `assets/koblenz/rhein-panorama.jpg` | Rheinpanorama Koblenz | Maxime Vandenberge | https://unsplash.com/photos/9wUQEBf03D0 |
| `assets/koblenz/deutsches-eck-seilbahn.jpg` | Deutsches Eck mit Seilbahn | Dmitro Meow | https://unsplash.com/photos/Ro5kRqclv8A |
| `assets/koblenz/deutsches-eck.jpg` | Deutsches Eck von oben | Jonathan Kemper | https://unsplash.com/photos/UNfICJ1CSjg |
| `assets/koblenz/ehrenbreitstein.jpg` | Festung Ehrenbreitstein | Michael Schreiber | https://unsplash.com/photos/1CzgDFaSKAQ |
| `assets/koblenz/stolzenfels.jpg` | Schloss Stolzenfels | Freysteinn G. Jonsson | https://unsplash.com/photos/1HGkn5_CzME |
