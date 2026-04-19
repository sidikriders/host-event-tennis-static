alter table public.profiles
  add column if not exists current_club_id uuid;

alter table public.profiles
  drop constraint if exists profiles_current_club_id_fkey;

alter table public.profiles
  add constraint profiles_current_club_id_fkey
  foreign key (current_club_id) references public.clubs(id) on delete set null;

create index if not exists profiles_current_club_id_idx on public.profiles(current_club_id);

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, updated_at)
  values (new.id, new.email, timezone('utc', now()))
  on conflict (id) do update
  set email = excluded.email,
      updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_new_profile();

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());