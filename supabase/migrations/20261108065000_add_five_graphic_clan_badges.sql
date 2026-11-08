-- Add the five graphic insignias shown in the CL4NTB3ST badge concept.
-- Existing badge names and descriptions are intentionally left unchanged.
insert into public.clan_badges (slug,name,description,icon,rarity,is_active)
values
 ('diamante','Diamante','Destacar por logros extraordinarios y rendimiento sobresaliente.','💎','legendary',true),
 ('maestro','Maestro','Demostrar dominio, estrategia y habilidad en los desafíos del clan.','🏅','epic',true),
 ('leyenda','Leyenda','Construir una trayectoria excepcional dentro del clan.','👑','legendary',true),
 ('elite','Élite','Mantener un nivel competitivo alto y constante.','🛡️','epic',true),
 ('rey-del-clan','Rey del Clan','Alcanzar un reconocimiento máximo por liderazgo y dominio competitivo.','👑','legendary',true)
on conflict (slug) do nothing;
