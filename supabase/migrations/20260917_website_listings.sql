-- Haller Haven website listings schema
-- Target: Haller Immobilienberatung Supabase (EU)

CREATE TABLE IF NOT EXISTS public.website_listings (
  id text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  price text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  rooms text NOT NULL DEFAULT '',
  place text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'kauf' CHECK (type IN ('kauf', 'miete')),
  category text NOT NULL DEFAULT '',
  ref text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'aktiv' CHECK (status IN ('aktiv', 'verkauft')),
  enabled boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  note text NOT NULL DEFAULT '',
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  links jsonb NOT NULL DEFAULT '{"is24":"","immowelt":""}'::jsonb,
  inquiry_count integer NOT NULL DEFAULT 0 CHECK (inquiry_count >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS website_listings_public_idx
  ON public.website_listings (sort_order, created_at)
  WHERE enabled = true AND status <> 'verkauft';

CREATE INDEX IF NOT EXISTS website_listings_featured_idx
  ON public.website_listings (sort_order)
  WHERE featured = true AND enabled = true AND status <> 'verkauft';

CREATE TABLE IF NOT EXISTS public.website_inquiries (
  id bigserial PRIMARY KEY,
  listing_ids text[] NOT NULL DEFAULT '{}',
  intent text,
  visitor_key text,
  page_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS website_inquiries_created_idx
  ON public.website_inquiries (created_at DESC);

COMMENT ON TABLE public.website_inquiries IS
  'Operational inquiry events for website demo. No full message PII. Retention target 24 months.';

CREATE TABLE IF NOT EXISTS public.website_rate_limits (
  bucket text NOT NULL,
  rate_key text NOT NULL,
  window_start timestamptz NOT NULL,
  hit_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, rate_key)
);

ALTER TABLE public.website_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.website_rate_limit_hit(
  p_bucket text,
  p_key text,
  p_max integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_row public.website_rate_limits%ROWTYPE;
  v_window interval := make_interval(secs => GREATEST(p_window_seconds, 1));
BEGIN
  IF p_bucket IS NULL OR length(trim(p_bucket)) = 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.website_rate_limits (bucket, rate_key, window_start, hit_count)
  VALUES (p_bucket, coalesce(nullif(trim(p_key), ''), 'anon'), v_now, 1)
  ON CONFLICT (bucket, rate_key) DO UPDATE
    SET hit_count = CASE
          WHEN public.website_rate_limits.window_start + v_window < v_now THEN 1
          ELSE public.website_rate_limits.hit_count + 1
        END,
        window_start = CASE
          WHEN public.website_rate_limits.window_start + v_window < v_now THEN v_now
          ELSE public.website_rate_limits.window_start
        END
  RETURNING * INTO v_row;

  RETURN v_row.hit_count <= GREATEST(p_max, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.website_listings_replace(p_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_rows must be a JSON array';
  END IF;

  DELETE FROM public.website_listings;

  INSERT INTO public.website_listings (
    id, title, price, area, rooms, place, type, category, ref, status,
    enabled, featured, note, images, links, inquiry_count, sort_order,
    created_at, updated_at
  )
  SELECT
    r.id,
    coalesce(r.title, ''),
    coalesce(r.price, ''),
    coalesce(r.area, ''),
    coalesce(r.rooms, ''),
    coalesce(r.place, ''),
    CASE WHEN r.type = 'miete' THEN 'miete' ELSE 'kauf' END,
    coalesce(r.category, ''),
    coalesce(r.ref, ''),
    CASE WHEN r.status = 'verkauft' THEN 'verkauft' ELSE 'aktiv' END,
    coalesce(r.enabled, true),
    coalesce(r.featured, false),
    coalesce(r.note, ''),
    coalesce(r.images, '[]'::jsonb),
    coalesce(r.links, '{"is24":"","immowelt":""}'::jsonb),
    greatest(coalesce(r.inquiry_count, 0), 0),
    coalesce(r.sort_order, 0),
    coalesce(r.created_at::timestamptz, now()),
    coalesce(r.updated_at::timestamptz, now())
  FROM jsonb_to_recordset(p_rows) AS r(
    id text,
    title text,
    price text,
    area text,
    rooms text,
    place text,
    type text,
    category text,
    ref text,
    status text,
    enabled boolean,
    featured boolean,
    note text,
    images jsonb,
    links jsonb,
    inquiry_count integer,
    sort_order integer,
    created_at text,
    updated_at text
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.website_inquiry_record(
  p_listing_ids text[],
  p_intent text,
  p_visitor_key text,
  p_page_path text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.website_inquiries (listing_ids, intent, visitor_key, page_path)
  VALUES (
    coalesce(p_listing_ids, '{}'),
    nullif(trim(coalesce(p_intent, '')), ''),
    nullif(left(trim(coalesce(p_visitor_key, '')), 64), ''),
    nullif(left(trim(coalesce(p_page_path, '')), 300), '')
  );

  IF p_listing_ids IS NOT NULL AND cardinality(p_listing_ids) > 0 THEN
    UPDATE public.website_listings
    SET inquiry_count = inquiry_count + 1,
        updated_at = now()
    WHERE id = ANY (p_listing_ids);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.website_rate_limit_hit(text, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.website_listings_replace(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.website_inquiry_record(text[], text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.website_rate_limit_hit(text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.website_listings_replace(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.website_inquiry_record(text[], text, text, text) TO service_role;
