create or replace function public.is_active_clan_member()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.membership_status = 'active'
      and p.approval_status = 'approved'
  );
$function$;

create or replace function public.is_active_clan_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.membership_status = 'active'
      and p.approval_status = 'approved'
      and p.role in ('Líder','Líder interina')
  );
$function$;

create or replace function public.is_active_clan_leader()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'Líder'
      and p.membership_status = 'active'
      and p.approval_status = 'approved'
  );
$function$;

create or replace function public.is_clan_badge_manager()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select (select auth.uid()) is not null and exists (
    select 1
    from auth.users u
    join public.profiles pr on pr.id = u.id
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and pr.membership_status = 'active'
      and pr.approval_status = 'approved'
      and (
        (u.id = 'af0d8907-fc67-4290-bba6-eb0bc4c81126'::uuid and pr.role = 'Líder')
        or (
          pr.role = 'Líder interina'
          and exists (select 1 from public.clan_badge_managers m where m.user_id = u.id)
          and pg_catalog.encode(
            extensions.digest(pg_catalog.lower(pg_catalog.btrim(u.email)), 'sha256'),
            'hex'
          ) = '6b22ba9bd6f52a507ebe6d14c555da505b29560d3cecb21d17f7f7aae34df8a0'
        )
      )
  );
$function$;
