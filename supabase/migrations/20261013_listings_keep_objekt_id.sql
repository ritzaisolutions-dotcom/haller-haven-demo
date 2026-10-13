-- Keep website_listings.objekt_id (link to CRM objekte) across admin saves.
-- website_listings_replace deletes and reinserts every row; before this fix it
-- dropped objekt_id, so the first /admin save unlinked all listings from the CRM.
-- A row may pass objekt_id explicitly; otherwise the previous value for that id is kept.

CREATE OR REPLACE FUNCTION public.website_listings_replace(p_rows jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_rows must be a JSON array';
  END IF;

  CREATE TEMP TABLE _prev_objekt ON COMMIT DROP AS
    SELECT id, objekt_id FROM public.website_listings WHERE objekt_id IS NOT NULL;

  DELETE FROM public.website_listings;

  INSERT INTO public.website_listings (
    id, title, price, area, rooms, place, type, category, ref, status,
    enabled, featured, note, images, links, inquiry_count, sort_order,
    created_at, updated_at, objekt_id
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
    coalesce(r.updated_at::timestamptz, now()),
    (SELECT o.id FROM public.objekte o
      WHERE o.id = coalesce(nullif(r.objekt_id, ''), p.objekt_id) LIMIT 1)
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
    updated_at text,
    objekt_id text
  )
  LEFT JOIN _prev_objekt p ON p.id = r.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;
