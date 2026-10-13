-- Classic relaunch: editable site content (Banner, Partner-Logos, Bewertungen, Texte, Hausverwaltung-PDF)
-- and PDF attachments (Grundrisse, Energieausweis) in the existing bucket.

CREATE TABLE IF NOT EXISTS public.website_settings (
  key text PRIMARY KEY CHECK (key ~ '^[a-z][a-zA-Z0-9_]{0,40}$'),
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.website_settings IS
  'Admin-editable site content. Read/write only via service role (api/settings.js).';

-- No policies: anon/authenticated have no access; the service role bypasses RLS.
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- Allow PDFs (max 10 MB) next to images. Images stay capped client/server side at 4 MB.
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id = 'listing-images';
