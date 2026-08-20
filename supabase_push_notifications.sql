-- Push tokens for student deal/event alerts
--
-- Run in the Supabase SQL editor against the shared Uni Deals project.
-- After this file:
--   1. Deploy `supabase/functions/notify-students`
--   2. Create Database Webhooks on `deals` and `events` (see README)

CREATE TABLE IF NOT EXISTS public.push_tokens (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (expo_push_token)
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx
  ON public.push_tokens (user_id);

COMMENT ON TABLE public.push_tokens IS
  'Expo push tokens. One row per device. Students receive new-deal and new-event alerts.';

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own push tokens" ON public.push_tokens;
CREATE POLICY "Users can read own push tokens"
  ON public.push_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push tokens" ON public.push_tokens;
CREATE POLICY "Users can insert own push tokens"
  ON public.push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own push tokens" ON public.push_tokens;
CREATE POLICY "Users can update own push tokens"
  ON public.push_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push tokens" ON public.push_tokens;
CREATE POLICY "Users can delete own push tokens"
  ON public.push_tokens
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;

-- SECURITY DEFINER so a device can reclaim a token that still belongs to a
-- previous account (ON CONFLICT UPDATE of user_id would otherwise fail RLS).
CREATE OR REPLACE FUNCTION public.upsert_own_push_token(
  p_token text,
  p_platform text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RAISE EXCEPTION 'Push token is required';
  END IF;
  IF p_platform NOT IN ('ios', 'android') THEN
    RAISE EXCEPTION 'Invalid platform';
  END IF;

  INSERT INTO public.push_tokens (user_id, expo_push_token, platform)
  VALUES (uid, trim(p_token), p_platform)
  ON CONFLICT (expo_push_token)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    platform = EXCLUDED.platform,
    updated_at = now();
END;
$$;

-- Possessing the device token is proof of the device; any signed-in user on
-- that device can drop the row so a partner/admin login stops student alerts.
CREATE OR REPLACE FUNCTION public.unregister_push_token(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RETURN;
  END IF;

  DELETE FROM public.push_tokens
  WHERE expo_push_token = trim(p_token);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_own_push_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_own_push_token(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.unregister_push_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unregister_push_token(text) TO authenticated;

-- Service-role only. Used by notify-students so we do not depend on a
-- PostgREST relationship between push_tokens and user_roles.
CREATE OR REPLACE FUNCTION public.list_student_push_tokens()
RETURNS TABLE (expo_push_token text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT pt.expo_push_token
  FROM public.push_tokens pt
  INNER JOIN public.user_roles ur ON ur.user_id = pt.user_id
  WHERE ur.role = 'student';
$$;

REVOKE ALL ON FUNCTION public.list_student_push_tokens() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_student_push_tokens() TO service_role;
