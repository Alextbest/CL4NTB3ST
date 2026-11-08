-- Reconcile badge-manager authorization after email verification as well as profile creation.
CREATE OR REPLACE FUNCTION private.sync_clan_badge_manager_from_verified_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_email text;
  v_email_hash text;
  v_owner_id uuid := 'af0d8907-fc67-4290-bba6-eb0bc4c81126'::uuid;
  v_role text;
BEGIN
  SELECT pg_catalog.lower(pg_catalog.btrim(u.email))
    INTO v_email
  FROM auth.users AS u
  WHERE u.id = NEW.id
    AND u.email_confirmed_at IS NOT NULL;

  v_email_hash := pg_catalog.encode(
    extensions.digest(coalesce(v_email, ''), 'sha256'),
    'hex'
  );

  IF v_email_hash = '934a07afbc6371b9cdaf98965a05939e2029a30dc15f53fdbef43f42a2d32630' THEN
    v_role := 'Líder';
  ELSIF v_email_hash = '6b22ba9bd6f52a507ebe6d14c555da505b29560d3cecb21d17f7f7aae34df8a0' THEN
    v_role := 'Líder interina';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.clan_badge_managers(user_id, granted_by)
  VALUES (NEW.id, CASE WHEN NEW.id = v_owner_id THEN NEW.id ELSE v_owner_id END)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.profiles
  SET role = v_role
  WHERE id = NEW.id AND role IS DISTINCT FROM v_role;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_clan_badge_manager_after_auth_user_change ON auth.users;
CREATE TRIGGER sync_clan_badge_manager_after_auth_user_change
AFTER INSERT OR UPDATE OF email, email_confirmed_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION private.sync_clan_badge_manager_from_verified_email();

DROP TRIGGER IF EXISTS sync_clan_badge_manager_after_profile_insert ON public.profiles;
CREATE TRIGGER sync_clan_badge_manager_after_profile_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION private.sync_clan_badge_manager_from_verified_email();