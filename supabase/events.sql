create table if not exists public.events (
  id uuid primary key,
  club_id uuid references public.clubs(id) on delete restrict,
  created_by_id uuid references auth.users(id) on delete restrict,
  name text not null,
  date date not null,
  time_start timestamptz,
  time_end timestamptz,
  location text not null,
  courts text[] not null default array['Court 1']::text[],
  match_type text not null check (match_type in ('single', 'double')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.events
  add column if not exists club_id uuid references public.clubs(id) on delete restrict;

alter table public.events
  add column if not exists created_by_id uuid references auth.users(id) on delete restrict;

alter table public.events
  add column if not exists courts text[];

alter table public.events
  add column if not exists time_start timestamptz;

alter table public.events
  add column if not exists time_end timestamptz;

update public.events
set time_start = (date::text || 'T10:00:00+07:00')::timestamptz
where time_start is null;

update public.events
set time_end = (date::text || 'T12:00:00+07:00')::timestamptz
where time_end is null;

update public.events
set courts = array['Court 1']::text[]
where courts is null or coalesce(array_length(courts, 1), 0) = 0;

alter table public.events
  alter column courts set default array['Court 1']::text[];

do $$
begin
  if not exists (select 1 from public.events where courts is null or coalesce(array_length(courts, 1), 0) = 0) then
    alter table public.events alter column courts set not null;
  end if;

  if not exists (select 1 from public.events where club_id is null) then
    alter table public.events alter column club_id set not null;
  end if;

  if not exists (select 1 from public.events where created_by_id is null) then
    alter table public.events alter column created_by_id set not null;
  end if;

  if not exists (select 1 from public.events where time_start is null) then
    alter table public.events alter column time_start set not null;
  end if;

  if not exists (select 1 from public.events where time_end is null) then
    alter table public.events alter column time_end set not null;
  end if;
end $$;

alter table public.events
  alter column time_start set default (timezone('utc', now()));

alter table public.events
  alter column time_end set default (timezone('utc', now()));

alter table public.events
  drop constraint if exists events_courts_not_empty;

alter table public.events
  add constraint events_courts_not_empty
  check (coalesce(array_length(courts, 1), 0) > 0);

create index if not exists events_club_id_idx on public.events(club_id);
create index if not exists events_created_by_id_idx on public.events(created_by_id);
create index if not exists events_club_created_at_idx on public.events(club_id, created_at desc);

alter table public.events enable row level security;

drop policy if exists "Public can read events" on public.events;
drop policy if exists "Club admins can insert events" on public.events;
drop policy if exists "Club admins can update events" on public.events;
drop policy if exists "Club admins can delete events" on public.events;

create policy "Public can read events"
on public.events
for select
to anon, authenticated
using (true);

create policy "Club admins can insert events"
on public.events
for insert
to authenticated
with check (
  public.is_club_admin(club_id, auth.uid())
  and created_by_id = auth.uid()
);

create policy "Club admins can update events"
on public.events
for update
to authenticated
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

create policy "Club admins can delete events"
on public.events
for delete
to authenticated
using (public.is_club_admin(club_id, auth.uid()));