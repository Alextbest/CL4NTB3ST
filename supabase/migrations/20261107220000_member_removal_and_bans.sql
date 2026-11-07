alter table public.profiles
  add column if not exists membership_status text not null default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_membership_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_membership_status_check
      check (membership_status in ('active','removed','banned'));
  end if;
end $$;

create or replace function public.is_active_clan_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.membership_status = 'active'
  );
$$;

revoke all on function public.is_active_clan_member() from public;
grant execute on function public.is_active_clan_member() to authenticated;

create or replace function public.is_active_clan_leader()
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'Líder'
      and p.membership_status = 'active'
  );
$;

revoke all on function public.is_active_clan_leader() from public;
grant execute on function public.is_active_clan_leader() to authenticated;

drop policy if exists "profiles readable by clan" on public.profiles;
create policy "profiles readable by clan"
on public.profiles for select to authenticated
using (
  membership_status = 'active'
  or id = (select auth.uid())
  or (select public.is_active_clan_leader())
);

drop policy if exists "profiles active owner update" on public.profiles;
create policy "profiles active owner update"
on public.profiles as restrictive for update to authenticated
using ((select public.is_active_clan_member()))
with check ((select public.is_active_clan_member()));

drop policy if exists "profiles active owner insert" on public.profiles;
create policy "profiles active owner insert"
on public.profiles as restrictive for insert to authenticated
with check (id = (select auth.uid()) and membership_status = 'active');

do $$
declare t record;
begin
  for t in
    select c.relname as table_name
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relrowsecurity and c.relname <> 'profiles'
  loop
    execute format('drop policy if exists %I on public.%I', 'clan_active_member_required', t.table_name);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using ((select public.is_active_clan_member())) with check ((select public.is_active_clan_member()))',
      'clan_active_member_required', t.table_name
    );
  end loop;
end $$;
