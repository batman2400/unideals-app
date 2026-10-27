-- Location support for in-store deals and events.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Apply AFTER supabase_expired_online_codes.sql and
-- supabase_reveal_deal_code_cutover.sql in the web repo. This file rebuilds
-- get_public_deals() and get_public_deal_by_id() from their latest definitions
-- and only APPENDS two columns, so older app builds keep working.
--
-- What changes:
--   deals   + location_name, location_address   (shown for In-Store deals)
--   events  + location_address, is_online       (location_name already exists)
--   RPCs    get_public_deals / get_public_deal_by_id return the deal location
--           submit_pending_event accepts p_location_address and p_is_online
--
-- Deliberately NOT added: a CHECK constraint forcing In-Store deals to have a
-- location. A NOT VALID check still fires on every UPDATE, so pausing or
-- approving a legacy In-Store deal without a location would start failing, and
-- older app builds would fail to publish. The app enforces it in the form.

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. Columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS location_address TEXT;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS location_address TEXT,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT FALSE;

-- ────────────────────────────────────────────────────────────
-- 2. Public deal list
-- ────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────
-- 3. Public deal by id (same code-visibility rules as the cutover file)
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_public_deal_by_id(BIGINT);

CREATE FUNCTION public.get_public_deal_by_id(target_deal_id BIGINT)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  brand TEXT,
  discount TEXT,
  type TEXT,
  category TEXT,
  image_url TEXT,
  description TEXT,
  redemption_code TEXT,
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  caller_role TEXT := public.get_user_role();
  can_view_redemption_code BOOLEAN := FALSE;
  deal_is_coming_soon BOOLEAN := FALSE;
  deal_is_expired BOOLEAN := FALSE;
BEGIN
  SELECT
    (d.start_time IS NOT NULL AND d.start_time > now()),
    (d.end_time IS NOT NULL AND d.end_time < now())
  INTO deal_is_coming_soon, deal_is_expired
  FROM public.deals d
  WHERE d.id = target_deal_id
    AND d.status = 'approved'
  LIMIT 1;

  deal_is_coming_soon := COALESCE(deal_is_coming_soon, FALSE);
  deal_is_expired := COALESCE(deal_is_expired, FALSE);

  IF deal_is_expired AND COALESCE(caller_role, '') NOT IN ('admin', 'partner') THEN
    RETURN;
  END IF;

  -- Students never receive the code on page load. They must call
  -- reveal_online_deal_code. Admins and owning partners still can.
  IF caller_role = 'admin' THEN
    can_view_redemption_code := TRUE;

  ELSIF caller_role = 'partner' THEN
    SELECT (d.brand_id IS NOT NULL
            AND d.brand_id = public.get_partner_brand_id(caller_id))
    INTO can_view_redemption_code
    FROM public.deals d
    WHERE d.id = target_deal_id;

    can_view_redemption_code := COALESCE(can_view_redemption_code, FALSE);
  ELSE
    can_view_redemption_code := FALSE;
  END IF;

  IF deal_is_coming_soon AND COALESCE(caller_role, '') NOT IN ('admin', 'partner') THEN
    can_view_redemption_code := FALSE;
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.brand,
    d.discount,
    d.type,
    d.category,
    d.image_url,
    d.description,
    CASE
      WHEN can_view_redemption_code THEN d.redemption_code
      ELSE NULL
    END AS redemption_code,
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
    AND d.id = target_deal_id
  LIMIT 1;
END
$$;

GRANT EXECUTE ON FUNCTION public.get_public_deal_by_id(BIGINT) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 4. Event submission: accept address + online flag
--    The old 12-argument signature is dropped so named-argument calls from
--    older app builds resolve to the new function (new args have defaults).
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.submit_pending_event(
  TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.submit_pending_event(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_end_time TIMESTAMPTZ DEFAULT NULL,
  p_publish_at TIMESTAMPTZ DEFAULT NULL,
  p_location_name TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_university_name TEXT DEFAULT NULL,
  p_club_name TEXT DEFAULT NULL,
  p_cover_image_url TEXT DEFAULT NULL,
  p_target_audience TEXT DEFAULT 'all_students',
  p_external_registration_url TEXT DEFAULT NULL,
  p_location_address TEXT DEFAULT NULL,
  p_is_online BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  IF p_start_time IS NULL THEN
    RAISE EXCEPTION 'Start time is required';
  END IF;

  IF p_end_time IS NOT NULL AND p_end_time < p_start_time THEN
    RAISE EXCEPTION 'End time must be on or after the start time';
  END IF;

  INSERT INTO public.events (
    title,
    description,
    organizer_id,
    start_time,
    end_time,
    publish_at,
    location_name,
    location_address,
    is_online,
    category,
    university_name,
    club_name,
    cover_image_url,
    target_audience,
    external_registration_url,
    status
  ) VALUES (
    btrim(p_title),
    NULLIF(btrim(COALESCE(p_description, '')), ''),
    auth.uid(),
    p_start_time,
    p_end_time,
    COALESCE(p_publish_at, now()),
    NULLIF(btrim(COALESCE(p_location_name, '')), ''),
    NULLIF(btrim(COALESCE(p_location_address, '')), ''),
    COALESCE(p_is_online, FALSE),
    COALESCE(NULLIF(btrim(COALESCE(p_category, '')), ''), 'social'),
    NULLIF(btrim(COALESCE(p_university_name, '')), ''),
    NULLIF(btrim(COALESCE(p_club_name, '')), ''),
    NULLIF(btrim(COALESCE(p_cover_image_url, '')), ''),
    COALESCE(NULLIF(btrim(COALESCE(p_target_audience, '')), ''), 'all_students'),
    NULLIF(btrim(COALESCE(p_external_registration_url, '')), ''),
    'pending'
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_pending_event(
  TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_pending_event(
  TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
