-- Cada ID de Free Fire puede pertenecer a una sola cuenta.
-- Los perfiles sin ID siguen permitidos durante migraciones/altas incompletas.
create unique index if not exists profiles_ff_id_unique_idx
on public.profiles (ff_id)
where ff_id is not null;

-- Rechaza valores no numéricos o de más de 11 dígitos incluso si se envían fuera de la interfaz.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_ff_id_format_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_ff_id_format_check
      check (ff_id is null or ff_id ~ '^[0-9]{1,11}$');
  end if;
end $$;
