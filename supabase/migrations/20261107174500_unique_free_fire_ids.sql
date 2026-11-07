-- Cada ID de Free Fire puede pertenecer a una sola cuenta.
-- Los perfiles sin ID siguen permitidos durante migraciones/altas incompletas.
create unique index if not exists profiles_ff_id_unique_idx
on public.profiles (ff_id)
where ff_id is not null;
