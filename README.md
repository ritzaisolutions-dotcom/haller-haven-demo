# Haller Haven Demo

Static Haven-Demo für Haller Immobilienberatung GmbH (Andernach).

- **Preview:** https://haller-haven-demo.vercel.app/
- **Formulare:** `REPLACE_WEB3FORMS_ACCESS_KEY` in `kontakt.html` / `objekt.html` ersetzen
- **Admin:** Vercel Env `ADMIN_PASSWORD` + Blob-Store (`BLOB_READ_WRITE_TOKEN`); Objekte live über **`/admin`** (Website / Startseite max. 6)
- **Canonical:** `window.RAIS_SITE_BASE` in `config.js` (Go-Live: Domain + sitemap/robots/llms/HTML-Canonicals)
- **Consent-Log:** Vercel Env `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` → Tabelle `website_consent_log` (Haller-Supabase EU)

## Go-Live-Checkliste

1. Web3Forms-Key + Ziel-Mail Haller; DPA akzeptieren
2. `ADMIN_PASSWORD` in Vercel; **Blob-Store** ans Projekt anbinden; Admin-Zugang und Live-Toggle testen
2b. `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in Vercel (Haller-Projekt); Consent-Accept testen → Zeile in `website_consent_log`
3. Domain DNS → Vercel; `RAIS_SITE_BASE` + sitemap/robots/llms/Canonicals umstellen
4. Vercel-Plan mit AVV/DPA prüfen; Supabase-AVV für Consent-Log prüfen
5. Unsplash- und WP-Hotlinks durch eigene Medien ersetzen
6. AGB juristisch freigeben; Datenschutz an Live-Stack halten
7. Echte Objekte sind in `listings.json` / Blob; Demo-Hinweis nur bewusst belassen oder entfernen
