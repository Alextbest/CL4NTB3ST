-- Keep interim-leader permissions active only for verified, active accounts.
create or replace function public.is_clan_badge_manager()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.clan_badge_managers m
    join auth.users u on u.id=m.user_id
    join public.profiles pr on pr.id=m.user_id
    where m.user_id=(select auth.uid()) and u.email_confirmed_at is not null
      and pr.membership_status='active' and pr.role in ('Líder','Líder interina')
      and pg_catalog.encode(extensions.digest(pg_catalog.lower(pg_catalog.btrim(u.email)),'sha256'),'hex')
        in ('934a07afbc6371b9cdaf98965a05939e2029a30dc15f53fdbef43f42a2d32630',
            '6b22ba9bd6f52a507ebe6d14c555da505b29560d3cecb21d17f7f7aae34df8a0')
  );
$$;

create or replace function private.clan_manager_can_manage_target(p_target_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and public.is_clan_badge_manager()
    and exists(select 1 from public.profiles a where a.id=(select auth.uid()) and a.membership_status='active')
    and ((select auth.uid())='af0d8907-fc67-4290-bba6-eb0bc4c81126'::uuid
      or p_target_user_id<>'af0d8907-fc67-4290-bba6-eb0bc4c81126'::uuid);
$$;
revoke all on function private.clan_manager_can_manage_target(uuid) from public,anon,authenticated;

create or replace function public.is_active_clan_admin()
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid())
   and p.membership_status='active' and p.role in ('Líder','Líder interina'));
$$;
revoke all on function public.is_active_clan_admin() from public,anon;
grant execute on function public.is_active_clan_admin() to authenticated;

create or replace function public.grant_clan_badge(p_user_id uuid,p_badge_id uuid,p_note text default '')
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_row public.member_badges%rowtype;
begin
 if auth.uid() is null or not public.is_clan_badge_manager() then raise exception 'Solo los líderes autorizados pueden otorgar insignias.'; end if;
 if not private.clan_manager_can_manage_target(p_user_id) then raise exception 'No tienes permiso para modificar las insignias de esa cuenta.'; end if;
 if not exists(select 1 from public.profiles where id=p_user_id and membership_status='active') then raise exception 'No se encontró un integrante activo.'; end if;
 if not exists(select 1 from public.clan_badges where id=p_badge_id and is_active) then raise exception 'La insignia no existe o no está activa.'; end if;
 if char_length(coalesce(p_note,''))>300 then raise exception 'La nota supera 300 caracteres.'; end if;
 insert into public.member_badges(user_id,badge_id,awarded_by,note) values(p_user_id,p_badge_id,auth.uid(),coalesce(p_note,''))
 on conflict(user_id,badge_id) do nothing returning * into v_row;
 if v_row.id is null then raise exception 'Este integrante ya tiene esa insignia.'; end if;
 return to_jsonb(v_row);
end; $$;

create or replace function public.review_mission_submission(p_submission_id uuid,p_decision text,p_review_note text default '')
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_submission public.mission_submissions%rowtype; v_mission public.clan_missions%rowtype; v_badge_id uuid;
begin
 if auth.uid() is null or not public.is_active_clan_admin() then raise exception 'Solo los líderes activos pueden revisar evidencias.'; end if;
 if p_decision not in ('approved','rejected') then raise exception 'Decisión no válida.'; end if;
 if char_length(coalesce(p_review_note,''))>500 then raise exception 'La observación supera 500 caracteres.'; end if;
 select * into v_submission from public.mission_submissions where id=p_submission_id for update;
 if not found then raise exception 'No se encontró la evidencia.'; end if;
 if v_submission.user_id=auth.uid() then raise exception 'No puedes aprobar ni rechazar tu propia evidencia.'; end if;
 if not private.clan_manager_can_manage_target(v_submission.user_id) then raise exception 'La líder interina no puede aprobar recompensas para el líder principal.'; end if;
 if v_submission.status<>'pending' then raise exception 'Esta evidencia ya fue revisada.'; end if;
 select * into v_mission from public.clan_missions where id=v_submission.mission_id;
 update public.mission_submissions set status=p_decision,review_note=coalesce(p_review_note,''),reviewed_by=auth.uid(),reviewed_at=now()
 where id=p_submission_id returning * into v_submission;
 if p_decision='approved' then
  if v_mission.reward_type='points' and v_mission.points>0 then
   insert into public.clan_point_ledger(user_id,amount,source_type,source_id,reason,created_by)
   values(v_submission.user_id,v_mission.points,'mission',v_mission.id,'Misión completada: '||v_mission.title,auth.uid());
  elsif v_mission.reward_type='gold' and v_mission.gold_reward>0 then
   insert into public.clan_gold_ledger(user_id,amount,source_type,source_id,reason,created_by)
   values(v_submission.user_id,v_mission.gold_reward,'mission',v_mission.id,'Misión completada: '||v_mission.title,auth.uid());
  end if;
  select id into v_badge_id from public.clan_badges where slug='primera-mision' and is_active limit 1;
  if v_badge_id is not null then
   insert into public.member_badges(user_id,badge_id,awarded_by,note)
   select v_submission.user_id,v_badge_id,auth.uid(),'Primera misión completada'
   where not exists(select 1 from public.member_badges mb where mb.user_id=v_submission.user_id and mb.badge_id=v_badge_id);
  end if;
 end if;
 return to_jsonb(v_submission);
end; $$;
revoke all on function public.review_mission_submission(uuid,text,text) from public,anon;
grant execute on function public.review_mission_submission(uuid,text,text) to authenticated;

drop policy if exists "members read own submissions and moderators read all" on public.mission_submissions;
create policy "members read own submissions and clan admins read all" on public.mission_submissions
for select to authenticated using (user_id=(select auth.uid()) or (select public.is_active_clan_admin()));
drop policy if exists "members and moderators read mission evidence" on storage.objects;
create policy "members and clan admins read mission evidence" on storage.objects for select to authenticated
using (bucket_id='mission-evidence' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_active_clan_admin())));
drop policy if exists "members delete own unreviewed evidence" on storage.objects;
create policy "members delete own unsubmitted evidence" on storage.objects for delete to authenticated
using (bucket_id='mission-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text
 and not exists(select 1 from public.mission_submissions s where s.evidence_path=objects.name));

create or replace function private.assign_clan_role(p_identifier text,p_role text)
returns table(id uuid,display_name text,ff_nick text,ff_id text,role text)
language plpgsql security definer set search_path=''
as $$
declare v_actor_role text; v_actor_status text; v_target_id uuid; v_target_role text;
 v_identifier text:=pg_catalog.btrim(coalesce(p_identifier,'')); v_matches integer;
begin
 if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
 select p.role,p.membership_status into v_actor_role,v_actor_status from public.profiles p where p.id=auth.uid();
 if v_actor_status is distinct from 'active' or v_actor_role not in ('Líder','Líder interina') then raise exception 'Solo los líderes activos pueden administrar rangos.'; end if;
 if p_role not in ('Miembro','Decano') then raise exception 'Solo se puede asignar Miembro o Decano.'; end if;
 if v_identifier='' or length(v_identifier)>128 then raise exception 'Introduce un ID válido.'; end if;
 select p.id,p.role into v_target_id,v_target_role from public.profiles p where p.id::text=v_identifier;
 if not found then
  select count(*) into v_matches from public.profiles p where p.ff_id=v_identifier;
  if v_matches=0 then raise exception 'No existe una cuenta registrada con ese ID.';
  elsif v_matches>1 then raise exception 'Ese ID de Free Fire está asociado a varias cuentas. Usa el UUID de la cuenta.'; end if;
  select p.id,p.role into v_target_id,v_target_role from public.profiles p where p.ff_id=v_identifier;
 end if;
 if v_target_id=auth.uid() then raise exception 'No puedes cambiar tu propio rango.'; end if;
 if v_target_id='af0d8907-fc67-4290-bba6-eb0bc4c81126'::uuid then raise exception 'La cuenta del líder principal está protegida.'; end if;
 if v_target_role='Líder' then raise exception 'No se puede degradar ni modificar una cuenta de líder desde este panel.'; end if;
 return query update public.profiles p set role=p_role where p.id=v_target_id returning p.id,p.display_name,p.ff_nick,p.ff_id,p.role;
end; $$;
grant execute on function private.assign_clan_role(text,text) to authenticated;
revoke all on function public.review_mission_submission(uuid,text,text) from public,anon;
revoke all on table public.clan_gold_ledger from anon;
grant select,insert on table public.clan_gold_ledger to authenticated;
