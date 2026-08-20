-- Missing helper the Dashboard webhooks UI needs.
--
-- The Create webhook form calls `supabase_functions.http_request()`. This
-- project did not have that schema, which caused:
--   ERROR: 3F000: schema "supabase_functions" does not exist
--
-- Run this in the SQL editor, then create the two HTTP webhooks again
-- (deals + events → notify-students). Do not put the service role key in git.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE SCHEMA IF NOT EXISTS supabase_functions;

GRANT USAGE ON SCHEMA supabase_functions
  TO postgres, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION supabase_functions.http_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = net, public, pg_temp
AS $function$
DECLARE
  request_id bigint;
  payload jsonb;
  url text := TG_ARGV[0]::text;
  method text := TG_ARGV[1]::text;
  headers jsonb;
  params jsonb;
  timeout_ms integer;
BEGIN
  IF url IS NULL OR url = 'null' THEN
    RAISE EXCEPTION 'url argument is missing';
  END IF;

  IF method IS NULL OR method = 'null' THEN
    RAISE EXCEPTION 'method argument is missing';
  END IF;

  IF TG_ARGV[2] IS NULL OR TG_ARGV[2] = 'null' THEN
    headers := '{"Content-Type": "application/json"}'::jsonb;
  ELSE
    headers := TG_ARGV[2]::jsonb;
  END IF;

  IF TG_ARGV[3] IS NULL OR TG_ARGV[3] = 'null' THEN
    params := '{}'::jsonb;
  ELSE
    params := TG_ARGV[3]::jsonb;
  END IF;

  IF TG_ARGV[4] IS NULL OR TG_ARGV[4] = 'null' THEN
    timeout_ms := 5000;
  ELSE
    timeout_ms := TG_ARGV[4]::integer;
  END IF;

  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW),
    'old_record', to_jsonb(OLD)
  );

  IF upper(method) = 'GET' THEN
    SELECT net.http_get(url, params, headers, timeout_ms) INTO request_id;
  ELSIF upper(method) = 'POST' THEN
    SELECT net.http_post(url, payload, params, headers, timeout_ms) INTO request_id;
  ELSE
    RAISE EXCEPTION 'method argument % is invalid', method;
  END IF;

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION supabase_functions.http_request()
  TO postgres, anon, authenticated, service_role;
