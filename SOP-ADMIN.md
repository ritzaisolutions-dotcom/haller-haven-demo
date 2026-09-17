# SOP — Admin-Panel (Haller Haven)

Pfad: `/admin.html`

## Kann da jeder dran?

**Öffentliche Seite:** ja, `/admin.html` ist eine normale URL. Wer den Link kennt, sieht das Login.

**Login:** Passwort liegt in der Vercel-Umgebungsvariable **`ADMIN_PASSWORD`** (Serverless: `api/admin-login.js`). Nicht in `config.js`, nicht im Git-Repo.

Wenn `ADMIN_PASSWORD` fehlt, antwortet Login mit 503. Absicht.

**Produktion (Pflicht vor Go-Live):**

1. Starkes Passwort nur in Vercel Env setzen (nie committen).
2. Optional: Vercel Deployment Protection für `/admin.html`.
3. Langfristig besser: echte Auth + Listings in einer DB (nicht nur localStorage).

Ohne gesetztes Env darf das Admin-Panel auf der Kundendomain nicht als „fertig“ gelten.

## Wo die Objekte liegen

| Umgebung | Speicher | Wer sieht die Objekte |
|---|---|---|
| Preview / dieser Browser (Admin-Edits) | `localStorage` (`rais-listings-haller-haven`) | nur dieses Gerät |
| Öffentliche Seite | `/listings.json` im Repo | jeder Besucher |

Admin → Objekt anlegen → **JSON exportieren** → `listings.json` ersetzen → deployen.
Sonst bleibt die Startseite bei Besuchern unverändert. localStorage vom Admin erscheint nicht bei Website-Besuchern.

## Felder (nicht erweitern)

title, price, area, rooms, place, status (`aktiv`|`verkauft`), note, images (max. 12), inquiryCount, enabled, createdAt.

## Personalize

In `config.js`:

- `tenant`: Kurzname, z. B. `haller-haven`
- `RAIS_SITE_BASE`: Canonical-Origin (Go-Live: Domain tauschen + sitemap/robots/llms/HTML-Canonicals)

## Stop

- Kein Live-Passwort in Git.
- Kein Admin-Link in der öffentlichen Navigation.
- `robots.txt` verbietet `/admin.html`.
