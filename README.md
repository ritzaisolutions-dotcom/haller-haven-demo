# Haller Immobilien

Website der Haller Immobilienberatung GmbH (Andernach). Canonical: **https://haller-immobilien.de/**

- **Preview (bis DNS):** https://haller-haven-demo.vercel.app/
- **Formulare:** Server-Proxy `/api/inquiries` → Web3Forms. Vercel Env: `WEB3FORMS_ACCESS_KEY`
- **Admin:** Vercel Env `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET`; Objekte live über **`/admin`** (Startseite max. 6)
- **Listings:** Supabase-Tabellen `website_listings` / `website_inquiries` (Env: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`)
- **Bilder (Upload):** Supabase Storage bucket `listing-images` (öffentlich lesbar)
- **Canonical:** `window.RAIS_SITE_BASE` / `SITE_BASE` = `https://haller-immobilien.de`
- **Consent-Log:** dieselbe Supabase-Instanz → `website_consent_log`
- **AVV/DPA:** Vercel, Supabase und Web3Forms sind abgeschlossen

## Env (Vercel)

| Variable | Zweck |
|---|---|
| `ADMIN_PASSWORD` | Shared admin password (plain or `sha256:<hex>`) |
| `ADMIN_SESSION_SECRET` | HMAC secret for the admin cookie (separate from password) |
| `WEB3FORMS_ACCESS_KEY` | Server-only Web3Forms key |
| `SUPABASE_URL` | Haller Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service role (listings, consent, uploads) |

## Scripts

```bash
npm test          # unit tests (node:test)
npm run seed      # push listings.json → Supabase (needs env)
npm run seo       # regenerate sitemap.xml + llms.txt from listings.json
```

## Go-Live-Checkliste

Canonicals, Sitemap, robots, `llms.txt` und Datenschutzerklärung stehen bereits auf **haller-immobilien.de**. AVV/DPA mit Vercel, Supabase und Web3Forms sind abgeschlossen.

1. Domain-DNS auf Vercel zeigen lassen (Rest ist vorbereitet)
2. Formular-Testanfrage + Admin-Login unter der echten Domain prüfen
3. AGB/Datenschutz bei Bedarf juristisch gegenlesen lassen
