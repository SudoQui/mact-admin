-- Add multi-value audience/discovery tags for community events.
-- event_type remains the primary event format; event_tags stores multiple audience/discovery classifications.

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

alter table public.community_events
add column if not exists event_tags text[] not null default '{}';

alter table public.community_events
drop constraint if exists community_events_event_tags_allowed;

alter table public.community_events
add constraint community_events_event_tags_allowed
check (
  event_tags <@ array[
    'women',
    'men',
    'youth',
    'children',
    'families',
    'brothers',
    'sisters',
    'students',
    'new_muslims',
    'general'
  ]::text[]
  and public.text_array_has_no_duplicates(event_tags)
);

comment on column public.community_events.event_tags is
'Multiple audience/discovery classifications for a community event. event_type remains the primary event format.';

create index if not exists community_events_event_tags_gin_idx
on public.community_events
using gin (event_tags);

update public.community_events
set event_tags = array(
  select allowed.tag
  from unnest(array[
    'women',
    'men',
    'youth',
    'children',
    'families',
    'brothers',
    'sisters',
    'students',
    'new_muslims',
    'general'
  ]::text[]) with ordinality as allowed(tag, sort_order)
  where allowed.tag = any(event_tags || array['youth']::text[])
  order by allowed.sort_order
)
where event_type = 'youth';

update public.community_events
set event_tags = array(
  select allowed.tag
  from unnest(array[
    'women',
    'men',
    'youth',
    'children',
    'families',
    'brothers',
    'sisters',
    'students',
    'new_muslims',
    'general'
  ]::text[]) with ordinality as allowed(tag, sort_order)
  where allowed.tag = any(event_tags || array['women', 'sisters']::text[])
  order by allowed.sort_order
)
where event_type = 'sisters';

update public.community_events
set event_tags = array(
  select allowed.tag
  from unnest(array[
    'women',
    'men',
    'youth',
    'children',
    'families',
    'brothers',
    'sisters',
    'students',
    'new_muslims',
    'general'
  ]::text[]) with ordinality as allowed(tag, sort_order)
  where allowed.tag = any(event_tags || array['men', 'brothers']::text[])
  order by allowed.sort_order
)
where event_type = 'brothers';

update public.community_events
set event_tags = array(
  select allowed.tag
  from unnest(array[
    'women',
    'men',
    'youth',
    'children',
    'families',
    'brothers',
    'sisters',
    'students',
    'new_muslims',
    'general'
  ]::text[]) with ordinality as allowed(tag, sort_order)
  where allowed.tag = any(event_tags || array['families']::text[])
  order by allowed.sort_order
)
where event_type = 'family';
