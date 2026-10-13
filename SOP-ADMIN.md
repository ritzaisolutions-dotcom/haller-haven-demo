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
| Grundrisse, Energieausweis, Hausverwaltung-PDF | gleicher Bucket (PDF max. 10 MB, signierte Upload-URL) | öffentliche Download-Links |
| Banner, Partner-Logos, Bewertungen, Texte | Supabase `website_settings` via `/api/settings` | öffentlich (Banner nur im eingestellten Zeitraum), CDN-Cache 60 s |

Admin → „Auf Website zeigen“ / „Auf Startseite“ oder Speichern → **sofort live**. Sicherung optional über „Sicherung speichern“.

## Felder

title, price, area, rooms, place, type (`kauf`|`miete`), category, ref, status (`aktiv`|`verkauft`), note (Kurzbeschreibung), description (formatiert: Fett, Kursiv, Schriftstärke, Überschriften, Listen, Links — Einfügen aus Word/Google Docs behält die Formatierung, Server bereinigt per Allowlist), provision, floorplans (max. 6, PDF oder Bild), energyPdf, images (max. 12), links.is24, links.immowelt (nur `https:`), inquiryCount (server-seitig über `/api/inquiries`), enabled, featured, createdAt.

Provision, Grundrisse und Energieausweis-PDF liegen technisch im `links`-JSON der Zeile — keine eigene Spalte nötig.

## Website-Inhalte (unter der Objektliste)

| Reiter | Was | Wo sichtbar |
|---|---|---|
| Banner | Text (formatiert), Link, Stil Hinweis/Event, Zeitraum von–bis | oben auf allen Seiten, schließbar |
| Partner-Logos | Logo hochladen, Name, Link, Reihenfolge | Startseite, Über uns |
| Bewertungen | Google, ImmoScout24, Immowelt: Wert, Anzahl, Satz, Profil-Link | Startseite |
| Texte | Intro-Blöcke Startseite, Über uns, Team, Leistungen, Hausverwaltung | leer = statischer Text bleibt |
| Hausverwaltung-PDF | Upload / Entfernen | Download-Button auf `hausverwaltung.html` |

Nur öffentlich belegte Bewertungszahlen eintragen.

## Sichtbarkeit

| Schalter | Wirkung |
|---|---|
| **Auf Website zeigen** (`enabled`) | Objekt auf Objekte-Seite, Detailseite und Kontaktformular-Picker |
| **Auf Startseite** (`featured`) | zusätzlich auf der Startseite, **max. 6** gleichzeitig |
| Verkauft / Verborgen | nirgends öffentlich |

Reihenfolge in der Admin-Liste = Reihenfolge auf der Website (Drag & Drop). Startseite zeigt `featured`, begrenzt durch `HOME_MAX = 6` in `lib/constants.js` (und `RAIS_HOME_MAX` in `config.js`). Ohne Featured: Fallback auf die ersten Online-Objekte bis Cap.

## Anfragen

Formulare posten an **`/api/inquiries`**. Der Server sendet die Mail per SMTP an das EU-Postfach, schickt sie optional an das CRM (`CRM_WEBHOOK_URL`) und erhöht danach `inquiry_count` in Supabase. Admin-CSV zeigt nur diesen Serverzähler — kein localStorage mehr.

## Personalize

In `config.js`:

- `tenant`: Kurzname, z. B. `haller-haven`
- `RAIS_SITE_BASE`: Canonical-Origin (`https://haller-immobilien.de`)
- `RAIS_HOME_MAX`: Cap Startseite (muss zu `lib/constants.js` passen)
- `RAIS_LISTINGS_URL`: `/api/listings`
- `RAIS_INQUIRIES_URL`: `/api/inquiries`

## Stop

- Kein Live-Passwort / Session-Secret / Service-Role / SMTP- oder CRM-Secret in Git.
- Kein Admin-Link in der öffentlichen Navigation.
- `robots.txt` verbietet `/admin`.
- Keine data:-Bilder in Listings — immer über `/api/upload` → Supabase bucket `listing-images` (JPEG/PNG/WebP, PDFs nur über signierte Upload-URL).
