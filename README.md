# Tennis Event Host

Static Next.js app for managing tennis Americano and Mexicano events. Events are stored in Supabase, while participant attendance and match generation remain in browser local storage.

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

- Event records are stored in Supabase and shared across browsers that use the same project.
- Participant attendance and matches are still stored in browser local storage per device.
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

alter table public.events enable row level security;

drop policy if exists "Allow anonymous read access to events" on public.events;
drop policy if exists "Allow anonymous insert access to events" on public.events;
drop policy if exists "Allow anonymous update access to events" on public.events;
drop policy if exists "Allow anonymous delete access to events" on public.events;

create policy "Allow anonymous read access to events"
on public.events
for select
to anon
using (true);

create policy "Allow anonymous insert access to events"
on public.events
for insert
to anon
with check (true);

create policy "Allow anonymous update access to events"
on public.events
for update
to anon
using (true)
with check (true);

create policy "Allow anonymous delete access to events"
on public.events
for delete
to anon
using (true);
```
