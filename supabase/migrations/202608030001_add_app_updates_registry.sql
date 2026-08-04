-- Registry of EAS Updates published for the MACT mobile app.
-- This is administrative release data for the dashboard, not user/device telemetry.

create or replace function public.text_array_has_no_duplicates(values text[])
returns boolean
language sql
immutable
as $$
  select coalesce(cardinality(values), 0) = (
    select count(distinct value)
    from unnest(values) as value
  );
$$;

create table if not exists public.app_updates (
  id uuid primary key default gen_random_uuid(),
  eas_update_id uuid not null,
  update_group_id uuid,
  channel text not null,
  branch text,
  runtime_version text not null,
  app_version text,
  android_version_code integer,
  ios_build_number text,
  platforms text[] not null default '{}',
  message text,
  git_commit_sha text,
  git_branch text,
  published_at timestamptz not null,
  registered_at timestamptz not null default now(),
  registered_by text,
  metadata jsonb not null default '{}'::jsonb,
  is_rollback boolean not null default false
);

alter table public.app_updates enable row level security;

alter table public.app_updates
drop constraint if exists app_updates_eas_update_id_unique;

alter table public.app_updates
add constraint app_updates_eas_update_id_unique
unique (eas_update_id);

alter table public.app_updates
drop constraint if exists app_updates_channel_not_blank;

alter table public.app_updates
add constraint app_updates_channel_not_blank
check (length(btrim(channel)) > 0);

alter table public.app_updates
drop constraint if exists app_updates_runtime_version_not_blank;

alter table public.app_updates
add constraint app_updates_runtime_version_not_blank
check (length(btrim(runtime_version)) > 0);

alter table public.app_updates
drop constraint if exists app_updates_platforms_allowed;

alter table public.app_updates
add constraint app_updates_platforms_allowed
check (
  platforms <@ array['android', 'ios']::text[]
  and public.text_array_has_no_duplicates(platforms)
);

create index if not exists app_updates_channel_runtime_published_idx
on public.app_updates (channel, runtime_version, published_at desc);

create index if not exists app_updates_published_idx
on public.app_updates (published_at desc);

drop policy if exists "admins can read app updates" on public.app_updates;
create policy "admins can read app updates"
on public.app_updates
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.is_active = true
  )
);

comment on table public.app_updates is
'Administrative registry of EAS Updates published for the MACT mobile app. Rows are release records and do not represent user/device adoption.';

comment on column public.app_updates.eas_update_id is
'Unique EAS Update UUID returned by EAS for a published update.';

comment on column public.app_updates.update_group_id is
'Optional EAS update group UUID when supplied by EAS. Platform-specific updates may have distinct EAS update IDs.';

comment on column public.app_updates.platforms is
'Platforms included in this registered update row. Supported values are android and ios.';

comment on column public.app_updates.metadata is
'Additional server-side release metadata, including registration_source.';
