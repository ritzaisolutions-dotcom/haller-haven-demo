# SOP — Admin-Panel (Haller Haven)

Pfad: `/admin.html`

## Kann da jeder dran?

**Öffentliche Seite:** ja, `/admin.html` ist eine normale URL. Wer den Link kennt, sieht das Login.

**Login:** Passwort liegt in der Vercel-Umgebungsvariable **`ADMIN_PASSWORD`** (Serverless: `api/admin-login.js`). Nicht in `config.js`, nicht im Git-Repo.

Wenn `ADMIN_PASSWORD` fehlt, antwortet Login mit 503. Absicht.

**Produktion (Pflicht vor Go-Live):**

1. Starkes Passwort nur in Vercel Env setzen (nie committen).
2. **Vercel Blob Store** einmalig ans Projekt anbinden (Dashboard → Storage → Blob → Connect). Das setzt `BLOB_READ_WRITE_TOKEN` automatisch.
3. Optional: Vercel Deployment Protection für `/admin.html`.

Ohne gesetztes Env und ohne Blob-Store darf das Admin-Panel auf der Kundendomain nicht als „fertig“ gelten.

## Wo die Objekte liegen

| Umgebung | Speicher | Wer sieht die Objekte |
|---|---|---|
| Öffentliche Seite + Admin (live) | Vercel Blob `listings.json` via `/api/listings` | jeder Besucher, sofort nach Speichern |
| Fallback (erster Deploy / Blob leer) | Repo-Datei `/listings.json` + `/assets/objekte/` | jeder Besucher |
| Bilder (Admin-Upload) | Vercel Blob `objekte/<id>/*.webp` | öffentliche URLs |

Admin → Online / Startseite umschalten oder Speichern → **sofort live** (kein Export, kein Redeploy). Backup optional über „Backup herunterladen“.

## Felder

title, price, area, rooms, place, type (`kauf`|`miete`), category, ref, status (`aktiv`|`verkauft`), note, images (max. 12), links.is24, links.immowelt, inquiryCount, enabled, featured, createdAt.

## Sichtbarkeit

| Schalter | Wirkung |
|---|---|
| **Online** (`enabled`) | Objekt auf Objekte-Seite, Detailseite und Kontaktformular-Picker |
| **Startseite** (`featured`) | zusätzlich auf der Startseite, **max. 6** gleichzeitig |
| Offline | überall weg; Startseite-Flag wird mit abgeschaltet |

Reihenfolge in der Admin-Liste = Reihenfolge auf der Website (Drag & Drop). Startseite zeigt nur `featured`, begrenzt durch `RAIS_HOME_MAX` in `config.js` (Standard: 6). Wenn keines featured ist: Fallback erste 3 Online-Objekte.

## Personalize

In `config.js`:

- `tenant`: Kurzname, z. B. `haller-haven`
- `RAIS_SITE_BASE`: Canonical-Origin (Go-Live: Domain tauschen + sitemap/robots/llms/HTML-Canonicals)
- `RAIS_HOME_MAX`: Cap Startseite (6)
- `RAIS_LISTINGS_URL`: `/api/listings`

## Stop

- Kein Live-Passwort in Git.
- Kein Admin-Link in der öffentlichen Navigation.
- `robots.txt` verbietet `/admin.html`.
- Keine data:-Bilder in `listings.json` — immer über `/api/upload`.
