-- Keep only read access for authenticated clients; all gold ledger writes go through guarded RPCs.
revoke all on table public.clan_gold_ledger from anon, authenticated;
grant select on table public.clan_gold_ledger to authenticated;
