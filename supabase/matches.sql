create table if not exists public.matches (
  id uuid primary key,
  event_id uuid not null references public.events(id) on delete restrict,
  round integer not null check (round > 0),
  court text not null default 'Court 1',
  team_a text[] not null,
  team_b text[] not null,
  score_a integer,
  score_b integer,
  status text not null check (status in ('pending', 'ongoing', 'completed')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.matches
drop constraint if exists matches_event_id_fkey;

alter table public.matches
add column if not exists court text;

update public.matches
set court = 'Court 1'
where court is null or btrim(court) = '';

alter table public.matches
alter column court set default 'Court 1';

alter table public.matches
alter column court set not null;

alter table public.matches
drop constraint if exists matches_court_not_blank;

alter table public.matches
add constraint matches_court_not_blank
check (char_length(btrim(court)) > 0);

alter table public.matches
add constraint matches_event_id_fkey
foreign key (event_id) references public.events(id) on delete restrict;

create index if not exists matches_event_id_idx on public.matches(event_id);
create index if not exists matches_event_round_idx on public.matches(event_id, round);

alter table public.matches enable row level security;

drop policy if exists "Guests and users can read matches" on public.matches;
drop policy if exists "Authenticated users can insert matches" on public.matches;
drop policy if exists "Authenticated users can update matches" on public.matches;
drop policy if exists "Authenticated users can delete matches" on public.matches;

create policy "Guests and users can read matches"
on public.matches
for select
to anon, authenticated
using (true);

create policy "Authenticated users can insert matches"
on public.matches
for insert
to authenticated
with check (auth.uid() is not null);

create policy "Authenticated users can update matches"
on public.matches
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "Authenticated users can delete matches"
on public.matches
for delete
to authenticated
using (auth.uid() is not null);