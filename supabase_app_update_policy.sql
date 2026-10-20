-- Release policy the mobile app reads on launch and when it returns to the foreground.
-- Run once in the Supabase SQL editor.
--
-- Routine EAS updates stay on force_ota = false. The app downloads them in the
-- background and applies them the next time it is opened from scratch.
--
-- Mandatory JS update (old bundle would break):
--   1. Publish the bundle with `npm run update:production` (or update:preview).
--   2. update public.app_update_policy
--        set force_ota = true, updated_at = now()
--        where id = 1;
--   3. After people have reloaded onto it, set force_ota back to false.
--
-- Native binary is too old for an over-the-air bundle. min_store_version is the
-- runtime version baked into the build (app.json "version" at build time):
--   update public.app_update_policy
--     set min_store_version = '1.1.0', updated_at = now()
--     where id = 1;

create table if not exists public.app_update_policy (
  id integer primary key default 1 check (id = 1),
  min_store_version text,
  force_ota boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.app_update_policy (id, min_store_version, force_ota)
values (1, null, false)
on conflict (id) do nothing;

alter table public.app_update_policy enable row level security;

revoke all on table public.app_update_policy from anon, authenticated;
grant select on table public.app_update_policy to anon, authenticated;

drop policy if exists "Anyone can read the app update policy" on public.app_update_policy;
create policy "Anyone can read the app update policy"
  on public.app_update_policy
  for select
  to anon, authenticated
  using (true);
