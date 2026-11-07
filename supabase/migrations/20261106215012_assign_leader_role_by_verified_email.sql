-- Verified-email leader assignment. Only SHA-256 digests are stored in this public repository.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA private TO authenticated;
CREATE OR REPLACE FUNCTION private.set_initial_clan_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_email_hash text;
BEGIN
 v_email_hash:=pg_catalog.encode(extensions.digest(pg_catalog.lower(pg_catalog.btrim(coalesce(auth.jwt()->>'email',''))),'sha256'),'hex');
 NEW.role:=CASE WHEN v_email_hash=ANY(ARRAY[
 '934a07afbc6371b9cdaf98965a05939e2029a30dc15f53fdbef43f42a2d32630',
 '6b22ba9bd6f52a507ebe6d14c555da505b29560d3cecb21d17f7f7aae34df8a0'
 ]::text[]) THEN 'Líder' ELSE 'Miembro' END;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.set_initial_clan_role() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS set_initial_clan_role ON public.profiles;
CREATE TRIGGER set_initial_clan_role BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.set_initial_clan_role();
