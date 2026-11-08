-- This is a trigger-only guard; clients must not invoke it as an RPC.
revoke all on function public.guard_profile_avatar_changes() from public, anon, authenticated;
