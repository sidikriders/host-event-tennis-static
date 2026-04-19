create table if not exists public.event_participants (
  event_id uuid not null references public.events(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete cascade,
  present boolean not null default true,
  primary key (event_id, participant_id)
);

alter table public.event_participants
drop constraint if exists event_participants_event_id_fkey;

alter table public.event_participants
add constraint event_participants_event_id_fkey
foreign key (event_id) references public.events(id) on delete restrict;

create index if not exists event_participants_event_id_idx on public.event_participants(event_id);
create index if not exists event_participants_participant_id_idx on public.event_participants(participant_id);

alter table public.event_participants enable row level security;

drop policy if exists "Public can read event participants" on public.event_participants;
drop policy if exists "Club members can insert event participants" on public.event_participants;
drop policy if exists "Club members can update event participants" on public.event_participants;
drop policy if exists "Club members can delete event participants" on public.event_participants;

create policy "Public can read event participants"
on public.event_participants
for select
to anon, authenticated
using (true);

create policy "Club members can insert event participants"
on public.event_participants
for insert
to authenticated
with check (
  exists (
    select 1
    from public.events
    join public.participants on public.participants.id = event_participants.participant_id
    where public.events.id = event_participants.event_id
      and public.participants.club_id = public.events.club_id
      and public.is_club_member(public.events.club_id, auth.uid())
  )
);

create policy "Club members can update event participants"
on public.event_participants
for update
to authenticated
using (
  exists (
    select 1
    from public.events
    where public.events.id = event_participants.event_id
      and public.is_club_member(public.events.club_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.events
    where public.events.id = event_participants.event_id
      and public.is_club_member(public.events.club_id, auth.uid())
  )
);

create policy "Club members can delete event participants"
on public.event_participants
for delete
to authenticated
using (
  exists (
    select 1
    from public.events
    where public.events.id = event_participants.event_id
      and public.is_club_member(public.events.club_id, auth.uid())
  )
);