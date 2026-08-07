-- Human-readable release numbers for MACT OTA updates.
-- Numbers are allocated by PostgreSQL so concurrent publishers cannot race.

create sequence if not exists public.app_update_release_number_seq;

alter table public.app_updates
add column if not exists release_number bigint;

with ordered_updates as (
  select
    id,
    row_number() over (
      order by published_at asc, registered_at asc, id asc
    ) as assigned_release_number
  from public.app_updates
  where release_number is null
)
update public.app_updates au
set release_number = ordered_updates.assigned_release_number
from ordered_updates
where au.id = ordered_updates.id;

select setval(
  'public.app_update_release_number_seq',
  greatest(
    coalesce((select max(release_number) from public.app_updates), 0),
    1
  ),
  coalesce((select max(release_number) from public.app_updates), 0) > 0
);

alter table public.app_updates
alter column release_number set default nextval('public.app_update_release_number_seq');

alter table public.app_updates
alter column release_number set not null;

create unique index if not exists app_updates_release_number_unique
on public.app_updates (release_number);

create table if not exists public.app_update_release_reservations (
  id uuid primary key default gen_random_uuid(),
  release_number bigint not null default nextval('public.app_update_release_number_seq'),
  reservation_token text not null,
  requested_channel text,
  requested_platform text,
  requested_runtime_version text,
  requested_app_version text,
  requested_by text,
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  consumed_app_update_id uuid references public.app_updates(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.app_update_release_reservations enable row level security;

create unique index if not exists app_update_release_reservations_release_number_unique
on public.app_update_release_reservations (release_number);

create unique index if not exists app_update_release_reservations_token_unique
on public.app_update_release_reservations (reservation_token);

drop policy if exists "admins can read app update release reservations" on public.app_update_release_reservations;
create policy "admins can read app update release reservations"
on public.app_update_release_reservations
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

comment on column public.app_updates.release_number is
'Human-readable sequential MACT OTA release number allocated by PostgreSQL.';

comment on table public.app_update_release_reservations is
'Short-lived release-number reservations used to embed a database-allocated release number into an EAS Update bundle before publication.';
