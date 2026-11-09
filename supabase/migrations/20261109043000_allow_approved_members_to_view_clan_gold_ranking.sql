create or replace view public.clan_global_ranking
with (security_invoker = false)
as
select
  p.id as user_id,
  p.display_name,
  p.ff_nick,
  p.role,
  coalesce(points.total, 0::bigint) as points,
  rank() over (
    order by coalesce(points.total, 0::bigint) desc, p.created_at
  ) as position,
  coalesce(gold.total, 0::bigint) as gold
from public.profiles p
left join (
  select user_id, sum(amount) as total
  from public.clan_point_ledger
  group by user_id
) points on points.user_id = p.id
left join (
  select user_id, sum(amount) as total
  from public.clan_gold_ledger
  group by user_id
) gold on gold.user_id = p.id
where p.approval_status = 'approved'
  and p.membership_status = 'active';

grant select on public.clan_global_ranking to authenticated;
