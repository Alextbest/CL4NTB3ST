-- CL4N TB3ST: administración segura de rangos vinculados a cuentas Auth
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

revoke update on table public.profiles from authenticated;
grant update (display_name, ff_nick, ff_id, phone_e164)
on table public.profiles to authenticated;

create or replace function private.assign_clan_role(p_identifier text, p_role text)
returns table (id uuid, display_name text, ff_nick text, ff_id text, role text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_role text;
  v_target_id uuid;
  v_target_role text;
  v_identifier text := pg_catalog.btrim(coalesce(p_identifier, ''));
  v_matches integer;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  select p.role into v_actor_role from public.profiles as p where p.id = auth.uid();
  if v_actor_role is distinct from 'Líder' then raise exception 'Solo los líderes pueden administrar rangos.'; end if;
  if p_role not in ('Miembro', 'Decano') then raise exception 'Solo se puede asignar Miembro o Decano.'; end if;
  if v_identifier = '' or pg_catalog.length(v_identifier) > 128 then raise exception 'Introduce un ID válido.'; end if;

  select p.id, p.role into v_target_id, v_target_role
  from public.profiles as p where p.id::text = v_identifier;

  if not found then
    select pg_catalog.count(*) into v_matches from public.profiles as p where p.ff_id = v_identifier;
    if v_matches = 0 then raise exception 'No existe una cuenta registrada con ese ID.';
    elsif v_matches > 1 then raise exception 'Ese ID de Free Fire está asociado a varias cuentas. Usa el UUID de la cuenta.'; end if;
    select p.id, p.role into v_target_id, v_target_role from public.profiles as p where p.ff_id = v_identifier;
  end if;

  if v_target_id = auth.uid() then raise exception 'No puedes cambiar tu propio rango.'; end if;
  if v_target_role = 'Líder' then raise exception 'No se puede degradar ni modificar una cuenta de líder desde este panel.'; end if;

  return query update public.profiles as p set role = p_role where p.id = v_target_id
  returning p.id, p.display_name, p.ff_nick, p.ff_id, p.role;
end;
$function$;

revoke all on function private.assign_clan_role(text, text) from public, anon;
grant execute on function private.assign_clan_role(text, text) to authenticated;

create or replace function public.assign_clan_role(p_identifier text, p_role text)
returns table (id uuid, display_name text, ff_nick text, ff_id text, role text)
language sql
security invoker
set search_path = ''
as $function$
  select * from private.assign_clan_role(p_identifier, p_role);
$function$;

revoke all on function public.assign_clan_role(text, text) from public, anon;
grant execute on function public.assign_clan_role(text, text) to authenticated;

-- Garantiza que las dos cuentas autorizadas reciban el rango Líder al crear su perfil.
-- El cliente no puede escoger su rango inicial mediante el formulario.
create or replace function private.set_initial_clan_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  new.role := case
    when pg_catalog.encode(
      extensions.digest(
        pg_catalog.lower(pg_catalog.btrim(coalesce(auth.jwt() ->> 'email', ''))),
        'sha256'
      ),
      'hex'
    ) = any (
      array[
        '934a07afbc6371b9cdaf98965a05939e2029a30dc15f53fdbef43f42a2d32630',
        '6b22ba9bd6f52a507ebe6d14c555da505b29560d3cecb21d17f7f7aae34df8a0'
      ]::text[]
    ) then 'Líder'
    else 'Miembro'
  end;
  return new;
end;
$function$;

revoke all on function private.set_initial_clan_role() from public, anon, authenticated;
drop trigger if exists set_initial_clan_role on public.profiles;
create trigger set_initial_clan_role
before insert on public.profiles
for each row execute function private.set_initial_clan_role();
-- current_clan_role solo consulta el perfil visible por las políticas del clan;
-- no necesita privilegios SECURITY DEFINER.
create or replace function public.current_clan_role()
returns text
language sql
stable
security invoker
set search_path = ''
as $function$
  select p.role from public.profiles as p where p.id = auth.uid();
$function$;
revoke all on function public.current_clan_role() from public, anon;
grant execute on function public.current_clan_role() to authenticated;

revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select, insert on table public.profiles to authenticated;
grant update (display_name, ff_nick, ff_id, phone_e164)
on table public.profiles to authenticated;

-- Decanos y líderes pueden editar datos visibles de miembros, pero no sus rangos.
create or replace function private.update_clan_member_details(
  p_member_id uuid,
  p_display_name text,
  p_ff_nick text
)
returns table (id uuid, display_name text, ff_nick text, ff_id text, role text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_role text;
  v_target_role text;
  v_name text := pg_catalog.btrim(coalesce(p_display_name, ''));
  v_nick text := pg_catalog.btrim(coalesce(p_ff_nick, ''));
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  select p.role into v_actor_role from public.profiles as p where p.id = auth.uid();
  if v_actor_role not in ('Líder', 'Decano') then
    raise exception 'Solo líderes y decanos pueden editar los datos de miembros.';
  end if;
  if v_name = '' or pg_catalog.length(v_name) > 32 then raise exception 'El nombre debe tener entre 1 y 32 caracteres.'; end if;
  if v_nick = '' or pg_catalog.length(v_nick) > 32 then raise exception 'El nick debe tener entre 1 y 32 caracteres.'; end if;
  select p.role into v_target_role from public.profiles as p where p.id = p_member_id;
  if not found then raise exception 'No existe esa cuenta.'; end if;
  if v_target_role <> 'Miembro' then raise exception 'Solo se pueden editar los datos de cuentas con rango Miembro.'; end if;

  return query update public.profiles as p
  set display_name = v_name, ff_nick = v_nick
  where p.id = p_member_id
  returning p.id, p.display_name, p.ff_nick, p.ff_id, p.role;
end;
$function$;

revoke all on function private.update_clan_member_details(uuid, text, text) from public, anon;
grant execute on function private.update_clan_member_details(uuid, text, text) to authenticated;

create or replace function public.update_clan_member_details(
  p_member_id uuid,
  p_display_name text,
  p_ff_nick text
)
returns table (id uuid, display_name text, ff_nick text, ff_id text, role text)
language sql
security invoker
set search_path = ''
as $function$
  select * from private.update_clan_member_details(p_member_id, p_display_name, p_ff_nick);
$function$;

revoke all on function public.update_clan_member_details(uuid, text, text) from public, anon;
grant execute on function public.update_clan_member_details(uuid, text, text) to authenticated;
