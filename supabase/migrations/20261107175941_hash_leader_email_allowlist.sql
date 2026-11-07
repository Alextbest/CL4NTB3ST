-- Keep leader allowlist identifiers out of the public migration source as plain email addresses.
CREATE OR REPLACE FUNCTION private.set_initial_clan_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_email_hash text;
BEGIN
  v_email_hash := pg_catalog.encode(
    extensions.digest(
      pg_catalog.lower(pg_catalog.btrim(coalesce(auth.jwt() ->> 'email', ''))),
      'sha256'
    ),
    'hex'
  );
  NEW.role := CASE
    WHEN v_email_hash = ANY (ARRAY[
      '934a07afbc6371b9cdaf98965a05939e2029a30dc15f53fdbef43f42a2d32630',
      '6b22ba9bd6f52a507ebe6d14c555da505b29560d3cecb21d17f7f7aae34df8a0'
    ]::text[]) THEN 'Líder'
    ELSE 'Miembro'
  END;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.set_initial_clan_role() FROM PUBLIC, anon, authenticated;
