-- Elimina controles antiguos que bloqueaban el RPC seguro de rangos
-- y evita exponer teléfonos en lecturas de perfiles del clan.
drop trigger if exists profiles_role_guard on public.profiles;
drop function if exists public.guard_profile_role();

-- Había dos triggers BEFORE INSERT que asignaban el mismo rango inicial.
drop trigger if exists profiles_assign_initial_role on public.profiles;
drop function if exists public.assign_initial_profile_role();

-- La lectura general del clan es necesaria para nombres/rangos, pero no la lectura del teléfono.
drop policy if exists "profiles can only read own row" on public.profiles;
drop policy if exists "profiles created by authenticated owner" on public.profiles;
create policy "profiles created by authenticated owner"
on public.profiles for insert to authenticated
with check (id = (select auth.uid()));

revoke select on table public.profiles from authenticated;
revoke select (id, display_name, ff_nick, ff_id, phone_e164, role, created_at)
on table public.profiles from authenticated;
grant select (id, display_name, ff_nick, ff_id, role, created_at)
on table public.profiles to authenticated;

revoke insert on table public.profiles from authenticated;
revoke insert (id, display_name, ff_nick, ff_id, phone_e164, role, created_at)
on table public.profiles from authenticated;
grant insert (id, display_name, ff_nick, ff_id, phone_e164)
on table public.profiles to authenticated;

revoke update on table public.profiles from authenticated;
revoke update (display_name, ff_nick, ff_id, phone_e164)
on table public.profiles from authenticated;
grant update (display_name, ff_nick, ff_id, phone_e164)
on table public.profiles to authenticated;
