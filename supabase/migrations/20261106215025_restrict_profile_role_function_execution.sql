-- Secure role assignment and member-detail RPCs. Clients cannot update profile roles directly.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE(display_name,ff_nick,ff_id,phone_e164) ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
CREATE OR REPLACE FUNCTION private.assign_clan_role(p_identifier text,p_role text)
RETURNS TABLE(id uuid,display_name text,ff_nick text,ff_id text,role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor_role text; v_target_id uuid; v_target_role text; v_identifier text:=pg_catalog.btrim(coalesce(p_identifier,'')); v_matches integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión.'; END IF;
 SELECT p.role INTO v_actor_role FROM public.profiles p WHERE p.id=auth.uid();
 IF v_actor_role IS DISTINCT FROM 'Líder' THEN RAISE EXCEPTION 'Solo los líderes pueden administrar rangos.'; END IF;
 IF p_role NOT IN ('Miembro','Decano') THEN RAISE EXCEPTION 'Solo se puede asignar Miembro o Decano.'; END IF;
 IF v_identifier='' OR pg_catalog.length(v_identifier)>128 THEN RAISE EXCEPTION 'Introduce un ID válido.'; END IF;
 SELECT p.id,p.role INTO v_target_id,v_target_role FROM public.profiles p WHERE p.id::text=v_identifier;
 IF NOT FOUND THEN
  SELECT pg_catalog.count(*) INTO v_matches FROM public.profiles p WHERE p.ff_id=v_identifier;
  IF v_matches=0 THEN RAISE EXCEPTION 'No existe una cuenta registrada con ese ID.';
  ELSIF v_matches>1 THEN RAISE EXCEPTION 'Ese ID de Free Fire está asociado a varias cuentas. Usa el UUID de la cuenta.'; END IF;
  SELECT p.id,p.role INTO v_target_id,v_target_role FROM public.profiles p WHERE p.ff_id=v_identifier;
 END IF;
 IF v_target_id=auth.uid() THEN RAISE EXCEPTION 'No puedes cambiar tu propio rango.'; END IF;
 IF v_target_role='Líder' THEN RAISE EXCEPTION 'No se puede degradar ni modificar una cuenta de líder desde este panel.'; END IF;
 RETURN QUERY UPDATE public.profiles p SET role=p_role WHERE p.id=v_target_id RETURNING p.id,p.display_name,p.ff_nick,p.ff_id,p.role;
END; $$;
REVOKE ALL ON FUNCTION private.assign_clan_role(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.assign_clan_role(text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.assign_clan_role(p_identifier text,p_role text)
RETURNS TABLE(id uuid,display_name text,ff_nick text,ff_id text,role text)
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT * FROM private.assign_clan_role(p_identifier,p_role); $$;
REVOKE ALL ON FUNCTION public.assign_clan_role(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.assign_clan_role(text,text) TO authenticated;
CREATE OR REPLACE FUNCTION private.update_clan_member_details(p_member_id uuid,p_display_name text,p_ff_nick text)
RETURNS TABLE(id uuid,display_name text,ff_nick text,ff_id text,role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor_role text; v_target_role text; v_name text:=pg_catalog.btrim(coalesce(p_display_name,'')); v_nick text:=pg_catalog.btrim(coalesce(p_ff_nick,''));
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión.'; END IF;
 SELECT p.role INTO v_actor_role FROM public.profiles p WHERE p.id=auth.uid();
 IF v_actor_role NOT IN ('Líder','Decano') THEN RAISE EXCEPTION 'Solo líderes y decanos pueden editar los datos de miembros.'; END IF;
 IF v_name='' OR pg_catalog.length(v_name)>32 THEN RAISE EXCEPTION 'El nombre debe tener entre 1 y 32 caracteres.'; END IF;
 IF v_nick='' OR pg_catalog.length(v_nick)>32 THEN RAISE EXCEPTION 'El nick debe tener entre 1 y 32 caracteres.'; END IF;
 SELECT p.role INTO v_target_role FROM public.profiles p WHERE p.id=p_member_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'No existe esa cuenta.'; END IF;
 IF v_target_role<>'Miembro' THEN RAISE EXCEPTION 'Solo se pueden editar los datos de cuentas con rango Miembro.'; END IF;
 RETURN QUERY UPDATE public.profiles p SET display_name=v_name,ff_nick=v_nick WHERE p.id=p_member_id RETURNING p.id,p.display_name,p.ff_nick,p.ff_id,p.role;
END; $$;
REVOKE ALL ON FUNCTION private.update_clan_member_details(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.update_clan_member_details(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.update_clan_member_details(p_member_id uuid,p_display_name text,p_ff_nick text)
RETURNS TABLE(id uuid,display_name text,ff_nick text,ff_id text,role text)
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT * FROM private.update_clan_member_details(p_member_id,p_display_name,p_ff_nick); $$;
REVOKE ALL ON FUNCTION public.update_clan_member_details(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_clan_member_details(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.current_clan_role()
RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT p.role FROM public.profiles p WHERE p.id=(SELECT auth.uid()); $$;
REVOKE ALL ON FUNCTION public.current_clan_role() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.current_clan_role() TO authenticated;
REVOKE ALL ON TABLE public.profiles FROM anon,authenticated;
GRANT SELECT(id,display_name,ff_nick,ff_id,role,created_at) ON public.profiles TO authenticated;
GRANT INSERT(id,display_name,ff_nick,ff_id,phone_e164) ON public.profiles TO authenticated;
GRANT UPDATE(display_name,ff_nick,ff_id,phone_e164) ON public.profiles TO authenticated;
