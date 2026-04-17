create table if not exists public.events (
  id uuid primary key,
  name text not null,
  date date not null,
  location text not null,
  courts text[] not null default array['Court 1']::text[],
  match_type text not null check (match_type in ('single', 'double')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.events
add column if not exists courts text[];

update public.events
set courts = array['Court 1']::text[]
where courts is null or coalesce(array_length(courts, 1), 0) = 0;

alter table public.events
alter column courts set default array['Court 1']::text[];

alter table public.events
alter column courts set not null;

alter table public.events
drop constraint if exists events_courts_not_empty;

alter table public.events
add constraint events_courts_not_empty
check (coalesce(array_length(courts, 1), 0) > 0);

alter table public.events enable row level security;

drop policy if exists "Guests and users can read events" on public.events;
drop policy if exists "Authenticated users can insert events" on public.events;
drop policy if exists "Authenticated users can update events" on public.events;
drop policy if exists "Authenticated users can delete events" on public.events;

create policy "Guests and users can read events"
on public.events
for select
to anon, authenticated
using (true);

create policy "Authenticated users can insert events"
on public.events
for insert
to authenticated
with check (auth.uid() is not null);

create policy "Authenticated users can update events"
on public.events
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "Authenticated users can delete events"
on public.events
for delete
to authenticated
using (auth.uid() is not null);