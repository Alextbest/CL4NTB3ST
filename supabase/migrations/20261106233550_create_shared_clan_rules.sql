-- Shared clan rules editable only by leaders.
CREATE TABLE IF NOT EXISTS public.clan_rules (
 id smallint PRIMARY KEY DEFAULT 1 CHECK(id=1),
 rules jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(rules)='array'),
 updated_by uuid REFERENCES public.profiles(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clan_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clan members can read rules" ON public.clan_rules;
CREATE POLICY "clan members can read rules" ON public.clan_rules FOR SELECT TO authenticated USING(true);
DROP POLICY IF EXISTS "leaders can update rules" ON public.clan_rules;
CREATE POLICY "leaders can update rules" ON public.clan_rules FOR UPDATE TO authenticated
 USING((SELECT public.current_clan_role())='Líder') WITH CHECK((SELECT public.current_clan_role())='Líder');
GRANT SELECT,UPDATE ON public.clan_rules TO authenticated;
INSERT INTO public.clan_rules(id,rules) VALUES(1,'["Respetar las decisiones del líder y la lideresa.","Los miembros masculinos presentan sus quejas al líder.","Las miembros femeninas presentan sus quejas a la lideresa.","Los desafíos oficiales se realizan bajo las reglas establecidas.","Mantener el respeto y la actividad dentro del clan."]'::jsonb) ON CONFLICT(id) DO NOTHING;
