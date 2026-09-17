# Haller Haven Demo

Static Haven-Demo für Haller Immobilienberatung GmbH (Andernach).

- **Preview:** https://haller-haven-demo.vercel.app/
- **Formulare:** `REPLACE_WEB3FORMS_ACCESS_KEY` in `kontakt.html` / `objekt.html` ersetzen
- **Admin:** Vercel Env `ADMIN_PASSWORD`; Objekte über `/admin.html` → Export → `listings.json` deployen
- **Canonical:** `window.RAIS_SITE_BASE` in `config.js` (Go-Live: Domain + sitemap/robots/llms/HTML-Canonicals)

## Go-Live-Checkliste

1. Web3Forms-Key + Ziel-Mail Haller; DPA akzeptieren
2. `ADMIN_PASSWORD` in Vercel; Admin-Zugang testen
3. Domain DNS → Vercel; `RAIS_SITE_BASE` + sitemap/robots/llms/Canonicals umstellen
4. Vercel-Plan mit AVV/DPA prüfen
5. Unsplash- und WP-Hotlinks durch eigene Medien ersetzen
6. AGB juristisch freigeben; Datenschutz an Live-Stack halten
7. Echte Objekte in `listings.json`; Demo-Hinweis nur bewusst belassen oder entfernen
