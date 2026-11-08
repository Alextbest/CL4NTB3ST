-- CL4NTB3ST: secure badge managers and assign the interim leader role by verified email.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['Líder'::text, 'Líder interina'::text, 'Decano'::text, 'Miembro'::text]));

CREATE OR REPLACE FUNCTION private.set_initial_clan_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_email text; v_email_hash text;
BEGIN
  SELECT pg_catalog.lower(pg_catalog.btrim(u.email)) INTO v_email
  FROM auth.users AS u WHERE u.id = NEW.id AND u.email_confirmed_at IS NOT NULL;
  v_email_hash := pg_catalog.encode(extensions.digest(coalesce(v_email, ''), 'sha256'), 'hex');
  NEW.role := CASE
    WHEN v_email_hash = '934a07afbc6371b9cdaf98965a05939e2029a30dc15f53fdbef43f42a2d32630' THEN 'Líder'
    WHEN v_email_hash = '6b22ba9bd6f52a507ebe6d14c555da505b29560d3cecb21d17f7f7aae34df8a0' THEN 'Líder interina'
    ELSE 'Miembro' END;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.sync_clan_badge_manager_from_verified_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_email text; v_email_hash text; v_owner_id uuid := 'af0d8907-fc67-4290-bba6-eb0bc4c81126'::uuid;
BEGIN
  SELECT pg_catalog.lower(pg_catalog.btrim(u.email)) INTO v_email
  FROM auth.users AS u WHERE u.id = NEW.id AND u.email_confirmed_at IS NOT NULL;
  v_email_hash := pg_catalog.encode(extensions.digest(coalesce(v_email, ''), 'sha256'), 'hex');
  IF v_email_hash IN (
    '934a07afbc6371b9cdaf98965a05939e2029a30dc15f53fdbef43f42a2d32630',
    '6b22ba9bd6f52a507ebe6d14c555da505b29560d3cecb21d17f7f7aae34df8a0'
  ) THEN
    INSERT INTO public.clan_badge_managers(user_id, granted_by)
    VALUES (NEW.id, CASE WHEN NEW.id = v_owner_id THEN NEW.id ELSE v_owner_id END)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_clan_badge_manager_after_profile_insert ON public.profiles;
CREATE TRIGGER sync_clan_badge_manager_after_profile_insert
AFTER INSERT ON public.profiles FOR EACH ROW
EXECUTE FUNCTION private.sync_clan_badge_manager_from_verified_email();

REVOKE ALL ON FUNCTION private.set_initial_clan_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.sync_clan_badge_manager_from_verified_email() FROM PUBLIC, anon, authenticated;
ALTER TABLE public.clan_badge_managers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.clan_badge_managers FROM PUBLIC, anon, authenticated;

DELETE FROM public.clan_badge_managers AS m
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users AS u
  WHERE u.id = m.user_id AND u.email_confirmed_at IS NOT NULL
    AND pg_catalog.encode(extensions.digest(pg_catalog.lower(pg_catalog.btrim(u.email)), 'sha256'), 'hex') IN (
      '934a07afbc6371b9cdaf98965a05939e2029a30dc15f53fdbef43f42a2d32630',
      '6b22ba9bd6f52a507ebe6d14c555da505b29560d3cecb21d17f7f7aae34df8a0'
    )
);
INSERT INTO public.clan_badge_managers(user_id, granted_by)
VALUES ('af0d8907-fc67-4290-bba6-eb0bc4c81126'::uuid, 'af0d8907-fc67-4290-bba6-eb0bc4c81126'::uuid)
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_clan_badge_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.clan_badge_managers AS m
    JOIN auth.users AS u ON u.id = m.user_id
    WHERE m.user_id = (SELECT auth.uid()) AND u.email_confirmed_at IS NOT NULL
      AND pg_catalog.encode(extensions.digest(pg_catalog.lower(pg_catalog.btrim(u.email)), 'sha256'), 'hex') IN (
        '934a07afbc6371b9cdaf98965a05939e2029a30dc15f53fdbef43f42a2d32630',
        '6b22ba9bd6f52a507ebe6d14c555da505b29560d3cecb21d17f7f7aae34df8a0'
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.is_clan_badge_manager() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_clan_badge_manager() TO authenticated;
REVOKE ALL ON FUNCTION public.grant_clan_badge(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_clan_badge(uuid, uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.revoke_clan_badge(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_clan_badge(uuid) TO authenticated;
