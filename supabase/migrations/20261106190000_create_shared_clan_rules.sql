-- CL4N TB3ST: reglas del clan compartidas y editables solo por líderes
create table if not exists public.clan_rules (
  id smallint primary key default 1 check (id = 1),
  rules jsonb not null default '[]'::jsonb check (jsonb_typeof(rules) = 'array'),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
alter table public.clan_rules enable row level security;
drop policy if exists "clan members can read rules" on public.clan_rules;
create policy "clan members can read rules"
on public.clan_rules for select to authenticated
using (true);
drop policy if exists "leaders can update rules" on public.clan_rules;
create policy "leaders can update rules"
on public.clan_rules for update to authenticated
using (public.current_clan_role() = 'Líder')
with check (public.current_clan_role() = 'Líder');
grant select, update on public.clan_rules to authenticated;
insert into public.clan_rules (id, rules)
values (1, '["Respetar las decisiones del líder y la lideresa.","Los miembros masculinos presentan sus quejas al líder.","Las miembros femeninas presentan sus quejas a la lideresa.","Los desafíos oficiales se realizan bajo las reglas establecidas.","Mantener el respeto y la actividad dentro del clan."]'::jsonb)
on conflict (id) do nothing;
