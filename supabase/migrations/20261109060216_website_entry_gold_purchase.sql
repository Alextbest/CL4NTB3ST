-- Charge 100 clan gold for every entry to the clan website.
-- The request UUID makes retries of the same purchase idempotent.
alter table public.clan_gold_ledger
  drop constraint if exists clan_gold_ledger_source_type_check;
alter table public.clan_gold_ledger
  add constraint clan_gold_ledger_source_type_check
  check (source_type = any (array['manual','mission','adjustment','transfer','website_entry']::text[]));

create unique index if not exists clan_gold_ledger_website_entry_request_uidx
  on public.clan_gold_ledger(source_id)
  where source_type = 'website_entry' and source_id is not null;

create or replace function public.purchase_clan_website_entry(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_membership_status text;
  v_approval_status text;
  v_balance bigint;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para realizar esta compra.';
  end if;
  if p_request_id is null then
    raise exception 'La solicitud de compra no es válida.';
  end if;

  select p.membership_status, p.approval_status
    into v_membership_status, v_approval_status
  from public.profiles p
  where p.id = v_user_id
  for update;

  if not found or v_membership_status <> 'active' or v_approval_status <> 'approved' then
    return jsonb_build_object('success', false, 'code', 'inactive_membership');
  end if;

  if exists (
    select 1 from public.clan_gold_ledger l
    where l.source_type = 'website_entry' and l.source_id = p_request_id
      and l.user_id = v_user_id
  ) then
    select coalesce(sum(l.amount), 0)::bigint into v_balance
    from public.clan_gold_ledger l where l.user_id = v_user_id;
    return jsonb_build_object('success', true, 'code', 'already_charged', 'balance', v_balance);
  end if;

  select coalesce(sum(l.amount), 0)::bigint into v_balance
  from public.clan_gold_ledger l
  where l.user_id = v_user_id;

  if v_balance < 100 then
    return jsonb_build_object('success', false, 'code', 'insufficient_funds', 'balance', v_balance);
  end if;

  insert into public.clan_gold_ledger(user_id, amount, source_type, source_id, reason, created_by)
  values (v_user_id, -100, 'website_entry', p_request_id, 'Acceso al sitio web del clan', v_user_id);

  return jsonb_build_object('success', true, 'code', 'charged', 'balance', v_balance - 100);
end;
$function$;

revoke all on function public.purchase_clan_website_entry(uuid) from public, anon;
grant execute on function public.purchase_clan_website_entry(uuid) to authenticated;
