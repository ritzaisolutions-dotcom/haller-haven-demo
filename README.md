# Haller Haven Demo — Personalization SOP

Template: **Haven** (full-bleed dark stage, Fraunces).
Repo: `ritzaisolutions-dotcom/haller-haven-demo`

This README is the runbook for a human **or an AI**. Do not invent scope. Check the list, change only listed fields, stop.

## What this is

Preview site (Schicht 1). Haller content is the example tenant.
Not a live mandate. Not the listing-admin CMS (that is AN-0015 after signature).

Form: Web3Forms via `form.js`. n8n is Schicht 2 only.

## Already in the repo

- [x] Full-bleed hero, two project tiles, underline form
- [x] Form fields: intent, name, email, phone, place
- [x] Honeypot `botcheck`
- [x] `form.js` POST to `https://api.web3forms.com/submit`
- [x] `window.RAIS_FORM` block in `index.html`

## Missing until you fill them (AI: do not skip)

- [ ] `window.RAIS_FORM.accessKey` still `REPLACE_WEB3FORMS_ACCESS_KEY`
- [ ] Prospect logo (now Haller CDN)
- [ ] Prospect name, city, phone, mail, Impressum
- [ ] Hero sentence that names **their** current-site problem
- [ ] Demo watermark stays until AN-0015 + AVV
- [ ] Own domain / DNS — not in preview
- [ ] `/admin` listings backend — not in this repo
- [ ] n8n webhook — do not point preview here

If the key is still `REPLACE_…`, the form must show “Key fehlt”. That is correct.

## Personalize a new prospect (30–60 min)

Copy this repo or this `index.html` + `form.js`. Then only:

1. **Key** — RAIS Web3Forms key into `accessKey`. One key for all previews. Inbox = Kevin.
2. **fromName / subject** — `{Firma} Preview`.
3. **Logo** — their PNG/SVG. Height ~52px. Do not keep Haller logo on a foreign preview.
4. **Strings to replace** (search these):
   - Haller
   - Andernach / Koblenz / Neuwied
   - Kirchberg 42, 56626
   - 02632 9458-0
   - info@haller-immobilien.de
   - Waldemar Haller
   - “Allgemeinmediziner für Wohnraum.”
5. **Hero** — one true sentence about *their* live site (no CTA / dead contact / 2014 look). No invented metrics.
6. **Stage image** — swap the Haller slide URL only if you have a real photo of them or their street. Else keep a dark wash, no random luxury stock.
7. **Footer** — `Demo · kein Live-Mandat · {Firma} Preview`.
8. Deploy Vercel preview URL. Test one form submit. Mail must hit RAIS inbox.
9. Send URL only after they said “zeig her”. Not in DM1.

## Do not change

Dark stage + Fraunces + Inter unless they handed a system.
Form field names (`name`, `email`, `phone`, `place`, `intent`, `note`).
`form.js` logic.
Adding CMS, blog, IS24, Calendly, n8n on preview.

## Schicht 2 (after AN-0015 + AVV only)

Duplicate n8n workflow **RAIS Website Anfrage**  
`POST https://n8n.ritz-ai.solutions/webhook/rais-website-anfrage`  
Set `toEmail` to the client inbox. Do not leave the Web3Forms preview key on their domain.

## AI stop conditions

- No access key in chat → leave placeholder, say so.
- No logo file → keep a text name, flag “logo missing”.
- Site already good (clear CTA + working form) → do not build a preview; this lead is out.
- They asked for listings admin → point to AN-0015, do not hack it into this HTML.
