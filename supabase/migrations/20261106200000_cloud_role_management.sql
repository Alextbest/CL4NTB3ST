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
    when pg_catalog.lower(coalesce(auth.jwt() ->> 'email', '')) = any (
      array['capocallabo2005@gmail.com', 'garciakimberlyfernanda6@gmail.com']::text[]
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
