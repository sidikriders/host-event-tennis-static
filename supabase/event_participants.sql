create table if not exists public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  present boolean not null default true,
  primary key (event_id, participant_id)
);

create index if not exists event_participants_event_id_idx on public.event_participants(event_id);
create index if not exists event_participants_participant_id_idx on public.event_participants(participant_id);

alter table public.event_participants enable row level security;

drop policy if exists "Guests and users can read event participants" on public.event_participants;
drop policy if exists "Authenticated users can insert event participants" on public.event_participants;
drop policy if exists "Authenticated users can update event participants" on public.event_participants;
drop policy if exists "Authenticated users can delete event participants" on public.event_participants;

create policy "Guests and users can read event participants"
on public.event_participants
for select
to anon, authenticated
using (true);

create policy "Authenticated users can insert event participants"
on public.event_participants
for insert
to authenticated
with check (auth.uid() is not null);

create policy "Authenticated users can update event participants"
on public.event_participants
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "Authenticated users can delete event participants"
on public.event_participants
for delete
to authenticated
using (auth.uid() is not null);