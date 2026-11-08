create table if not exists public.clan_member_contacts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone_e164 text not null unique
    check (phone_e164 ~ '^[+][1-9][0-9]{7,14}$'),
  updated_at timestamptz not null default now()
);

alter table public.clan_member_contacts enable row level security;
revoke all on table public.clan_member_contacts from anon, authenticated;
grant select on table public.clan_member_contacts to authenticated;

drop policy if exists "members read own contact and admins read all"
  on public.clan_member_contacts;
create policy "members read own contact and admins read all"
  on public.clan_member_contacts
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_active_clan_admin())
  );

create or replace function private.sync_profile_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.clan_member_contacts(user_id, phone_e164, updated_at)
  values (new.id, new.phone_e164, now())
  on conflict (user_id)
  do update set phone_e164 = excluded.phone_e164, updated_at = now();
  return new;
end;
$function$;

revoke all on function private.sync_profile_contact()
  from public, anon, authenticated;

drop trigger if exists sync_profile_contact_to_private_table on public.profiles;
create trigger sync_profile_contact_to_private_table
  after insert or update of phone_e164 on public.profiles
  for each row execute function private.sync_profile_contact();

insert into public.clan_member_contacts(user_id, phone_e164, updated_at)
select id, phone_e164, now()
from public.profiles
on conflict (user_id)
do update set phone_e164 = excluded.phone_e164, updated_at = now();

revoke select on table public.profiles from authenticated;
grant select (
  id, display_name, ff_nick, ff_id, role, created_at,
  membership_status, avatar_path, avatar_status,
  avatar_reviewed_at, avatar_reviewed_by, approval_status
) on table public.profiles to authenticated;

do $publication$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'clan_point_ledger', 'clan_missions', 'clan_rules',
    'member_preferences', 'clan_badges', 'clan_member_contacts'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    end if;
  end loop;
end;
$publication$;
