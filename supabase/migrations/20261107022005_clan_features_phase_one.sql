-- Consolidated phase-one snapshot for fresh Supabase installations.
-- Later historical migration files remain in the directory to preserve production history.

CREATE TABLE IF NOT EXISTS public.clan_badges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,50}$'),
 name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 60),
 description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 300),
 icon text NOT NULL DEFAULT '🏅' CHECK (char_length(icon) <= 12),
 rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.clan_missions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 80),
 description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1200),
 instructions text NOT NULL DEFAULT '' CHECK (char_length(instructions) <= 2000),
 points integer NOT NULL DEFAULT 10 CHECK (points BETWEEN 1 AND 10000),
 cadence text NOT NULL DEFAULT 'one_time' CHECK (cadence IN ('daily','weekly','one_time')),
 starts_at timestamptz NOT NULL DEFAULT now(),
 ends_at timestamptz,
 is_active boolean NOT NULL DEFAULT true,
 created_by uuid NOT NULL REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE TABLE IF NOT EXISTS public.clan_point_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 amount integer NOT NULL CHECK (amount BETWEEN -10000 AND 10000 AND amount <> 0),
 source_type text NOT NULL CHECK (source_type IN ('mission','duel','tournament','mvp','trivia','bonus','adjustment')),
 source_id uuid,
 reason text NOT NULL CHECK (char_length(trim(reason)) BETWEEN 3 AND 200),
 created_by uuid NOT NULL REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.member_badges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 badge_id uuid NOT NULL REFERENCES public.clan_badges(id) ON DELETE CASCADE,
 awarded_by uuid REFERENCES public.profiles(id),
 note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 300),
 awarded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,badge_id)
);
CREATE TABLE IF NOT EXISTS public.member_presence (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','busy','looking_for_squad')),
 message text NOT NULL DEFAULT '' CHECK (char_length(message) <= 80),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.mission_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 mission_id uuid NOT NULL REFERENCES public.clan_missions(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 evidence_path text NOT NULL CHECK (char_length(evidence_path) BETWEEN 1 AND 500),
 note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 review_note text NOT NULL DEFAULT '' CHECK (char_length(review_note) <= 500),
 reviewed_by uuid REFERENCES public.profiles(id),
 submitted_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.social_posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 content text NOT NULL,
 is_hidden boolean NOT NULL DEFAULT false,
 moderated_by uuid REFERENCES public.profiles(id),
 moderation_note text NOT NULL DEFAULT '' CHECK (char_length(moderation_note) <= 300),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 media_path text,
 CHECK (char_length(trim(content)) <= 800 AND (char_length(trim(content)) >= 1 OR media_path IS NOT NULL)),
 CHECK (media_path IS NULL OR split_part(media_path,'/',1)=user_id::text)
);
CREATE TABLE IF NOT EXISTS public.social_comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 content text NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 500),
 is_hidden boolean NOT NULL DEFAULT false,
 moderated_by uuid REFERENCES public.profiles(id),
 moderation_note text NOT NULL DEFAULT '' CHECK (char_length(moderation_note) <= 300),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.social_reactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 reaction text NOT NULL DEFAULT 'like' CHECK (reaction IN ('like','fire','gg','clap')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(post_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.member_preferences (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 music_muted boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clan_missions_created_by_idx ON public.clan_missions(created_by);
CREATE INDEX IF NOT EXISTS clan_point_ledger_created_by_idx ON public.clan_point_ledger(created_by);
CREATE INDEX IF NOT EXISTS clan_point_ledger_user_idx ON public.clan_point_ledger(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS member_badges_awarded_by_idx ON public.member_badges(awarded_by);
CREATE INDEX IF NOT EXISTS member_badges_badge_id_idx ON public.member_badges(badge_id);
CREATE UNIQUE INDEX IF NOT EXISTS mission_submissions_one_pending_idx ON public.mission_submissions(mission_id,user_id) WHERE status='pending';
CREATE INDEX IF NOT EXISTS mission_submissions_review_idx ON public.mission_submissions(status,submitted_at);
CREATE INDEX IF NOT EXISTS mission_submissions_reviewed_by_idx ON public.mission_submissions(reviewed_by);
CREATE INDEX IF NOT EXISTS mission_submissions_user_idx ON public.mission_submissions(user_id,submitted_at DESC);
CREATE INDEX IF NOT EXISTS social_comments_moderated_by_idx ON public.social_comments(moderated_by);
CREATE INDEX IF NOT EXISTS social_comments_post_idx ON public.social_comments(post_id,created_at);
CREATE INDEX IF NOT EXISTS social_comments_user_id_idx ON public.social_comments(user_id);
CREATE INDEX IF NOT EXISTS social_posts_created_idx ON public.social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS social_posts_moderated_by_idx ON public.social_posts(moderated_by);
CREATE INDEX IF NOT EXISTS social_posts_user_id_idx ON public.social_posts(user_id);
CREATE INDEX IF NOT EXISTS social_reactions_post_id_idx ON public.social_reactions(post_id);
CREATE INDEX IF NOT EXISTS social_reactions_user_id_idx ON public.social_reactions(user_id);

ALTER TABLE public.clan_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_point_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_preferences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.ensure_member_presence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.member_presence(user_id,status,message) VALUES(NEW.id,'available','')
 ON CONFLICT(user_id) DO NOTHING;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.ensure_member_presence() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS create_member_presence_after_profile ON public.profiles;
CREATE TRIGGER create_member_presence_after_profile AFTER INSERT ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION private.ensure_member_presence();

CREATE OR REPLACE FUNCTION public.grant_clan_badge(p_user_id uuid,p_badge_id uuid,p_note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row public.member_badges%rowtype;
BEGIN
 IF auth.uid() IS NULL OR public.current_clan_role() <> 'Líder' THEN RAISE EXCEPTION 'Solo los Líderes pueden otorgar insignias especiales.'; END IF;
 IF char_length(coalesce(p_note,'')) > 300 THEN RAISE EXCEPTION 'La nota supera 300 caracteres.'; END IF;
 INSERT INTO public.member_badges(user_id,badge_id,awarded_by,note)
 VALUES(p_user_id,p_badge_id,auth.uid(),coalesce(p_note,'')) ON CONFLICT(user_id,badge_id) DO NOTHING
 RETURNING * INTO v_row;
 IF v_row.id IS NULL THEN RAISE EXCEPTION 'Este integrante ya tiene esa insignia.'; END IF;
 RETURN to_jsonb(v_row);
END;
$$;
CREATE OR REPLACE FUNCTION public.moderate_social_content(p_content_type text,p_content_id uuid,p_hide boolean,p_note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_result jsonb;
BEGIN
 IF auth.uid() IS NULL OR public.current_clan_role() NOT IN ('Líder','Decano') THEN RAISE EXCEPTION 'Solo Líderes y Decanos pueden moderar el muro.'; END IF;
 IF p_content_type='post' THEN
  UPDATE public.social_posts SET is_hidden=p_hide,moderated_by=auth.uid(),moderation_note=coalesce(p_note,'') WHERE id=p_content_id RETURNING to_jsonb(social_posts.*) INTO v_result;
 ELSIF p_content_type='comment' THEN
  UPDATE public.social_comments SET is_hidden=p_hide,moderated_by=auth.uid(),moderation_note=coalesce(p_note,'') WHERE id=p_content_id RETURNING to_jsonb(social_comments.*) INTO v_result;
 ELSE RAISE EXCEPTION 'Tipo de contenido no válido.';
 END IF;
 IF v_result IS NULL THEN RAISE EXCEPTION 'No se encontró la publicación o comentario.'; END IF;
 RETURN v_result;
END;
$$;
CREATE OR REPLACE FUNCTION public.record_clan_points(p_user_id uuid,p_amount integer,p_source_type text,p_reason text,p_source_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row public.clan_point_ledger%rowtype;
BEGIN
 IF auth.uid() IS NULL OR public.current_clan_role() NOT IN ('Líder','Decano') THEN RAISE EXCEPTION 'Solo Líderes y Decanos pueden registrar puntos.'; END IF;
 IF p_amount IS NULL OR p_amount=0 OR abs(p_amount)>10000 THEN RAISE EXCEPTION 'Cantidad de puntos no válida.'; END IF;
 IF p_source_type NOT IN ('duel','tournament','mvp','trivia','bonus','adjustment') THEN RAISE EXCEPTION 'Tipo de puntos no válido.'; END IF;
 IF char_length(trim(coalesce(p_reason,''))) NOT BETWEEN 3 AND 200 THEN RAISE EXCEPTION 'Describe el motivo (3 a 200 caracteres).'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user_id) THEN RAISE EXCEPTION 'No se encontró el integrante.'; END IF;
 INSERT INTO public.clan_point_ledger(user_id,amount,source_type,source_id,reason,created_by)
 VALUES(p_user_id,p_amount,p_source_type,p_source_id,trim(p_reason),auth.uid()) RETURNING * INTO v_row;
 RETURN to_jsonb(v_row);
END;
$$;
CREATE OR REPLACE FUNCTION public.review_mission_submission(p_submission_id uuid,p_decision text,p_review_note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_submission public.mission_submissions%rowtype; v_points integer; v_badge_id uuid;
BEGIN
 IF auth.uid() IS NULL OR public.current_clan_role() NOT IN ('Líder','Decano') THEN RAISE EXCEPTION 'Solo Líderes y Decanos pueden revisar evidencias.'; END IF;
 IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Decisión no válida.'; END IF;
 IF char_length(coalesce(p_review_note,'')) > 500 THEN RAISE EXCEPTION 'La observación supera 500 caracteres.'; END IF;
 SELECT * INTO v_submission FROM public.mission_submissions WHERE id=p_submission_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró la evidencia.'; END IF;
 IF v_submission.user_id=auth.uid() THEN RAISE EXCEPTION 'No puedes aprobar ni rechazar tu propia evidencia.'; END IF;
 IF v_submission.status<>'pending' THEN RAISE EXCEPTION 'Esta evidencia ya fue revisada.'; END IF;
 SELECT points INTO v_points FROM public.clan_missions WHERE id=v_submission.mission_id;
 UPDATE public.mission_submissions SET status=p_decision,review_note=coalesce(p_review_note,''),reviewed_by=auth.uid(),reviewed_at=now()
 WHERE id=p_submission_id RETURNING * INTO v_submission;
 IF p_decision='approved' THEN
  INSERT INTO public.clan_point_ledger(user_id,amount,source_type,source_id,reason,created_by)
  VALUES(v_submission.user_id,v_points,'mission',v_submission.id,'Misión aprobada',auth.uid());
  SELECT id INTO v_badge_id FROM public.clan_badges WHERE slug='primera-mision' AND is_active LIMIT 1;
  IF v_badge_id IS NOT NULL THEN
   INSERT INTO public.member_badges(user_id,badge_id,awarded_by,note)
   SELECT v_submission.user_id,v_badge_id,NULL,'Primera misión completada'
   WHERE NOT EXISTS(SELECT 1 FROM public.member_badges mb WHERE mb.user_id=v_submission.user_id AND mb.badge_id=v_badge_id);
  END IF;
 END IF;
 RETURN to_jsonb(v_submission);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_clan_badge(uuid,uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.moderate_social_content(text,uuid,boolean,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.record_clan_points(uuid,integer,text,text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.review_mission_submission(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.grant_clan_badge(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_social_content(text,uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_clan_points(uuid,integer,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_mission_submission(uuid,text,text) TO authenticated;

-- Public catalog and leader management.
CREATE POLICY "clan reads active badges" ON public.clan_badges FOR SELECT TO authenticated
 USING (is_active OR (SELECT public.current_clan_role()) IN ('Líder','Decano'));
CREATE POLICY "leaders insert badge catalog" ON public.clan_badges FOR INSERT TO authenticated
 WITH CHECK ((SELECT public.current_clan_role())='Líder');
CREATE POLICY "leaders update badge catalog" ON public.clan_badges FOR UPDATE TO authenticated
 USING ((SELECT public.current_clan_role())='Líder') WITH CHECK ((SELECT public.current_clan_role())='Líder');
CREATE POLICY "leaders delete badge catalog" ON public.clan_badges FOR DELETE TO authenticated
 USING ((SELECT public.current_clan_role())='Líder');

CREATE POLICY "clan reads missions" ON public.clan_missions FOR SELECT TO authenticated USING (true);
CREATE POLICY "leaders insert missions" ON public.clan_missions FOR INSERT TO authenticated
 WITH CHECK ((SELECT public.current_clan_role())='Líder' AND created_by=(SELECT auth.uid()));
CREATE POLICY "leaders update missions" ON public.clan_missions FOR UPDATE TO authenticated
 USING ((SELECT public.current_clan_role())='Líder')
 WITH CHECK ((SELECT public.current_clan_role())='Líder' AND created_by=(SELECT auth.uid()));
CREATE POLICY "leaders delete missions" ON public.clan_missions FOR DELETE TO authenticated
 USING ((SELECT public.current_clan_role())='Líder');
CREATE POLICY "clan reads point ledger" ON public.clan_point_ledger FOR SELECT TO authenticated USING (true);
CREATE POLICY "clan reads awarded badges" ON public.member_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "clan reads member presence" ON public.member_presence FOR SELECT TO authenticated USING (true);
CREATE POLICY "members set own presence" ON public.member_presence FOR INSERT TO authenticated
 WITH CHECK (user_id=(SELECT auth.uid()));
CREATE POLICY "members update own presence" ON public.member_presence FOR UPDATE TO authenticated
 USING (user_id=(SELECT auth.uid())) WITH CHECK (user_id=(SELECT auth.uid()));
CREATE POLICY "members read own submissions and moderators read all" ON public.mission_submissions FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()) OR (SELECT public.current_clan_role()) IN ('Líder','Decano'));
CREATE POLICY "members submit own mission evidence" ON public.mission_submissions FOR INSERT TO authenticated
 WITH CHECK (
  user_id=(SELECT auth.uid()) AND evidence_path LIKE ((SELECT auth.uid())::text||'/%')
  AND status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL
  AND EXISTS(SELECT 1 FROM public.clan_missions m WHERE m.id=mission_submissions.mission_id
    AND m.is_active AND m.starts_at<=now() AND (m.ends_at IS NULL OR m.ends_at>=now()))
 );
CREATE POLICY "members read own preferences" ON public.member_preferences FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()));
CREATE POLICY "members insert own preferences" ON public.member_preferences FOR INSERT TO authenticated
 WITH CHECK (user_id=(SELECT auth.uid()));
CREATE POLICY "members update own preferences" ON public.member_preferences FOR UPDATE TO authenticated
 USING (user_id=(SELECT auth.uid())) WITH CHECK (user_id=(SELECT auth.uid()));

CREATE POLICY "clan reads visible social posts" ON public.social_posts FOR SELECT TO authenticated
 USING (NOT is_hidden OR (SELECT public.current_clan_role()) IN ('Líder','Decano'));
CREATE POLICY "members publish own social posts" ON public.social_posts FOR INSERT TO authenticated
 WITH CHECK (user_id=(SELECT auth.uid()) AND is_hidden=false AND moderated_by IS NULL);
CREATE POLICY "members edit own visible posts" ON public.social_posts FOR UPDATE TO authenticated
 USING (user_id=(SELECT auth.uid()) AND NOT is_hidden)
 WITH CHECK (user_id=(SELECT auth.uid()) AND NOT is_hidden AND moderated_by IS NULL);
CREATE POLICY "members delete own posts" ON public.social_posts FOR DELETE TO authenticated
 USING (user_id=(SELECT auth.uid()));
CREATE POLICY "clan reads visible comments" ON public.social_comments FOR SELECT TO authenticated
 USING (
  ((NOT is_hidden) AND EXISTS(SELECT 1 FROM public.social_posts p WHERE p.id=social_comments.post_id
    AND (NOT p.is_hidden OR (SELECT public.current_clan_role()) IN ('Líder','Decano'))))
  OR (SELECT public.current_clan_role()) IN ('Líder','Decano')
 );
CREATE POLICY "members comment on visible posts" ON public.social_comments FOR INSERT TO authenticated
 WITH CHECK (user_id=(SELECT auth.uid()) AND is_hidden=false AND moderated_by IS NULL
  AND EXISTS(SELECT 1 FROM public.social_posts p WHERE p.id=social_comments.post_id AND NOT p.is_hidden));
CREATE POLICY "members edit own comments" ON public.social_comments FOR UPDATE TO authenticated
 USING (user_id=(SELECT auth.uid()) AND NOT is_hidden)
 WITH CHECK (user_id=(SELECT auth.uid()) AND NOT is_hidden AND moderated_by IS NULL);
CREATE POLICY "members delete own comments" ON public.social_comments FOR DELETE TO authenticated
 USING (user_id=(SELECT auth.uid()));
CREATE POLICY "clan reads social reactions" ON public.social_reactions FOR SELECT TO authenticated
 USING (EXISTS(SELECT 1 FROM public.social_posts p WHERE p.id=social_reactions.post_id
   AND (NOT p.is_hidden OR (SELECT public.current_clan_role()) IN ('Líder','Decano'))));
CREATE POLICY "members add own reactions" ON public.social_reactions FOR INSERT TO authenticated
 WITH CHECK (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.social_posts p
   WHERE p.id=social_reactions.post_id AND NOT p.is_hidden));
CREATE POLICY "members remove own reactions" ON public.social_reactions FOR DELETE TO authenticated
 USING (user_id=(SELECT auth.uid()));

CREATE OR REPLACE VIEW public.clan_global_ranking WITH (security_invoker=true) AS
 SELECT p.id AS user_id,p.display_name,p.ff_nick,p.role,
 COALESCE(sum(l.amount),0::bigint) AS points,
 rank() OVER (ORDER BY COALESCE(sum(l.amount),0::bigint) DESC,p.created_at) AS position
 FROM public.profiles p LEFT JOIN public.clan_point_ledger l ON l.user_id=p.id
 GROUP BY p.id,p.display_name,p.ff_nick,p.role,p.created_at;

-- Private evidence and social media buckets.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('mission-evidence','mission-evidence',false,10485760,ARRAY['image/jpeg','image/png','image/webp']),
 ('social-post-media','social-post-media',false,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "members and moderators read mission evidence" ON storage.objects;
CREATE POLICY "members and moderators read mission evidence" ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id='mission-evidence' AND ((storage.foldername(name))[1]=(SELECT auth.uid())::text
  OR (SELECT public.current_clan_role()) IN ('Líder','Decano')));
DROP POLICY IF EXISTS "members upload own mission evidence" ON storage.objects;
CREATE POLICY "members upload own mission evidence" ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id='mission-evidence' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS "members delete own unreviewed evidence" ON storage.objects;
CREATE POLICY "members delete own unreviewed evidence" ON storage.objects FOR DELETE TO authenticated
 USING (bucket_id='mission-evidence' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS "clan members read social post media" ON storage.objects;
CREATE POLICY "clan members read social post media" ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id='social-post-media' AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=(SELECT auth.uid())));
DROP POLICY IF EXISTS "members upload own social post media" ON storage.objects;
CREATE POLICY "members upload own social post media" ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id='social-post-media' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS "members delete own social post media" ON storage.objects;
CREATE POLICY "members delete own social post media" ON storage.objects FOR DELETE TO authenticated
 USING (bucket_id='social-post-media' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);

GRANT SELECT,INSERT,UPDATE,DELETE ON public.clan_badges TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.clan_missions TO authenticated;
GRANT SELECT ON public.clan_point_ledger TO authenticated;
GRANT SELECT ON public.member_badges TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.member_presence TO authenticated;
GRANT SELECT,INSERT ON public.mission_submissions TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.social_posts TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.social_comments TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.social_reactions TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.member_preferences TO authenticated;
GRANT SELECT ON public.clan_global_ranking TO authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['activities','activity_participants','activity_poll_options','activity_poll_votes','activity_polls','clan_site_settings','member_presence','social_comments','social_posts','social_reactions'] LOOP
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
   EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
  END IF;
 END LOOP;
END $$;
