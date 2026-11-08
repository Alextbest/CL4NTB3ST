-- La app necesita leer el estado de acceso del propio perfil después de autenticar.
-- Se concede únicamente esta columna; phone_e164 sigue sin estar disponible para SELECT.
grant select (membership_status) on table public.profiles to authenticated;
