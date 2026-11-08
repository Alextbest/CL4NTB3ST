-- Mirror of the production migration applied on 2026-11-07.
-- Restricts anonymous access, splits permissive ALL policies, optimizes RLS checks,
-- and indexes uncovered foreign keys. Safe to apply once to an existing database.

REVOKE ALL ON SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

REVOKE ALL ON FUNCTION public.grant_clan_badge(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.moderate_social_content(text, uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_clan_points(uuid, integer, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_mission_submission(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_clan_badge(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_social_content(text, uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_clan_points(uuid, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_mission_submission(uuid, text, text) TO authenticated;

DROP POLICY IF EXISTS "leaders manage polls" ON public.activity_polls;
CREATE POLICY "leaders insert polls" ON public.activity_polls FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_clan_role()) = 'Líder');
CREATE POLICY "leaders update polls" ON public.activity_polls FOR UPDATE TO authenticated
  USING ((SELECT public.current_clan_role()) = 'Líder')
  WITH CHECK ((SELECT public.current_clan_role()) = 'Líder');
CREATE POLICY "leaders delete polls" ON public.activity_polls FOR DELETE TO authenticated
  USING ((SELECT public.current_clan_role()) = 'Líder');

DROP POLICY IF EXISTS "leaders manage poll options" ON public.activity_poll_options;
CREATE POLICY "leaders insert poll options" ON public.activity_poll_options FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_clan_role()) = 'Líder');
CREATE POLICY "leaders update poll options" ON public.activity_poll_options FOR UPDATE TO authenticated
  USING ((SELECT public.current_clan_role()) = 'Líder')
  WITH CHECK ((SELECT public.current_clan_role()) = 'Líder');
CREATE POLICY "leaders delete poll options" ON public.activity_poll_options FOR DELETE TO authenticated
  USING ((SELECT public.current_clan_role()) = 'Líder');

DROP POLICY IF EXISTS "leaders manage badge catalog" ON public.clan_badges;
CREATE POLICY "leaders insert badge catalog" ON public.clan_badges FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_clan_role()) = 'Líder');
CREATE POLICY "leaders update badge catalog" ON public.clan_badges FOR UPDATE TO authenticated
  USING ((SELECT public.current_clan_role()) = 'Líder')
  WITH CHECK ((SELECT public.current_clan_role()) = 'Líder');
CREATE POLICY "leaders delete badge catalog" ON public.clan_badges FOR DELETE TO authenticated
  USING ((SELECT public.current_clan_role()) = 'Líder');

DROP POLICY IF EXISTS "leaders manage missions" ON public.clan_missions;
CREATE POLICY "leaders insert missions" ON public.clan_missions FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_clan_role()) = 'Líder' AND created_by = (SELECT auth.uid()));
CREATE POLICY "leaders update missions" ON public.clan_missions FOR UPDATE TO authenticated
  USING ((SELECT public.current_clan_role()) = 'Líder')
  WITH CHECK ((SELECT public.current_clan_role()) = 'Líder' AND created_by = (SELECT auth.uid()));
CREATE POLICY "leaders delete missions" ON public.clan_missions FOR DELETE TO authenticated
  USING ((SELECT public.current_clan_role()) = 'Líder');

ALTER POLICY "profile owner can update own details" ON public.profiles
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
ALTER POLICY "leaders create activities" ON public.activities
  WITH CHECK ((SELECT public.current_clan_role()) = 'Líder' AND created_by = (SELECT auth.uid()));
ALTER POLICY "leaders update activities" ON public.activities
  USING ((SELECT public.current_clan_role()) = 'Líder')
  WITH CHECK ((SELECT public.current_clan_role()) = 'Líder');
ALTER POLICY "leaders delete activities" ON public.activities
  USING ((SELECT public.current_clan_role()) = 'Líder');
ALTER POLICY "members manage own attendance" ON public.activity_participants
  WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "members update own attendance" ON public.activity_participants
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "members cast own vote" ON public.activity_poll_votes
  WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "members change own vote" ON public.activity_poll_votes
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "members read own preferences" ON public.member_preferences
  USING (user_id = (SELECT auth.uid()));
ALTER POLICY "members insert own preferences" ON public.member_preferences
  WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "members update own preferences" ON public.member_preferences
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "leaders can update rules" ON public.clan_rules
  USING ((SELECT public.current_clan_role()) = 'Líder')
  WITH CHECK ((SELECT public.current_clan_role()) = 'Líder');
ALTER POLICY "leaders can create shared site" ON public.clan_site_settings
  WITH CHECK ((SELECT public.current_clan_role()) = 'Líder');
ALTER POLICY "leaders can update shared site" ON public.clan_site_settings
  USING ((SELECT public.current_clan_role()) = 'Líder')
  WITH CHECK ((SELECT public.current_clan_role()) = 'Líder');

CREATE INDEX IF NOT EXISTS activities_created_by_idx ON public.activities(created_by);
CREATE INDEX IF NOT EXISTS activity_participants_user_id_idx ON public.activity_participants(user_id);
CREATE INDEX IF NOT EXISTS activity_poll_options_poll_id_idx ON public.activity_poll_options(poll_id);
CREATE INDEX IF NOT EXISTS activity_poll_votes_option_id_idx ON public.activity_poll_votes(option_id);
CREATE INDEX IF NOT EXISTS activity_poll_votes_user_id_idx ON public.activity_poll_votes(user_id);
CREATE INDEX IF NOT EXISTS clan_rules_updated_by_idx ON public.clan_rules(updated_by);
CREATE INDEX IF NOT EXISTS clan_site_settings_updated_by_idx ON public.clan_site_settings(updated_by);
