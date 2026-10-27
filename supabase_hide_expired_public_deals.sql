-- Hide ended and non-approved deals from the public catalogue.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- The website already drops expired and removed offers. Play Store and
-- App Store builds call get_public_deals() and render every row, and the
-- RPC used to null out end_time when the end date is hidden, so those
-- builds could not tell an offer had ended. Filtering here updates the
-- live apps without a new store release.
--
-- Partners and admins still load finished deals from the deals table.

BEGIN;

DROP FUNCTION IF EXISTS public.get_public_deals();

CREATE FUNCTION public.get_public_deals()
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  brand TEXT,
  discount TEXT,
  type TEXT,
  category TEXT,
  image_url TEXT,
  description TEXT,
  store_url TEXT,
  created_at TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  show_start_date BOOLEAN,
  show_end_date BOOLEAN,
  is_coming_soon BOOLEAN,
  is_expired BOOLEAN,
  location_name TEXT,
  location_address TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.title,
    d.brand,
    d.discount,
    d.type,
    d.category,
    d.image_url,
    d.description,
    d.store_url,
    d.created_at,
    CASE
      WHEN d.start_time IS NOT NULL AND d.start_time > now() THEN d.start_time
      WHEN d.show_start_date THEN d.start_time
      ELSE NULL
    END AS start_time,
    CASE WHEN d.show_end_date THEN d.end_time ELSE NULL END AS end_time,
    d.show_start_date,
    d.show_end_date,
    (d.start_time IS NOT NULL AND d.start_time > now()) AS is_coming_soon,
    (d.end_time IS NOT NULL AND d.end_time < now()) AS is_expired,
    d.location_name,
    d.location_address
  FROM public.deals d
  WHERE d.status = 'approved'
    AND (d.end_time IS NULL OR d.end_time >= now())
  ORDER BY d.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_deals() TO anon, authenticated;

COMMIT;
