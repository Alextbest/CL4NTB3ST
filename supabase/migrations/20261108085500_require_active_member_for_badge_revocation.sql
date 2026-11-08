create or replace function public.revoke_clan_badge(p_member_badge_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_row public.member_badges%rowtype;
begin
 if auth.uid() is null or not public.is_clan_badge_manager() then raise exception 'Solo los administradores autorizados pueden revocar insignias.'; end if;
 select * into v_row from public.member_badges where id=p_member_badge_id;
 if v_row.id is null then raise exception 'La insignia ya no existe o fue revocada.'; end if;
 if not private.clan_manager_can_manage_target(v_row.user_id) then raise exception 'No tienes permiso para modificar las insignias de esa cuenta.'; end if;
 if not exists(select 1 from public.profiles where id=v_row.user_id and membership_status='active') then raise exception 'Solo se pueden modificar insignias de integrantes activos.'; end if;
 delete from public.member_badges where id=p_member_badge_id;
 return to_jsonb(v_row);
end; $$;
revoke all on function public.revoke_clan_badge(uuid) from public,anon;
grant execute on function public.revoke_clan_badge(uuid) to authenticated;
