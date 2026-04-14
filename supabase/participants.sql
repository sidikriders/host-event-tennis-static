create table if not exists public.participants (
  id uuid primary key,
  name text not null,
  gender text not null check (gender in ('male', 'female', 'other')),
  note text not null default '',
  origin text check (origin in ('reclub', 'kuyy', 'ayo', 'wa', 'other')),
  instagram text
);

create index if not exists participants_name_idx on public.participants(name);

create or replace function public.prevent_delete_participant_with_matches()
returns trigger
language plpgsql
as $$
declare
  player_has_matches boolean;
begin
  if to_regclass('public.matches') is null then
    return old;
  end if;

  execute
    'select exists (
      select 1
      from public.matches
      where $1 = any(team_a) or $1 = any(team_b)
    )'
  into player_has_matches
  using old.id::text;

  if player_has_matches then
    raise exception 'Cannot delete participant because they already have matches.';
  end if;

  return old;
end;
$$;

drop trigger if exists participants_prevent_delete_with_matches on public.participants;

create trigger participants_prevent_delete_with_matches
before delete on public.participants
for each row
execute function public.prevent_delete_participant_with_matches();

alter table public.participants enable row level security;

drop policy if exists "Guests and users can read participants" on public.participants;
drop policy if exists "Authenticated users can insert participants" on public.participants;
drop policy if exists "Authenticated users can update participants" on public.participants;
drop policy if exists "Authenticated users can delete participants" on public.participants;

create policy "Guests and users can read participants"
on public.participants
for select
to anon, authenticated
using (true);

create policy "Authenticated users can insert participants"
on public.participants
for insert
to authenticated
with check (auth.uid() is not null);

create policy "Authenticated users can update participants"
on public.participants
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "Authenticated users can delete participants"
on public.participants
for delete
to authenticated
using (auth.uid() is not null);