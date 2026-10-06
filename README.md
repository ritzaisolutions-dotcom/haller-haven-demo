# Haller Immobilien

Website der Haller Immobilienberatung GmbH (Andernach). Demo: **https://haller-haven-demo.vercel.app/**

- **Formulare:** Browser → `POST /api/inquiries` → SMTP an EU-Postfach (kein Web3Forms)
- **Admin:** `/admin` — inkl. Beschreibung, Energieausweis, Vermarktungstage
- **Listings:** Supabase `website_listings` (Migration `20261006_listing_energy.sql` ausführen)
- **Cal.com:** Env `CAL_COM_EVENT_URL` (optional; sonst Fallback-Button)
- **Cookies:** Kein Analyse-Tracking, kein Consent-Banner. Nur technisch notwendig (`rais_admin` nach Admin-Login). Formular-Checkbox bleibt.

## Env (Vercel)

| Variable | Zweck |
|---|---|
| `ADMIN_PASSWORD` | Admin-Login |
| `ADMIN_SESSION_SECRET` | HMAC für Cookie |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Listings, Uploads |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` | EU-Mailversand (Port 465 / implicit TLS) |
| `SMTP_FROM` / `INQUIRY_TO` | Absender / Empfänger (Demo: marco@-Postfach) |
| `CAL_COM_EVENT_URL` | Öffentliche Buchungs-URL |

Web Analytics / Speed Insights in Vercel müssen aus bleiben — sonst wäre wieder ein Banner nötig.

## Go-Live

1. SMTP-Env setzen, sonst liefern Formulare 503.
2. Energie-Migration in Supabase anwenden.
3. DNS später auf haller-immobilien.de; OG-Tags der Demo zeigen auf vercel.app.
