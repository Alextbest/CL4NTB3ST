create or replace function private.clan_manager_can_manage_target(p_target_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
 select (select auth.uid()) is not null
 and exists (
  select 1 from auth.users actor join public.clan_badge_managers manager on manager.user_id=actor.id
  where actor.id=(select auth.uid()) and actor.email_confirmed_at is not null
  and pg_catalog.encode(extensions.digest(pg_catalog.lower(pg_catalog.btrim(actor.email)),'sha256'),'hex')
  in ('934a07afbc6371b9cdaf98965a05939e2029a30dc15f53fdbef43f42a2d32630','6b22ba9bd6f52a507ebe6d14c555da505b29560d3cecb21d17f7f7aae34df8a0')
 )
 and (
  exists(select 1 from auth.users actor where actor.id=(select auth.uid())
   and pg_catalog.encode(extensions.digest(pg_catalog.lower(pg_catalog.btrim(actor.email)),'sha256'),'hex')='934a07afbc6371b9cdaf98965a05939e2029a30dc15f53fdbef43f42a2d32630')
  or not exists(select 1 from auth.users target where target.id=p_target_user_id
   and pg_catalog.encode(extensions.digest(pg_catalog.lower(pg_catalog.btrim(target.email)),'sha256'),'hex')='934a07afbc6371b9cdaf98965a05939e2029a30dc15f53fdbef43f42a2d32630')
 );
$$;
revoke all on function private.clan_manager_can_manage_target(uuid) from public,anon,authenticated;
create or replace function public.grant_clan_badge(p_user_id uuid,p_badge_id uuid,p_note text default '')
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_row public.member_badges%rowtype;
begin
 if auth.uid() is null or not public.is_clan_badge_manager() then raise exception 'Solo los administradores autorizados de insignias pueden otorgarlas.'; end if;
 if not private.clan_manager_can_manage_target(p_user_id) then raise exception 'La líder interina no puede otorgar insignias a la cuenta del líder principal.'; end if;
 if char_length(coalesce(p_note,''))>300 then raise exception 'La nota supera 300 caracteres.'; end if;
 insert into public.member_badges(user_id,badge_id,awarded_by,note) values(p_user_id,p_badge_id,auth.uid(),coalesce(p_note,'')) on conflict(user_id,badge_id) do nothing returning * into v_row;
 if v_row.id is null then raise exception 'Este integrante ya tiene esa insignia.'; end if;
 return to_jsonb(v_row);
end; $$;
create or replace function public.revoke_clan_badge(p_member_badge_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_row public.member_badges%rowtype;
begin
 if auth.uid() is null or not public.is_clan_badge_manager() then raise exception 'Solo los administradores autorizados de insignias pueden revocarlas.'; end if;
 select * into v_row from public.member_badges where id=p_member_badge_id;
 if v_row.id is null then raise exception 'La insignia ya no existe o fue revocada.'; end if;
 if not private.clan_manager_can_manage_target(v_row.user_id) then raise exception 'La líder interina no puede revocar insignias de la cuenta del líder principal.'; end if;
 delete from public.member_badges where id=p_member_badge_id;
 return to_jsonb(v_row);
end; $$;
create or replace function public.record_clan_points(p_user_id uuid,p_amount integer,p_source_type text,p_reason text,p_source_id uuid default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_row public.clan_point_ledger%rowtype;
begin
 if auth.uid() is null or not public.is_clan_badge_manager() then raise exception 'Solo los líderes autorizados pueden otorgar puntos.'; end if;
 if not private.clan_manager_can_manage_target(p_user_id) then raise exception 'La líder interina no puede modificar los puntos del líder principal.'; end if;
 if p_amount is null or p_amount=0 or abs(p_amount::bigint)>1000000000 then raise exception 'La cantidad debe estar entre -1,000,000,000 y 1,000,000,000 puntos, sin incluir cero.'; end if;
 if p_source_type not in ('duel','tournament','mvp','trivia','bonus','adjustment') then raise exception 'Tipo de puntos no válido.'; end if;
 if char_length(trim(coalesce(p_reason,''))) not between 3 and 200 then raise exception 'Describe el motivo (3 a 200 caracteres).'; end if;
 if not exists(select 1 from public.profiles where id=p_user_id and membership_status='active') then raise exception 'No se encontró un integrante activo.'; end if;
 insert into public.clan_point_ledger(user_id,amount,source_type,source_id,reason,created_by) values(p_user_id,p_amount,p_source_type,p_source_id,trim(p_reason),auth.uid()) returning * into v_row;
 return to_jsonb(v_row);
end; $$;
create or replace function public.grant_clan_gold(p_user_id uuid,p_amount integer,p_reason text,p_source_type text default 'manual',p_source_id uuid default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_row public.clan_gold_ledger%rowtype;
begin
 if auth.uid() is null or not public.is_clan_badge_manager() then raise exception 'Solo los líderes autorizados pueden otorgar oro.'; end if;
 if not private.clan_manager_can_manage_target(p_user_id) then raise exception 'La líder interina no puede modificar el oro del líder principal.'; end if;
 if p_amount is null or p_amount<1 or p_amount>1000000000 then raise exception 'La cantidad de oro debe estar entre 1 y 1,000,000,000.'; end if;
 if p_source_type not in ('manual','mission','adjustment') then raise exception 'Origen de oro no válido.'; end if;
 if char_length(btrim(coalesce(p_reason,''))) not between 3 and 300 then raise exception 'Describe el motivo (3 a 300 caracteres).'; end if;
 if not exists(select 1 from public.profiles p where p.id=p_user_id and p.membership_status='active') then raise exception 'No se encontró un integrante activo.'; end if;
 insert into public.clan_gold_ledger(user_id,amount,source_type,source_id,reason,created_by) values(p_user_id,p_amount,p_source_type,p_source_id,btrim(p_reason),auth.uid()) returning * into v_row;
 return to_jsonb(v_row);
end; $$;
revoke all on function public.grant_clan_badge(uuid,uuid,text) from public,anon;
revoke all on function public.revoke_clan_badge(uuid) from public,anon;
revoke all on function public.record_clan_points(uuid,integer,text,text,uuid) from public,anon;
revoke all on function public.grant_clan_gold(uuid,integer,text,text,uuid) from public,anon;
grant execute on function public.grant_clan_badge(uuid,uuid,text) to authenticated;
grant execute on function public.revoke_clan_badge(uuid) to authenticated;
grant execute on function public.record_clan_points(uuid,integer,text,text,uuid) to authenticated;
grant execute on function public.grant_clan_gold(uuid,integer,text,text,uuid) to authenticated;