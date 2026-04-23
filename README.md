# Tennis Event Host

Static Next.js app for managing tennis Americano and Mexicano events. Clubs, events, participants, attendance membership, and matches are stored in Supabase.

## Local development

Use Node.js 22.20.0 or newer. The repository includes `.nvmrc`, so `nvm use` will select the expected version.

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Create a `.env.local` file before starting the app:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Open http://localhost:3000.

## Production build

This app is configured for static export.

```bash
npm run build
```

The generated static site is written to `out/`.

## Deploy to GitHub Pages

This repository now includes a GitHub Actions workflow that builds the app and publishes `out/` to GitHub Pages.

### 1. Push the repository to GitHub

Create a GitHub repository and push this project. The workflow runs automatically on pushes to `main` or `master`.

### 2. Enable GitHub Pages

In the GitHub repository:

1. Go to `Settings` → `Pages`.
2. Set `Source` to `GitHub Actions`.

### 3. Add GitHub Actions secrets

In the GitHub repository, go to `Settings` → `Secrets and variables` → `Actions` and add:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

These are required because the static GitHub Pages build inlines the public Supabase configuration at build time.

### 4. Wait for deployment

After the workflow finishes, the app will be available at:

```text
https://<your-github-username>.github.io/host-event-tennis-static/
```

If you rename the repository, the GitHub Actions build automatically adjusts the base path to the new repository name.

The workflow also caches `.next/cache` to speed up rebuilds.

## Notes

- Clubs are the tenancy boundary. Each user can belong to multiple clubs, select an active club, and see only that club's dashboard data.
- Events belong to a club and record `created_by_id` for audit.
- Participants belong to a club. Members can operate event workflows inside their club, while only club `owner` and `admin` can create, edit, or delete events.
- Event detail pages stay public for read-only access, while admin controls remain private behind authenticated club membership and RLS.
- Player stats are derived from participants plus matches, so there is no separate `player_stats` table.
- GitHub Pages still serves only the static frontend; Supabase provides the shared database.

## Supabase SQL

Run these files in the Supabase SQL Editor in this order:

```text
supabase/clubs.sql
supabase/profiles.sql
supabase/events.sql
supabase/participants.sql
supabase/event_participants.sql
supabase/event_match_rules.sql
supabase/matches.sql
```

If you enable live match updates in the app, rerun `supabase/matches.sql` so the `matches` table is added to the `supabase_realtime` publication and `REPLICA IDENTITY FULL` is applied for reliable delete events.

If you already have production data, backfill the new club columns for existing rows before enforcing any not-null requirements on old records.

For a fresh setup, the core schema now includes:

```sql
create table if not exists public.clubs (
	id uuid primary key,
	name text not null,
	tag_name text not null,
	description text not null default '',
	created_by_id uuid not null references auth.users(id),
	created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.club_members (
	club_id uuid not null references public.clubs(id) on delete cascade,
	user_id uuid not null references auth.users(id) on delete cascade,
	role text not null check (role in ('owner', 'admin', 'member')),
	created_at timestamptz not null default timezone('utc', now()),
	primary key (club_id, user_id)
);

create table if not exists public.events (
	id uuid primary key,
	club_id uuid not null references public.clubs(id),
	created_by_id uuid not null references auth.users(id),
	name text not null,
	date date not null,
	location text not null,
	match_type text not null check (match_type in ('single', 'double')),
	created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.participants (
	id uuid primary key,
	club_id uuid not null references public.clubs(id),
	name text not null,
	gender text not null check (gender in ('male', 'female', 'other')),
	note text not null default '',
	origin text check (origin in ('reclub', 'kuyy', 'ayo', 'wa', 'other')),
	instagram text
);

create table if not exists public.event_participants (
	event_id uuid not null references public.events(id) on delete restrict,
	participant_id uuid not null references public.participants(id) on delete cascade,
	present boolean not null default true,
	primary key (event_id, participant_id)
);

create table if not exists public.matches (
	id uuid primary key,
	club_id uuid not null references public.clubs(id),
	event_id uuid not null references public.events(id) on delete restrict,
	round integer not null check (round > 0),
	team_a text[] not null,
	team_b text[] not null,
	score_a integer,
	score_b integer,
	status text not null check (status in ('pending', 'ongoing', 'completed')),
	created_at timestamptz not null default timezone('utc', now())
);

create index if not exists participants_name_idx on public.participants(name);
create index if not exists event_participants_event_id_idx on public.event_participants(event_id);
create index if not exists event_participants_participant_id_idx on public.event_participants(participant_id);
create index if not exists matches_event_id_idx on public.matches(event_id);
create index if not exists matches_event_round_idx on public.matches(event_id, round);

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

alter table public.events enable row level security;
alter table public.participants enable row level security;
alter table public.event_participants enable row level security;
alter table public.matches enable row level security;

drop policy if exists "Guests and users can read events" on public.events;
drop policy if exists "Authenticated users can insert events" on public.events;
drop policy if exists "Authenticated users can update events" on public.events;
drop policy if exists "Authenticated users can delete events" on public.events;
drop policy if exists "Guests and users can read participants" on public.participants;
drop policy if exists "Authenticated users can insert participants" on public.participants;
drop policy if exists "Authenticated users can update participants" on public.participants;
drop policy if exists "Authenticated users can delete participants" on public.participants;
drop policy if exists "Guests and users can read event participants" on public.event_participants;
drop policy if exists "Authenticated users can insert event participants" on public.event_participants;
drop policy if exists "Authenticated users can update event participants" on public.event_participants;
drop policy if exists "Authenticated users can delete event participants" on public.event_participants;
drop policy if exists "Guests and users can read matches" on public.matches;
drop policy if exists "Authenticated users can insert matches" on public.matches;
drop policy if exists "Authenticated users can update matches" on public.matches;
drop policy if exists "Authenticated users can delete matches" on public.matches;

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
```
