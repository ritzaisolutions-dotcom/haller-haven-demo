# SOP — Admin-Panel (alle drei Templates)

Pfad: `/admin.html`  
Gilt für Formed, Ambience, Haven. Dieselbe Datei.

## Kann da jeder dran?

**Öffentliche Seite:** ja, `/admin.html` ist eine normale URL. Wer den Link kennt, sieht das Login.

**Login jetzt (Preview / Demo):** Passwort steht in `config.js` (`window.RAIS_ADMIN.password`).
Das ist **kein** Schloss. Jeder mit „Seite Quelltext“ liest das Passwort.
Zweck: der Makler klickt nicht aus Versehen ins Formular. Es hält keinen Angreifer.

Wenn das Passwort noch `REPLACE_ADMIN_PASSWORD` ist, bleibt das Panel zu. Absicht.

**Produktion (Pflicht vor Go-Live R2):** eines von beiden, sonst kein Admin auf der Kundendomain.

1. Vercel Deployment Protection — Passwort nur in Vercel, nicht im Repo.
2. Besser: Supabase Auth, eine E-Mail = der Makler. Listings in der Tabelle, nicht in localStorage.

Ohne 1 oder 2 darf `/admin.html` nicht auf der Live-Domain liegen (Datei nicht deployen oder Vercel ignorieren).

## Wo die Objekte liegen

| Umgebung | Speicher | Wer sieht die Objekte |
|---|---|---|
| Preview / dieser Browser | `localStorage` | nur dieses Gerät |
| Öffentliche Seite | `/listings.json` im Repo | jeder Besucher |
| Live nach AN-0015 | Supabase Tenant | jeder Besucher, Admin nur Login |

Admin → Objekt anlegen → **JSON exportieren** → `listings.json` ersetzen → deployen.
Sonst bleibt die Startseite leer. localStorage vom Admin erscheint nicht bei Website-Besuchern.

## Felder (nicht erweitern)

title, price, area, rooms, place, status (`aktiv`\|`verkauft`), note, images (max. 12, WebP, lange Kante 1600).

Bilder nur im Admin. Kein WhatsApp, kein Zip an Kevin.

## Personalize

In `config.js`:

- `tenant`: Kurzname der Firma, z. B. `mueller-koeln`
- `password`: nur Preview. Nie das Live-Passwort committen.

## Stop

- Kein Live-Passwort in Git.
- Kein Admin-Link in der öffentlichen Navigation.
- `robots.txt` verbietet `/admin.html`.
- Ohne AVV keine Personen im Formular. Admin-Fotos sind Objektdaten, trotzdem nicht öffentlich indexieren.
