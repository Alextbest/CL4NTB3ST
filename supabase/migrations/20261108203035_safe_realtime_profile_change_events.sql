create table if not exists public.clan_profile_updates (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.clan_profile_updates enable row level security;
revoke all on table public.clan_profile_updates from anon, authenticated;
grant select on table public.clan_profile_updates to authenticated;

drop policy if exists "clan members read permitted profile update events"
  on public.clan_profile_updates;
create policy "clan members read permitted profile update events"
  on public.clan_profile_updates
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_active_clan_admin())
    or exists (
      select 1 from public.profiles p
      where p.id = clan_profile_updates.user_id
        and p.approval_status = 'approved'
        and p.membership_status = 'active'
    )
  );

create or replace function private.sync_clan_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.clan_profile_updates(user_id, updated_at)
  values (new.id, now())
  on conflict (user_id) do update set updated_at = now();
  return new;
end;
$function$;

revoke all on function private.sync_clan_profile_update()
  from public, anon, authenticated;

drop trigger if exists publish_clan_profile_update on public.profiles;
create trigger publish_clan_profile_update
  after insert or update on public.profiles
  for each row execute function private.sync_clan_profile_update();

insert into public.clan_profile_updates(user_id, updated_at)
select id, now() from public.profiles
on conflict (user_id) do update set updated_at = excluded.updated_at;

do $publication$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime drop table public.profiles;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'clan_profile_updates'
  ) then
    alter publication supabase_realtime add table public.clan_profile_updates;
  end if;
end;
$publication$;
