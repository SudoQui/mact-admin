-- MACT Admin Dashboard support tables and safety indexes
-- Review before running in production.

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('owner', 'admin', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id),
  admin_email text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  import_batch_id uuid,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create unique index if not exists places_slug_unique
on public.places (slug)
where slug is not null;

create unique index if not exists community_events_slug_unique
on public.community_events (slug);

create index if not exists places_admin_search_idx
on public.places (mode, category, is_active, suburb);

create index if not exists community_events_admin_search_idx
on public.community_events (event_type, is_active, starts_at);

create index if not exists whats_new_items_admin_search_idx
on public.whats_new_items (mode, item_type, priority, is_active, visible_from);

-- Optional read policy for logged-in admins only.
-- Service role bypasses RLS, but these are useful if you later query with the user's session.

drop policy if exists "admins can read admin users" on public.admin_users;
create policy "admins can read admin users"
on public.admin_users
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

drop policy if exists "admins can read audit log" on public.audit_log;
create policy "admins can read audit log"
on public.audit_log
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
