drop policy if exists "profiles readable by clan" on public.profiles;
create policy "profiles readable by clan" on public.profiles for select to authenticated
using (membership_status='active' or id=(select auth.uid()) or (select public.is_active_clan_admin()));
