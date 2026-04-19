create table if not exists public.matches (
  id uuid primary key,
  club_id uuid references public.clubs(id) on delete restrict,
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
add column if not exists club_id uuid references public.clubs(id) on delete restrict;

alter table public.matches
add column if not exists court text;

update public.matches
set club_id = public.events.club_id
from public.events
where public.events.id = public.matches.event_id
  and public.matches.club_id is null;

update public.matches
set court = 'Court 1'
where court is null or btrim(court) = '';

alter table public.matches
alter column court set default 'Court 1';

do $$
begin
  if not exists (select 1 from public.matches where court is null or btrim(court) = '') then
    alter table public.matches alter column court set not null;
  end if;

  if not exists (select 1 from public.matches where club_id is null) then
    alter table public.matches alter column club_id set not null;
  end if;
end $$;

alter table public.matches
drop constraint if exists matches_court_not_blank;

alter table public.matches
add constraint matches_court_not_blank
check (char_length(btrim(court)) > 0);

alter table public.matches
add constraint matches_event_id_fkey
foreign key (event_id) references public.events(id) on delete restrict;

create index if not exists matches_club_id_idx on public.matches(club_id);
create index if not exists matches_event_id_idx on public.matches(event_id);
create index if not exists matches_event_round_idx on public.matches(event_id, round);

alter table public.matches enable row level security;
alter table public.matches replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.matches;
exception
  when duplicate_object then null;
end $$;

drop policy if exists "Public can read matches" on public.matches;
drop policy if exists "Club members can insert matches" on public.matches;
drop policy if exists "Club members can update matches" on public.matches;
drop policy if exists "Club members can delete matches" on public.matches;

create policy "Public can read matches"
on public.matches
for select
to anon, authenticated
using (true);

create policy "Club members can insert matches"
on public.matches
for insert
to authenticated
with check (
  public.is_club_member(club_id, auth.uid())
  and exists (
    select 1
    from public.events
    where public.events.id = matches.event_id
      and public.events.club_id = matches.club_id
  )
);

create policy "Club members can update matches"
on public.matches
for update
to authenticated
using (public.is_club_member(club_id, auth.uid()))
with check (
  public.is_club_member(club_id, auth.uid())
  and exists (
    select 1
    from public.events
    where public.events.id = matches.event_id
      and public.events.club_id = matches.club_id
  )
);

create policy "Club members can delete matches"
on public.matches
for delete
to authenticated
using (public.is_club_member(club_id, auth.uid()));