create table if not exists public.event_match_rules (
  id uuid primary key,
  club_id uuid references public.clubs(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  rule_type text not null check (rule_type in ('avoid_teammate', 'avoid_opponent', 'avoid_same_match')),
  participant_1_id uuid not null,
  participant_2_id uuid not null,
  created_by_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.event_match_rules
  add column if not exists club_id uuid references public.clubs(id) on delete restrict;

alter table public.event_match_rules
  add column if not exists event_id uuid references public.events(id) on delete restrict;

alter table public.event_match_rules
  add column if not exists rule_type text;

alter table public.event_match_rules
  add column if not exists participant_1_id uuid;

alter table public.event_match_rules
  add column if not exists participant_2_id uuid;

alter table public.event_match_rules
  add column if not exists created_by_id uuid references auth.users(id) on delete restrict;

update public.event_match_rules
set club_id = public.events.club_id
from public.events
where public.events.id = public.event_match_rules.event_id
  and public.event_match_rules.club_id is null;

do $$
begin
  if not exists (select 1 from public.event_match_rules where club_id is null) then
    alter table public.event_match_rules alter column club_id set not null;
  end if;

  if not exists (select 1 from public.event_match_rules where event_id is null) then
    alter table public.event_match_rules alter column event_id set not null;
  end if;

  if not exists (select 1 from public.event_match_rules where rule_type is null) then
    alter table public.event_match_rules alter column rule_type set not null;
  end if;

  if not exists (select 1 from public.event_match_rules where participant_1_id is null) then
    alter table public.event_match_rules alter column participant_1_id set not null;
  end if;

  if not exists (select 1 from public.event_match_rules where participant_2_id is null) then
    alter table public.event_match_rules alter column participant_2_id set not null;
  end if;

  if not exists (select 1 from public.event_match_rules where created_by_id is null) then
    alter table public.event_match_rules alter column created_by_id set not null;
  end if;
end $$;

alter table public.event_match_rules
  drop constraint if exists event_match_rules_rule_type_check;

alter table public.event_match_rules
  add constraint event_match_rules_rule_type_check
  check (rule_type in ('avoid_teammate', 'avoid_opponent', 'avoid_same_match'));

alter table public.event_match_rules
  drop constraint if exists event_match_rules_distinct_pair;

alter table public.event_match_rules
  add constraint event_match_rules_distinct_pair
  check (participant_1_id <> participant_2_id);

alter table public.event_match_rules
  drop constraint if exists event_match_rules_pair_order;

alter table public.event_match_rules
  add constraint event_match_rules_pair_order
  check (participant_1_id < participant_2_id);

alter table public.event_match_rules
  drop constraint if exists event_match_rules_event_id_fkey;

alter table public.event_match_rules
  add constraint event_match_rules_event_id_fkey
  foreign key (event_id) references public.events(id) on delete restrict;

alter table public.event_match_rules
  drop constraint if exists event_match_rules_participant_1_fkey;

alter table public.event_match_rules
  add constraint event_match_rules_participant_1_fkey
  foreign key (event_id, participant_1_id)
  references public.event_participants(event_id, participant_id)
  on delete cascade;

alter table public.event_match_rules
  drop constraint if exists event_match_rules_participant_2_fkey;

alter table public.event_match_rules
  add constraint event_match_rules_participant_2_fkey
  foreign key (event_id, participant_2_id)
  references public.event_participants(event_id, participant_id)
  on delete cascade;

create unique index if not exists event_match_rules_unique_pair_idx
on public.event_match_rules(event_id, rule_type, participant_1_id, participant_2_id);

create index if not exists event_match_rules_club_id_idx
on public.event_match_rules(club_id);

create index if not exists event_match_rules_event_id_idx
on public.event_match_rules(event_id);

create index if not exists event_match_rules_event_rule_type_idx
on public.event_match_rules(event_id, rule_type);

alter table public.event_match_rules enable row level security;

drop policy if exists "Club members can read event match rules" on public.event_match_rules;
drop policy if exists "Club members can insert event match rules" on public.event_match_rules;
drop policy if exists "Club members can update event match rules" on public.event_match_rules;
drop policy if exists "Club members can delete event match rules" on public.event_match_rules;

create policy "Club members can read event match rules"
on public.event_match_rules
for select
to authenticated
using (public.is_club_member(club_id, auth.uid()));

create policy "Club members can insert event match rules"
on public.event_match_rules
for insert
to authenticated
with check (
  created_by_id = auth.uid()
  and public.is_club_member(club_id, auth.uid())
  and exists (
    select 1
    from public.events
    where public.events.id = event_match_rules.event_id
      and public.events.club_id = event_match_rules.club_id
  )
);

create policy "Club members can update event match rules"
on public.event_match_rules
for update
to authenticated
using (public.is_club_member(club_id, auth.uid()))
with check (
  public.is_club_member(club_id, auth.uid())
  and exists (
    select 1
    from public.events
    where public.events.id = event_match_rules.event_id
      and public.events.club_id = event_match_rules.club_id
  )
);

create policy "Club members can delete event match rules"
on public.event_match_rules
for delete
to authenticated
using (public.is_club_member(club_id, auth.uid()));