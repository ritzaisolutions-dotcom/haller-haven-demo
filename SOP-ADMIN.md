# SOP — Objekte verwalten (Haller Haven)

Pfad: **`/admin`** (auch `/admin.html`)

## Kann da jeder dran?

**Öffentliche Seite:** ja, `/admin` ist eine normale URL. Wer den Link kennt, sieht das Login.

**Login:** Passwort in Vercel **`ADMIN_PASSWORD`**. Cookie-Signatur über separates **`ADMIN_SESSION_SECRET`**. Beides nur serverseitig — nie in `config.js` / Git.

Fehlt eines der beiden Env-Felder → Login antwortet mit 503. Login-Versuche sind rate-limitiert (Supabase).

## Wo die Objekte liegen

| Umgebung | Speicher | Wer sieht die Objekte |
|---|---|---|
| Öffentliche Seite + Admin (live) | Supabase `website_listings` via `/api/listings` | öffentliche Projektion ohne `inquiryCount` / disabled |
| Seed (einmalig) | Repo-Datei `/listings.json` → `npm run seed` | nur Migration, kein Runtime-Fallback |
| Bilder (Admin-Upload) | Supabase Storage bucket `listing-images` | öffentliche Bild-URLs |

Admin → „Auf Website zeigen“ / „Auf Startseite“ oder Speichern → **sofort live**. Sicherung optional über „Sicherung speichern“.

## Felder

title, price, area, rooms, place, type (`kauf`|`miete`), category, ref, status (`aktiv`|`verkauft`), note, images (max. 12), links.is24, links.immowelt (nur `https:`), inquiryCount (server-seitig über `/api/inquiries`), enabled, featured, createdAt.

## Sichtbarkeit

| Schalter | Wirkung |
|---|---|
| **Auf Website zeigen** (`enabled`) | Objekt auf Objekte-Seite, Detailseite und Kontaktformular-Picker |
| **Auf Startseite** (`featured`) | zusätzlich auf der Startseite, **max. 6** gleichzeitig |
| Verkauft / Verborgen | nirgends öffentlich |

Reihenfolge in der Admin-Liste = Reihenfolge auf der Website (Drag & Drop). Startseite zeigt `featured`, begrenzt durch `HOME_MAX` in `lib/constants.js` (und `RAIS_HOME_MAX` in `config.js`). Ohne Featured: Fallback auf die ersten Online-Objekte bis Cap.

## Anfragen

Formulare posten an **`/api/inquiries`**. Der Server sendet an Web3Forms (`WEB3FORMS_ACCESS_KEY`) und erhöht danach `inquiry_count` in Supabase. Admin-CSV zeigt nur diesen Serverzähler — kein localStorage mehr.

## Personalize

In `config.js`:

- `tenant`: Kurzname, z. B. `haller-haven`
- `RAIS_SITE_BASE`: Canonical-Origin (`https://haller-immobilien.de`)
- `RAIS_HOME_MAX`: Cap Startseite (muss zu `lib/constants.js` passen)
- `RAIS_LISTINGS_URL`: `/api/listings`
- `RAIS_INQUIRIES_URL`: `/api/inquiries`

## Stop

- Kein Live-Passwort / Session-Secret / Service-Role / Web3Forms-Key in Git.
- Kein Admin-Link in der öffentlichen Navigation.
- `robots.txt` verbietet `/admin`.
- Keine data:-Bilder in Listings — immer über `/api/upload` → Supabase bucket `listing-images` (JPEG/PNG/WebP only).
