create policy member_badges_update_only_own_equipped
  on public.member_badges
  as restrictive
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant update (equipped) on public.member_badges to authenticated;

create or replace function public.set_my_badge_equipped(
  p_member_badge_id uuid,
  p_equipped boolean
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_updated_id uuid;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if p_equipped is null then
    raise exception 'Selecciona si deseas equipar o desequipar la insignia.';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = v_user_id and membership_status = 'active'
  ) then
    raise exception 'Solo los integrantes activos pueden cambiar sus insignias.';
  end if;

  update public.member_badges
     set equipped = p_equipped
   where id = p_member_badge_id
     and user_id = v_user_id
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'La insignia no existe o no te pertenece.';
  end if;
  return true;
end;
$function$;

revoke all on function public.set_my_badge_equipped(uuid, boolean) from public, anon;
grant execute on function public.set_my_badge_equipped(uuid, boolean) to authenticated;
