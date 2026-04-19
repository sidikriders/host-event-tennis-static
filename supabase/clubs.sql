create table if not exists public.clubs (
  id uuid primary key,
  name text not null,
  tag_name text not null,
  description text not null default '',
  created_by_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.clubs
  add column if not exists description text;

update public.clubs
set description = ''
where description is null;

alter table public.clubs
  alter column description set default '';

do $$
begin
  if not exists (select 1 from public.clubs where description is null) then
    alter table public.clubs alter column description set not null;
  end if;
end $$;

alter table public.clubs
  drop constraint if exists clubs_name_not_blank;

alter table public.clubs
  add constraint clubs_name_not_blank
  check (char_length(btrim(name)) > 0);

alter table public.clubs
  drop constraint if exists clubs_tag_name_format;

alter table public.clubs
  add constraint clubs_tag_name_format
  check (tag_name ~ '^[A-Z0-9_]{1,12}$');

create unique index if not exists clubs_tag_name_lower_idx on public.clubs (lower(tag_name));

create table if not exists public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, user_id)
);

update public.club_members
set role = lower(role)
where role <> lower(role);

alter table public.club_members
  drop constraint if exists club_members_role_check;

alter table public.club_members
  add constraint club_members_role_check
  check (lower(role) in ('owner', 'admin', 'member'));

create index if not exists club_members_user_id_idx on public.club_members(user_id);
create index if not exists club_members_role_idx on public.club_members(club_id, role);

create or replace function public.is_club_member(target_club_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.club_members
    where club_id = target_club_id
      and user_id = target_user_id
  );
$$;

create or replace function public.is_club_creator(target_club_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clubs
    where id = target_club_id
      and created_by_id = target_user_id
  );
$$;

create or replace function public.is_club_admin(target_club_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.club_members
    where club_id = target_club_id
      and user_id = target_user_id
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.is_club_owner(target_club_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.club_members
    where club_id = target_club_id
      and user_id = target_user_id
      and role = 'owner'
  );
$$;

grant execute on function public.is_club_member(uuid, uuid) to anon, authenticated;
grant execute on function public.is_club_admin(uuid, uuid) to anon, authenticated;
grant execute on function public.is_club_owner(uuid, uuid) to anon, authenticated;
grant execute on function public.is_club_creator(uuid, uuid) to anon, authenticated;

alter table public.clubs enable row level security;
alter table public.club_members enable row level security;

drop policy if exists "Club members can read clubs" on public.clubs;
drop policy if exists "Authenticated users can create clubs" on public.clubs;
drop policy if exists "Club admins can update clubs" on public.clubs;
drop policy if exists "Club owners can delete clubs" on public.clubs;

create policy "Club members can read clubs"
on public.clubs
for select
to authenticated
using (
  public.is_club_member(id, auth.uid())
  or public.is_club_creator(id, auth.uid())
);

create policy "Authenticated users can create clubs"
on public.clubs
for insert
to authenticated
with check (created_by_id = auth.uid());

create policy "Club admins can update clubs"
on public.clubs
for update
to authenticated
using (public.is_club_admin(id, auth.uid()))
with check (public.is_club_admin(id, auth.uid()));

create policy "Club owners can delete clubs"
on public.clubs
for delete
to authenticated
using (public.is_club_owner(id, auth.uid()));

drop policy if exists "Club members can read memberships" on public.club_members;
drop policy if exists "Club admins can insert memberships" on public.club_members;
drop policy if exists "Club admins can update memberships" on public.club_members;
drop policy if exists "Club admins can delete memberships" on public.club_members;

create policy "Club members can read memberships"
on public.club_members
for select
to authenticated
using (
  public.is_club_member(club_id, auth.uid())
  or public.is_club_creator(club_id, auth.uid())
);

create policy "Club admins can insert memberships"
on public.club_members
for insert
to authenticated
with check (
  public.is_club_admin(club_id, auth.uid())
  or public.is_club_creator(club_id, auth.uid())
);

create policy "Club admins can update memberships"
on public.club_members
for update
to authenticated
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

create policy "Club admins can delete memberships"
on public.club_members
for delete
to authenticated
using (public.is_club_admin(club_id, auth.uid()));