# Tennis Event Host

Static Next.js app for managing tennis Americano and Mexicano events. Events, participants, attendance membership, and matches are stored in Supabase.

## Local development

Use Node.js 22.20.0 or newer.

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

### 3. Wait for deployment

After the workflow finishes, the app will be available at:

```text
https://<your-github-username>.github.io/host-event-tennis-static/
```

If you rename the repository, the GitHub Actions build automatically adjusts the base path to the new repository name.

## Notes

- Events, participants, event attendance membership, and matches are stored in Supabase and shared across browsers that use the same project.
- Player stats are derived from participants plus matches, so there is no separate `player_stats` table.
- GitHub Pages still serves only the static frontend; Supabase provides the shared database.

## Supabase SQL

Run this in the Supabase SQL Editor:

```sql
create table if not exists public.events (
	id uuid primary key,
	name text not null,
	date date not null,
	location text not null,
	match_type text not null check (match_type in ('single', 'double')),
	created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.participants (
	id uuid primary key,
	name text not null,
	gender text not null check (gender in ('male', 'female', 'other')),
	note text not null default '',
	origin text check (origin in ('reclub', 'kuyy', 'ayo', 'wa', 'other')),
	instagram text
);

create table if not exists public.event_participants (
	event_id uuid not null references public.events(id) on delete cascade,
	participant_id uuid not null references public.participants(id) on delete cascade,
	present boolean not null default true,
	primary key (event_id, participant_id)
);

create table if not exists public.matches (
	id uuid primary key,
	event_id uuid not null references public.events(id) on delete cascade,
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
