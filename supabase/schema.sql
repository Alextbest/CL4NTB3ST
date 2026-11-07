-- CL4N TB3ST · Supabase foundation
-- Run this file in Supabase SQL Editor. New accounts always start as Miembro.
-- Promote the two leaders manually after their accounts exist; never from the client.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 32),
  ff_nick text not null check (char_length(trim(ff_nick)) between 1 and 32),
  ff_id text check (ff_id is null or ff_id ~ '^[0-9]{1,11}
  phone_e164 text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  role text not null default 'Miembro' check (role in ('Líder', 'Decano', 'Miembro')),
  created_at timestamptz not null default now()
);

-- El ID de Free Fire identifica una sola cuenta del clan.
create unique index if not exists profiles_ff_id_unique_idx
on public.profiles (ff_id) where ff_id is not null;

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 60),
  starts_at timestamptz not null,
  description text not null default '',
  rules text not null default '',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_participants (
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attending boolean not null,
  updated_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create table if not exists public.activity_polls (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null unique references public.activities(id) on delete cascade,
  question text not null check (char_length(trim(question)) between 1 and 100)
);

create table if not exists public.activity_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.activity_polls(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 50),
  position integer not null default 0
);

create table if not exists public.activity_poll_votes (
  poll_id uuid not null references public.activity_polls(id) on delete cascade,
  option_id uuid not null references public.activity_poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create or replace function public.current_clan_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.activity_participants enable row level security;
alter table public.activity_polls enable row level security;
alter table public.activity_poll_options enable row level security;
alter table public.activity_poll_votes enable row level security;

drop policy if exists "profiles readable by clan" on public.profiles;
create policy "profiles readable by clan" on public.profiles
for select to authenticated using (true);

drop policy if exists "profile owner can update own details" on public.profiles;
create policy "profile owner can update own details" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles created by authenticated owner" on public.profiles;
create policy "profiles created by authenticated owner" on public.profiles
for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists "activities readable by clan" on public.activities;
create policy "activities readable by clan" on public.activities
for select to authenticated using (true);

drop policy if exists "leaders create activities" on public.activities;
create policy "leaders create activities" on public.activities
for insert to authenticated with check (public.current_clan_role() = 'Líder' and created_by = auth.uid());

drop policy if exists "leaders update activities" on public.activities;
create policy "leaders update activities" on public.activities
for update to authenticated using (public.current_clan_role() = 'Líder')
with check (public.current_clan_role() = 'Líder');

drop policy if exists "leaders delete activities" on public.activities;
create policy "leaders delete activities" on public.activities
for delete to authenticated using (public.current_clan_role() = 'Líder');

drop policy if exists "members read attendance" on public.activity_participants;
create policy "members read attendance" on public.activity_participants
for select to authenticated using (true);

drop policy if exists "members manage own attendance" on public.activity_participants;
create policy "members manage own attendance" on public.activity_participants
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "members update own attendance" on public.activity_participants;
create policy "members update own attendance" on public.activity_participants
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "members read polls" on public.activity_polls;
create policy "members read polls" on public.activity_polls
for select to authenticated using (true);

drop policy if exists "leaders manage polls" on public.activity_polls;
create policy "leaders manage polls" on public.activity_polls
for all to authenticated using (public.current_clan_role() = 'Líder')
with check (public.current_clan_role() = 'Líder');

drop policy if exists "members read poll options" on public.activity_poll_options;
create policy "members read poll options" on public.activity_poll_options
for select to authenticated using (true);

drop policy if exists "leaders manage poll options" on public.activity_poll_options;
create policy "leaders manage poll options" on public.activity_poll_options
for all to authenticated using (public.current_clan_role() = 'Líder')
with check (public.current_clan_role() = 'Líder');

drop policy if exists "members read votes" on public.activity_poll_votes;
create policy "members read votes" on public.activity_poll_votes
for select to authenticated using (true);

drop policy if exists "members cast own vote" on public.activity_poll_votes;
create policy "members cast own vote" on public.activity_poll_votes
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "members change own vote" on public.activity_poll_votes;
create policy "members change own vote" on public.activity_poll_votes
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant usage on schema public to authenticated;
revoke all on table public.profiles from authenticated;
grant select (id, display_name, ff_nick, ff_id, role, created_at) on public.profiles to authenticated;
grant insert (id, display_name, ff_nick, ff_id, phone_e164) on public.profiles to authenticated;
grant update (display_name, ff_nick, ff_id, phone_e164) on public.profiles to authenticated;
grant select, insert, update, delete on public.activities to authenticated;
grant select, insert, update on public.activity_participants to authenticated;
grant select, insert, update, delete on public.activity_polls to authenticated;
grant select, insert, update, delete on public.activity_poll_options to authenticated;
grant select, insert, update on public.activity_poll_votes to authenticated;
),
  phone_e164 text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  role text not null default 'Miembro' check (role in ('Líder', 'Decano', 'Miembro')),
  created_at timestamptz not null default now()
);

-- El ID de Free Fire identifica una sola cuenta del clan.
create unique index if not exists profiles_ff_id_unique_idx
on public.profiles (ff_id) where ff_id is not null;

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 60),
  starts_at timestamptz not null,
  description text not null default '',
  rules text not null default '',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_participants (
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attending boolean not null,
  updated_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create table if not exists public.activity_polls (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null unique references public.activities(id) on delete cascade,
  question text not null check (char_length(trim(question)) between 1 and 100)
);

create table if not exists public.activity_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.activity_polls(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 50),
  position integer not null default 0
);

create table if not exists public.activity_poll_votes (
  poll_id uuid not null references public.activity_polls(id) on delete cascade,
  option_id uuid not null references public.activity_poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create or replace function public.current_clan_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

-- Role changes are restricted through the authenticated leader-only RPC in the role-management migration.

alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.activity_participants enable row level security;
alter table public.activity_polls enable row level security;
alter table public.activity_poll_options enable row level security;
alter table public.activity_poll_votes enable row level security;

drop policy if exists "profiles readable by clan" on public.profiles;
create policy "profiles readable by clan" on public.profiles
for select to authenticated using (true);

drop policy if exists "profile owner can update own details" on public.profiles;
create policy "profile owner can update own details" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles created by authenticated owner" on public.profiles;
create policy "profiles created by authenticated owner" on public.profiles
for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists "activities readable by clan" on public.activities;
create policy "activities readable by clan" on public.activities
for select to authenticated using (true);

drop policy if exists "leaders create activities" on public.activities;
create policy "leaders create activities" on public.activities
for insert to authenticated with check (public.current_clan_role() = 'Líder' and created_by = auth.uid());

drop policy if exists "leaders update activities" on public.activities;
create policy "leaders update activities" on public.activities
for update to authenticated using (public.current_clan_role() = 'Líder')
with check (public.current_clan_role() = 'Líder');

drop policy if exists "leaders delete activities" on public.activities;
create policy "leaders delete activities" on public.activities
for delete to authenticated using (public.current_clan_role() = 'Líder');

drop policy if exists "members read attendance" on public.activity_participants;
create policy "members read attendance" on public.activity_participants
for select to authenticated using (true);

drop policy if exists "members manage own attendance" on public.activity_participants;
create policy "members manage own attendance" on public.activity_participants
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "members update own attendance" on public.activity_participants;
create policy "members update own attendance" on public.activity_participants
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "members read polls" on public.activity_polls;
create policy "members read polls" on public.activity_polls
for select to authenticated using (true);

drop policy if exists "leaders manage polls" on public.activity_polls;
create policy "leaders manage polls" on public.activity_polls
for all to authenticated using (public.current_clan_role() = 'Líder')
with check (public.current_clan_role() = 'Líder');

drop policy if exists "members read poll options" on public.activity_poll_options;
create policy "members read poll options" on public.activity_poll_options
for select to authenticated using (true);

drop policy if exists "leaders manage poll options" on public.activity_poll_options;
create policy "leaders manage poll options" on public.activity_poll_options
for all to authenticated using (public.current_clan_role() = 'Líder')
with check (public.current_clan_role() = 'Líder');

drop policy if exists "members read votes" on public.activity_poll_votes;
create policy "members read votes" on public.activity_poll_votes
for select to authenticated using (true);

drop policy if exists "members cast own vote" on public.activity_poll_votes;
create policy "members cast own vote" on public.activity_poll_votes
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "members change own vote" on public.activity_poll_votes;
create policy "members change own vote" on public.activity_poll_votes
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant usage on schema public to authenticated;
revoke all on table public.profiles from authenticated;
grant select (id, display_name, ff_nick, ff_id, role, created_at) on public.profiles to authenticated;
grant insert (id, display_name, ff_nick, ff_id, phone_e164) on public.profiles to authenticated;
grant update (display_name, ff_nick, ff_id, phone_e164) on public.profiles to authenticated;
grant select, insert, update, delete on public.activities to authenticated;
grant select, insert, update on public.activity_participants to authenticated;
grant select, insert, update, delete on public.activity_polls to authenticated;
grant select, insert, update, delete on public.activity_poll_options to authenticated;
grant select, insert, update on public.activity_poll_votes to authenticated;
