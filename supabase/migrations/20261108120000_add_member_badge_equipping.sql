alter table public.member_badges
  add column if not exists equipped boolean not null default true;

create or replace function public.set_my_badge_equipped(
  p_member_badge_id uuid,
  p_equipped boolean
)
returns boolean
language plpgsql
security definer
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
