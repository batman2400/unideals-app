-- Store-update gate. The app reads this row on launch and when it returns
-- to the foreground. Paste this whole file into the Supabase SQL editor and run it.
-- It is safe to run more than once. It does not lock anyone out.
--
-- The installed app compares its own version with min_store_version.
-- Older installs see "Update Uni Deals" and cannot continue until they
-- install from the store. If this row cannot be read, the app opens anyway.
--
-- Do not raise min_store_version until that exact version is live on both
-- the App Store and Play Store. The builds in the stores today are
-- Android 1.0.1 and iPhone 1.0.2, and neither includes the latest fixes.
-- Setting a higher minimum before the new build is listed locks people out
-- with nothing to install.
--
-- After the new build is live on both stores, run only this, using the
-- version that is actually listed (change 1.0.3 if you shipped a different one):
--
--   update public.app_update_policy
--     set min_store_version = '1.0.3', updated_at = now()
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

select id, min_store_version, force_ota, updated_at
from public.app_update_policy
where id = 1;
