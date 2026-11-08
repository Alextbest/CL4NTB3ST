-- Shared clan website configuration.
CREATE TABLE IF NOT EXISTS public.clan_site_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_url text CHECK (site_url IS NULL OR (left(site_url, 8) = 'https://' AND length(site_url) <= 2048)),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clan_site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clan members can read shared site" ON public.clan_site_settings;
CREATE POLICY "clan members can read shared site" ON public.clan_site_settings
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "leaders can create shared site" ON public.clan_site_settings;
CREATE POLICY "leaders can create shared site" ON public.clan_site_settings
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.current_clan_role()) = 'Líder');
DROP POLICY IF EXISTS "leaders can update shared site" ON public.clan_site_settings;
CREATE POLICY "leaders can update shared site" ON public.clan_site_settings
  FOR UPDATE TO authenticated USING ((SELECT public.current_clan_role()) = 'Líder')
  WITH CHECK ((SELECT public.current_clan_role()) = 'Líder');
GRANT SELECT, INSERT, UPDATE ON public.clan_site_settings TO authenticated;
INSERT INTO public.clan_site_settings(id, site_url) VALUES (1, NULL) ON CONFLICT (id) DO NOTHING;
